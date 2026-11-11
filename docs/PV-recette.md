# Procès-verbal de recette — CareerPilot v0.4

Date : 2026-11-10 · Environnement : Linux, Node 26.13, PostgreSQL 17 (Docker), build de production (`next build` + `next start`).
Données : **exclusivement fictives** (CV fictif `tests/fixtures/cv-fictif.docx`, offres du jeu de référence, serveur SMTP fictif local).

## 1. Synthèse
| Campagne | Résultat |
|---|---|
| Tests unitaires et d'intégration (vitest) | **45 / 45** |
| Parcours fonctionnels et sécurité de bout en bout (Playwright, navigateur réel) | **6 / 6** |
| Lint, typage TypeScript, build de production | OK |
| `npm audit --omit=dev` | 0 vulnérabilité |
| Matching sur 20 offres annotées | P@5 = 100 %, P@10 = 90 %, R@10 = 100 % (voir réserves §4) |

## 2. Cas de test exécutés (résultats réels)
| Réf. | Exigence | Test | Statut |
|---|---|---|---|
| M1-1 | Inscription avec consentement obligatoire | e2e `flow`, `security.test` (schéma) | ✅ |
| M1-2 | Connexion / déconnexion, mauvais mot de passe refusé | e2e `flow` | ✅ |
| M1-3 | Récupération de mot de passe (jeton haché, 1 h, sessions révoquées) | implémenté ; **pas de test automatisé** | ⚠ non testé |
| M1-4 | Suppression de compte + export JSON | e2e `flow` (export, suppression, reconnexion refusée) | ✅ |
| M2-1 | Import CV DOCX, extraction, profil modifiable | e2e `flow`, unit `cv-parser` | ✅ |
| M2-2 | Import CV **PDF** | extraction codée, **aucun PDF réel testé** | ⚠ non testé |
| M2-3 | Aucune compétence inventée | unit `cv-parser` | ✅ |
| M3-1 | Source de démonstration, dédoublonnage, pas de doublon à la 2ᵉ collecte | e2e `offers`, unit `dedupe` | ✅ |
| M3-2 | France Travail (API officielle) | mapping/OAuth sur réponse simulée ; **appel réel : échec `invalid_scope`** | ❌ bloqué (voir §4) |
| M3-3 | LinkedIn : liens uniquement, aucune collecte | unit | ✅ |
| M4-1 | Filtres, classement par score, explication, compétences manquantes | e2e `offers` | ✅ |
| M4-2 | Qualité du matching | `npm run eval:matching`, unit | ✅ (réserves §4) |
| M5-1 | Cartes, favoris, rejet, brouillon sans envoi | e2e `offers` | ✅ |
| M6-1 | Génération de messages sans invention | unit `generate` + essais réels Anthropic (3/3) | ✅ |
| M6-2 | Modifier / régénérer / copier / valider | e2e `send` (modifier, valider) ; copier et régénérer non automatisés | ⚠ partiel |
| M7-1 | Spontanée : 12 compétences 360, stage de 2 mois, e-mail saisi par l'étudiant | e2e `send`, unit | ✅ |
| M8-1 | Envoi refusé sans validation / sans confirmation / sans destinataire / au-delà du plafond | unit `send-guard` (7 cas), e2e `send` | ✅ |
| M8-2 | Envoi réel depuis l'adresse de l'étudiant | e2e + unit vers **serveur SMTP fictif** | ✅ simulé |
| M8-3 | Envoi via un **vrai** Gmail | non effectué | ⚠ non testé |
| M8-4 | Relances J+7 / J+15 planifiées | e2e `send` (planification) ; **envoi d'une relance non testé** | ⚠ partiel |
| M9-1 | Tableau de bord (8 indicateurs, graphique) | e2e `send` | ✅ |
| M10-1 | Tendances du marché, k-anonymat (K=3) | unit `market` (6 cas), e2e `offers` | ✅ |

## 3. Sécurité et performance
| Contrôle | Résultat |
|---|---|
| Routes privées redirigent vers /login (8 routes), export 401, cron 403 (sans/avec mauvais secret) | ✅ e2e |
| Isolation : l'étudiant B reçoit 404 sur la candidature de A, ne la voit pas en liste ni dans son export | ✅ e2e |
| Cookie de session `HttpOnly`, `SameSite=Lax` | ✅ e2e |
| En-têtes `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, pas de `X-Powered-By` | ✅ e2e |
| Upload : faux PDF et `.exe` refusés | ✅ e2e |
| Chiffrement AES-256-GCM (altération détectée), bcrypt, limitation de débit | ✅ unit |
| Mobile 375 px : aucun défilement horizontal sur 9 pages | ✅ e2e |
| Perf : 10 000 scores en 1,7 s ; 10 000 clés de dédoublonnage en 76 ms | ✅ |
| **Non fait** : audit d'accessibilité (axe/lecteur d'écran), test de charge HTTP, test d'intrusion, CSP | ⚠ |

## 4. Réserves et anomalies connues
1. **France Travail** : API non accessible (`invalid_scope`, absente du catalogue de l'application ; une source signale une suspension d'octobre 2026). Les offres réelles ne sont donc **pas** collectées ; seule la source de démonstration (fictive) alimente l'application.
2. **Matching** : 20 offres, un seul profil, annotations rédigées par l'équipe de développement (assistée par IA) et non relues par un humain. Les métriques sont indicatives ; elles ne prouvent pas la performance sur des offres réelles.
3. **Envoi réel** et **relance envoyée** non éprouvés sur une vraie messagerie.
4. Limiteur de débit en mémoire (non partagé entre instances) ; pas de CSP ; la récupération de mot de passe n'envoie pas d'e-mail en production (aucun service d'envoi système configuré) — le lien n'est affiché qu'en développement.
5. Problèmes d'outillage rencontrés : cache du serveur de dev corrompu par des arrêts brutaux → la recette automatisée tourne sur un build de production.

## 5. Décision
Recette **conditionnelle** : fonctionnalités livrées validées sur données fictives. Avant usage réel : (a) obtenir une source d'offres réelle, (b) essai d'envoi avec un compte Gmail jetable, (c) faire relire le jeu annoté par un tuteur, (d) configurer un envoi d'e-mails système pour la réinitialisation de mot de passe.

Signatures : ______________ (étudiant)  ______________ (tuteur CCCLX)
