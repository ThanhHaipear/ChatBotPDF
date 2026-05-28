import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import { HuggingFaceService } from '../huggingface/huggingface.service';
import { PrismaService } from '../prisma/prisma.service';
import { cleanText } from '../utils/clean-text';
import { chunkText } from '../utils/chunk-text';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  private readonly expectedEmbeddingDimensions = Number(
    process.env.HUGGINGFACE_EMBEDDING_DIMENSIONS || 1024,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly huggingFaceService: HuggingFaceService,
  ) {}

  async uploadAndIndex(file: Express.Multer.File, dto: CreateDocumentDto) {
    try {
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

      const chunks = chunkText(text);
      const indexedChunks: Array<{
        content: string;
        chunkIndex: number;
        embeddingString: string;
      }> = [];

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.huggingFaceService.createEmbedding(
          chunks[i],
        );

        if (embedding.length !== this.expectedEmbeddingDimensions) {
          throw new InternalServerErrorException(
            `Embedding dimension mismatch: expected ${this.expectedEmbeddingDimensions}, got ${embedding.length}. Check HUGGINGFACE_EMBEDDING_MODEL and Prisma vector dimension.`,
          );
        }

        indexedChunks.push({
          content: chunks[i],
          chunkIndex: i,
          embeddingString: `[${embedding.join(',')}]`,
        });
      }

      const document = await this.prisma.$transaction(async (tx) => {
        const createdDocument = await tx.document.create({
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

        for (const chunk of indexedChunks) {
          await tx.$executeRawUnsafe(
            `
            INSERT INTO "DocumentChunk"
              ("id", "documentId", "content", "pageNumber", "chunkIndex", "embedding", "createdAt")
            VALUES
              (gen_random_uuid(), $1, $2, NULL, $3, $4::vector, NOW())
          `,
            createdDocument.id,
            chunk.content,
            chunk.chunkIndex,
            chunk.embeddingString,
          );
        }

        return createdDocument;
      });

      return {
        message: 'Document uploaded and indexed successfully',
        documentId: document.id,
        title: document.title,
        totalChunks: chunks.length,
      };
    } catch (error) {
      await this.removeUploadedFile(file);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Document indexing failed: ${this.getErrorMessage(error)}`,
      );
    }
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

  private async removeUploadedFile(file?: Express.Multer.File) {
    if (!file?.path) {
      return;
    }

    await fs.unlink(file.path).catch(() => undefined);
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
