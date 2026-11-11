# Support de soutenance — plan (≈ 15 min)

1. **Problème** (1 min) — offres dispersées, candidatures non suivies. 
2. **Solution** (1 min) — parcours : CV → offres classées → message → validation → envoi → suivi.
3. **Démo live** (5 min, données fictives) : inscription/consentement → import CV (profil prérempli, modifiable) → offres + score expliqué + compétences manquantes → spontanée avec compétences 360 → génération IA → **refus d'envoi sans validation** → validation → envoi (serveur SMTP fictif) → statut + dashboard → export/suppression RGPD.
4. **Architecture et sécurité** (2 min) — schéma, sessions hachées, AES-256-GCM, isolation, humain dans la boucle, anonymisation avant IA.
5. **Qualité mesurée** (2 min) — 45 tests + 6 e2e ; matching P@5/P@10/R@10 **avec ses réserves** (20 offres, annotation non relue) ; défauts trouvés par les tests.
6. **Limites assumées** (2 min) — France Travail indisponible, envoi réel non testé, pas d'OAuth, accessibilité non auditée.
7. **Suite** (1 min) — source réelle (options A/B/E), essai Gmail jetable, relecture des annotations.
8. **Questions** — préparer : « pourquoi pas du scraping ? » (CGU), « le score est-il une probabilité ? » (non), « et si l'IA invente ? » (garde-fou + validation humaine), « RGPD ? » (consentement, export, suppression, K-anonymat).

*Version diapositives (.pptx) à produire sur demande à partir de ce plan.*
