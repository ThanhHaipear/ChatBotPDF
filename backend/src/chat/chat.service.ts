import { Injectable } from '@nestjs/common';
import { HuggingFaceService } from '../huggingface/huggingface.service';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { RerankService } from '../rerank/rerank.service';
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
    private readonly huggingFaceService: HuggingFaceService,
    private readonly rerankService: RerankService,
    private readonly ragService: RagService,
  ) {}

  async chat(dto: ChatDto) {
    const vectorTopK = Number(process.env.RAG_VECTOR_TOP_K || 20);
    const rerankTopK = Number(process.env.RAG_RERANK_TOP_K || 5);
    const queryEmbedding = await this.huggingFaceService.createEmbedding(
      dto.message,
    );
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    const params: Array<string | number> = [embeddingString];
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
      LIMIT $${params.length + 1}
    `,
      ...params,
      vectorTopK,
    );

    if (results.length === 0) {
      return {
        answer: 'Hien chua co tai lieu phu hop voi nhu cau cua ban.',
        recommendedDocuments: [],
        sources: [],
      };
    }

    const rerankedResults = await this.rerankService.rerank(
      dto.message,
      results.map((item) => ({
        id: item.id,
        content: item.content,
        similarity: Number(item.similarity),
        metadata: {
          title: item.title,
          subject: item.subject,
          topic: item.topic,
          level: item.level,
          priceType: item.priceType,
          price: item.price,
        },
      })),
    );
    const selectedResults = rerankedResults.slice(0, rerankTopK);
    const context = await this.ragService.formatContext(selectedResults);

    const answer = await this.ragService.generateAnswer(dto.message, context);

    return {
      answer,
      recommendedDocuments: this.groupRecommendations(selectedResults),
      sources: selectedResults.map((item) => ({
        documentTitle: String(item.metadata?.title || ''),
        subject: String(item.metadata?.subject || ''),
        topic: item.metadata?.topic || null,
        level: item.metadata?.level || null,
        priceType: String(item.metadata?.priceType || ''),
        similarity: Number(item.similarity),
        rerankScore: Number(item.rerankScore),
        preview: item.content.slice(0, 300),
      })),
    };
  }

  private addIlikeFilter(
    filters: string[],
    params: Array<string | number>,
    column: string,
    value?: string,
  ) {
    if (!value) {
      return;
    }

    params.push(`%${value}%`);
    filters.push(`${column} ILIKE $${params.length}`);
  }

  private groupRecommendations(
    results: Array<{
      metadata?: Record<string, unknown>;
      similarity?: number;
      rerankScore?: number;
    }>,
  ) {
    const map = new Map<string, (typeof results)[number]>();

    for (const item of results) {
      const title = String(item.metadata?.title || '');
      if (title && !map.has(title)) {
        map.set(title, item);
      }
    }

    return Array.from(map.values()).map((item) => ({
      title: item.metadata?.title,
      subject: item.metadata?.subject,
      topic: item.metadata?.topic,
      level: item.metadata?.level,
      priceType: item.metadata?.priceType,
      price: item.metadata?.price,
      similarity: Number(item.similarity),
      rerankScore: Number(item.rerankScore),
    }));
  }
}
