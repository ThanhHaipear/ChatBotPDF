import { HuggingFaceService } from './huggingface.service';

describe('HuggingFaceService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.HUGGINGFACE_API_KEY;
    delete process.env.HUGGINGFACE_EMBEDDING_FALLBACK;
    delete process.env.HUGGINGFACE_EMBEDDING_DIMENSIONS;
  });

  it('creates a deterministic local embedding when hashing fallback is enabled', async () => {
    process.env.HUGGINGFACE_EMBEDDING_FALLBACK = 'hashing';
    process.env.HUGGINGFACE_EMBEDDING_DIMENSIONS = '1024';
    global.fetch = jest.fn().mockRejectedValue(new Error('network blocked'));

    const service = new HuggingFaceService();
    const first = await service.createEmbedding('Vietnamese AI document');
    const second = await service.createEmbedding('Vietnamese AI document');

    expect(first).toHaveLength(1024);
    expect(first).toEqual(second);
    expect(first.some((value) => value !== 0)).toBe(true);
  });
});
