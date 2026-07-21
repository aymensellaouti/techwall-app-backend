export interface CategoryDefinition {
  key: string;
  label: string;
  description: string;
}

export const CATEGORIES: CategoryDefinition[] = [
  { key: 'web', label: 'Développement Web', description: 'Symfony, Angular, NestJs, PHP, GraphQL, VueJs' },
  { key: 'mobile', label: 'Développement Mobile', description: 'Flutter, Android' },
  { key: 'data', label: 'Big Data', description: 'Hadoop, Spark, cours Big Data' },
  { key: 'cyber', label: 'Cybersécurité', description: 'Pentest, cryptographie, sécurité offensive' },
  { key: 'algo', label: 'Algorithmique & Systèmes', description: 'Algo, structures de données, C, Python, systèmes d\'exploitation' },
  { key: 'ai', label: 'Intelligence Artificielle', description: 'LLM, IA générative' },
  { key: 'gamedev', label: 'Game Development', description: 'Unity, développement de jeux' },
];

/**
 * Mapping explicite par youtubePlaylistId plutot que par mot-cle dans le titre :
 * plusieurs playlists partagent un vocabulaire proche (ex. Python 101 vs Introduction
 * a la programmation Python) et un mapping par regex s'est deja revele ambigu
 * lors de la construction du site vitrine statique (cf. livrables/sites/techwall-site).
 */
export const PLAYLIST_CATEGORY_BY_ID: Record<string, string> = {
  // Web
  'PLl3CtU4THqPawV0hRF8Qqn0RVEHSjYgfy': 'web', // Symfony 6, 7
  'PLl3CtU4THqPb_rvLczpEp31I5iOm6CUnp': 'web', // Symfony 3.4
  'PLl3CtU4THqPZ8vFpuA23r5ar97trMc6ok': 'web', // POO PHP
  'PLl3CtU4THqPav4uAWNafmw3dVufofU0nR': 'web', // PHP
  'PLl3CtU4THqPaOIQ6C037bV6b9haQTZw4U': 'web', // PHP PDO
  'PLl3CtU4THqPZmg-y8arX_BeG2o-AyIdKp': 'web', // PHP MVC et envoi de mail
  'PLl3CtU4THqPZt6ay6iYT3uZaOMT_yUN-l': 'web', // NestJs 7
  'PLl3CtU4THqPYNPElacumSgXXdzG0eSwjh': 'web', // Angular 13
  'PLl3CtU4THqPY-8x-cCpzIOLSahvjdhouy': 'web', // Angular Drag and Drop
  'PLl3CtU4THqPa1TllnirbhA4nyc25N7PFg': 'web', // Angular Service Worker
  'PLl3CtU4THqPZ1ARMWsmhCYzlCEMZgTBes': 'web', // VueJs avec Symfony
  'PLl3CtU4THqPZd5ZrMYnljdgJzMQ35FhNl': 'web', // Initiation à GraphQL
  'PLl3CtU4THqPZW7vdr7fqT-p56-rAoWM6G': 'web', // Microservices (Spring)

  // Mobile
  'PLl3CtU4THqPZzhuxcwsZhxfIXeuF_ivxK': 'mobile', // Android -1
  'PLl3CtU4THqPYPcfIIIUxhy56LAIn2rL7F': 'mobile', // Flutter
  'PLl3CtU4THqPajhUs2PRlHPmue5pQ2c9cz': 'mobile', // Tic Tac Toe avec Flutter

  // Big Data
  'PLl3CtU4THqPYFvrqtQ6v6aJOV3ZHM84jm': 'data', // Hadoop & Compagnie
  'PLl3CtU4THqPaHpU5g1-iFyT72SACUmCv_': 'data', // Atelier Spark
  'PLl3CtU4THqPbc443ljDXQlP0av9StuSwC': 'data', // Cours Big Data (étudiants ingénieurs)

  // Cybersécurité
  'PLl3CtU4THqPbAyLnE27nhCd0c310Dlg6Y': 'cyber', // Cybersecurity
  'PLl3CtU4THqPbCtbTUuuWmVlo__3rlHngN': 'cyber', // Cryptographie

  // Algorithmique & systèmes
  'PLl3CtU4THqPboussUFWdDGmRclxlSPix_': 'algo', // Algo, structures de données, C
  'PLl3CtU4THqPbeu--yZXf630WeXW4EvDO0': 'algo', // Cours Systèmes d'Exploitation
  'PLl3CtU4THqPavC9HpYkhpXWXSxqIqa5gI': 'algo', // Introduction à la programmation Python
  'PLl3CtU4THqPajnTLZnJOP-qKJWCK6OzS7': 'algo', // Python 101 - Sudoku

  // IA
  'PLl3CtU4THqParbb6E224p6Y2gyG9e6JP1': 'ai', // Generative AI Course (contenu invité)

  // Game dev
  'PLl3CtU4THqPZ3FhU-912atvy-d-Fezy-f': 'gamedev', // 'game development beginner tutorial' (Unity, invité)
  'PLl3CtU4THqPa3lQa-VsaIaN4CZUFlpYPh': 'gamedev', // Game Development
};
