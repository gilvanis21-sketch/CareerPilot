# Changelog
## [0.5.1] - 2026-11-11 — Correctifs de revue
- Envoi : verrou atomique (compare-and-set sur la validation) + un envoi à la fois par utilisateur ; plus de relance involontaire par re-soumission ; jour calculé en Europe/Paris.
- Auth : IP client fiable (`TRUST_PROXY`), limite par compte, bcrypt systématique (pas de différence de temps), révocation des autres sessions au changement de mot de passe, purge des sessions expirées, IP/UA enregistrés.
- Réinitialisation de mot de passe : envoi réel par SMTP (`SMTP_*`), `APP_URL` vérifié.
- Upload de CV : limite Server Actions portée à 6 Mo ; transaction + nettoyage du fichier ; route de téléchargement authentifiée `/api/cv/[id]`.
- Limites de débit sur génération IA, import CV, synchronisation ; collecte avec délai minimal par source ; requêtes groupées (offres et scores).
- CSP et HSTS ; comparaison du secret cron à temps constant ; rotation de clé (`ENCRYPTION_KEY_PREVIOUS`) et validation du format chiffré.
- Suppression de compte : base d'abord, fichiers ensuite ; compétences du profil en transaction ; garde-fou anti-invention resserré ; `.gitignore` des identifiants.
- Détail de la revue : `docs/revue-code-2026-11-11.md`.
## [0.5.0] - 2026-11-10 — Recette
- Tests de sécurité e2e (isolation, routes, cookies, en-têtes, upload piégé), mobile, performance ; en-têtes HTTP de sécurité.
- Recette automatisée sur build de production ; synchronisation e2e fiabilisée.
- Documentation : PV de recette, guides utilisateur/installation/exploitation, dossier RGPD, rapport, plan de soutenance, options de sourcing.
## [0.4.0] - 2026-11-10
- Page « Tendances du marché » (secteurs, compétences, contrats, évolution, réponses par secteur, postes recherchés) avec k-anonymat (K=3) et bandeau si les offres sont fictives.
- IA : repli automatique sur le modèle standard si l'API échoue ; en-tête `anthropic-workspace-id` optionnel.
- Scripts de diagnostic : `npm run check:france-travail`, `npm run check:ai`.
- Anthropic testé en réel (workspace CareerPilot) : génération OK. Corrigés : bloc « thinking » avant le texte, limite de tokens, accord de genre neutre.
- Garde-fou anti-invention durci : « C#/C++ » ne se confondent plus avec la lettre c (aussi dans le matching) ; une techno de l'offre n'est tolérée que si le manque est assumé.
- France Travail testé en réel : `invalid_scope`, API absente du catalogue (voir docs/connectors.md).
## [0.3.0] - 2026-11-09 — Sprint 3
- Génération de candidatures (offre, spontanée, relance) : modèle sûr par défaut, Claude optionnel (non testé en réel), garde-fou anti-invention de compétences.
- Candidatures spontanées avec les 12 compétences 360 (suggestion par secteur, stage de 2 mois éventuellement non rémunéré).
- Messagerie de l'étudiant : Gmail via mot de passe d'application (SMTP), identifiants vérifiés puis chiffrés AES-256-GCM.
- Envoi uniquement après validation + confirmation explicites, destinataire saisi par l'étudiant, plafond quotidien, relances J+7/J+15 configurables, journal.
- Suivi des statuts, tableau de bord (8 indicateurs + graphique), route cron des relances.
- Tests : 35 unitaires (dont envoi vers un serveur SMTP fictif), 3 parcours e2e.
## [0.2.0] - 2026-11-09 — Sprint 1b + Sprint 2
- Mot de passe oublié/réinitialisation (jeton haché, 1 h, sessions révoquées), changement de mot de passe.
- Paramètres : relances configurables, consentement IA, anonymisation, export JSON RGPD, suppression de compte.
- Connecteurs : démo (fictive), France Travail (non testé en réel), LinkedIn (liens uniquement). Dédoublonnage inter-sources, reprises.
- Matching explicable sur 100 (5 critères), filtres, favoris, rejet, brouillon de candidature.
- Jeu de référence de 20 offres + `npm run eval:matching` (P@5, P@10, R@10) → `docs/matching-evaluation.md`.
- Correction : l'email saisi était effacé après un échec de connexion.
- Tests : 21 unitaires, 2 parcours e2e Playwright.
## [0.1.0] - 2026-11-09
- Initialisation, schéma Prisma, authentification, profil, import/analyse CV.
