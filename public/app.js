'use strict';

//  État global 
let currentUser   = null;
let categories    = [];
let activeFilter  = { type: 'all', value: null };

//  Init
document.addEventListener('DOMContentLoaded', async () => {
  await fetchMe();
  await fetchCategories();
  await fetchPosts();
});

//  Api helpers
async function api(method, url, body = null) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

//  Authentification
async function fetchMe() {
  try {
    const data = await api('GET', '/api/me');
    currentUser = data.user;
    renderAuthNav();
  } catch { currentUser = null; renderAuthNav(); }
}

function renderAuthNav() {
  const nav = document.getElementById('auth-nav');
  const newPostBtn  = document.getElementById('new-post-btn');
  const userFilters = document.getElementById('user-filters');

  if (currentUser) {
    nav.innerHTML = `
      <div class="user-chip">
        <span>${currentUser.avatar || '👤'}</span>
        <span>${escHtml(currentUser.username)}</span>
      </div>
      <button class="btn-secondary" onclick="logout()">Déconnexion</button>
    `;
    if (newPostBtn) newPostBtn.style.display = 'flex';
    if (userFilters) userFilters.style.display = 'block';
  } else {
    nav.innerHTML = `
      <button class="btn-nav" onclick="openModal('auth-modal'); switchTab('login')">Connexion</button>
      <button class="btn-primary" onclick="openModal('auth-modal'); switchTab('register')">S'inscrire</button>
    `;
    if (newPostBtn) newPostBtn.style.display = 'none';
    if (userFilters) userFilters.style.display = 'none';
  }
}

async function login() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';

  try {
    const data = await api('POST', '/api/login', { email, password });
    currentUser = data.user;
    closeModal('auth-modal');
    renderAuthNav();
    await fetchPosts();
    showToast('Bienvenue, ' + data.user.username + ' !');
  } catch (e) {
    errEl.textContent = e.message;
  }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('register-error');
  errEl.textContent = '';

  try {
    await api('POST', '/api/register', { username, email, password });
    showToast('Compte créé ! Connectez-vous maintenant.');
    switchTab('login');
  } catch (e) {
    errEl.textContent = e.message;
  }
}

async function logout() {
  await api('POST', '/api/logout');
  currentUser = null;
  renderAuthNav();
  activeFilter = { type: 'all', value: null };
  await fetchPosts();
  showToast('À bientôt !');
}

//  Categories
async function fetchCategories() {
  try {
    categories = await api('GET', '/api/categories');
    renderCategoryList();
  } catch { /* silencieux */ }
}

function renderCategoryList() {
  const list = document.getElementById('category-list');
  const allLi = list.querySelector('[data-id=""]');
  list.innerHTML = '';
  list.appendChild(allLi);

  categories.forEach(c => {
    const li = document.createElement('li');
    li.className = 'cat-item';
    li.dataset.id = c.id;
    li.innerHTML = `<span class="cat-icon">${c.icon}</span> ${escHtml(c.name)}`;
    li.onclick = () => filterByCategory(li, c.id);
    list.appendChild(li);
  });
}


//  Posts — Fetch & Render
async function fetchPosts() {
  const container = document.getElementById('posts-container');
  container.innerHTML = '<div class="loading-state"><span class="spinner"></span> Chargement…</div>';

  let url = '/api/posts';
  if (activeFilter.type === 'category' && activeFilter.value) {
    url += `?category=${activeFilter.value}`;
  } else if (activeFilter.type === 'mine') {
    url += '?mine=1';
  } else if (activeFilter.type === 'liked') {
    url += '?liked=1';
  }

  try {
    const posts = await api('GET', url);
    if (!posts.length) {
      container.innerHTML = '<div class="empty-state">// Aucun post trouvé</div>';
      return;
    }
    container.innerHTML = '';
    posts.forEach((p, i) => {
      const card = buildPostCard(p, i);
      container.appendChild(card);
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state">// Erreur : ${escHtml(e.message)}</div>`;
  }
}

function buildPostCard(post, idx) {
  const card = document.createElement('div');
  card.className = 'post-card';
  card.style.animationDelay = `${idx * 0.04}s`;

  const catNames = post.category_names ? post.category_names.split(',') : [];
  const catIcons = post.category_icons ? post.category_icons.split(',') : [];
  const tagsHtml = catNames.map((n, i) =>
    `<span class="tag">${catIcons[i] || ''} ${escHtml(n)}</span>`
  ).join('');

  const likedClass    = post.user_reaction === 'like'    ? 'liked'    : '';
  const dislikedClass = post.user_reaction === 'dislike' ? 'disliked' : '';

  card.innerHTML = `
    <div class="post-meta">
      <div class="avatar">${post.avatar || '👤'}</div>
      <span class="post-author">${escHtml(post.username)}</span>
      <span class="post-date">${formatDate(post.created_at)}</span>
    </div>
    <div class="post-title">${escHtml(post.title)}</div>
    <div class="post-excerpt">${escHtml(post.content)}</div>
    <div class="post-footer">
      <div class="tags">${tagsHtml}</div>
      <div class="reactions">
        <span class="comment-count">💬 ${post.comment_count || 0}</span>
        <button class="reaction-btn ${likedClass}"
          onclick="event.stopPropagation(); reactPost('${post.id}','like',this)">
          👍 <span>${post.likes || 0}</span>
        </button>
        <button class="reaction-btn ${dislikedClass}"
          onclick="event.stopPropagation(); reactPost('${post.id}','dislike',this)">
          👎 <span>${post.dislikes || 0}</span>
        </button>
      </div>
    </div>
  `;

  card.addEventListener('click', () => openPostDetail(post.id));
  return card;
}

//  Filtres
function setActiveFilter(type, value) {
  activeFilter = { type, value };
  // reset visual selection
  document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
}

function filterByCategory(el, catId) {
  setActiveFilter('category', catId);
  el.classList.add('active');
  const title = catId
    ? categories.find(c => c.id == catId)?.name || 'Catégorie'
    : 'Publications récentes';
  document.getElementById('feed-title').textContent = title;
  fetchPosts();
}

function filterMine(el) {
  if (!currentUser) { openModal('auth-modal'); return; }
  setActiveFilter('mine', null);
  el.classList.add('active');
  document.getElementById('feed-title').textContent = 'Mes publications';
  fetchPosts();
}

function filterLiked(el) {
  if (!currentUser) { openModal('auth-modal'); return; }
  setActiveFilter('liked', null);
  el.classList.add('active');
  document.getElementById('feed-title').textContent = 'Publications aimées';
  fetchPosts();
}

function showHome() {
  setActiveFilter('all', null);
  document.querySelector('.cat-item[data-id=""]').classList.add('active');
  document.getElementById('feed-title').textContent = 'Publications récentes';
  fetchPosts();
}


//  Nouveau Post
function showNewPostModal() {
  if (!currentUser) { openModal('auth-modal'); return; }

  // Remplir les checkboxes catégories
  const box = document.getElementById('post-categories');
  box.innerHTML = '';
  categories.forEach(c => {
    const label = document.createElement('label');
    label.className = 'cat-check-label';
    label.innerHTML = `
      <input type="checkbox" value="${c.id}" />
      ${c.icon} ${escHtml(c.name)}
    `;
    label.querySelector('input').addEventListener('change', () => {
      label.classList.toggle('checked', label.querySelector('input').checked);
    });
    box.appendChild(label);
  });

  document.getElementById('post-title').value   = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-error').textContent = '';
  openModal('post-modal');
}

async function submitPost() {
  const title   = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const errEl   = document.getElementById('post-error');
  errEl.textContent = '';

  const checked = document.querySelectorAll('#post-categories input:checked');
  const cats    = Array.from(checked).map(i => parseInt(i.value));

  if (!title)   { errEl.textContent = 'Le titre est requis.'; return; }
  if (!content) { errEl.textContent = 'Le contenu est requis.'; return; }

  try {
    await api('POST', '/api/posts', { title, content, categories: cats });
    closeModal('post-modal');
    showToast('Post publié !');
    setActiveFilter('all', null);
    await fetchPosts();
  } catch (e) {
    errEl.textContent = e.message;
  }
}

//  Détail Post
async function openPostDetail(postId) {
  const inner = document.getElementById('post-detail-inner');
  inner.innerHTML = '<div class="loading-state"><span class="spinner"></span></div>';
  openModal('post-detail-modal');

  try {
    const { post, comments } = await api('GET', `/api/posts/${postId}`);
    renderPostDetail(post, comments);
  } catch (e) {
    inner.innerHTML = `<div class="empty-state">// Erreur : ${escHtml(e.message)}</div>`;
  }
}

function renderPostDetail(post, comments) {
  const inner = document.getElementById('post-detail-inner');

  const catNames = post.category_names ? post.category_names.split(',') : [];
  const catIcons = post.category_icons ? post.category_icons.split(',') : [];
  const tagsHtml = catNames.map((n, i) =>
    `<span class="tag">${catIcons[i] || ''} ${escHtml(n)}</span>`
  ).join('');

  const likedClass    = post.user_reaction === 'like'    ? 'liked'    : '';
  const dislikedClass = post.user_reaction === 'dislike' ? 'disliked' : '';

  const isOwner = currentUser && currentUser.id === post.user_id;
  const deleteBtn = isOwner
    ? `<button class="btn-danger" onclick="deletePost('${post.id}')">🗑 Supprimer</button>`
    : '';

  const commentsHtml = comments.map(c => buildCommentHtml(c)).join('');

  const addCommentHtml = currentUser ? `
    <div class="add-comment">
      <h4>// Ajouter un commentaire</h4>
      <div class="comment-input-row">
        <textarea id="new-comment-text" rows="3" placeholder="Votre commentaire…"></textarea>
        <button class="btn-primary" onclick="submitComment('${post.id}')">Envoyer</button>
      </div>
      <div class="form-error" id="comment-error"></div>
    </div>
  ` : `<p style="color:var(--text-muted);font-size:13px;margin-top:16px;font-family:var(--font-mono)">// Connectez-vous pour commenter</p>`;

  inner.innerHTML = `
    <button class="modal-close" onclick="closeModal('post-detail-modal')">✕</button>

    <div class="post-detail">
      <div class="post-detail-header">
        <div class="avatar avatar-lg">${post.avatar || '👤'}</div>
        <div class="post-detail-meta">
          <div class="post-detail-author">${escHtml(post.username)}</div>
          <div class="post-detail-date">${formatDate(post.created_at)}</div>
        </div>
        ${deleteBtn}
      </div>

      <h1 class="post-detail-title">${escHtml(post.title)}</h1>
      <div class="tags" style="margin-bottom:16px">${tagsHtml}</div>
      <div class="post-detail-body">${escHtml(post.content)}</div>

      <div class="post-detail-actions">
        <button class="reaction-btn ${likedClass}" id="detail-like-btn"
          onclick="reactPostDetail('${post.id}','like')">
          👍 <span id="detail-likes">${post.likes || 0}</span>
        </button>
        <button class="reaction-btn ${dislikedClass}" id="detail-dislike-btn"
          onclick="reactPostDetail('${post.id}','dislike')">
          👎 <span id="detail-dislikes">${post.dislikes || 0}</span>
        </button>
      </div>

      <div class="comments-section">
        <div class="comments-title">// ${comments.length} Commentaire${comments.length !== 1 ? 's' : ''}</div>
        <div id="comments-list">${commentsHtml || '<p style="color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">// Aucun commentaire</p>'}</div>
        ${addCommentHtml}
      </div>
    </div>
  `;
}

function buildCommentHtml(c) {
  const likedClass    = c.user_reaction === 'like'    ? 'liked'    : '';
  const dislikedClass = c.user_reaction === 'dislike' ? 'disliked' : '';

  return `
    <div class="comment-card" id="comment-${c.id}">
      <div class="comment-meta">
        <div class="avatar">${c.avatar || '👤'}</div>
        <span class="comment-author">${escHtml(c.username)}</span>
        <span class="comment-date">${formatDate(c.created_at)}</span>
      </div>
      <div class="comment-body">${escHtml(c.content)}</div>
      <div class="comment-actions">
        <button class="reaction-btn ${likedClass}" onclick="reactComment('${c.id}','like',this)">
          👍 <span>${c.likes || 0}</span>
        </button>
        <button class="reaction-btn ${dislikedClass}" onclick="reactComment('${c.id}','dislike',this)">
          👎 <span>${c.dislikes || 0}</span>
        </button>
      </div>
    </div>
  `;
}

// Réaction post (dans le feed) 
async function reactPost(postId, type, btn) {
  if (!currentUser) { openModal('auth-modal'); return; }
  try {
    await api('POST', `/api/posts/${postId}/react`, { type });
    // Rafraîchir le post pour avoir les vrais compteurs
    const { post } = await api('GET', `/api/posts/${postId}`);
    const countEl  = btn.querySelector('span');
    const otherBtn = btn.closest('.reactions').querySelector(type === 'like' ? '.reaction-btn:last-child' : '.reaction-btn:first-child');

    btn.querySelector('span').textContent = type === 'like' ? post.likes : post.dislikes;
    otherBtn.querySelector('span').textContent = type === 'like' ? post.dislikes : post.likes;

    btn.classList.toggle(type === 'like' ? 'liked' : 'disliked');
    otherBtn.classList.remove(type === 'like' ? 'disliked' : 'liked');
  } catch (e) { showToast(e.message, true); }
}

// Réaction post (dans le détail) 
async function reactPostDetail(postId, type) {
  if (!currentUser) { openModal('auth-modal'); return; }
  try {
    await api('POST', `/api/posts/${postId}/react`, { type });
    const { post } = await api('GET', `/api/posts/${postId}`);
    document.getElementById('detail-likes').textContent    = post.likes;
    document.getElementById('detail-dislikes').textContent = post.dislikes;
    const likeBtn    = document.getElementById('detail-like-btn');
    const dislikeBtn = document.getElementById('detail-dislike-btn');
    likeBtn.className    = 'reaction-btn' + (post.user_reaction === 'like'    ? ' liked'    : '');
    dislikeBtn.className = 'reaction-btn' + (post.user_reaction === 'dislike' ? ' disliked' : '');
  } catch (e) { showToast(e.message, true); }
}

// Réaction commentaire 
async function reactComment(commentId, type, btn) {
  if (!currentUser) { openModal('auth-modal'); return; }
  try {
    await api('POST', `/api/comments/${commentId}/react`, { type });
    // Mise à jour visuelle optimiste
    const card      = btn.closest('.comment-card');
    const likeBtn   = card.querySelector('.reaction-btn:first-child');
    const dislikeBtn= card.querySelector('.reaction-btn:last-child');

    const wasActive = btn.classList.contains(type === 'like' ? 'liked' : 'disliked');
    likeBtn.classList.remove('liked');
    dislikeBtn.classList.remove('disliked');
    if (!wasActive) btn.classList.add(type === 'like' ? 'liked' : 'disliked');

    // Rafraîchir les compteurs
    const target = btn.querySelector('span');
    const current = parseInt(target.textContent);
    if (wasActive) target.textContent = Math.max(0, current - 1);
    else { target.textContent = current + 1; }
  } catch (e) { showToast(e.message, true); }
}

//  Commentaires
async function submitComment(postId) {
  const textarea = document.getElementById('new-comment-text');
  const errEl    = document.getElementById('comment-error');
  const content  = textarea.value.trim();
  errEl.textContent = '';

  if (!content) { errEl.textContent = 'Le commentaire est vide.'; return; }

  try {
    await api('POST', `/api/posts/${postId}/comments`, { content });
    textarea.value = '';
    showToast('Commentaire ajouté !');
    // Recharger le détail
    const { post, comments } = await api('GET', `/api/posts/${postId}`);
    renderPostDetail(post, comments);
  } catch (e) {
    errEl.textContent = e.message;
  }
}

//  Suppression Post
async function deletePost(postId) {
  if (!confirm('Supprimer ce post définitivement ?')) return;
  try {
    await api('DELETE', `/api/posts/${postId}`);
    closeModal('post-detail-modal');
    showToast('Post supprimé.');
    await fetchPosts();
  } catch (e) { showToast(e.message, true); }
}


//  Modals
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function switchTab(tab) {
  document.getElementById('form-login').style.display    = tab === 'login' ? 'block' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-error').textContent    = '';
  document.getElementById('register-error').textContent = '';
}

// Fermeture avec Échap
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});


//  Toast
let toastTimeout;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast' + (isError ? ' error' : '');
  setTimeout(() => t.classList.add('show'), 10);
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 3500);
}


//  Utils
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000)   return 'À l\'instant';
  if (diff < 3600000) return `il y a ${Math.floor(diff/60000)} min`;
  if (diff < 86400000)return `il y a ${Math.floor(diff/3600000)} h`;
  return d.toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' });
}
