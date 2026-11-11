# Architecture

- **Monolithe modulaire Next.js** (pages, Server Actions, routes API) : suffisant, un seul déploiement. Un service FastAPI ne sera ajouté que si un traitement IA lourd le justifie (non justifié à ce stade).
- `app/` pages · `components/` UI · `lib/` socle (db, crypto, sessions, logs) · `services/` logique métier · `connectors/` sources d'offres (un connecteur = une source) · `ai/` matching et génération · `prisma/` schéma + migrations · `tests/`.
- **Auth** : sessions en base, jeton aléatoire stocké haché (SHA-256), cookie httpOnly/SameSite=Lax, bcrypt (coût 12), limitation de débit. `proxy.ts` = garde légère ; `requireUser()` = vérification réelle.
- **Isolation** : toute requête métier filtre par `userId`.
- **Secrets** : tokens OAuth chiffrés AES-256-GCM (`lib/crypto.ts`), clés API uniquement côté serveur.
- **CV** : stockés hors `/public` (`storage/`), signature de fichier vérifiée, 5 Mo max.
- **Analyse du CV** : règles + dictionnaire, locale (aucun envoi à un LLM) ; n'extrait que ce qui est écrit.
- **Choix** : Prisma 7 stable (la CLI `latest` est une préversion 8 rc) ; Cache Components désactivés (app 100 % dynamique).
