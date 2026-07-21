/**
 * Repli statique utilise UNIQUEMENT si YOUTUBE_API_KEY est absente/revoquee.
 * Genere a partir de context/import/techwallPlaylistInfos.json (export ponctuel,
 * moins complet que l'API live : 19 playlists au lieu de 28, sans jointure video<->playlist).
 * A ne jamais preferer a la sync live si la cle fonctionne.
 */
export interface SeedFallbackPlaylist {
  youtubePlaylistId: string;
  title: string;
  videoCount: number;
  categoryKey: string;
}

export const SEED_FALLBACK_PLAYLISTS: SeedFallbackPlaylist[] = [
  { youtubePlaylistId: 'PLl3CtU4THqPb_rvLczpEp31I5iOm6CUnp', title: 'Symfony 3.4', videoCount: 81, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPZt6ay6iYT3uZaOMT_yUN-l', title: 'NestJs 7', videoCount: 47, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPYNPElacumSgXXdzG0eSwjh', title: 'Angular 13', videoCount: 54, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPav4uAWNafmw3dVufofU0nR', title: 'PHP', videoCount: 31, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPZ8vFpuA23r5ar97trMc6ok', title: 'POO PHP', videoCount: 20, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPZ1ARMWsmhCYzlCEMZgTBes', title: 'VueJs avec Symfony', videoCount: 20, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPaOIQ6C037bV6b9haQTZw4U', title: 'PHP PDO', videoCount: 9, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPY-8x-cCpzIOLSahvjdhouy', title: 'Angular Drag and Drop', videoCount: 5, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPa1TllnirbhA4nyc25N7PFg', title: 'Angular Service Worker', videoCount: 3, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPZmg-y8arX_BeG2o-AyIdKp', title: 'PHP MVC et envoi de mail', videoCount: 2, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPZzhuxcwsZhxfIXeuF_ivxK', title: 'Android -1', videoCount: 18, categoryKey: 'mobile' },
  { youtubePlaylistId: 'PLl3CtU4THqPYPcfIIIUxhy56LAIn2rL7F', title: 'Flutter', videoCount: 10, categoryKey: 'mobile' },
  { youtubePlaylistId: 'PLl3CtU4THqPajhUs2PRlHPmue5pQ2c9cz', title: 'Tic Tac Toe avec Flutter', videoCount: 5, categoryKey: 'mobile' },
  { youtubePlaylistId: 'PLl3CtU4THqPYFvrqtQ6v6aJOV3ZHM84jm', title: 'Hadoop & Compagnie', videoCount: 21, categoryKey: 'data' },
  { youtubePlaylistId: 'PLl3CtU4THqPaHpU5g1-iFyT72SACUmCv_', title: 'Atelier Spark', videoCount: 11, categoryKey: 'data' },
  { youtubePlaylistId: 'PLl3CtU4THqPboussUFWdDGmRclxlSPix_', title: 'Algorithmique, structures de données et C', videoCount: 57, categoryKey: 'algo' },
  { youtubePlaylistId: 'PLl3CtU4THqPZW7vdr7fqT-p56-rAoWM6G', title: 'Microservices', videoCount: 7, categoryKey: 'web' },
  { youtubePlaylistId: 'PLl3CtU4THqPajnTLZnJOP-qKJWCK6OzS7', title: 'Python 101 - Sudoku', videoCount: 9, categoryKey: 'algo' },
];
