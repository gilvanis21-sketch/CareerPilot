# Rapport de projet — CareerPilot
*Clinique de l'IT (CCCLX / aivancity)*

## 1. Contexte et objectif
Les offres de stage et d'alternance sont dispersées ; les étudiants candidatent de façon peu ciblée et sans suivi. CareerPilot centralise : dépôt du CV, recherche d'offres, classement par compatibilité, génération de messages personnalisés, envoi **validé par l'étudiant** depuis sa propre messagerie, suivi, statistiques.

## 2. Cadrage et décision
Trois options comparées (tableur, extension d'un outil existant, application dédiée) dans `docs/cadrage.md` (notes d'appréciation, non mesurées). Application dédiée retenue (4,6/5 pondéré) pour la maîtrise RGPD, les connecteurs et les statistiques agrégées.

## 3. Architecture et choix
Next.js 16 (monolithe modulaire), TypeScript, Tailwind, PostgreSQL + Prisma 7 (15 entités), sessions en base, chiffrement AES-256-GCM. Justifications dans `ARCHITECTURE.md` : pas de service FastAPI (non justifié), Prisma 7 stable (la version « latest » était une préversion), Cache Components désactivés (application entièrement dynamique). Connecteurs indépendants (`docs/connectors.md`).

## 4. Réalisations
S1 : authentification, profil, import/analyse de CV, RGPD (export, suppression). S2 : connecteurs, dédoublonnage, filtres, matching explicable, jeu annoté. S3 : génération IA avec garde-fou anti-invention, spontanées (12 compétences 360), envoi SMTP validé, plafond, relances, tableau de bord. Phase 2 : tendances du marché anonymisées (K=3). Recette : `docs/PV-recette.md`.

## 5. Évaluation
- **Tests** : 45 unitaires/intégration, 6 parcours de bout en bout, 0 vulnérabilité de dépendance de production.
- **Matching** (20 offres fictives, 1 profil) : P@5 100 %, P@10 90 %, R@10 100 %. Une première version donnait trop de crédit aux offres sans compétences listées hors domaine (cuisinier, infirmier) ; corrigée sans changer les métriques mais en rendant le bas du classement cohérent. **Limite majeure** : annotations non relues par un humain, échantillon minuscule — pas de conclusion sur des offres réelles.
- **IA** : Claude testé en réel, 3 essais sur 3 sans compétence inventée ; le garde-fou a révélé trois défauts de mon propre code (faux positifs « C# », exemption trop large des technos de l'offre, lecture du mauvais bloc de réponse).
- **Performance** : 10 000 scores en 1,7 s.

## 6. Difficultés et enseignements
- **API France Travail indisponible** (suspension signalée) : le cœur « offres réelles » n'est pas démontrable ; repli sur une source de démonstration clairement étiquetée. Options dans `docs/sources-offres-options.md`.
- **OAuth Gmail/Outlook** impossible sans application déclarée : remplacé par SMTP + mot de passe d'application (Outlook personnel non supporté).
- Les tests automatisés ont trouvé des défauts réels (champs effacés après erreur de connexion, message de confirmation qui disparaissait, course entre test et synchronisation) ; l'instabilité du serveur de dev a conduit à tester sur build de production.
- Données uniquement fictives ; développement assisté par Claude Code, relecture humaine nécessaire pour les annotations et les textes générés.

## 7. Limites et perspectives
Source d'offres réelle ; essai d'envoi réel ; relecture des annotations ; accessibilité ; CSP ; e-mail système de réinitialisation ; conservation automatique ; OAuth2 ; import manuel d'offres ; matching enrichi par LLM puis nouvelle mesure P@k sur un jeu plus grand.
