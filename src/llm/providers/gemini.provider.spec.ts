import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiProvider,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'GOOGLE_API_KEY') {
                return process.env.GOOGLE_API_KEY || 'test-key';
              }
              throw new Error(`Config key ${key} not found`);
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<GeminiProvider>(GeminiProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
    expect(provider.name).toBe('gemini');
  });

  it('should generate simple JSON response', async () => {
    const simpleSchema = {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        confidence: { type: 'number' },
      },
      required: ['answer', 'confidence'],
    };

    try {
      const result = await provider.generateStructured({
        systemPrompt: 'You are a helpful assistant. Always respond with valid JSON.',
        userPrompt: 'What is 2 + 2? Respond with {"answer": "...", "confidence": 0.95}',
        jsonSchema: simpleSchema,
      });

      console.log('✓ Simple response:', result);
      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('confidence');
    } catch (error) {
      console.error('✗ Error:', error.message);
      throw error;
    }
  });

  it('should generate complex recommendation-like response', async () => {
    const complexSchema = {
      type: 'object',
      properties: {
        goalSummary: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              order: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['order', 'title', 'description'],
          },
        },
      },
      required: ['goalSummary', 'steps'],
    };

    try {
      const result = await provider.generateStructured({
        systemPrompt: 'You are an educational advisor. Create a learning plan with 2 steps.',
        userPrompt: 'Create a plan to learn web development',
        jsonSchema: complexSchema,
      });

      console.log('✓ Complex response:', JSON.stringify(result, null, 2));
      expect(result).toHaveProperty('goalSummary');
      expect(result).toHaveProperty('steps');
      expect(Array.isArray(result.steps)).toBe(true);
    } catch (error) {
      console.error('✗ Error:', error.message);
      throw error;
    }
  });
});
