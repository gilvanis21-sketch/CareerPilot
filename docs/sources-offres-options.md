# Sources d'offres : options face au blocage France Travail

**Constat (2026-11-10)** : connexion OAuth acceptée mais `invalid_scope` ; l'API « Offres d'emploi v2 » n'apparaît plus dans le catalogue de l'application. Une fiche data.gouv datée du 2026-10-20 indique son retrait temporaire pendant l'examen de ses conditions de réutilisation (non confirmé sur le site officiel).

| Option | Légal / CGU | Effort | Réserves |
|---|---|---|---|
| A. Demander l'accès à France Travail (formulaire de contact de francetravail.io), projet pédagogique CCCLX | Oui, source officielle | Faible (un message) | Délai et réponse inconnus |
| B. Jeu de données ouvert « France Travail – Offres d'emploi » (data.gouv, Licence Ouverte 2.0, CSV/JSON ~650 Ko, màj 27/08/2026) | Oui | Moyen (import planifié) | Petit volume, fraîcheur et présence de stages/alternance **non vérifiées** : à télécharger et inspecter avant de s'engager |
| C. Agrégateur à clé (ex. Adzuna) | Selon CGU : attribution (logo + lien) obligatoire, accès à leur discrétion | Moyen | Gratuité et couverture France **non confirmées** ; à vérifier sur developer.adzuna.com |
| D. Flux « offres » publiés par des sites carrières (JSON-LD `JobPosting`, RSS) avec robots.txt/CGU favorables | Au cas par cas | Élevé | Hétérogène ; seulement des sites qui l'autorisent |
| E. Saisie / import manuel (l'étudiant colle l'URL ou le texte d'une offre trouvée lui-même, y compris sur LinkedIn) | Oui | Faible | Pas de découverte automatique, mais zéro risque juridique |
| F. Rester en démonstration pour la soutenance | Oui | Nul | À annoncer clairement |

**Recommandation** : A (immédiat) + E (livrable vite, utile même avec une API) + B si l'inspection du fichier montre des offres exploitables. Écarter tout scraping de sites dont les CGU l'interdisent.

## Brouillon de message à France Travail
> Objet : Demande d'accès à l'API Offres d'emploi — projet pédagogique CCCLX (aivancity)
>
> Bonjour, nous développons CareerPilot, un outil pédagogique d'aide à la recherche de stages et d'alternance pour les étudiants de la Clinique de l'IT (CCCLX, aivancity). Notre application (identifiants créés sur francetravail.io) obtient un jeton mais l'API « Offres d'emploi v2 » n'apparaît plus dans le catalogue et la demande de scope `api_offresdemploiv2` est rejetée (`invalid_scope`). Pouvez-vous nous indiquer si l'API est toujours ouverte et comment y souscrire ? L'usage serait en lecture seule, avec mention de la source, sans redistribution, sur un volume faible. Merci.
