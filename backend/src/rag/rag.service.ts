import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../openai/openai.service';

type PromptTemplateLike = {
  format(input: Record<string, string>): Promise<string>;
};

@Injectable()
export class RagService {
  constructor(private readonly openAiService: OpenAiService) {}

  async generateAnswer(question: string, context: string): Promise<string> {
    const prompt = await this.formatPrompt(question, context);
    return this.openAiService.generateFromPrompt(prompt);
  }

  async formatContext(
    chunks: Array<{
      content: string;
      metadata?: Record<string, unknown>;
      similarity?: number;
      rerankScore?: number;
    }>,
  ): Promise<string> {
    return chunks
      .map((item, index) => {
        const metadata = item.metadata || {};

        return `
Nguon ${index + 1}
Ten tai lieu: ${metadata.title || 'Khong ro'}
Mon hoc: ${metadata.subject || 'Khong ro'}
Chu de: ${metadata.topic || 'Khong ro'}
Trinh do: ${metadata.level || 'Khong ro'}
Gia: ${metadata.priceType || 'Khong ro'}${metadata.price ? ` - ${metadata.price}` : ''}
Do phu hop vector: ${Number(item.similarity ?? 0).toFixed(3)}
Diem rerank: ${Number(item.rerankScore ?? 0).toFixed(3)}
Noi dung:
${item.content}
`;
      })
      .join('\n---\n');
  }

  private async formatPrompt(question: string, context: string): Promise<string> {
    const template = `
Ban la StudyDocs AI, chatbot goi y tai lieu hoc tap.

Nhiem vu:
1. Tra loi dung nhu cau hoc cua nguoi dung.
2. Chi de xuat tai lieu co trong context.
3. Giai thich vi sao tai lieu phu hop.
4. Neu context khong du, hay noi ro la chua co du tai lieu phu hop.
5. Tra loi bang tieng Viet, ngan gon, de hieu.

Context:
{context}

Cau hoi cua nguoi dung:
{question}
`;

    const promptTemplate = await this.tryCreateLangChainPrompt(template);

    if (promptTemplate) {
      return promptTemplate.format({ question, context });
    }

    return template
      .replace('{context}', context)
      .replace('{question}', question);
  }

  private async tryCreateLangChainPrompt(
    template: string,
  ): Promise<PromptTemplateLike | null> {
    try {
      const dynamicImport = new Function(
        'specifier',
        'return import(specifier)',
      ) as (specifier: string) => Promise<{ PromptTemplate: unknown }>;
      const module = await dynamicImport('@langchain/core/prompts');
      const PromptTemplate = module.PromptTemplate as {
        fromTemplate(template: string): PromptTemplateLike;
      };

      return PromptTemplate.fromTemplate(template);
    } catch {
      return null;
    }
  }
}
