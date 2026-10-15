// server.js — Serveur principal du Forum
'use strict';

require('dotenv').config();

const express      = require('express');
const cookieParser = require('cookie-parser');
const bcrypt       = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path         = require('path');
const db           = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS    = 12;
const SESSION_HOURS  = 24; // durée de vie du cookie
const IS_PROD = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

//  Middlewares globaux
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware auth 
async function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) return res.status(401).json({ error: 'Non authentifié' });

  const sessions = await db.query(
    'SELECT s.*, u.id AS uid, u.username, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > NOW()',
    [sessionId]
  );
  if (!sessions.length) return res.status(401).json({ error: 'Session expirée' });

  req.user = { id: sessions[0].uid, username: sessions[0].username, email: sessions[0].email };
  next();
}

async function optionalAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;
  req.user = null;
  if (sessionId) {
    const sessions = await db.query(
      'SELECT s.*, u.id AS uid, u.username, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > NOW()',
      [sessionId]
    );
    if (sessions.length) {
      req.user = { id: sessions[0].uid, username: sessions[0].username, email: sessions[0].email };
    }
  }
  next();
}

//  Auth Routes

// POST /api/register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'Tous les champs sont requis.' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });

    // Vérifier email / username existants
    const existing = await db.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length)
      return res.status(409).json({ error: 'Email ou nom d\'utilisateur déjà utilisé.' });

    // Hash du mot de passe (bcrypt)
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const userId  = uuidv4();
    const avatars = ['🦊','🐺','🦁','🐯','🦝','🐻','🦄','🐸','🦋','🐙'];
    const avatar  = avatars[Math.floor(Math.random() * avatars.length)];

    await db.query(
      'INSERT INTO users (id, username, email, password, avatar) VALUES (?, ?, ?, ?, ?)',
      [userId, username, email, hashed, avatar]
    );

    res.status(201).json({ message: 'Inscription réussie !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email et mot de passe requis.' });

    const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users.length)
      return res.status(401).json({ error: 'Identifiants incorrects.' });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Identifiants incorrects.' });

    // Supprimer les anciennes sessions de cet utilisateur (1 session max)
    await db.query('DELETE FROM sessions WHERE user_id = ?', [user.id]);

    // Créer une nouvelle session (UUID)
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, user.id, expiresAt]
    );

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      expires : expiresAt,
      sameSite: 'strict',
      secure  : IS_PROD,
    });

    res.json({
      message : 'Connexion réussie !',
      user    : { id: user.id, username: user.username, email: user.email, avatar: user.avatar }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/logout
app.post('/api/logout', async (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) await db.query('DELETE FROM sessions WHERE id = ?', [sessionId]);
  res.clearCookie('session_id');
  res.json({ message: 'Déconnexion réussie.' });
});

// GET /api/me
app.get('/api/me', optionalAuth, async (req, res) => {
  if (!req.user) return res.json({ user: null });

  const users = await db.query('SELECT id, username, email, avatar FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: users[0] || null });
});

//  Categories
app.get('/api/categories', async (req, res) => {
  try {
    const cats = await db.query('SELECT * FROM categories ORDER BY name');
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});


//  Posts

// GET /api/posts — avec filtres
app.get('/api/posts', optionalAuth, async (req, res) => {
  try {
    const { category, mine, liked } = req.query;

    let sql = `
      SELECT
        p.id, p.title, p.content, p.created_at,
        u.id AS user_id, u.username, u.avatar,
        GROUP_CONCAT(DISTINCT c.id   ORDER BY c.id SEPARATOR ',') AS category_ids,
        GROUP_CONCAT(DISTINCT c.name ORDER BY c.id SEPARATOR ',') AS category_names,
        GROUP_CONCAT(DISTINCT c.icon ORDER BY c.id SEPARATOR ',') AS category_icons,
        COALESCE(SUM(r.type = 'like'),    0) AS likes,
        COALESCE(SUM(r.type = 'dislike'), 0) AS dislikes,
        COUNT(DISTINCT cm.id) AS comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN categories c       ON pc.category_id = c.id
      LEFT JOIN reactions r        ON p.id = r.post_id
      LEFT JOIN comments cm        ON p.id = cm.post_id
    `;
    const params = [];

    if (category) {
      sql += ' WHERE c.id = ?';
      params.push(category);
    } else if (mine && req.user) {
      sql += ' WHERE p.user_id = ?';
      params.push(req.user.id);
    } else if (liked && req.user) {
      sql += ' WHERE r.user_id = ? AND r.type = "like"';
      params.push(req.user.id);
    }

    sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const posts = await db.query(sql, params);

    // Ajouter la réaction de l'utilisateur connecté
    if (req.user) {
      const userReactions = await db.query(
        'SELECT post_id, type FROM reactions WHERE user_id = ? AND post_id IS NOT NULL',
        [req.user.id]
      );
      const reactionMap = {};
      userReactions.forEach(r => { reactionMap[r.post_id] = r.type; });
      posts.forEach(p => { p.user_reaction = reactionMap[p.id] || null; });
    }

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/posts/:id
app.get('/api/posts/:id', optionalAuth, async (req, res) => {
  try {
    const posts = await db.query(`
      SELECT p.*, u.username, u.avatar,
        GROUP_CONCAT(DISTINCT c.id   SEPARATOR ',') AS category_ids,
        GROUP_CONCAT(DISTINCT c.name SEPARATOR ',') AS category_names,
        GROUP_CONCAT(DISTINCT c.icon SEPARATOR ',') AS category_icons,
        COALESCE(SUM(r.type='like'),    0) AS likes,
        COALESCE(SUM(r.type='dislike'), 0) AS dislikes
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN categories c       ON pc.category_id = c.id
      LEFT JOIN reactions r        ON p.id = r.post_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [req.params.id]);

    if (!posts.length) return res.status(404).json({ error: 'Post introuvable.' });

    // Commentaires
    const comments = await db.query(`
      SELECT cm.id, cm.content, cm.created_at,
        u.username, u.avatar, u.id AS user_id,
        COALESCE(SUM(r.type='like'),    0) AS likes,
        COALESCE(SUM(r.type='dislike'), 0) AS dislikes
      FROM comments cm
      JOIN users u ON cm.user_id = u.id
      LEFT JOIN reactions r ON cm.id = r.comment_id
      WHERE cm.post_id = ?
      GROUP BY cm.id
      ORDER BY cm.created_at ASC
    `, [req.params.id]);

    if (req.user) {
      const [pr] = await db.query(
        'SELECT type FROM reactions WHERE user_id=? AND post_id=?',
        [req.user.id, req.params.id]
      );
      posts[0].user_reaction = pr?.type || null;

      const cReactions = await db.query(
        'SELECT comment_id, type FROM reactions WHERE user_id=? AND comment_id IS NOT NULL',
        [req.user.id]
      );
      const cMap = {};
      cReactions.forEach(r => { cMap[r.comment_id] = r.type; });
      comments.forEach(c => { c.user_reaction = cMap[c.id] || null; });
    }

    res.json({ post: posts[0], comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/posts
app.post('/api/posts', requireAuth, async (req, res) => {
  try {
    const { title, content, categories } = req.body;

    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ error: 'Titre et contenu requis.' });

    const postId = uuidv4();
    await db.query(
      'INSERT INTO posts (id, user_id, title, content) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, title.trim(), content.trim()]
    );

    if (Array.isArray(categories) && categories.length) {
      for (const catId of categories) {
        await db.query(
          'INSERT IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)',
          [postId, catId]
        );
      }
    }

    res.status(201).json({ message: 'Post créé.', id: postId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/posts/:id
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const posts = await db.query('SELECT user_id FROM posts WHERE id=?', [req.params.id]);
    if (!posts.length) return res.status(404).json({ error: 'Post introuvable.' });
    if (posts[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'Non autorisé.' });

    await db.query('DELETE FROM posts WHERE id=?', [req.params.id]);
    res.json({ message: 'Post supprimé.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

//  Commentaires
app.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ error: 'Commentaire vide.' });

    const postExists = await db.query('SELECT id FROM posts WHERE id=?', [req.params.id]);
    if (!postExists.length) return res.status(404).json({ error: 'Post introuvable.' });

    const cmId = uuidv4();
    await db.query(
      'INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)',
      [cmId, req.params.id, req.user.id, content.trim()]
    );

    res.status(201).json({ message: 'Commentaire ajouté.', id: cmId });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

//  Réactions (like / dislike)
async function handleReaction(userId, targetType, targetId, type, res) {
  const col = targetType === 'post' ? 'post_id' : 'comment_id';

  // Réaction existante ?
  const existing = await db.query(
    `SELECT id, type FROM reactions WHERE user_id=? AND ${col}=?`,
    [userId, targetId]
  );

  if (existing.length) {
    if (existing[0].type === type) {
      // Même type → annuler
      await db.query(`DELETE FROM reactions WHERE id=?`, [existing[0].id]);
      return res.json({ message: 'Réaction annulée.' });
    } else {
      // Changer de type
      await db.query(`UPDATE reactions SET type=? WHERE id=?`, [type, existing[0].id]);
      return res.json({ message: 'Réaction mise à jour.' });
    }
  }

  // Nouvelle réaction
  await db.query(
    `INSERT INTO reactions (user_id, ${col}, type) VALUES (?, ?, ?)`,
    [userId, targetId, type]
  );
  res.json({ message: 'Réaction enregistrée.' });
}

app.post('/api/posts/:id/react', requireAuth, async (req, res) => {
  const { type } = req.body;
  if (!['like','dislike'].includes(type))
    return res.status(400).json({ error: 'Type invalide.' });
  try {
    await handleReaction(req.user.id, 'post', req.params.id, type, res);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/comments/:id/react', requireAuth, async (req, res) => {
  const { type } = req.body;
  if (!['like','dislike'].includes(type))
    return res.status(400).json({ error: 'Type invalide.' });
  try {
    await handleReaction(req.user.id, 'comment', req.params.id, type, res);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

//  Gestion des erreurs http
app.use((req, res) => {
  res.status(404).json({ error: '404 — Ressource introuvable.' });
});

app.use((err, req, res, next) => {
  console.error('Erreur non gérée :', err);
  res.status(500).json({ error: '500 — Erreur interne du serveur.' });
});

//  Démarrage
(async () => {
  try {
    await db.init();
    app.listen(PORT, () => {
      console.log(`🚀 Forum lancé sur http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Impossible de démarrer :', err.message);
    process.exit(1);
  }
})();
