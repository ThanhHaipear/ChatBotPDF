import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import { OpenAiService } from '../openai/openai.service';
import { PrismaService } from '../prisma/prisma.service';
import { cleanText } from '../utils/clean-text';
import { chunkText } from '../utils/chunk-text';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
  ) {}

  async uploadAndIndex(file: Express.Multer.File, dto: CreateDocumentDto) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Only PDF files are supported');
    }

    const buffer = await fs.readFile(file.path);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const parsedPdf = await parser.getText();
    await parser.destroy();

    const text = cleanText(parsedPdf.text || '');

    if (!text || text.length < 100) {
      throw new BadRequestException('PDF does not contain enough readable text');
    }

    const document = await this.prisma.document.create({
      data: {
        title: dto.title,
        subject: dto.subject,
        topic: dto.topic,
        level: dto.level,
        priceType: dto.priceType || 'FREE',
        price: dto.price ? Number(dto.price) : null,
        sourceUrl: dto.sourceUrl,
        fileUrl: file.path,
      },
    });

    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.openAiService.createEmbedding(chunks[i]);
      const embeddingString = `[${embedding.join(',')}]`;

      await this.prisma.$executeRawUnsafe(
        `
        INSERT INTO "DocumentChunk"
          ("id", "documentId", "content", "pageNumber", "chunkIndex", "embedding", "createdAt")
        VALUES
          (gen_random_uuid(), $1, $2, NULL, $3, $4::vector, NOW())
      `,
        document.id,
        chunks[i],
        i,
        embeddingString,
      );
    }

    return {
      message: 'Document uploaded and indexed successfully',
      documentId: document.id,
      title: document.title,
      totalChunks: chunks.length,
    };
  }

  async findAll() {
    return this.prisma.document.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            chunkIndex: true,
            createdAt: true,
          },
          orderBy: {
            chunkIndex: 'asc',
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.document.delete({
      where: { id },
    });

    return {
      message: 'Document deleted successfully',
    };
  }
}
