# CareerPilot — assistant de recherche de stage et d'alternance

CareerPilot - développé par Arthur DADJO. Next.js 16 (App Router) · TypeScript · Tailwind 4 · Prisma 7 · PostgreSQL.

## Démarrage
```bash
docker compose up -d          # PostgreSQL sur le port 5433
cp .env.example .env          # puis renseigner ENCRYPTION_KEY (openssl rand -hex 32)
npm install
npx prisma migrate dev        # applique les migrations
npx prisma generate
npm run dev                   # http://localhost:3112
npm test                      # tests unitaires (vitest)
```
Sans clé API, l'application tourne en **mode démonstration** (`AI_PROVIDER=mock`, offres fictives).
N'utiliser que des CV et données **fictifs** avant la recette.

## État d'avancement
Voir `ROADMAP.md` et `CHANGELOG.md`.

## Documentation
`docs/guide-utilisateur.md` · `docs/guide-installation.md` · `docs/guide-exploitation.md` · `docs/securite-rgpd.md` · `docs/connectors.md` · `docs/oauth-messagerie.md` · `docs/matching-evaluation.md` · `docs/PV-recette.md` · `docs/rapport.md` · `docs/soutenance.md` · `docs/sources-offres-options.md`
