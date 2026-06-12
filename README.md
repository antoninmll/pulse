# 🎧 Pulse

Partage tes playlists, suis leurs écoutes.

Pulse est une application web connectée à Spotify : tu te connectes avec ton compte Spotify
(aucun compte à créer), tu crées ou importes des playlists, tu les partages d'un simple lien,
et tu suis leurs statistiques d'écoute en temps réel (écoutes par morceau, auditeurs uniques,
tendance sur 14 jours).

## Fonctionnalités

- **Connexion Spotify** — OAuth officiel, le compte Pulse est créé automatiquement
  (tu choisis juste un nom d'utilisateur). Profil modifiable : photo, nom affiché, bio.
- **Playlists** — création de zéro avec **recherche directe dans le catalogue Spotify**,
  ajout par **lien Spotify** si la recherche ne suffit pas, et **import complet d'une
  playlist Spotify existante** en collant son lien.
- **Partage** — chaque playlist a un lien unique (`/p/xxxxxxxxxx`). Publique (visible dans
  Découvrir) ou privée (accessible à toi seul).
- **Lecture intégrale** — via le Spotify Web Playback SDK, avec lecteur intégré
  (lecture/pause, suivant/précédent, progression, volume). ⚠️ Nécessite **Spotify Premium**
  (limitation imposée par Spotify).
- **Stats créateur** — pour chaque playlist : écoutes totales, auditeurs uniques, morceau le
  plus écouté, écoutes par morceau et courbe des 14 derniers jours.

## Installation

### 1. Prérequis

- [Node.js](https://nodejs.org) 20 ou plus (déjà installé si tu as suivi la mise en place)
- Un compte Spotify (Premium pour la lecture intégrale)

### 2. Créer ton app Spotify (2 minutes, gratuit)

1. Va sur <https://developer.spotify.com/dashboard> et connecte-toi avec ton compte Spotify.
2. Clique **Create app** et remplis :
   - **App name** : `Pulse` (ou ce que tu veux)
   - **Redirect URI** : `http://127.0.0.1:3000/api/auth/callback`
     ⚠️ exactement cette valeur — Spotify n'accepte plus `localhost`, il faut `127.0.0.1`.
   - **APIs used** : coche **Web API** et **Web Playback SDK**.
3. Valide, puis ouvre **Settings** : copie le **Client ID** et le **Client secret**.

### 3. Configurer l'application

Ouvre le fichier `.env.local` à la racine du projet et colle tes identifiants :

```env
SPOTIFY_CLIENT_ID=ton_client_id
SPOTIFY_CLIENT_SECRET=ton_client_secret
APP_URL=http://127.0.0.1:3000
SESSION_SECRET=(déjà généré, ne pas toucher)
```

### 4. Lancer

```bash
npm install
npm run dev
```

Ouvre **http://127.0.0.1:3000** (bien `127.0.0.1`, pas `localhost`, pour que la connexion
Spotify fonctionne).

## ⚠️ Mode développement Spotify

Une app Spotify fraîchement créée est en **Development Mode** : seuls les utilisateurs que tu
ajoutes à la main peuvent se connecter (25 maximum).

Pour permettre à un ami de se connecter : dashboard Spotify → ton app → **Settings** →
**User Management** → ajoute son nom + l'email de son compte Spotify.

Pour ouvrir l'app à tout le monde, il faut demander le passage en *Extended Quota Mode*
depuis le dashboard (validation par Spotify).

## Structure technique

| Élément | Choix |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| Style | Tailwind CSS v4 + design system maison (verre dépoli, dégradés violet/cyan) |
| Base de données | SQLite (better-sqlite3) — fichier `data/pulse.db` créé automatiquement |
| Auth | OAuth Spotify (authorization code) + session signée HMAC en cookie httpOnly |
| Lecture | Spotify Web Playback SDK (l'app devient un appareil Spotify « Pulse ») |
| Stats | Chaque lecture déclenche un événement enregistré côté serveur (anti-doublon 30 s) |

### Scripts utiles

- `npm run dev` — serveur de développement
- `npm run build && npm start` — production
- `node scripts/seed-test.mjs` — injecte des données de démo (utilisateur + playlist +
  écoutes) et affiche un cookie de session de test, pratique pour voir l'interface sans
  configurer Spotify. Supprime le dossier `data/` pour repartir de zéro.
