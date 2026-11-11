# Connecteurs de sources d'offres

| Source | Type | État | Test |
|---|---|---|---|
| Démo (offres fictives) | DEMO | opérationnelle | e2e |
| France Travail (API officielle) | API_OFFICIELLE | implémentée mais **bloquée** : testée en réel le 2026-11-10, `invalid_scope` (l'API « Offres d'emploi v2 » n'apparaît plus dans le catalogue de l'application ; une source signale sa suspension le 2026-10-20) | mapping + OAuth sur réponse simulée |
| LinkedIn | LIEN_RECHERCHE | liens préremplis uniquement, **aucune collecte** | unitaire |

Sans clés (`FRANCE_TRAVAIL_CLIENT_ID/SECRET`), la source France Travail est ignorée sans erreur.
Le scope OAuth (`FRANCE_TRAVAIL_SCOPE`) et les codes de nature de contrat sont à confirmer dans la documentation de l'API au moment de l'obtention des clés : le classement du contrat repose pour l'instant sur le texte de l'intitulé.

## Ajouter une nouvelle source
1. **Vérifier les conditions d'utilisation** de la source (API officielle, flux autorisé, robots.txt). Pas d'autorisation claire = pas de collecte (liens de recherche seulement).
2. Créer `connectors/ma-source.ts` implémentant `Connector` (`connectors/types.ts`) : `slug`, `kind`, `termsUrl`, `termsNote`, `isConfigured()`, `search()` qui renvoie des `RawOffer`.
3. L'enregistrer dans `connectors/registry.ts`.
4. Écrire un test avec une réponse simulée (voir `tests/france-travail.test.ts`).
5. Documenter la source dans le tableau ci-dessus.
Le dédoublonnage inter-sources (`services/dedupe.ts`), les reprises (3 essais, backoff exponentiel) et la journalisation sont automatiques.
