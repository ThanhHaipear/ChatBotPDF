import { RerankService } from './rerank.service';

describe('RerankService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.HUGGINGFACE_API_KEY;
  });

  it('keeps vector order and exposes similarity as rerankScore without an API key', async () => {
    const service = new RerankService();

    const results = await service.rerank('machine learning', [
      { id: 'chunk-1', content: 'first', similarity: 0.82 },
      { id: 'chunk-2', content: 'second', similarity: 0.75 },
    ]);

    expect(results).toEqual([
      { id: 'chunk-1', content: 'first', similarity: 0.82, rerankScore: 0.82 },
      { id: 'chunk-2', content: 'second', similarity: 0.75, rerankScore: 0.75 },
    ]);
  });

  it('sorts chunks by Hugging Face rerank scores when scores are returned', async () => {
    process.env.HUGGINGFACE_API_KEY = 'token';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [0.12, 0.91, 0.44],
    } as Response);

    const service = new RerankService();

    const results = await service.rerank('biology', [
      { id: 'chunk-1', content: 'low' },
      { id: 'chunk-2', content: 'high' },
      { id: 'chunk-3', content: 'middle' },
    ]);

    expect(results.map((item) => item.id)).toEqual([
      'chunk-2',
      'chunk-3',
      'chunk-1',
    ]);
    expect(results.map((item) => item.rerankScore)).toEqual([0.91, 0.44, 0.12]);
  });

  it('falls back to similarity if Hugging Face returns an unsupported payload', async () => {
    process.env.HUGGINGFACE_API_KEY = 'token';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'unsupported' }),
    } as Response);

    const service = new RerankService();

    const results = await service.rerank('history', [
      { id: 'chunk-1', content: 'first', similarity: 0.7 },
      { id: 'chunk-2', content: 'second', similarity: 0.4 },
    ]);

    expect(results.map((item) => item.rerankScore)).toEqual([0.7, 0.4]);
  });
});
