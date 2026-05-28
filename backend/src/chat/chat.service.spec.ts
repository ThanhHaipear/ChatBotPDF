import { ChatService } from './chat.service';

describe('ChatService', () => {
  afterEach(() => {
    delete process.env.RAG_VECTOR_TOP_K;
    delete process.env.RAG_RERANK_TOP_K;
  });

  it('returns an empty recommendation response when no chunks match', async () => {
    const service = new ChatService(
      {
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      } as any,
      {
        createEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]),
      } as any,
      {
        rerank: jest.fn(),
      } as any,
      {
        formatContext: jest.fn(),
        generateAnswer: jest.fn(),
      } as any,
    );

    await expect(service.chat({ message: 'find documents' })).resolves.toEqual({
      answer: 'Hien chua co tai lieu phu hop voi nhu cau cua ban.',
      recommendedDocuments: [],
      sources: [],
    });
  });

  it('retrieves top 20 chunks, reranks them, and uses top 5 for context', async () => {
    process.env.RAG_VECTOR_TOP_K = '20';
    process.env.RAG_RERANK_TOP_K = '5';

    const retrieved = Array.from({ length: 6 }, (_, index) => ({
      id: `chunk-${index + 1}`,
      content: `content ${index + 1}`,
      title: index < 3 ? 'AI Basics' : 'AI Advanced',
      subject: 'AI',
      topic: 'RAG',
      level: 'Beginner',
      priceType: 'FREE',
      price: null,
      similarity: 0.9 - index * 0.05,
    }));
    const reranked = [...retrieved].reverse().map((item, index) => ({
      id: item.id,
      content: item.content,
      similarity: item.similarity,
      metadata: {
        title: item.title,
        subject: item.subject,
        topic: item.topic,
        level: item.level,
        priceType: item.priceType,
        price: item.price,
      },
      rerankScore: 1 - index * 0.1,
    }));
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue(retrieved),
    };
    const huggingFaceService = {
      createEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
    const rerankService = {
      rerank: jest.fn().mockResolvedValue(reranked),
    };
    const ragService = {
      formatContext: jest.fn().mockResolvedValue('formatted context'),
      generateAnswer: jest.fn().mockResolvedValue('grounded answer'),
    };
    const service = new ChatService(
      prisma as any,
      huggingFaceService as any,
      rerankService as any,
      ragService as any,
    );

    const response = await service.chat({
      message: 'what should I read?',
      subject: 'AI',
      topic: 'RAG',
      level: 'Beginner',
      priceType: 'FREE',
    });

    expect(huggingFaceService.createEmbedding).toHaveBeenCalledWith(
      'what should I read?',
    );
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $6'),
      '[0.1,0.2,0.3]',
      '%AI%',
      '%RAG%',
      '%Beginner%',
      'FREE',
      20,
    );
    expect(rerankService.rerank).toHaveBeenCalledWith(
      'what should I read?',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'chunk-1',
          metadata: expect.objectContaining({ title: 'AI Basics' }),
        }),
      ]),
    );
    expect(ragService.formatContext).toHaveBeenCalledWith(reranked.slice(0, 5));
    expect(ragService.generateAnswer).toHaveBeenCalledWith(
      'what should I read?',
      'formatted context',
    );
    expect(response.answer).toBe('grounded answer');
    expect(response.sources).toHaveLength(5);
    expect(response.sources[0]).toEqual(
      expect.objectContaining({
        documentTitle: 'AI Advanced',
        rerankScore: 1,
      }),
    );
    expect(response.recommendedDocuments).toHaveLength(2);
  });
});
