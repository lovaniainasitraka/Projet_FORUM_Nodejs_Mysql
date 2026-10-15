# NEXUS — Forum Web
> HTML · CSS · JavaScript · Node.js · MySQL · bcrypt · UUID

---

## 📋 Prérequis

| Outil       | Version minimale |
|-------------|-----------------|
| Node.js     | 18+             |
| MySQL       | 8.0+            |

---

## 🚀 Installation & Démarrage

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer MySQL

Créez un fichier `.env` à partir de `.env.example` puis adaptez les valeurs :

```powershell
Copy-Item .env.example .env
```

Variables disponibles :
```bash
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=forum_user
DB_PASSWORD=Forum2026!
PORT=8080
NODE_ENV=development
```

Si MySQL refuse la connexion au démarrage, vérifiez bien que `DB_USER` et `DB_PASSWORD` correspondent à votre installation locale. Le serveur ne peut pas démarrer sans accès valide à la base `forum_db`.

### 3. Lancer le serveur
```bash
npm start
```

Sur Windows PowerShell, si `npm start` est bloqué par la politique d'exécution, utilisez :
```bash
npm.cmd start
```

Pour lancer directement le forum sur une instance MySQL locale en port `3307` :
```bash
npm run start:local
```

> La base de données `forum_db` et toutes les tables sont créées **automatiquement** au démarrage.

### 4. Ouvrir dans le navigateur
```
http://localhost:8080
```

---

## 📁 Structure du projet

```
forum/
├── server.js          # Serveur Express — toutes les routes API
├── database.js        # Connexion MySQL + initialisation
├── schema.sql         # Schéma complet de la base de données
├── package.json
└── public/
    ├── index.html     # Page principale (SPA)
    ├── styles.css     # Design dark/cyberpunk
    └── app.js         # Logique frontend (fetch API)
```

---

## 🗄️ Schéma de la base de données

```
users          — id(UUID), username, email, password(bcrypt), avatar
sessions       — id(UUID), user_id, expires_at
categories     — id, name, icon
posts          — id(UUID), user_id, title, content
post_categories— post_id, category_id  (relation N:N)
comments       — id(UUID), post_id, user_id, content
reactions      — id, user_id, post_id?, comment_id?, type(like|dislike)
```

---

## 🔗 Routes API

### Auth
| Méthode | Route           | Description                    |
|---------|-----------------|--------------------------------|
| POST    | /api/register   | Créer un compte                |
| POST    | /api/login      | Connexion (cookie session)     |
| POST    | /api/logout     | Déconnexion                    |
| GET     | /api/me         | Utilisateur connecté           |

### Posts
| Méthode | Route                    | Description                    |
|---------|--------------------------|--------------------------------|
| GET     | /api/posts               | Liste (filtres: category/mine/liked) |
| GET     | /api/posts/:id           | Détail + commentaires          |
| POST    | /api/posts               | Créer un post 🔒               |
| DELETE  | /api/posts/:id           | Supprimer son post 🔒          |

### Commentaires
| Méthode | Route                         | Description          |
|---------|-------------------------------|----------------------|
| POST    | /api/posts/:id/comments       | Ajouter commentaire 🔒 |

### Réactions
| Méthode | Route                         | Description          |
|---------|-------------------------------|----------------------|
| POST    | /api/posts/:id/react          | Like/dislike post 🔒 |
| POST    | /api/comments/:id/react       | Like/dislike comment 🔒 |

### Catégories
| Méthode | Route           | Description    |
|---------|-----------------|----------------|
| GET     | /api/categories | Toutes les catégories |

> 🔒 = Authentification requise

---

## ✅ Fonctionnalités implémentées

- [x] Inscription avec email unique + mot de passe chiffré (bcrypt)
- [x] Connexion avec session cookie (UUID, expiration 24h)
- [x] Une seule session par utilisateur
- [x] Création de posts avec catégories multiples
- [x] Commentaires sur les posts
- [x] Likes / dislikes sur posts et commentaires (toggle)
- [x] Filtrage par catégorie (sous-forums)
- [x] Filtrage "Mes publications" (utilisateur connecté)
- [x] Filtrage "Mes likes" (utilisateur connecté)
- [x] Gestion des erreurs HTTP (400, 401, 403, 404, 500)
- [x] Suppression de ses propres posts
- [x] Visibilité publique des posts et compteurs

---

## 📦 Packages utilisés

| Package       | Usage                          |
|---------------|--------------------------------|
| express       | Serveur HTTP                   |
| mysql2        | Connexion MySQL (promisifiée)  |
| bcrypt        | Chiffrement des mots de passe  |
| uuid          | Génération d'identifiants UUID |
| cookie-parser | Lecture des cookies            |
