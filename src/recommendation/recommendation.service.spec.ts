import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { LlmService } from '../llm/llm.service';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationPlan } from './types/recommendation-plan.type';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let llmService: LlmService;
  let catalogService: CatalogService;
  let prisma: PrismaService;

  const mockPlaylists = [
    {
      id: 'ang-1',
      title: 'Angular 22 Complet',
      description: 'Cours complet sur Angular 22 avec RxJS, routing, services',
      videoCount: 15,
      category: { label: 'Développement Web' },
    },
    {
      id: 'ang-auth',
      title: 'Angular Authentication & Guards',
      description: 'AuthGuard, CanActivate, JWT tokens, intercepteurs',
      videoCount: 8,
      category: { label: 'Développement Web' },
    },
    {
      id: 'vue-1',
      title: 'Vue 3 Basics',
      description: 'Introduction à Vue 3 et Composition API',
      videoCount: 10,
      category: { label: 'Développement Web' },
    },
    {
      id: 'react-1',
      title: 'React Modern Patterns',
      description: 'React hooks, context, performance optimization',
      videoCount: 12,
      category: { label: 'Développement Web' },
    },
    {
      id: 'bigdata-1',
      title: 'Big Data avec Hadoop',
      description: 'HDFS, MapReduce, Hadoop ecosystem',
      videoCount: 10,
      category: { label: 'Big Data' },
    },
    {
      id: 'spark-1',
      title: 'Apache Spark Deep Dive',
      description: 'Spark RDD, DataFrame, SQL, streaming',
      videoCount: 12,
      category: { label: 'Big Data' },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: LlmService,
          useValue: {
            generateStructured: jest.fn(),
          },
        },
        {
          provide: CatalogService,
          useValue: {
            getPlaylists: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            recommendationRequest: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    llmService = module.get<LlmService>(LlmService);
    catalogService = module.get<CatalogService>(CatalogService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.spyOn(catalogService, 'getPlaylists').mockResolvedValue(mockPlaylists);
    jest.spyOn(prisma.recommendationRequest, 'create').mockResolvedValue({} as any);
  });

  describe('Frontend Framework Learning', () => {
    it('should recommend Angular playlist for "learn frontend framework" goal', async () => {
      const mockPlan: RecommendationPlan = {
        goalSummary: 'Apprendre un framework frontend moderne',
        steps: [
          {
            order: 1,
            playlistId: 'ang-1',
            playlistTitle: 'Angular 22 Complet',
            recommendedVideoIds: ['video-1', 'video-2', 'video-3'],
            targetedAxes: [
              'RxJS Observables',
              'Component lifecycle',
              'Dependency injection',
              'Routing',
            ],
            whyThisChoice:
              'Angular est un framework complet et full-featured avec typage fort, parfait pour les applications d\'entreprise. Il offre une courbe d\'apprentissage structurée avec des patterns clairs.',
            whyNotOthers:
              'Vue est plus léger mais moins complet pour une formation complète. React se concentre sur la couche présentation et nécessite des librairies externes pour le routing et la gestion d\'état.',
            relevanceToGoal:
              'Directement orienté sur un framework frontend moderne que tu veux apprendre, avec une communauté large et beaucoup de ressources.',
          },
        ],
        overallRationale:
          'Commencer avec Angular 22 car c\'est actuellement l\'une des meilleures options pour un apprentissage progressif et complet en développement frontend.',
      };

      jest.spyOn(llmService, 'generateStructured').mockResolvedValue({
        response: mockPlan,
        providerUsed: 'gemini',
        fallbackUsed: false,
      });

      const result = await service.recommend(
        'Apprendre un framework frontend moderne',
        'sess-1',
      );

      expect(result.plan.steps[0].playlistId).toBe('ang-1');
      expect(result.plan.steps[0].targetedAxes).toContain('RxJS Observables');
      expect(result.plan.steps[0].whyThisChoice.length).toBeGreaterThan(50);
      expect(result.plan.steps[0].whyNotOthers.length).toBeGreaterThan(50);
      expect(result.providerUsed).toBe('gemini');
      expect(result.fallbackUsed).toBe(false);
    });
  });

  describe('Angular Route Security', () => {
    it('should recommend auth/guard-specific videos for route protection goal', async () => {
      const mockPlan: RecommendationPlan = {
        goalSummary: 'Comprendre comment sécuriser une route Angular',
        steps: [
          {
            order: 1,
            playlistId: 'ang-auth',
            playlistTitle: 'Angular Authentication & Guards',
            recommendedVideoIds: ['video-auth-1', 'video-auth-2', 'video-auth-3'],
            targetedAxes: [
              'AuthGuard implementation',
              'CanActivate interface',
              'JWT token handling',
              'Route protection patterns',
            ],
            whyThisChoice:
              'Cette playlist couvre spécifiquement les patterns de AuthGuard et de sécurité basée sur les tokens dans Angular. Elle explique comment implémenter CanActivate et protéger les routes de manière professionnelle.',
            whyNotOthers:
              'Le cours Angular Complet couvre les bases mais pas les détails de sécurité. Les autres frameworks comme Vue et React ont des approches différentes aux guards et ne sont pas pertinents pour Angular spécifiquement.',
            relevanceToGoal:
              'Directement orienté sur la protection des routes Angular qui est exactement ce que tu demandes, avec des exemples concrets de AuthGuard et JWT.',
          },
        ],
        overallRationale:
          'La playlist "Angular Authentication & Guards" adresse directement ta question sur la sécurisation des routes avec tous les détails pratiques que tu as besoin.',
      };

      jest.spyOn(llmService, 'generateStructured').mockResolvedValue({
        response: mockPlan,
        providerUsed: 'gemini',
        fallbackUsed: false,
      });

      const result = await service.recommend(
        'Je veux comprendre comment sécuriser une route Angular avec les guards',
        'sess-2',
      );

      expect(result.plan.steps[0].targetedAxes).toContain('AuthGuard implementation');
      expect(result.plan.steps[0].recommendedVideoIds.length).toBeGreaterThan(0);
      expect(result.plan.steps[0].whyThisChoice).toContain('AuthGuard');
    });
  });

  describe('Big Data Learning Path', () => {
    it('should recommend Hadoop and Spark for Big Data goal', async () => {
      const mockPlan: RecommendationPlan = {
        goalSummary: 'Apprendre Big Data avec Hadoop et Spark',
        steps: [
          {
            order: 1,
            playlistId: 'bigdata-1',
            playlistTitle: 'Big Data avec Hadoop',
            recommendedVideoIds: ['bd-1', 'bd-2', 'bd-3'],
            targetedAxes: ['HDFS fundamentals', 'MapReduce', 'Hadoop ecosystem'],
            whyThisChoice:
              'Hadoop est la fondation du Big Data moderne. Cette playlist couvre HDFS et MapReduce qui sont essentiels pour comprendre les architectures Big Data distribuées.',
            whyNotOthers:
              'Spark est plus moderne mais nécessite une compréhension de HDFS. Angular et Vue ne sont pas pertinents pour Big Data.',
            relevanceToGoal:
              'C\'est le premier pas logique dans ta formation Big Data, établissant les concepts fondamentaux de distribution et de traitement paralléle.',
          },
          {
            order: 2,
            playlistId: 'spark-1',
            playlistTitle: 'Apache Spark Deep Dive',
            recommendedVideoIds: ['spark-1', 'spark-2'],
            targetedAxes: ['Spark RDD', 'DataFrame', 'SQL on Spark', 'Streaming'],
            whyThisChoice:
              'Après maîtriser Hadoop, Spark te permet de traiter les données de manière plus efficace et avec une API plus haute niveau. C\'est la prochaine étape logique.',
            whyNotOthers:
              'Hadoop seul ne suffit pas pour apprendre le Big Data moderne. Spark est devenu le standard industriel pour le traitement de données à grande échelle.',
            relevanceToGoal:
              'Complète ta formation Big Data avec les outils modernes que tu veux apprendre, après avoir compris les fondations avec Hadoop.',
          },
        ],
        overallRationale:
          'Un parcours progressif de Big Data: commencer par les fondations Hadoop puis progresser vers Spark pour couvrir tout ce que tu veux apprendre.',
      };

      jest.spyOn(llmService, 'generateStructured').mockResolvedValue({
        response: mockPlan,
        providerUsed: 'anthropic',
        fallbackUsed: false,
      });

      const result = await service.recommend(
        'Apprendre Big Data avec Hadoop et Spark',
        'sess-3',
      );

      expect(result.plan.steps).toHaveLength(2);
      expect(result.plan.steps[0].playlistId).toBe('bigdata-1');
      expect(result.plan.steps[1].playlistId).toBe('spark-1');
    });
  });

  describe('Fallback Chain', () => {
    it('should use Anthropic when Gemini fails', async () => {
      const mockPlan: RecommendationPlan = {
        goalSummary: 'Test fallback',
        steps: [
          {
            order: 1,
            playlistId: 'ang-1',
            playlistTitle: 'Angular 22 Complet',
            recommendedVideoIds: ['v1'],
            targetedAxes: ['test'],
            whyThisChoice: 'This is a test recommendation with sufficient length to pass validation',
            whyNotOthers: 'Other options are not suitable for this specific scenario in context',
            relevanceToGoal: 'Directly relevant to the stated learning objective and goals',
          },
        ],
        overallRationale: 'Test rationale',
      };

      jest.spyOn(llmService, 'generateStructured').mockResolvedValue({
        response: mockPlan,
        providerUsed: 'anthropic',
        fallbackUsed: true,
      });

      const result = await service.recommend('Any goal', 'sess-4');

      expect(result.fallbackUsed).toBe(true);
      expect(result.providerUsed).toBe('anthropic');
    });
  });

  describe('Response Validation', () => {
    it('should reject whyThisChoice that is too short', async () => {
      const invalidPlan: RecommendationPlan = {
        goalSummary: 'Learn',
        steps: [
          {
            order: 1,
            playlistId: 'ang-1',
            playlistTitle: 'Angular',
            recommendedVideoIds: ['v1'],
            targetedAxes: ['ax1'],
            whyThisChoice: 'Short',
            whyNotOthers: 'This is a long enough explanation with sufficient character length',
            relevanceToGoal: 'This is a long enough explanation with sufficient character length',
          },
        ],
        overallRationale: 'test',
      };

      jest.spyOn(llmService, 'generateStructured').mockResolvedValue({
        response: invalidPlan,
        providerUsed: 'gemini',
        fallbackUsed: false,
      });

      await expect(service.recommend('Learn web', 'sess-5')).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid playlistId', async () => {
      const invalidPlan: RecommendationPlan = {
        goalSummary: 'Learn',
        steps: [
          {
            order: 1,
            playlistId: 'invalid-id-xyz',
            playlistTitle: 'Unknown',
            recommendedVideoIds: ['v1'],
            targetedAxes: ['ax1'],
            whyThisChoice: 'This is a long enough explanation with sufficient character length',
            whyNotOthers: 'This is a long enough explanation with sufficient character length',
            relevanceToGoal: 'This is a long enough explanation with sufficient character length',
          },
        ],
        overallRationale: 'test',
      };

      jest.spyOn(llmService, 'generateStructured').mockResolvedValue({
        response: invalidPlan,
        providerUsed: 'gemini',
        fallbackUsed: false,
      });

      await expect(service.recommend('Learn', 'sess-6')).rejects.toThrow(BadRequestException);
    });

    it('should reject empty recommendedVideoIds', async () => {
      const invalidPlan: RecommendationPlan = {
        goalSummary: 'Learn',
        steps: [
          {
            order: 1,
            playlistId: 'ang-1',
            playlistTitle: 'Angular',
            recommendedVideoIds: [],
            targetedAxes: ['ax1'],
            whyThisChoice: 'This is a long enough explanation with sufficient character length',
            whyNotOthers: 'This is a long enough explanation with sufficient character length',
            relevanceToGoal: 'This is a long enough explanation with sufficient character length',
          },
        ],
        overallRationale: 'test',
      };

      jest.spyOn(llmService, 'generateStructured').mockResolvedValue({
        response: invalidPlan,
        providerUsed: 'gemini',
        fallbackUsed: false,
      });

      await expect(service.recommend('Learn', 'sess-7')).rejects.toThrow(BadRequestException);
    });
  });
});
