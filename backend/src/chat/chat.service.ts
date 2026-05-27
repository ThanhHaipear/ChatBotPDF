import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../openai/openai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatDto } from './dto/chat.dto';

type RetrievedChunk = {
  id: string;
  content: string;
  title: string;
  subject: string;
  topic: string | null;
  level: string | null;
  priceType: string;
  price: number | null;
  similarity: number;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
  ) {}

  async chat(dto: ChatDto) {
    const queryEmbedding = await this.openAiService.createEmbedding(dto.message);
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    const params: string[] = [embeddingString];
    const filters: string[] = [];

    this.addIlikeFilter(filters, params, 'd."subject"', dto.subject);
    this.addIlikeFilter(filters, params, 'd."topic"', dto.topic);
    this.addIlikeFilter(filters, params, 'd."level"', dto.level);

    if (dto.priceType) {
      params.push(dto.priceType);
      filters.push(`d."priceType" = $${params.length}`);
    }

    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const results = await this.prisma.$queryRawUnsafe<RetrievedChunk[]>(
      `
      SELECT
        dc."id",
        dc."content",
        d."title",
        d."subject",
        d."topic",
        d."level",
        d."priceType",
        d."price",
        1 - (dc."embedding" <=> $1::vector) AS "similarity"
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d."id" = dc."documentId"
      ${whereClause}
      ORDER BY dc."embedding" <=> $1::vector
      LIMIT 8
    `,
      ...params,
    );

    if (results.length === 0) {
      return {
        answer: 'Hien chua co tai lieu phu hop voi nhu cau cua ban.',
        recommendedDocuments: [],
        sources: [],
      };
    }

    const context = results
      .map((item, index) => {
        return `
Nguon ${index + 1}
Ten tai lieu: ${item.title}
Mon hoc: ${item.subject}
Chu de: ${item.topic || 'Khong ro'}
Trinh do: ${item.level || 'Khong ro'}
Gia: ${item.priceType}${item.price ? ` - ${item.price}` : ''}
Do phu hop: ${Number(item.similarity).toFixed(3)}
Noi dung:
${item.content}
`;
      })
      .join('\n---\n');

    const answer = await this.openAiService.generateAnswer(dto.message, context);

    return {
      answer,
      recommendedDocuments: this.groupRecommendations(results),
      sources: results.map((item) => ({
        documentTitle: item.title,
        subject: item.subject,
        topic: item.topic,
        level: item.level,
        priceType: item.priceType,
        similarity: Number(item.similarity),
        preview: item.content.slice(0, 300),
      })),
    };
  }

  private addIlikeFilter(
    filters: string[],
    params: string[],
    column: string,
    value?: string,
  ) {
    if (!value) {
      return;
    }

    params.push(`%${value}%`);
    filters.push(`${column} ILIKE $${params.length}`);
  }

  private groupRecommendations(results: RetrievedChunk[]) {
    const map = new Map<string, RetrievedChunk>();

    for (const item of results) {
      if (!map.has(item.title)) {
        map.set(item.title, item);
      }
    }

    return Array.from(map.values()).map((item) => ({
      title: item.title,
      subject: item.subject,
      topic: item.topic,
      level: item.level,
      priceType: item.priceType,
      price: item.price,
      similarity: Number(item.similarity),
    }));
  }
}
