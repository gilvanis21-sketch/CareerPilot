# Connexion OAuth2 à Gmail et Outlook

L'étudiant clique sur « Se connecter avec Google / Microsoft », autorise l'**envoi** de messages, et revient dans l'application. Aucun mot de passe n'est saisi ni stocké ; les jetons sont chiffrés (AES-256-GCM). Les candidatures partent par l'API Gmail (`gmail.send`) ou Microsoft Graph (`Mail.Send`) : l'application ne peut **pas** lire la boîte.

Sécurité : code d'autorisation + PKCE (S256), paramètre `state` lié à l'utilisateur et à un cookie chiffré de 10 min, jetons de renouvellement renouvelés automatiquement, autorisation révocable côté Google / Microsoft.

## Variables d'environnement (`.env`)
```
APP_URL="http://localhost:3112"
GOOGLE_CLIENT_ID=""      GOOGLE_CLIENT_SECRET=""
MICROSOFT_CLIENT_ID=""   MICROSOFT_CLIENT_SECRET=""
```
URI de redirection à déclarer chez chaque fournisseur (identique à `APP_URL`, sans barre finale) :
- `http://localhost:3112/api/oauth/gmail/callback`
- `http://localhost:3112/api/oauth/outlook/callback`

Redémarrer l'application après modification du `.env`. Un bouton non configuré affiche « non configuré sur ce serveur ».

## Google (Gmail)
1. https://console.cloud.google.com → créer un projet.
2. **API et services → Bibliothèque** : activer **Gmail API**.
3. **Écran de consentement OAuth** : type *Externe*, renseigner le nom de l'application ; ajouter la portée `.../auth/gmail.send` ; tant que l'application est en mode « Test », ajouter les adresses des testeurs (100 max). Au-delà, une validation Google est requise (portée sensible).
4. **Identifiants → Créer des identifiants → ID client OAuth → Application Web** ; ajouter l'URI de redirection ci-dessus.
5. Copier l'ID client et le secret dans `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
En mode « Test », Google révoque les jetons au bout de 7 jours : l'étudiant devra se reconnecter (message explicite dans l'application).

## Microsoft (Outlook, Hotmail, Microsoft 365)
1. https://entra.microsoft.com → **Inscriptions d'applications → Nouvelle inscription**.
2. Types de comptes pris en charge : **« Comptes dans un annuaire d'organisation et comptes Microsoft personnels »** (indispensable pour outlook.com / hotmail).
3. URI de redirection : plateforme **Web**, valeur ci-dessus.
4. **Autorisations d'API → Microsoft Graph → Déléguées** : `Mail.Send`, `User.Read`, `offline_access`.
5. **Certificats et secrets → Nouveau secret client** : copier la **valeur** (visible une seule fois) dans `MICROSOFT_CLIENT_SECRET` ; l'ID d'application (client) dans `MICROSOFT_CLIENT_ID`.
Pour un compte professionnel/scolaire, l'administrateur du tenant peut devoir autoriser l'application.

## Dépannage
| Symptôme | Cause probable |
|---|---|
| Bouton « non configuré » | variables manquantes ou serveur non redémarré |
| Google `redirect_uri_mismatch` / Microsoft `AADSTS50011` | l'URI déclarée ne correspond pas exactement à `APP_URL` + `/api/oauth/.../callback` |
| Google « accès bloqué » | adresse non ajoutée aux testeurs (mode Test) |
| Microsoft `AADSTS700016` / `AADSTS50020` | type de comptes mal choisi à l'étape 2 |
| « autorisation expirée » à l'envoi | jeton révoqué ou expiré : reconnecter depuis Paramètres |

Le mot de passe d'application (Gmail, ou Microsoft 365 avec SMTP activé) reste disponible dans « Autre méthode ».
