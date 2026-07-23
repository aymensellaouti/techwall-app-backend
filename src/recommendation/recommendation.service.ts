import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationPlan } from './types/recommendation-plan.type';
import { mockVideos } from '../catalog/fixtures';
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

interface CacheEntry {
  value: { plan: RecommendationPlan; providerUsed: string; fallbackUsed: boolean };
  expiresAt: number;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  // **Cache en mémoire par objectif normalisé** (#2): évite de rappeler le LLM pour
  // des objectifs identiques/proches. Réduit coût, latence et variabilité des réponses.
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure
  private readonly CACHE_MAX = 200;

  constructor(
    private llmService: LlmService,
    private catalogService: CatalogService,
    private prisma: PrismaService,
  ) {}

  /**
   * **POURQUOI cette méthode:**
   * Construit un catalogue détaillé vidéo-par-vidéo pour que Gemini recommande des
   * vidéos SPÉCIFIQUES avec titre exact et contexte.
   *
   * **Pré-filtrage (important):**
   * On n'envoie PAS tout le catalogue (600+ vidéos) au LLM à chaque requête.
   * On pré-sélectionne les vidéos les plus pertinentes pour l'objectif (matching
   * mots-clés). Gain: coût tokens, latence, précision, et passage à l'échelle.
   * Le LLM ne peut recommander que parmi ces candidates (la validation le vérifie).
   */
  private async buildVideoCatalog(goalText: string, playlists: any[]) {
    let allVideos: any[];
    try {
      allVideos = await this.prisma.video.findMany({
        include: { playlist: { include: { category: true } } },
      });
    } catch (error) {
      // **POURQUOI:** En dev local sans DB, on retombe sur les vidéos fixtures
      // pour que la recommandation reste fonctionnelle et testable hors-ligne.
      this.logger.warn(
        `[buildVideoCatalog] Prisma unavailable (${error.message}), using fixture videos`,
      );
      allVideos = mockVideos;
    }

    const candidates = this.selectCandidateVideos(goalText, allVideos);
    this.logger.debug(
      `[buildVideoCatalog] ${allVideos.length} vidéos au total -> ${candidates.length} candidates envoyées au LLM`,
    );

    const summary = candidates
      .map(
        v =>
          `- ID: ${v.id} | "${v.title}" (playlist: ${v.playlist?.title}, catégorie: ${v.playlist?.category?.label})\n  Description: ${v.description || 'Pas de description'}`,
      )
      .join('\n');

    return {
      videos: candidates,
      playlists,
      summary,
    };
  }

  /**
   * Pré-sélection des vidéos candidates par pertinence à l'objectif.
   * Score = nombre de mots (>= 3 lettres) de l'objectif retrouvés dans le titre
   * (poids fort), la description, la playlist et la catégorie.
   * - On garde les mieux scorées jusqu'à MAX_CANDIDATES.
   * - Si trop peu matchent (objectif vague), on complète avec les plus vues pour
   *   toujours donner au LLM un pool suffisant.
   */
  private selectCandidateVideos(goalText: string, allVideos: any[]): any[] {
    const MAX_CANDIDATES = 40;
    const MIN_CANDIDATES = 12;

    if (allVideos.length <= MAX_CANDIDATES) return allVideos;

    const words = this.keywords(goalText);
    const byViews = (a: any, b: any) => (b.viewCount ?? 0) - (a.viewCount ?? 0);

    const scored = allVideos
      .map(v => ({ v, score: this.scoreVideo(v, words) }))
      .sort((a, b) => b.score - a.score || byViews(a.v, b.v));

    const matched = scored.filter(s => s.score > 0).map(s => s.v);

    let candidates = matched.slice(0, MAX_CANDIDATES);

    // Si trop peu de matchs, compléter avec les vidéos les plus vues (hors doublons)
    if (candidates.length < MIN_CANDIDATES) {
      const chosen = new Set(candidates.map(v => v.id));
      const fillers = [...allVideos]
        .sort(byViews)
        .filter(v => !chosen.has(v.id));
      candidates = candidates.concat(fillers).slice(0, MAX_CANDIDATES);
    }

    return candidates;
  }

  private scoreVideo(video: any, words: string[]): number {
    if (!words.length) return 0;
    const title = (video.title ?? '').toLowerCase();
    const desc = (video.description ?? '').toLowerCase();
    const playlist = (video.playlist?.title ?? '').toLowerCase();
    const category = (video.playlist?.category?.label ?? '').toLowerCase();
    let score = 0;
    for (const w of words) {
      if (title.includes(w)) score += 3;
      if (playlist.includes(w)) score += 2;
      if (category.includes(w)) score += 2;
      if (desc.includes(w)) score += 1;
    }
    return score;
  }

  /** Normalise l'objectif en mots-clés (minuscules, sans accents, >= 3 lettres). */
  private keywords(text: string): string[] {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/i)
      .filter(w => w.length >= 3);
  }

  /** Clé de cache: mots-clés triés, pour que "apprendre Angular" == "angular apprendre". */
  private cacheKey(goalText: string): string {
    return this.keywords(goalText).sort().join(' ');
  }

  private getCached(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCached(
    key: string,
    value: { plan: RecommendationPlan; providerUsed: string; fallbackUsed: boolean },
  ) {
    if (!key) return;
    // Éviction simple: si plein, on retire l'entrée la plus ancienne insérée
    if (this.cache.size >= this.CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL_MS });
  }

  async recommend(goalText: string, sessionId: string, history?: string): Promise<{
    plan: RecommendationPlan;
    providerUsed: string;
    fallbackUsed: boolean;
  }> {
    this.logger.debug(`[recommend] Starting for goal: "${goalText.substring(0, 30)}..."`);

    // **Cache (#2):** un objectif déjà traité récemment est resservi sans rappeler le LLM.
    // On NE met PAS en cache les requêtes avec historique (#3): la réponse dépend du
    // contexte de conversation, donc elle n'est ni réutilisable ni figeable.
    const useCache = !history;
    const cacheKey = this.cacheKey(goalText);
    if (useCache) {
      const cached = this.getCached(cacheKey);
      if (cached) {
        this.logger.debug('[recommend] Réponse servie depuis le cache');
        return cached;
      }
    }

    try {
      // **POURQUOI:** Charger les vidéos individuelles, pas juste les playlists
      // Gemini ne peut recommander que ce qu'on lui donne. Sans les vidéos, impossible d'être spécifique
      const allPlaylists = await this.catalogService.getPlaylists();
      this.logger.debug(`[recommend] Loaded ${allPlaylists.length} playlists`);

      // **POURQUOI:** Pré-filtrage des vidéos candidates selon l'objectif (#1)
      // On ne construit le catalogue qu'à partir des vidéos les plus pertinentes
      const videoCatalog = await this.buildVideoCatalog(goalText, allPlaylists);
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

      // **Mémoire conversationnelle (#3):** si un historique est fourni, on le donne
      // au LLM pour qu'il interprète les questions de suivi ("et pour approfondir ?").
      const contextBlock = history
        ? `\n\nContexte de la conversation récente (pour interpréter les questions de suivi):\n${history}\n`
        : '';
      const userPrompt = `Objectif actuel: ${goalText}${contextBlock}`;

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

      await this.persist(sessionId, goalText, providerUsed, response, fallbackUsed);

      this.logger.debug(
        `[recommend] Successfully saved recommendation (provider: ${providerUsed}, fallback: ${fallbackUsed})`,
      );

      const result = { plan: response, providerUsed, fallbackUsed };
      // On ne met en cache que les vraies recommandations (pas les replis) et seulement
      // hors contexte conversationnel, pour ne pas figer un état transitoire/contextuel.
      if (useCache) this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      // **POURQUOI cette dégradation:**
      // L'endpoint ne doit JAMAIS renvoyer un 500 à l'utilisateur (panne LLM, réponse
      // invalide, quota dépassé...). On renvoie une réponse structurée 200 "sans reco",
      // avec au mieux la playlist du catalogue la plus proche de l'objectif.
      this.logger.warn(
        `[recommend] Génération/validation impossible (${error.message}). Dégradation gracieuse.`,
      );

      let playlists: any[] = [];
      try {
        playlists = await this.catalogService.getPlaylists();
      } catch {
        playlists = [];
      }

      const plan = this.buildGracefulFallback(goalText, playlists);
      await this.persist(sessionId, goalText, 'none', plan, true);

      return { plan, providerUsed: 'none', fallbackUsed: true };
    }
  }

  /**
   * Sauvegarde best-effort de la requête. Ne fait JAMAIS échouer /recommendations
   * si la base est indisponible (dev local sans DB, coupure Supabase...).
   */
  private async persist(
    sessionId: string,
    goalText: string,
    providerUsed: string,
    plan: RecommendationPlan,
    fallbackUsed: boolean,
  ) {
    try {
      await this.prisma.recommendationRequest.create({
        data: {
          sessionId: sessionId || randomUUID(),
          goalText,
          llmProvider: providerUsed,
          llmModel: this.getLlmModel(providerUsed),
          responseJson: plan as any,
          fallbackUsed,
        },
      });
    } catch (error) {
      this.logger.warn(`[persist] Sauvegarde ignorée (DB indisponible): ${error.message}`);
    }
  }

  /**
   * Enregistre un feedback utilisateur (👍/👎) sur une vidéo recommandée.
   * Best-effort: ne fait jamais échouer la requête si la table/DB est indisponible.
   */
  async recordFeedback(input: {
    sessionId: string;
    videoId?: string;
    goalText?: string;
    vote: 'up' | 'down';
  }): Promise<{ ok: boolean }> {
    try {
      await (this.prisma as any).recommendationFeedback.create({
        data: {
          sessionId: input.sessionId || randomUUID(),
          videoId: input.videoId ?? null,
          goalText: input.goalText ?? null,
          vote: input.vote,
        },
      });
      return { ok: true };
    } catch (error) {
      this.logger.warn(`[recordFeedback] Feedback non persisté (DB indisponible): ${error.message}`);
      return { ok: false };
    }
  }

  /**
   * Réponse de repli quand l'IA ne peut rien produire: pas de reco vidéo, mais on
   * propose la playlist du catalogue dont le titre/description/catégorie correspond
   * le mieux aux mots de l'objectif. Si rien ne matche, fallbackPlaylist reste null
   * (le frontend affiche alors un message "aucune vidéo pertinente trouvée").
   */
  private buildGracefulFallback(goalText: string, playlists: any[]): RecommendationPlan {
    const best = this.bestMatchingPlaylist(goalText, playlists);
    return {
      goalSummary: `Je n'ai pas pu générer de recommandation détaillée pour « ${goalText} » pour le moment.`,
      recommendations: [],
      fallbackPlaylist: best
        ? {
            playlistId: best.id,
            title: best.title,
            reason:
              "Playlist du catalogue la plus proche de ton objectif, en attendant que l'assistant IA soit de nouveau disponible.",
          }
        : null,
    };
  }

  /**
   * Scoring simple par mots-clés: compte combien de mots (>= 3 lettres) de l'objectif
   * apparaissent dans le titre/description/catégorie de chaque playlist.
   */
  private bestMatchingPlaylist(goalText: string, playlists: any[]): any | null {
    if (!playlists?.length) return null;
    const words = (goalText || '')
      .toLowerCase()
      .split(/[^a-zà-ÿ0-9]+/i)
      .filter(w => w.length >= 3);
    if (!words.length) return null;

    let best: any = null;
    let bestScore = 0;
    for (const p of playlists) {
      const hay = `${p.title ?? ''} ${p.description ?? ''} ${p.category?.label ?? ''}`.toLowerCase();
      let score = 0;
      for (const w of words) if (hay.includes(w)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return bestScore > 0 ? best : null;
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

    // Dédoublonnage: le LLM propose parfois plusieurs fois la même vidéo. On garde
    // la première occurrence de chaque videoId.
    const seen = new Set<string>();
    plan.recommendations = plan.recommendations.filter(rec => {
      if (seen.has(rec.videoId)) return false;
      seen.add(rec.videoId);
      return true;
    });

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
