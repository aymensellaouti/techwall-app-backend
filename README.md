# TechWall Backend API

Backend NestJS avec système de recommandations IA pour la plateforme éducative TechWall.

## Stack Technique

- **Framework**: NestJS
- **Runtime**: Node.js
- **Database**: PostgreSQL (Supabase)
- **LLM Providers**: Gemini, Anthropic, OpenAI (fallback chain)
- **Deployment**: Railway

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

- `PORT`: Port du serveur (défaut: 3000)
- `DATABASE_URL`: PostgreSQL connection string (Supabase)
- `GOOGLE_API_KEY`: Clé API Gemini
- `ANTHROPIC_API_KEY`: Clé API Claude (optionnel, fallback)
- `OPENAI_API_KEY`: Clé API OpenAI (optionnel, fallback)

## Développement

```bash
# Dev server
npm run start

# Watch mode
npm run start:dev

# Build production
npm run build

# Production
npm run start:prod
```

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
