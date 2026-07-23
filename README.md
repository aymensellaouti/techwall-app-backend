# TechWall Backend API

Backend NestJS avec système de recommandations IA pour la plateforme éducative TechWall.

## Stack Technique

- **Framework**: NestJS
- **Runtime**: Node.js
- **Database**: PostgreSQL (Supabase)
- **LLM Providers**: Gemini, Anthropic, OpenAI (fallback chain)
- **Deployment**: Railway with Docker
- **Security**: API Key validation + Rate limiting

## Phase 4 Features

✅ **API Key Protection**: `/recommendations` endpoint requiert un Bearer token
✅ **Rate Limiting**: 10 requêtes/minute par IP
✅ **CORS**: Seulement localhost:4200 (dev) + *.netlify.app (prod)
✅ **LLM Fallback**: Gemini → Anthropic → OpenAI si un provider échoue

## Installation

```bash
npm install
```

## Configuration

Copier `.env.example` en `.env` et renseigner les valeurs:

```bash
cp .env.example .env
```

### Variables essentielles:

**Serveur**:
- `PORT`: Port du serveur (défaut: 3000)
- `NODE_ENV`: `development` ou `production`
- `API_KEY`: Clé secrète pour protéger `/recommendations`
  - Générer avec: `openssl rand -hex 32`
  - **JAMAIS commiter en `.env`**
  - Passer via Railway Variables (Secret)

**Database** (Supabase):
- `DATABASE_URL`: Connection string avec PgBouncer
- `DIRECT_URL`: Connection string sans pooling (Prisma migrations)
- `SUPABASE_URL`: URL de la base
- `SUPABASE_PUBLISHABLE_KEY`: Clé publique
- `SUPABASE_SECRET_KEY`: Clé secrète
- `SUPABASE_JWKS_URL`: URL des clés JWT

**LLM Providers**:
- `LLM_PROVIDER_ORDER`: Ordre de fallback (défaut: `gemini,anthropic,openai`)
- `GOOGLE_API_KEY`: Google Cloud API pour Gemini
- `ANTHROPIC_API_KEY`: Anthropic Claude (fallback 1)
- `OPENAI_API_KEY`: OpenAI (fallback 2)

**YouTube**:
- `YOUTUBE_API_KEY`: YouTube Data API
- `YOUTUBE_CHANNEL_ID`: ID de votre chaîne

## Développement

```bash
# Dev server (avec hot reload)
npm run start:dev

# Build production
npm run build

# Test
npm run test
npm run test:watch
```

Accès: `http://localhost:3000`

### Tester l'API localement

```bash
# Clé de dev
API_KEY="techwall-api-key-v1-dev"

# Tester /health
curl http://localhost:3000/health

# Tester /recommendations (avec clé)
curl -X POST http://localhost:3000/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"goalText":"Apprendre Angular 22"}'
```

## Architecture

### Modules principaux

#### `AuthModule`
- `ApiKeyGuard`: Valide le Bearer token
- `RateLimitInterceptor`: Limite 10 req/min par IP

#### `LlmModule`
- `LlmService`: Orchestration avec fallback chain
- Providers: Gemini, Anthropic, OpenAI
- **Pourquoi**: Isoler la logique LLM, réutilisable par plusieurs modules

#### `RecommendationModule`
- `RecommendationController`: Endpoint `/recommendations`
- `RecommendationService`: Appelle LLM + DB
- Protégé par `@UseGuards(ApiKeyGuard)`
- Rate limited par `RateLimitInterceptor`

#### `CatalogModule`
- `CatalogService`: Récupère les playlists/vidéos YouTube
- Utilisé par RecommendationService pour contextualiser les recommandations

#### `PrismaModule`
- Gestion de la base PostgreSQL
- Sauvegarde des recommandations

### Flow: POST /recommendations

```
1. Requête HTTP arrive avec header Authorization
   ↓
2. ApiKeyGuard valide la clé
   ↓
3. RateLimitInterceptor check le quota IP
   ↓
4. RecommendationController.generateRecommendation()
   ↓
5. RecommendationService.recommend():
   a) Charge le catalogue complet (playlists)
   b) Appelle LlmService.generateStructured()
   c) LlmService essaie Gemini → Anthropic → OpenAI
   d) Valide la réponse (whyThisChoice, whyNotOthers, etc.)
   e) Sauvegarde en DB via Prisma
   f) Retourne la réponse
   ↓
6. Réponse JSON retournée au client
```

## Déploiement

Voir [DEPLOYMENT.md](../DEPLOYMENT.md) pour le guide complet.

### Quick start Railway

1. Connecter le repo GitHub à Railway
2. Créer les variables d'env (voir section Configuration)
3. Railway détecte `Dockerfile` et lance la build
4. Accès: `https://techwall-app-backend.railway.app`

### Health Check

Railway envoie les requêtes à `/health` pour vérifier si l'app est vivante.

Réponse attendue:
```json
{
  "status": "ok",
  "timestamp": "2026-07-22T10:30:45.123Z"
}
```

---

## Sécurité

### API Key Protection

- La clé `API_KEY` est stockée en **Variable Secrète Railway** (jamais en log)
- Le frontend envoie la même clé en header `Authorization: Bearer [key]`
- `ApiKeyGuard` valide la clé avant de traiter la requête
- **Pourquoi**: Protéger contre les abus (rate limiting global)

### Rate Limiting

- `RateLimitInterceptor` track les requêtes par IP
- Max 10 requêtes/minute par adresse IP
- Après dépassement: `429 Too Many Requests`
- **Pourquoi**: Protéger les quotas LLM (Gemini, Anthropic, OpenAI sont payants)

### CORS

```typescript
const allowedOrigins = [
  'http://localhost:4200',      // Dev frontend
  /https:\/\/.*\.netlify\.app$/, // Production Netlify
];
```

### Database

- `DATABASE_URL` avec PgBouncer (connection pooling)
- `DIRECT_URL` pour les migrations (Prisma)
- Credentials dans Variables Secrètes Railway

---

## Ressources

- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Railway Docs](https://docs.railway.app)
- [DEPLOYMENT.md](../DEPLOYMENT.md)

## API Endpoints

### POST `/recommendations`
Recommande des vidéos basées sur l'objectif d'apprentissage de l'utilisateur.

**Request:**
```json
{
  "goalText": "Apprendre Angular 22",
  "sessionId": "optional-uuid"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "plan": {
    "goalSummary": "...",
    "recommendations": [
      {
        "videoId": "uuid",
        "title": "Video Title",
        "playlistTitle": "Playlist Name",
        "whyRelevant": "Why this video is relevant...",
        "axes": ["concept1", "concept2"]
      }
    ],
    "fallbackPlaylist": null
  },
  "providerUsed": "gemini",
  "fallbackUsed": false,
  "createdAt": "2026-07-21T..."
}
```

## Déploiement sur Railway

### 1. Créer un compte Railway
https://railway.app

### 2. Connecter GitHub
- Dashboard → New Project → GitHub Repo
- Chercher `techwall-app-backend`

### 3. Variables d'environnement
Dans Railway Dashboard:
- Ajouter les variables depuis `.env.example`
- **CRITIQUE**: Ajouter `DATABASE_URL` depuis Supabase

### 4. Deploy
Railway auto-déploie à chaque push sur `main`

## LLM Provider Chain

Le backend utilise une chaîne de fallback automatique:

1. **Gemini** (primaire) - gratuit 250k tokens/mois
2. **Anthropic** (fallback) - si Gemini échoue
3. **OpenAI** (fallback) - dernier recours

Chaque provider peut être désactivé en omettant la clé API correspondante.

## Architecture

```
src/
├── llm/                 # Module LLM avec providers
│   ├── providers/       # Gemini, Anthropic, OpenAI
│   ├── llm.service.ts   # Orchestration + fallback
│   └── llm.module.ts    # NestJS module
├── recommendation/      # Module recommandations
│   ├── recommendation.service.ts
│   ├── recommendation.controller.ts
│   ├── types/
│   ├── dto/
│   └── recommendation.module.ts
├── catalog/            # Playlists & vidéos
├── auth/               # Authentification Supabase
└── app.module.ts       # Root module
```

## Notes

- Validation stricte des réponses LLM (VideoRecommendation schema)
- Fallback playlist optionnel si <2 vidéos trouvées
- Logging détaillé pour debug provider chain
- CORS configuré pour frontend Netlify
