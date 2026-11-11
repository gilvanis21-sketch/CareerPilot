# Guide d'installation

Prérequis : Node.js ≥ 22, Docker (PostgreSQL), Git.
```bash
git clone <dépôt> && cd <dépôt>
docker compose up -d                      # PostgreSQL 17, port 5433
cp .env.example .env
openssl rand -hex 32                      # → ENCRYPTION_KEY dans .env
npm install
npx prisma migrate deploy && npx prisma generate
npm run dev                               # http://localhost:3000
```
## Variables (`.env`)
| Variable | Rôle |
|---|---|
| `DATABASE_URL` | connexion PostgreSQL |
| `ENCRYPTION_KEY` | 64 caractères hex, chiffrement des mots de passe d'application |
| `APP_URL` | URL publique (liens de réinitialisation) |
| `AI_PROVIDER` | `mock` (modèle sans IA) ou `anthropic` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_WORKSPACE_ID` | IA (workspace requis si la clé n'est pas rattachée) |
| `FRANCE_TRAVAIL_CLIENT_ID/SECRET/SCOPE` | source France Travail (si l'accès est accordé) |
| `CRON_SECRET` | protège `/api/cron/followups` |
Sans clés, l'application fonctionne en mode démonstration.
## Tests
`npm test` (unitaires) · `npm run test:e2e` (build de production + navigateur ; télécharge Chromium via `npx playwright install chromium`) · `npm run eval:matching` · `npm run check:ai` · `npm run check:france-travail`.
