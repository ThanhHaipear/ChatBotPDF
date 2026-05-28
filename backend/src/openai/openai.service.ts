import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createEmbedding(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  }

  async generateFromPrompt(prompt: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    const response = await this.openai.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
    });

    return response.output_text;
  }

  async generateAnswer(userQuestion: string, context: string): Promise<string> {
    const prompt = `
Ban la StudyDocs AI, chatbot goi y tai lieu hoc tap.

Nhiem vu:
1. Tra loi dung nhu cau hoc cua nguoi dung.
2. Chi de xuat tai lieu co trong context.
3. Giai thich vi sao tai lieu phu hop.
4. Neu context khong du, hay noi ro la chua co du tai lieu phu hop.
5. Tra loi bang tieng Viet, ngan gon, de hieu.

Context:
${context}

Cau hoi cua nguoi dung:
${userQuestion}
`;

    return this.generateFromPrompt(prompt);
  }
}
