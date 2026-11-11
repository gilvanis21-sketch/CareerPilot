# Sécurité et RGPD
Implémenté : consentement explicite à l'inscription, mots de passe bcrypt, sessions hachées, rate limiting, validation Zod, chiffrement AES-256-GCM, journal d'activité, isolation par utilisateur, CV privés.
À faire : suppression/export de compte, politique de conservation, consentement IA avant tout envoi à un LLM, anonymisation du CV avant LLM, en-têtes de sécurité, protection CSRF des routes API.
Données : uniquement fictives pendant le développement.

## Messagerie de l'étudiant
- Aucun mot de passe de compte : uniquement un mot de passe d'application, vérifié (SMTP) avant enregistrement, chiffré AES-256-GCM, jamais renvoyé au navigateur ni journalisé.
- Envoi : validation + case de confirmation contrôlées côté serveur (`services/send-guard.ts`), toute modification annule la validation, plafond quotidien, aucun destinataire deviné.
- Limite connue : Outlook personnel n'accepte plus l'authentification SMTP basique ; le vrai OAuth2 Gmail/Outlook reste à faire (nécessite des identifiants d'application Google/Microsoft).
- `MAIL_HOST_OVERRIDE` (serveur fictif de test) est ignoré en production.
