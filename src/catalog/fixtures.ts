/**
 * **POURQUOI ce fichier:**
 * Données de repli utilisées UNIQUEMENT en développement local quand la base
 * Supabase/Postgres n'est pas joignable. Permet de faire tourner le backend,
 * le catalogue et les recommandations sans DB.
 *
 * En production (DB joignable), ces données ne sont jamais servies : le
 * CatalogService et le RecommendationService lisent Prisma en priorité et ne
 * retombent ici que sur exception de connexion.
 *
 * Les photos des fondateurs pointent vers les assets locaux du frontend
 * (public/assets/team/*.jpeg), servis par Angular sur le même origin.
 */

export const mockCategories = [
  { id: 'cat-web', key: 'web', label: 'Développement Web', description: 'HTML, CSS, JS, PHP, Symfony, Angular, NestJs', _count: { playlists: 10 } },
  { id: 'cat-mobile', key: 'mobile', label: 'Mobile', description: 'Android, Flutter', _count: { playlists: 3 } },
  { id: 'cat-data', key: 'data', label: 'Big Data', description: 'Hadoop, Spark', _count: { playlists: 2 } },
  { id: 'cat-algo', key: 'algo', label: 'Algorithmique', description: 'Structures de données, C, Python', _count: { playlists: 3 } },
];

const categoryByKey = (key: string) => mockCategories.find(c => c.key === key)!;

export interface FixturePlaylist {
  id: string;
  youtubePlaylistId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  videoCount: number;
  categoryId: string;
  category: (typeof mockCategories)[number];
  _count: { videos: number };
}

const rawPlaylists: Array<{ id: string; ytId: string; title: string; desc: string; count: number; cat: string }> = [
  { id: 'pl-symfony', ytId: 'PLl3CtU4THqPb_rvLczpEp31I5iOm6CUnp', title: 'Symfony 3.4', desc: 'Framework PHP: routing, Doctrine, formulaires, sécurité', count: 81, cat: 'web' },
  { id: 'pl-nestjs', ytId: 'PLl3CtU4THqPZt6ay6iYT3uZaOMT_yUN-l', title: 'NestJs 7', desc: 'Backend Node structuré: modules, providers, guards, pipes', count: 47, cat: 'web' },
  { id: 'pl-angular', ytId: 'PLl3CtU4THqPYNPElacumSgXXdzG0eSwjh', title: 'Angular 13', desc: 'Framework frontend: composants, RxJS, routing, services, guards', count: 54, cat: 'web' },
  { id: 'pl-php', ytId: 'PLl3CtU4THqPav4uAWNafmw3dVufofU0nR', title: 'PHP', desc: 'Bases du langage PHP côté serveur', count: 31, cat: 'web' },
  { id: 'pl-poo-php', ytId: 'PLl3CtU4THqPZ8vFpuA23r5ar97trMc6ok', title: 'POO PHP', desc: 'Programmation orientée objet en PHP', count: 20, cat: 'web' },
  { id: 'pl-vue-symfony', ytId: 'PLl3CtU4THqPZ1ARMWsmhCYzlCEMZgTBes', title: 'VueJs avec Symfony', desc: 'Intégrer VueJs dans un projet Symfony', count: 20, cat: 'web' },
  { id: 'pl-microservices', ytId: 'PLl3CtU4THqPZW7vdr7fqT-p56-rAoWM6G', title: 'Microservices', desc: 'Architecture microservices, communication inter-services', count: 7, cat: 'web' },
  { id: 'pl-android', ytId: 'PLl3CtU4THqPZzhuxcwsZhxfIXeuF_ivxK', title: 'Android -1', desc: 'Développement Android natif', count: 18, cat: 'mobile' },
  { id: 'pl-flutter', ytId: 'PLl3CtU4THqPYPcfIIIUxhy56LAIn2rL7F', title: 'Flutter', desc: 'Applications multiplateformes avec Flutter et Dart', count: 10, cat: 'mobile' },
  { id: 'pl-hadoop', ytId: 'PLl3CtU4THqPYFvrqtQ6v6aJOV3ZHM84jm', title: 'Hadoop & Compagnie', desc: 'Big Data: HDFS, MapReduce, écosystème Hadoop', count: 21, cat: 'data' },
  { id: 'pl-spark', ytId: 'PLl3CtU4THqPaHpU5g1-iFyT72SACUmCv_', title: 'Atelier Spark', desc: 'Apache Spark: RDD, DataFrame, traitement distribué', count: 11, cat: 'data' },
  { id: 'pl-algo-c', ytId: 'PLl3CtU4THqPboussUFWdDGmRclxlSPix_', title: 'Algorithmique, structures de données et C', desc: 'Fondamentaux algorithmiques et langage C', count: 57, cat: 'algo' },
  { id: 'pl-python-sudoku', ytId: 'PLl3CtU4THqPajnTLZnJOP-qKJWCK6OzS7', title: 'Python 101 - Sudoku', desc: 'Introduction à Python via un projet Sudoku', count: 9, cat: 'algo' },
];

export const mockPlaylists: FixturePlaylist[] = rawPlaylists.map(p => ({
  id: p.id,
  youtubePlaylistId: p.ytId,
  title: p.title,
  description: p.desc,
  thumbnailUrl: null,
  videoCount: p.count,
  categoryId: categoryByKey(p.cat).id,
  category: categoryByKey(p.cat),
  _count: { videos: p.count },
}));

export interface FixtureVideo {
  id: string;
  youtubeVideoId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  viewCount: number;
  publishedAt: null;
  position: number;
  playlistId: string;
  playlist: FixturePlaylist & { category: (typeof mockCategories)[number] };
}

const rawVideos: Array<{ id: string; title: string; desc: string; pl: string }> = [
  // Angular
  { id: 'vid-ng-intro', title: 'Angular : introduction et architecture', desc: 'Composants, modules, structure d\'un projet Angular', pl: 'pl-angular' },
  { id: 'vid-ng-rxjs', title: 'Angular : RxJS et Observables', desc: 'Programmation réactive, operators, subscription', pl: 'pl-angular' },
  { id: 'vid-ng-routing', title: 'Angular : routing et navigation', desc: 'RouterModule, routes, lazy loading', pl: 'pl-angular' },
  { id: 'vid-ng-guards', title: 'Angular : sécuriser une route avec les Guards', desc: 'CanActivate, AuthGuard, protection de routes, redirection', pl: 'pl-angular' },
  { id: 'vid-ng-interceptor', title: 'Angular : intercepteurs HTTP et JWT', desc: 'HttpInterceptor, ajout de token JWT, gestion 401', pl: 'pl-angular' },
  { id: 'vid-ng-forms', title: 'Angular : formulaires réactifs', desc: 'ReactiveFormsModule, validation, FormBuilder', pl: 'pl-angular' },
  // NestJs
  { id: 'vid-nest-intro', title: 'NestJs : premiers pas', desc: 'Modules, controllers, providers, injection de dépendances', pl: 'pl-nestjs' },
  { id: 'vid-nest-guards', title: 'NestJs : guards et authentification', desc: 'Guards, stratégies, protection d\'endpoints, JWT', pl: 'pl-nestjs' },
  { id: 'vid-nest-pipes', title: 'NestJs : pipes et validation', desc: 'ValidationPipe, DTO, transformation des données', pl: 'pl-nestjs' },
  // Symfony
  { id: 'vid-sf-intro', title: 'Symfony : installation et routing', desc: 'Structure, routes, contrôleurs', pl: 'pl-symfony' },
  { id: 'vid-sf-security', title: 'Symfony : sécurité et authentification', desc: 'Firewall, providers, voters, contrôle d\'accès', pl: 'pl-symfony' },
  { id: 'vid-sf-doctrine', title: 'Symfony : Doctrine ORM', desc: 'Entités, repositories, relations, requêtes', pl: 'pl-symfony' },
  // Big Data
  { id: 'vid-hadoop-hdfs', title: 'Hadoop : HDFS expliqué', desc: 'Système de fichiers distribué, NameNode, DataNode', pl: 'pl-hadoop' },
  { id: 'vid-hadoop-mapreduce', title: 'Hadoop : MapReduce', desc: 'Paradigme map/reduce, traitement parallèle', pl: 'pl-hadoop' },
  { id: 'vid-spark-rdd', title: 'Spark : les RDD', desc: 'Resilient Distributed Datasets, transformations, actions', pl: 'pl-spark' },
  { id: 'vid-spark-df', title: 'Spark : DataFrame et SQL', desc: 'API DataFrame, requêtes SQL sur données distribuées', pl: 'pl-spark' },
  // Flutter / Algo
  { id: 'vid-flutter-intro', title: 'Flutter : première application', desc: 'Widgets, layout, hot reload', pl: 'pl-flutter' },
  { id: 'vid-algo-tris', title: 'Algorithmique : les tris', desc: 'Tri à bulles, tri rapide, complexité', pl: 'pl-algo-c' },
];

export const mockVideos: FixtureVideo[] = rawVideos.map((v, i) => {
  const playlist = mockPlaylists.find(p => p.id === v.pl)!;
  return {
    id: v.id,
    youtubeVideoId: `yt-${v.id}`,
    title: v.title,
    description: v.desc,
    thumbnailUrl: null,
    durationSeconds: 600,
    viewCount: 0,
    publishedAt: null,
    position: i,
    playlistId: playlist.id,
    playlist,
  };
});

/**
 * Les 3 co-fondateurs de TechWall (enseignants-chercheurs à l'INSAT).
 * Bios et liens identiques au script de seed Supabase (scripts/seed-founders.ts).
 * photoUrl pointe vers les assets locaux du frontend (servis par Angular).
 */
export const mockFounders = [
  {
    id: 'founder-aymen',
    name: 'Aymen Sellaouti',
    role: 'Co-fondateur — Maître assistant à l\'INSAT',
    bio: "Enseigne à l'INSAT depuis 2013, docteur en informatique (Université de Strasbourg, 2014). Formateur freelance sur Symfony, Angular et NestJs.",
    linkedin: 'https://www.linkedin.com/in/aymen-sellaouti-b0427731/',
    photoUrl: '/assets/team/aymen-sellaouti.jpeg',
  },
  {
    id: 'founder-lilia',
    name: 'Lilia Sfaxi',
    role: 'Co-fondatrice — Maître assistante à l\'INSAT',
    bio: 'Docteur-ingénieur en informatique (Grenoble / Université de Tunis El Manar), spécialiste Big Data. À l\'origine des playlists Hadoop & Compagnie et Atelier Spark.',
    linkedin: 'https://www.linkedin.com/in/liliasfaxi/',
    photoUrl: '/assets/team/lilia-sfaxi.jpeg',
  },
  {
    id: 'founder-souheib',
    name: 'Souheib Yousfi',
    role: 'Co-fondateur — Enseignant-chercheur',
    bio: 'Enseignant-chercheur en informatique, spécialisé en sécurité (protocoles de vote électronique, blockchain). Contribue aux contenus pentest et cybersécurité de la chaîne.',
    linkedin: 'https://www.linkedin.com/in/souheib-yousfi-5b455810/',
    photoUrl: '/assets/team/souheib-yousfi.jpeg',
  },
];
