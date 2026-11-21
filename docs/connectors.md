# Connecteurs de sources d'offres

| Source | Type | État | Test |
|---|---|---|---|
| **La bonne alternance** (offres réelles d'alternance) | API_OFFICIELLE | implémentée, active dès que `LBA_API_KEY` est définie ; **non testée en réel** (clé à créer par l'utilisateur) | mapping + filtres sur réponse simulée |
| Démo (offres fictives) | DEMO | **désactivée par défaut** ; `ENABLE_DEMO_OFFERS=1` la réactive (tests e2e, soutenance) | e2e |
| France Travail (API officielle) | API_OFFICIELLE | implémentée mais **bloquée** : testée en réel le 2026-11-10, `invalid_scope` (l'API « Offres d'emploi v2 » n'apparaît plus dans le catalogue de l'application ; une source signale sa suspension le 2026-10-20) | mapping + OAuth sur réponse simulée |
| LinkedIn | LIEN_RECHERCHE | liens préremplis uniquement, **aucune collecte** | unitaire |

## Obtenir de vraies offres (La bonne alternance)
1. Créer un compte gratuit sur https://api.apprentissage.beta.gouv.fr/fr/compte/profil et générer une clé d'API (usage non lucratif ; la clé est secrète, ne jamais la publier).
2. Mettre `LBA_API_KEY="..."` dans `.env`, puis redémarrer (`npm run build && npm start`).
3. Page **Offres → Actualiser les offres** : l'application récupère les offres d'alternance **encore ouvertes et publiées il y a moins de 90 jours**, autour de la première ville du profil (rayon 30 km), filtrées par métier (codes ROME déduits des mots-clés). Chaque offre renvoie vers la page où postuler.
Limites : 60 appels/minute ; uniquement l'alternance (aucun stage : l'objectif « stage » ne renvoie rien) ; les codes ROME couvrent l'informatique, la data et le marketing, sans correspondance aucun filtre métier n'est appliqué.

Sans clés (`FRANCE_TRAVAIL_CLIENT_ID/SECRET`), la source France Travail est ignorée sans erreur.
Le scope OAuth (`FRANCE_TRAVAIL_SCOPE`) et les codes de nature de contrat sont à confirmer dans la documentation de l'API au moment de l'obtention des clés : le classement du contrat repose pour l'instant sur le texte de l'intitulé.

## Ajouter une nouvelle source
1. **Vérifier les conditions d'utilisation** de la source (API officielle, flux autorisé, robots.txt). Pas d'autorisation claire = pas de collecte (liens de recherche seulement).
2. Créer `connectors/ma-source.ts` implémentant `Connector` (`connectors/types.ts`) : `slug`, `kind`, `termsUrl`, `termsNote`, `isConfigured()`, `search()` qui renvoie des `RawOffer`.
3. L'enregistrer dans `connectors/registry.ts`.
4. Écrire un test avec une réponse simulée (voir `tests/france-travail.test.ts`).
5. Documenter la source dans le tableau ci-dessus.
Le dédoublonnage inter-sources (`services/dedupe.ts`), les reprises (3 essais, backoff exponentiel) et la journalisation sont automatiques.
