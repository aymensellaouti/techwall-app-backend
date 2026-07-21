/**
 * **POURQUOI cette nouvelle structure:**
 * - Avant: recommander des playlists complètes
 * - Maintenant: recommander des VIDÉOS SPÉCIFIQUES (3-5 vidéos)
 * - Fallback playlist SEULEMENT si < 2 vidéos trouvées
 */

export interface VideoRecommendation {
  videoId: string;
  title: string;
  playlistTitle: string;
  whyRelevant: string;
  axes: string[];
}

export interface PlaylistFallback {
  playlistId: string;
  title: string;
  reason?: string;
}

export interface RecommendationPlan {
  goalSummary: string;
  recommendations: VideoRecommendation[];
  fallbackPlaylist?: PlaylistFallback | null;
}
