import { Injectable, InternalServerErrorException } from '@nestjs/common';

type FeatureExtractionResponse = number[] | number[][] | number[][][];

@Injectable()
export class HuggingFaceService {
  private readonly apiKey = process.env.HUGGINGFACE_API_KEY;
  private readonly apiBaseUrl = (
    process.env.HUGGINGFACE_API_BASE_URL ||
    'https://router.huggingface.co/hf-inference'
  ).replace(/\/$/, '');
  private readonly embeddingModel =
    process.env.HUGGINGFACE_EMBEDDING_MODEL || 'BAAI/bge-m3';
  private readonly embeddingDimensions = Number(
    process.env.HUGGINGFACE_EMBEDDING_DIMENSIONS || 1024,
  );
  private readonly embeddingFallback =
    process.env.HUGGINGFACE_EMBEDDING_FALLBACK || 'none';

  async createEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      if (this.embeddingFallback === 'hashing') {
        return this.createHashingEmbedding(text);
      }

      throw new InternalServerErrorException(
        'HUGGINGFACE_API_KEY is not configured',
      );
    }

    const endpoint = `${this.apiBaseUrl}/models/${this.embeddingModel}`;
    const response = await this.fetchEmbedding(endpoint, text);

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

  private async fetchEmbedding(endpoint: string, text: string) {
    try {
      return await fetch(endpoint, {
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
      });
    } catch (error) {
      if (this.embeddingFallback === 'hashing') {
        return new Response(JSON.stringify(this.createHashingEmbedding(text)), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      throw new InternalServerErrorException(
        `Cannot reach Hugging Face embedding endpoint ${endpoint}: ${this.getErrorMessage(error)}`,
      );
    }
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

  private createHashingEmbedding(text: string): number[] {
    const vector = Array.from({ length: this.embeddingDimensions }, () => 0);
    const tokens = text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 1);

    for (const token of tokens) {
      const index = this.positiveHash(token) % this.embeddingDimensions;
      vector[index] += 1;
    }

    const norm = Math.sqrt(
      vector.reduce((total, value) => total + value * value, 0),
    );

    if (norm === 0) {
      return vector;
    }

    return vector.map((value) => value / norm);
  }

  private positiveHash(value: string) {
    let hash = 2166136261;

    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      const cause =
        typeof error.cause === 'object' &&
        error.cause !== null &&
        'message' in error.cause
          ? String((error.cause as { message?: unknown }).message)
          : '';

      return cause ? `${error.message}: ${cause}` : error.message;
    }

    return 'Unknown error';
  }
}
