import { Injectable, InternalServerErrorException } from '@nestjs/common';

type FeatureExtractionResponse = number[] | number[][] | number[][][];

@Injectable()
export class HuggingFaceService {
  private readonly apiKey = process.env.HUGGINGFACE_API_KEY;
  private readonly embeddingModel =
    process.env.HUGGINGFACE_EMBEDDING_MODEL || 'BAAI/bge-m3';

  async createEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'HUGGINGFACE_API_KEY is not configured',
      );
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.embeddingModel}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          options: {
            wait_for_model: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new InternalServerErrorException(
        `Hugging Face embedding request failed: ${message}`,
      );
    }

    const data = (await response.json()) as FeatureExtractionResponse;
    const embedding = this.normalizeEmbeddingResponse(data);

    if (embedding.length === 0) {
      throw new InternalServerErrorException(
        'Hugging Face returned an empty embedding',
      );
    }

    return embedding;
  }

  private normalizeEmbeddingResponse(data: FeatureExtractionResponse): number[] {
    if (this.isNumberArray(data)) {
      return data;
    }

    if (Array.isArray(data) && data.length > 0 && this.isNumberArray(data[0])) {
      return this.meanPool(data as number[][]);
    }

    if (
      Array.isArray(data) &&
      data.length > 0 &&
      Array.isArray(data[0]) &&
      data[0].length > 0 &&
      this.isNumberArray(data[0][0])
    ) {
      return this.meanPool(data[0] as number[][]);
    }

    return [];
  }

  private meanPool(vectors: number[][]): number[] {
    const dimensions = vectors[0]?.length || 0;
    const pooled = Array.from({ length: dimensions }, () => 0);

    for (const vector of vectors) {
      for (let i = 0; i < dimensions; i++) {
        pooled[i] += vector[i] || 0;
      }
    }

    return pooled.map((value) => value / vectors.length);
  }

  private isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'number');
  }
}
