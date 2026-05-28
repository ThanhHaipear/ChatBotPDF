import { Injectable } from '@nestjs/common';

export type RerankInput = {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  similarity?: number;
};

export type RerankOutput = RerankInput & {
  rerankScore: number;
};

@Injectable()
export class RerankService {
  private readonly apiKey = process.env.HUGGINGFACE_API_KEY;
  private readonly rerankModel =
    process.env.HUGGINGFACE_RERANK_MODEL || 'BAAI/bge-reranker-base';

  async rerank(query: string, chunks: RerankInput[]): Promise<RerankOutput[]> {
    if (chunks.length === 0) {
      return [];
    }

    const scores = await this.tryHuggingFaceRerank(query, chunks);

    if (!scores) {
      return chunks.map((chunk, index) => ({
        ...chunk,
        rerankScore: Number(chunk.similarity ?? 1 / (index + 1)),
      }));
    }

    return chunks
      .map((chunk, index) => ({
        ...chunk,
        rerankScore: Number(scores[index] ?? chunk.similarity ?? 0),
      }))
      .sort((left, right) => right.rerankScore - left.rerankScore);
  }

  private async tryHuggingFaceRerank(
    query: string,
    chunks: RerankInput[],
  ): Promise<number[] | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.rerankModel}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: {
              source_sentence: query,
              sentences: chunks.map((chunk) => chunk.content),
            },
            options: {
              wait_for_model: true,
            },
          }),
        },
      );

      if (!response.ok) {
        return null;
      }

      return this.parseScores(await response.json());
    } catch {
      return null;
    }
  }

  private parseScores(data: unknown): number[] | null {
    if (!Array.isArray(data)) {
      return null;
    }

    if (data.every((item) => typeof item === 'number')) {
      return data;
    }

    const scores = data
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'score' in item) {
          const score = (item as { score?: unknown }).score;
          return typeof score === 'number' ? score : null;
        }

        if (Array.isArray(item)) {
          const firstScoredItem = item.find(
            (candidate) =>
              typeof candidate === 'object' &&
              candidate !== null &&
              typeof (candidate as { score?: unknown }).score === 'number',
          ) as { score: number } | undefined;

          return firstScoredItem?.score ?? null;
        }

        return null;
      })
      .filter((score): score is number => typeof score === 'number');

    return scores.length === data.length ? scores : null;
  }
}
