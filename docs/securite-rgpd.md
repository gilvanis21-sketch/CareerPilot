# Dossier sécurité et RGPD

| Exigence | Mise en œuvre | Vérifié |
|---|---|---|
| Consentement explicite | case obligatoire à l'inscription (`consentAt`) ; consentement IA séparé et révocable | e2e/unit |
| Minimisation / LLM | analyse du CV locale ; envoi à l'IA seulement avec consentement ; nom masqué (`anonymizeForAi`) | unit + essai réel |
| Droit d'accès / portabilité | export JSON (`/api/account/export`), sans jeton | e2e |
| Droit à l'effacement | suppression en cascade + fichiers CV ; trace non nominative | e2e |
| Secrets | AES-256-GCM, clés uniquement côté serveur | unit |
| Authentification | bcrypt (12), sessions hachées 14 j, limitation de débit, réponse neutre au « mot de passe oublié » | unit/e2e |
| Isolation | filtrage par `userId` ; 404 inter-comptes | e2e |
| Entrées | Zod, signature des fichiers, 5 Mo, extensions | unit/e2e |
| Humain dans la boucle | validation + confirmation côté serveur, jamais d'adresse devinée | unit/e2e |
| Traçabilité | `ActivityLog` | partiel |
| Statistiques de marché | agrégées, K=3 | unit |
| LinkedIn / CGU | aucune collecte | unit |

**Écarts à traiter avant production** : durée de conservation automatique, CSP, DPA avec l'hébergeur et Anthropic, registre de traitements, e-mail système de réinitialisation, test d'intrusion, audit d'accessibilité. **Données** : uniquement fictives jusqu'à la recette.
