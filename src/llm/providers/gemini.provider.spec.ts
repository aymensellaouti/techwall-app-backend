import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';

/**
 * **POURQUOI on mocke le SDK:**
 * L'ancienne version faisait un VRAI appel réseau à Gemini (clé + quota + réseau),
 * donc `npm test` échouait hors-ligne ou sans clé valide. On mocke @google/generative-ai
 * pour un test unitaire déterministe qui valide la logique du provider (parsing JSON,
 * gestion d'erreur), pas la disponibilité de l'API.
 */
const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(async () => {
    mockGenerateContent.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiProvider,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('fake-key-for-tests') },
        },
      ],
    }).compile();

    provider = module.get<GeminiProvider>(GeminiProvider);
  });

  it('should be defined with name "gemini"', () => {
    expect(provider).toBeDefined();
    expect(provider.name).toBe('gemini');
  });

  it('parse et retourne le JSON renvoyé par le modèle', async () => {
    const payload = { answer: '4', confidence: 0.95 };
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(payload) },
    });

    const result = await provider.generateStructured({
      systemPrompt: 'Assistant JSON',
      userPrompt: 'Combien font 2 + 2 ?',
      jsonSchema: { type: 'object' },
    });

    expect(result).toEqual(payload);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('gère une réponse structurée complexe (objet imbriqué + tableau)', async () => {
    const payload = {
      goalSummary: 'Apprendre le web',
      steps: [{ order: 1, title: 'HTML', description: 'Bases du HTML' }],
    };
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(payload) },
    });

    const result = await provider.generateStructured<typeof payload>({
      systemPrompt: 'Conseiller pédagogique',
      userPrompt: 'Plan pour apprendre le web',
      jsonSchema: { type: 'object' },
    });

    expect(result.goalSummary).toBe('Apprendre le web');
    expect(Array.isArray(result.steps)).toBe(true);
    expect(result.steps[0].title).toBe('HTML');
  });

  it('encapsule les erreurs du SDK dans une Error "Gemini error: ..."', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API key not valid'));

    await expect(
      provider.generateStructured({ systemPrompt: 's', userPrompt: 'u', jsonSchema: {} }),
    ).rejects.toThrow('Gemini error: API key not valid');
  });
});
