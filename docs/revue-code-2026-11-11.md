# Revue de code et correctifs — 11/11/2026 (v0.5.1)

Revue complète du code (authentification, actions serveur, services, connecteurs, IA, schéma, configuration), correctifs appliqués et vérifications. Voir aussi `CHANGELOG.md` (0.5.1).

## 1. Constats et corrections

### Critiques
| # | Problème | Correction |
|---|---|---|
| 1 | Fichier d'identifiants (`identifiants_*.json`) non ignoré par git | Ajouté au `.gitignore` (jamais commité). À régénérer si déjà partagé. |
| 2 | Upload de CV > 1 Mo refusé (limite par défaut des Server Actions) | `experimental.serverActions.bodySizeLimit: "6mb"` dans `next.config.ts` |
| 3 | ~~Avertissements anti-invention jamais affichés~~ | **Faux positif de la revue** : la page candidature les recalcule à l'affichage. Aucun changement. |
| 4 | Double envoi possible (vérification puis écriture non atomiques) ; une re-soumission après envoi partait comme relance | Verrou atomique (compare-and-set sur `validatedAt`), validation rendue si l'envoi échoue, un envoi à la fois par utilisateur, transaction pour le statut et les relances, « jour » calculé en Europe/Paris (`lib/dates.ts`) |

### Sécurité
| # | Problème | Correction |
|---|---|---|
| 5 | Limiteur de débit contournable (`x-forwarded-for` falsifiable, IP seule, table non purgée) | `lib/request.ts` : en-tête lu seulement si `TRUST_PROXY=1`, dernière valeur ; limite par compte en plus de l'IP ; purge de la table |
| 6 | Énumération de comptes (temps de réponse à la connexion) | bcrypt exécuté même si l'email est inconnu. Le message « compte déjà existant » à l'inscription est **conservé** (limite connue, voir §3). |
| 7 | Sessions : autres appareils non révoqués au changement de mot de passe, sessions expirées jamais purgées, IP/UA vides | `destroyOtherSessions`, purge à la création, IP et user-agent enregistrés |
| 8 | Pas de limite sur les actions coûteuses | Limites sur génération IA, import CV, synchronisation, recalcul ; délai minimal de 10 min par source de collecte |
| 9 | Pas de CSP/HSTS ; secret cron comparé sans temps constant | CSP + HSTS ; `safeEqual` (SHA-256 + `timingSafeEqual`) |
| 10 | Clé de chiffrement unique, format non validé | Rotation via `ENCRYPTION_KEY_PREVIOUS` ; `decrypt` valide le format |

### Fonctionnel et robustesse
| # | Problème | Correction |
|---|---|---|
| 11 | Réinitialisation de mot de passe inutilisable en production | Envoi SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), vérification de `APP_URL`, limites par IP et par compte |
| 12 | `computeMatches` et la collecte : une requête par offre | Requêtes groupées, mises à jour par lots en transaction, `rejected` conservé |
| 13 | Opérations non transactionnelles (compétences, import CV, suppression de compte) | Transactions ; nettoyage du fichier si la base échoue ; suppression du compte : base d'abord, fichiers ensuite |
| 14 | Garde-fou anti-invention trop permissif (« motivé », « base ») | Regex `GAP` resserrée, doublons retirés |
| 15 | `readResume` inutilisé, pas de route de téléchargement | `GET /api/cv/[id]` (propriétaire uniquement, `no-store`) + lien « Télécharger » |
| 16 | Divers | `__dirname` → `import.meta.dirname`, doublon dans `classifyContract`, une candidature envoyée ne repasse plus en brouillon, `RELANCE_NECESSAIRE` impossible sans envoi |

## 2. Vérifications effectuées
- `tsc --noEmit` et ESLint : aucune erreur.
- Vitest : 53/53 (dont `tests/hardening.test.ts` : jour Paris hiver/été, rotation de clé, format chiffré, `safeEqual`, garde-fou).
- `next build` : OK.
- Playwright (build de production) : 6/6 — parcours étudiant, offres, routes protégées / en-têtes / cron, isolation entre étudiants / cookie / upload piégé, mobile, envoi complet.
- Serveur de dev : `/login`, `/register`, `/forgot` 200 ; pages protégées redirigées ; `/api/cv/x` et `/api/account/export` 401 ; cron 403 ; CSP, HSTS et `X-Frame-Options` présents.

## 3. Limites connues et points non vérifiés
- Message « compte déjà existant » à l'inscription : masquable seulement avec une vérification par email.
- CSP avec `'unsafe-inline'` (scripts Next sans nonce) ; une CSP stricte demanderait un nonce généré dans `proxy.ts`.
- Limiteur de débit en mémoire : mono-instance ; Redis requis en multi-instance. Le verrou d'envoi l'est aussi.
- Rôle `ADMIN` inutilisé (suppression = migration).
- Non testés en réel : génération Anthropic (`AI_PROVIDER=anthropic`), mail de réinitialisation, API France Travail, envoi Gmail/Outlook (les tests utilisent un faux serveur SMTP).

## 4. Exploitation
- Base : `docker compose up -d` (Postgres, port 5433), puis `npx prisma migrate deploy`.
- Lancement : `npm run dev` (http://localhost:3112) ; production : `npm run build && npm start`.
- Nouvelles variables (`.env.example`) : `TRUST_PROXY` (« 1 » derrière un proxy de confiance), `ENCRYPTION_KEY_PREVIOUS`, `SMTP_*`, `APP_URL` (obligatoire en production).
- Tests : `npm test` (unitaires), `npm run test:e2e` (nécessite la base).
