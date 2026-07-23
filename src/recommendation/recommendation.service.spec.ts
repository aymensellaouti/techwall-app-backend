import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { LlmService } from '../llm/llm.service';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationPlan } from './types/recommendation-plan.type';

/**
 * **POURQUOI ces tests:**
 * Le service recommande des VIDÉOS SPÉCIFIQUES (pas des playlists) et valide
 * que chaque videoId existe dans le catalogue chargé via prisma.video.findMany.
 * On mocke donc: le LLM (réponse structurée), le catalogue playlists, ET les
 * vidéos Prisma. Objectif: prouver la logique de reco + validation sans DB ni LLM réel.
 */
describe('RecommendationService', () => {
  let service: RecommendationService;
  let llmService: LlmService;
  let catalogService: CatalogService;
  let prisma: PrismaService;

  // Playlists du catalogue (pour la validation du fallbackPlaylist)
  const mockPlaylists = [
    { id: 'pl-angular', title: 'Angular 13', description: 'Framework frontend', videoCount: 54, category: { label: 'Développement Web' } },
    { id: 'pl-nestjs', title: 'NestJs 7', description: 'Backend Node', videoCount: 47, category: { label: 'Développement Web' } },
    { id: 'pl-hadoop', title: 'Hadoop & Compagnie', description: 'Big Data', videoCount: 21, category: { label: 'Big Data' } },
    { id: 'pl-spark', title: 'Atelier Spark', description: 'Spark', videoCount: 11, category: { label: 'Big Data' } },
  ];

  // Vidéos du catalogue (retournées par prisma.video.findMany)
  const mockVideos = [
    { id: 'vid-ng-guards', title: 'Angular : sécuriser une route avec les Guards', description: 'CanActivate, AuthGuard, protection de routes', playlist: { title: 'Angular 13', category: { label: 'Développement Web' } } },
    { id: 'vid-ng-interceptor', title: 'Angular : intercepteurs HTTP et JWT', description: 'HttpInterceptor, token JWT', playlist: { title: 'Angular 13', category: { label: 'Développement Web' } } },
    { id: 'vid-ng-rxjs', title: 'Angular : RxJS et Observables', description: 'Programmation réactive', playlist: { title: 'Angular 13', category: { label: 'Développement Web' } } },
    { id: 'vid-hadoop-hdfs', title: 'Hadoop : HDFS expliqué', description: 'Système de fichiers distribué', playlist: { title: 'Hadoop & Compagnie', category: { label: 'Big Data' } } },
    { id: 'vid-spark-rdd', title: 'Spark : les RDD', description: 'Resilient Distributed Datasets', playlist: { title: 'Atelier Spark', category: { label: 'Big Data' } } },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: LlmService, useValue: { generateStructured: jest.fn() } },
        { provide: CatalogService, useValue: { getPlaylists: jest.fn() } },
        {
          provide: PrismaService,
          useValue: {
            video: { findMany: jest.fn() },
            recommendationRequest: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    llmService = module.get<LlmService>(LlmService);
    catalogService = module.get<CatalogService>(CatalogService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.spyOn(catalogService, 'getPlaylists').mockResolvedValue(mockPlaylists as any);
    jest.spyOn(prisma.video, 'findMany').mockResolvedValue(mockVideos as any);
    jest.spyOn(prisma.recommendationRequest, 'create').mockResolvedValue({} as any);
  });

  const mockLlm = (plan: RecommendationPlan, providerUsed = 'gemini', fallbackUsed = false) =>
    jest.spyOn(llmService, 'generateStructured').mockResolvedValue({ response: plan, providerUsed, fallbackUsed });

  describe('Sécurisation de route Angular', () => {
    it('recommande les vidéos Guards/JWT pour un objectif de protection de route', async () => {
      const plan: RecommendationPlan = {
        goalSummary: 'Comprendre comment sécuriser une route Angular',
        recommendations: [
          {
            videoId: 'vid-ng-guards',
            title: 'Angular : sécuriser une route avec les Guards',
            playlistTitle: 'Angular 13',
            whyRelevant: 'Couvre exactement CanActivate et AuthGuard pour protéger une route Angular',
            axes: ['CanActivate', 'AuthGuard', 'Route protection'],
          },
          {
            videoId: 'vid-ng-interceptor',
            title: 'Angular : intercepteurs HTTP et JWT',
            playlistTitle: 'Angular 13',
            whyRelevant: 'Complète la sécurité en montrant comment attacher le token JWT aux requêtes',
            axes: ['HttpInterceptor', 'JWT'],
          },
        ],
        fallbackPlaylist: null,
      };
      mockLlm(plan);

      const result = await service.recommend('Sécuriser une route Angular avec les guards', 'sess-1');

      expect(result.plan.recommendations).toHaveLength(2);
      expect(result.plan.recommendations[0].videoId).toBe('vid-ng-guards');
      expect(result.plan.recommendations[0].axes).toContain('CanActivate');
      expect(result.providerUsed).toBe('gemini');
    });
  });

  describe('Parcours Big Data', () => {
    it('recommande HDFS puis RDD pour un objectif Hadoop/Spark', async () => {
      const plan: RecommendationPlan = {
        goalSummary: 'Apprendre le Big Data avec Hadoop et Spark',
        recommendations: [
          {
            videoId: 'vid-hadoop-hdfs',
            title: 'Hadoop : HDFS expliqué',
            playlistTitle: 'Hadoop & Compagnie',
            whyRelevant: 'Point de départ indispensable: le stockage distribué HDFS avant tout traitement',
            axes: ['HDFS', 'Stockage distribué'],
          },
          {
            videoId: 'vid-spark-rdd',
            title: 'Spark : les RDD',
            playlistTitle: 'Atelier Spark',
            whyRelevant: 'Étape suivante logique: le traitement distribué avec les RDD de Spark',
            axes: ['RDD', 'Spark'],
          },
        ],
        fallbackPlaylist: null,
      };
      mockLlm(plan, 'anthropic', false);

      const result = await service.recommend('Apprendre Big Data avec Hadoop et Spark', 'sess-2');

      expect(result.plan.recommendations.map(r => r.videoId)).toEqual(['vid-hadoop-hdfs', 'vid-spark-rdd']);
    });
  });

  describe('Chaîne de fallback LLM', () => {
    it('remonte providerUsed=anthropic et fallbackUsed=true quand Gemini échoue', async () => {
      const plan: RecommendationPlan = {
        goalSummary: 'Objectif test',
        recommendations: [
          {
            videoId: 'vid-ng-rxjs',
            title: 'Angular : RxJS et Observables',
            playlistTitle: 'Angular 13',
            whyRelevant: 'Vidéo pertinente avec une justification suffisamment longue pour la validation',
            axes: ['RxJS'],
          },
        ],
        fallbackPlaylist: null,
      };
      mockLlm(plan, 'anthropic', true);

      const result = await service.recommend('Un objectif quelconque', 'sess-3');

      expect(result.fallbackUsed).toBe(true);
      expect(result.providerUsed).toBe('anthropic');
    });
  });

  describe('Fallback playlist', () => {
    it('accepte un fallbackPlaylist valide présent dans le catalogue', async () => {
      const plan: RecommendationPlan = {
        goalSummary: 'Sujet rare',
        recommendations: [
          {
            videoId: 'vid-ng-guards',
            title: 'Angular : sécuriser une route avec les Guards',
            playlistTitle: 'Angular 13',
            whyRelevant: 'Seule vidéo proche du sujet, justification assez longue pour passer la validation',
            axes: ['Guards'],
          },
        ],
        fallbackPlaylist: { playlistId: 'pl-nestjs', title: 'NestJs 7', reason: 'Pour approfondir côté backend' },
      };
      mockLlm(plan);

      const result = await service.recommend('Un sujet peu couvert', 'sess-4');

      expect(result.plan.fallbackPlaylist?.playlistId).toBe('pl-nestjs');
    });

    it('ignore (met à null) un fallbackPlaylist dont l\'ID est absent du catalogue', async () => {
      const plan: RecommendationPlan = {
        goalSummary: 'Sujet rare',
        recommendations: [
          {
            videoId: 'vid-ng-guards',
            title: 'Angular : sécuriser une route avec les Guards',
            playlistTitle: 'Angular 13',
            whyRelevant: 'Seule vidéo proche du sujet, justification assez longue pour passer la validation',
            axes: ['Guards'],
          },
        ],
        fallbackPlaylist: { playlistId: 'pl-inexistante', title: 'Inconnue', reason: 'x' },
      };
      mockLlm(plan);

      const result = await service.recommend('Un sujet peu couvert', 'sess-5');

      expect(result.plan.fallbackPlaylist).toBeNull();
    });
  });

  describe('Validation des recommandations', () => {
    it('rejette une réponse sans aucune recommandation', async () => {
      mockLlm({ goalSummary: 'x', recommendations: [], fallbackPlaylist: null });
      await expect(service.recommend('Objectif', 'sess-6')).rejects.toThrow(BadRequestException);
    });

    it('rejette un videoId absent du catalogue', async () => {
      mockLlm({
        goalSummary: 'x',
        recommendations: [
          { videoId: 'vid-inexistante', title: 'Titre correct', playlistTitle: 'Angular 13', whyRelevant: 'Justification suffisamment longue pour la validation', axes: ['a'] },
        ],
        fallbackPlaylist: null,
      });
      await expect(service.recommend('Objectif', 'sess-7')).rejects.toThrow(BadRequestException);
    });

    it('rejette un whyRelevant trop court (< 20 caractères)', async () => {
      mockLlm({
        goalSummary: 'x',
        recommendations: [
          { videoId: 'vid-ng-guards', title: 'Titre correct', playlistTitle: 'Angular 13', whyRelevant: 'Trop court', axes: ['a'] },
        ],
        fallbackPlaylist: null,
      });
      await expect(service.recommend('Objectif', 'sess-8')).rejects.toThrow(BadRequestException);
    });

    it('rejette un tableau axes vide', async () => {
      mockLlm({
        goalSummary: 'x',
        recommendations: [
          { videoId: 'vid-ng-guards', title: 'Titre correct', playlistTitle: 'Angular 13', whyRelevant: 'Justification suffisamment longue pour la validation', axes: [] },
        ],
        fallbackPlaylist: null,
      });
      await expect(service.recommend('Objectif', 'sess-9')).rejects.toThrow(BadRequestException);
    });
  });
});
