import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationPlan } from './types/recommendation-plan.type';
import { randomUUID } from 'crypto';

interface PlaylistData {
  id: string;
  title: string;
  description?: string | null;
  videoCount: number;
  category?: {
    label: string;
  } | null;
}

// **POURQUOI ce schema:**
// Gemini rejette les types complexes comme type: ['object', 'null']
// Solution: fallbackPlaylist est optionnel (nullable), donc pas dans required
// Si aucune vidéo trouvée, Gemini doit inclure fallbackPlaylist
const RECOMMENDATION_SCHEMA = {
  type: 'object',
  properties: {
    goalSummary: { type: 'string' },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          videoId: { type: 'string' },
          title: { type: 'string' },
          playlistTitle: { type: 'string' },
          whyRelevant: { type: 'string' },
          axes: { type: 'array', items: { type: 'string' } },
        },
        required: ['videoId', 'title', 'playlistTitle', 'whyRelevant', 'axes'],
      },
    },
    fallbackPlaylist: {
      type: 'object',
      properties: {
        playlistId: { type: 'string' },
        title: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['playlistId', 'title'],
    },
  },
  required: ['goalSummary', 'recommendations'],
};

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private llmService: LlmService,
    private catalogService: CatalogService,
    private prisma: PrismaService,
  ) {}

  /**
   * **POURQUOI cette méthode:**
   * Construit un catalogue détaillé vidéo-par-vidéo au lieu de playlist-par-playlist
   * Gemini peut ainsi recommander des vidéos SPÉCIFIQUES avec titre exact et contexte
   *
   * **Logique:**
   * - Charger toutes les vidéos depuis la DB
   * - Grouper par playlist
   * - Créer un format lisible pour Gemini: "video-id | titre | description"
   */
  private async buildVideoCatalog(playlists: any[]) {
    const allVideos = await this.prisma.video.findMany({
      include: { playlist: { include: { category: true } } },
    });

    this.logger.debug(`[buildVideoCatalog] Loaded ${allVideos.length} total videos`);

    const summary = allVideos
      .map(
        v =>
          `- ID: ${v.id} | "${v.title}" (playlist: ${v.playlist.title}, catégorie: ${v.playlist.category?.label})\n  Description: ${v.description || 'Pas de description'}`,
      )
      .join('\n');

    return {
      videos: allVideos,
      playlists,
      summary,
    };
  }

  async recommend(goalText: string, sessionId: string): Promise<{
    plan: RecommendationPlan;
    providerUsed: string;
    fallbackUsed: boolean;
  }> {
    this.logger.debug(`[recommend] Starting for goal: "${goalText.substring(0, 30)}..."`);

    try {
      // **POURQUOI:** Charger les vidéos individuelles, pas juste les playlists
      // Gemini ne peut recommander que ce qu'on lui donne. Sans les vidéos, impossible d'être spécifique
      const allPlaylists = await this.catalogService.getPlaylists();
      this.logger.debug(`[recommend] Loaded ${allPlaylists.length} playlists`);

      // **POURQUOI:** Charger toutes les vidéos de toutes les playlists
      // On construit un catalogue détaillé avec titre + description de chaque vidéo
      const videoCatalog = await this.buildVideoCatalog(allPlaylists);
      this.logger.debug(`[recommend] Built video catalog with ${videoCatalog.videos.length} videos`);

      const catalogSummary = videoCatalog.summary;

      this.logger.debug(`[recommend] Catalog summary length: ${catalogSummary.length}`);

      // **POURQUOI ce nouveau prompt:**
      // On demande des VIDÉOS spécifiques, pas des playlists
      // Gemini doit retourner l'ID exact de la vidéo ET justifier pourquoi
      // Fallback sur playlist SEULEMENT si < 2 vidéos trouvées
      const systemPrompt = `Tu es un conseiller pédagogique expert en technologies. L'utilisateur te décrit son objectif d'apprentissage.
RECOMMANDE DES VIDÉOS SPÉCIFIQUES du catalogue ci-dessous. Une vidéo par ligne, avec son ID exact.

RÈGLES ABSOLUES:
1. **VIDÉOS D'ABORD:** Cherche 3-5 vidéos EXACTES qui correspondent à l'objectif
2. Copie l'ID DE VIDÉO exact du catalogue (UUID comme "a1b2c3d4-...")
3. Pour CHAQUE vidéo recommandée, fournis EXACTEMENT ces champs:
   - videoId: UUID exact de la vidéo du catalogue
   - title: Titre exact de la vidéo
   - playlistTitle: Nom de la playlist qui la contient
   - whyRelevant: Pourquoi cette vidéo répond à l'objectif (spécifique, JAMAIS générique, min 20 caractères)
   - axes: Les 2-3 concepts clés exacts que tu apprendras (comme ["JWT", "CORS", "Guards"])
4. Si tu trouves ZÉRO ou UNE SEULE vidéo pertinente:
   - Inclus fallbackPlaylist avec la playlist qui la contient
   - Format: {"playlistId": "...", "title": "...", "reason": "..."}
5. Ne renvoie JAMAIS d'IDs qui ne sont pas dans le catalogue.

CATALOGUE COMPLET (VIDÉOS):
${catalogSummary}

Retourne UNIQUEMENT JSON valide:
{
  "goalSummary": "Résumé clair de l'objectif en 1-2 phrases",
  "recommendations": [
    {
      "videoId": "EXACT_UUID_FROM_CATALOG",
      "title": "Titre exact de la vidéo",
      "playlistTitle": "Nom de la playlist",
      "whyRelevant": "Explication spécifique pourquoi cette vidéo",
      "axes": ["concept-1", "concept-2"]
    }
  ]
}`;

      const userPrompt = `Objectif: ${goalText}`;

      this.logger.debug(`[recommend] Calling LLM service...`);
      const { response, providerUsed, fallbackUsed } =
        await this.llmService.generateStructured<RecommendationPlan>({
          systemPrompt,
          userPrompt,
          jsonSchema: RECOMMENDATION_SCHEMA,
        });

      this.logger.debug(`[recommend] LLM response received (provider: ${providerUsed})`);
      this.logger.debug(`[recommend] Recommendations count: ${response.recommendations?.length}`);

      await this.validateRecommendationPlan(response, videoCatalog);

      this.logger.debug(`[recommend] Validation passed, saving to DB...`);

      await this.prisma.recommendationRequest.create({
        data: {
          sessionId: sessionId || randomUUID(),
          goalText,
          llmProvider: providerUsed,
          llmModel: this.getLlmModel(providerUsed),
          responseJson: response as any,
          fallbackUsed,
        },
      });

      this.logger.debug(
        `[recommend] Successfully saved recommendation (provider: ${providerUsed}, fallback: ${fallbackUsed})`,
      );

      return { plan: response, providerUsed, fallbackUsed };
    } catch (error) {
      this.logger.error(`[recommend] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * **POURQUOI cette nouvelle validation:**
   * - Avant: validait les playlists
   * - Maintenant: valide les VIDÉOS recommandées
   * - Vérifie que les videoIds existent dans le catalogue
   * - Applique fallback si < 2 vidéos trouvées
   */
  private async validateRecommendationPlan(
    plan: RecommendationPlan,
    videoCatalog: any,
  ) {
    const videoIds = new Set(videoCatalog.videos.map((v: any) => v.id));
    const playlistIds = new Set(videoCatalog.playlists.map((p: any) => p.id));

    if (!plan.recommendations || plan.recommendations.length === 0) {
      throw new BadRequestException('Recommendation must contain at least one video');
    }

    // Valider chaque vidéo recommandée
    for (let i = 0; i < plan.recommendations.length; i++) {
      const rec = plan.recommendations[i];

      if (!videoIds.has(rec.videoId)) {
        throw new BadRequestException(`Invalid videoId: ${rec.videoId} (not in catalog)`);
      }

      if (!rec.title || rec.title.trim().length < 5) {
        throw new BadRequestException(`Video title too short at index ${i}`);
      }

      if (!rec.whyRelevant || rec.whyRelevant.length < 20) {
        throw new BadRequestException(`whyRelevant must be at least 20 chars at index ${i}`);
      }

      if (!Array.isArray(rec.axes) || rec.axes.length === 0) {
        throw new BadRequestException(`axes must be non-empty at index ${i}`);
      }
    }

    // **POURQUOI on ignore les fallback invalides:**
    // Si Gemini ne trouve pas exactement le bon playlistId (UUID), on log seulement
    // Les vidéos recommandées sont déjà valides, le fallback est optionnel
    if (plan.fallbackPlaylist) {
      if (!playlistIds.has(plan.fallbackPlaylist.playlistId)) {
        this.logger.warn(
          `[validateRecommendationPlan] Fallback playlist ID "${plan.fallbackPlaylist.playlistId}" not found in catalog, ignoring fallback`,
        );
        plan.fallbackPlaylist = null;
      } else if (!plan.fallbackPlaylist.title || plan.fallbackPlaylist.title.length < 3) {
        this.logger.warn('[validateRecommendationPlan] Fallback playlist title too short, ignoring fallback');
        plan.fallbackPlaylist = null;
      }
    }

    this.logger.debug(
      `[validateRecommendationPlan] Validation passed: ${plan.recommendations.length} videos, fallback: ${plan.fallbackPlaylist ? 'yes' : 'no'}`,
    );
  }

  private getLlmModel(provider: string): string {
    const models: Record<string, string> = {
      gemini: 'gemini-2.5-flash',
      anthropic: 'claude-3-5-sonnet-20241022',
      openai: 'gpt-4o-mini',
    };
    return models[provider] || 'unknown';
  }
}
