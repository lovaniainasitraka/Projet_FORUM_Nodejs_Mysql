// seed.js — Remplir la base de données avec des données de démonstration
'use strict';

require('dotenv').config({ override: true });

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');


//  Données fictives 

const USERS = [
  { username: 'alex_tech',    email: 'alex@demo.com',    password: 'demo1234', avatar: '🦊' },
  { username: 'sophie_dev',   email: 'sophie@demo.com',  password: 'demo1234', avatar: '🦋' },
  { username: 'marc_gaming',  email: 'marc@demo.com',    password: 'demo1234', avatar: '🐺' },
  { username: 'lea_science',  email: 'lea@demo.com',     password: 'demo1234', avatar: '🦁' },
  { username: 'theo_music',   email: 'theo@demo.com',    password: 'demo1234', avatar: '🐸' },
  { username: 'nina_cinema',  email: 'nina@demo.com',    password: 'demo1234', avatar: '🦄' },
  { username: 'rayan_sport',  email: 'rayan@demo.com',   password: 'demo1234', avatar: '🐯' },
  { username: 'chloe_actu',   email: 'chloe@demo.com',   password: 'demo1234', avatar: '🐙' },
];

const POSTS = [
  // Technologie 
  {
    authorIdx: 0,
    categories: ['Technologie'],
    title: "ChatGPT vs Claude : lequel choisir en 2024 ?",
    content: `Après avoir testé les deux pendant plusieurs semaines dans un cadre professionnel, voici mon retour d'expérience.

Claude se démarque sur les tâches d'analyse et de rédaction longue. Il comprend mieux le contexte sur de longs échanges et ses réponses sont souvent plus nuancées. Par contre, ChatGPT reste imbattable pour générer du code rapidement et s'intègre mieux dans les workflows grâce aux plugins.

Pour le dev quotidien, je reste sur ChatGPT avec GitHub Copilot. Pour la recherche et la rédaction de rapports, Claude prend le dessus. Et vous, vous utilisez quoi ?`,
  },
  {
    authorIdx: 1,
    categories: ['Technologie'],
    title: "React 19 est sorti — ce qui change vraiment",
    content: `React 19 vient de sortir et l'équipe Meta a fait du bon travail. Les Server Components sont enfin stables, les transitions sont plus fluides et le nouveau compilateur optimise automatiquement les re-renders.

Ce qui m'a le plus surpris c'est le hook useActionState qui simplifie énormément la gestion des formulaires. Plus besoin de useState + useEffect pour les cas simples.

Par contre, la migration depuis React 18 demande du travail si vous utilisez des librairies tierces. Certaines ne sont pas encore compatibles. J'ai passé une journée à déboguer des problèmes d'hydratation.

Mon conseil : attendez encore 2-3 mois avant de migrer en production.`,
  },
  {
    authorIdx: 0,
    categories: ['Technologie'],
    title: "Pourquoi j'ai abandonné Windows pour Linux (et je ne reviendrai pas)",
    content: `Ça fait maintenant 8 mois que je tourne sous Ubuntu 24.04 au quotidien, boulot inclus. Voici pourquoi je ne reviens pas en arrière.

D'abord, la performance. Mon laptop qui ramait sous Windows tourne comme une horloge sous Linux. Plus de 30% de RAM économisée au démarrage.

Ensuite, le terminal. En tant que dev, avoir un vrai bash natif change tout. Fini WSL et ses lenteurs sur les fichiers.

Le seul vrai problème : les jeux. Steam Proton fait des miracles mais certains titres restent inaccessibles (anti-cheat). Si vous jouez beaucoup, gardez un dual boot.`,
  },

  // Science 
  {
    authorIdx: 3,
    categories: ['Science'],
    title: "Fusion nucléaire : où en est-on vraiment ?",
    content: `Après l'annonce historique du NIF en décembre 2022 (gain énergétique net), beaucoup pensaient qu'on allait avoir de la fusion commerciale dans 10 ans. La réalité est plus nuancée.

Le NIF a reproduit l'exploit plusieurs fois depuis, avec des rendements croissants. Mais le chemin entre un laser géant qui produit plus d'énergie qu'il n'en consomme et une centrale électrique rentable est immense.

Les problèmes : le laser lui-même consomme 300x plus d'énergie que le faisceau délivré. Il faut donc améliorer l'efficacité des lasers, la fabrication des cibles, et développer des matériaux capables de résister aux neutrons.

ITER en France avance. La première expérience plasma est prévue pour 2025. Mais la production d'électricité commerciale… on parle de 2050 au mieux.`,
  },
  {
    authorIdx: 3,
    categories: ['Science'],
    title: "Les microplastiques retrouvés dans le cerveau humain — ce que ça signifie",
    content: `Une étude publiée dans Nature Medicine a confirmé la présence de microplastiques dans des échantillons de cerveau humain. Les concentrations mesurées sont 10 à 20 fois supérieures à celles trouvées dans le foie ou les reins.

Ce qui est inquiétant n'est pas tant leur présence que leur accumulation progressive. Entre les échantillons de 2016 et ceux de 2024, la concentration a augmenté de 50%.

Est-ce dangereux ? On ne sait pas encore. Les études in vitro montrent des effets inflammatoires sur les neurones, mais les études épidémiologiques manquent encore de recul.

Ce qu'on peut faire dès maintenant : éviter les bouteilles plastiques surtout chauffées, les contenants plastique au micro-ondes, et les emballages alimentaires plastiques pour les aliments gras.`,
  },

  // Jeux vidéo 
  {
    authorIdx: 2,
    categories: ['Jeux vidéo'],
    title: "Elden Ring DLC Shadow of the Erdtree — ma review après 60h",
    content: `60 heures plus tard, je peux enfin donner un avis complet sur Shadow of the Erdtree.

C'est le meilleur DLC FromSoftware depuis Artorias of the Abyss, point. La map est gigantesque, verticale, pleine de secrets. J'ai terminé la zone principale en pensant avoir tout vu et j'ai découvert deux donjons entiers cachés derrière des illu que je n'aurais jamais trouvées sans l'aide du chat vocal.

Les boss : Messmer est probablement dans le top 3 FromSoftware all-time. Design, musique, moveset, tout est parfait. Radahn final par contre… je comprends le choix narratif mais le fight est brouillon.

Difficulté : oui c'est dur. Non ce n'est pas injuste. Prenez le temps de chercher les Scadutree Fragments et ça devient gérable.

Note : 9.5/10`,
  },
  {
    authorIdx: 2,
    categories: ['Jeux vidéo'],
    title: "Balatro m'a volé 200 heures de ma vie et je ne regrette rien",
    content: `Balatro. Un jeu de poker roguelike à 15€ qui tourne sur n'importe quelle machine et qui est probablement le jeu le plus addictif que j'ai joué depuis des années.

Le concept : vous construisez un deck de cartes de poker, vous achetez des jokers (modificateurs) et vous essayez d'atteindre des scores de plus en plus élevés. Simple sur le papier, profond dans la pratique.

Ce qui rend le jeu génial c'est la synergie entre les jokers. Certaines combinaisons cassent complètement le jeu de façon satisfaisante. Trouver une build qui fait x1000 sur chaque main jouée procure un sentiment d'accomplissement rare.

GOTY 2024 pour moi sans hésiter. Et il a tourné sur mon vieux laptop à 60fps constants.`,
  },

  // Musique 
  {
    authorIdx: 4,
    categories: ['Musique'],
    title: "Kendrick Lamar a-t-il définitivement gagné contre Drake ?",
    content: `Not Like Us est devenue l'une des chansons les plus streamées de l'histoire de Spotify en quelques jours. Le concert de Kendrick à Los Angeles avec 60 000 personnes chantant cette diss track a marqué une époque.

Musicalement, Kendrick a tout raflé. Chaque track de la beef était construite, avec du fond, des preuves et une narration. Drake a répondu avec de la bravade.

Mais est-ce que ça a réellement tué la carrière de Drake ? Pas vraiment. Il reste un des artistes les plus streamés au monde. Les casuals ne suivent pas les beef rap en détail.

Ce qui est certain : dans les livres d'histoire du hip-hop, cette période sera retenue comme la défaite de Drake face à Kendrick. Culturellement, Kendrick a gagné.`,
  },
  {
    authorIdx: 4,
    categories: ['Musique'],
    title: "Pourquoi le vinyle connaît un retour en force chez les jeunes",
    content: `En 2023, les ventes de vinyles ont dépassé celles des CDs pour la 17ème année consécutive aux États-Unis. Ce qui est nouveau c'est le profil des acheteurs : 54% ont moins de 35 ans.

Pourquoi cette génération élevée au streaming revient au vinyle ?

D'abord l'expérience. Écouter un vinyle c'est un rituel. On sort la pochette, on la regarde, on pose l'aiguille. Dans un monde de consommation rapide, ça crée un moment de pause.

Ensuite, le son. Le débat audiophile est complexe mais objectivement, le vinyle a une chaleur dans les médiums que le MP3 compressé n'a pas.

Enfin, l'objet. Une pochette de 30cm c'est de l'art. Les jeunes aiment posséder quelque chose de tangible de leurs artistes favoris.`,
  },

  // Cinéma 
  {
    authorIdx: 5,
    categories: ['Cinéma'],
    title: "Dune Partie 2 : Villeneuve confirme qu'il est le meilleur réalisateur de sa génération",
    content: `J'étais sceptique. La partie 1 m'avait laissé froid malgré sa beauté visuelle — trop froide, trop distante. La partie 2 corrige tout ça.

Villeneuve a compris que pour la deuxième partie, il fallait de l'émotion. Paul et Chani ont une vraie dynamique. Feyd-Rautha d'Austin Butler est terrifiant. La scène de l'arène en noir et blanc est un moment de cinéma pur.

Ce qui m'a frappé c'est l'ambiguïté morale maintenue jusqu'au bout. Paul n'est pas un héros. Le film ne vous laisse pas applaudir sa victoire confortablement. C'est rare dans le blockbuster moderne.

Techniquement : les scènes sur Giedi Prime en noir et blanc UV sont parmi les plus belles choses vues sur grand écran ces dernières années.`,
  },

  // Sport 
  {
    authorIdx: 6,
    categories: ['Sport'],
    title: "Mbappé au Real Madrid : bilan après 6 mois",
    content: `6 mois après la signature la plus attendue du football mondial, où en est-on ?

Les chiffres : 18 buts en 25 matchs toutes compétitions confondues. Pas mauvais, mais pas le niveau d'un Benzema à son prime non plus. La comparaison est inévitable et cruelle.

Les problèmes observés : Mbappé joue trop souvent dans l'axe là où il est dévastateur en couloir gauche. Ancelotti cherche encore l'équilibre avec Vinicius et Bellingham. Il y a parfois une impression de trop de ballons perdus.

Les bons moments : son triplé contre Brest en Ligue des Champions, son but en demi-finale, sa complicité grandissante avec Bellingham.

Verdict : c'est une adaptation normale pour un joueur qui change de championnat. Année 2 devrait être la vraie mesure.`,
  },

  // Actualités 
  {
    authorIdx: 7,
    categories: ['Actualités'],
    title: "Intelligence artificielle : l'UE et la question de la régulation",
    content: `L'AI Act européen entre en vigueur progressivement. C'est la première réglementation majeure de l'IA au monde et son impact va au-delà de l'Europe.

Les points clés : les systèmes à haut risque (médical, judiciaire, éducation) devront être certifiés. Les deepfakes devront être clairement identifiés. Les modèles "à usage général" comme GPT-4 devront publier leurs données d'entraînement.

Les critiques viennent de deux côtés opposés. L'industrie tech dit que c'est trop restrictif et que l'Europe va se faire distancer par les US et la Chine. Les défenseurs des droits numériques disent que c'est insuffisant et trop centré sur les entreprises.

Ma lecture : c'est imparfait mais c'est un début. Mieux vaut un cadre perfectible que pas de cadre du tout.`,
  },

  // Humour 
  {
    authorIdx: 1,
    categories: ['Humour'],
    title: "Types de collègues qu'on retrouve dans CHAQUE open space",
    content: `Après 5 ans en open space dans différentes boîtes, j'ai établi une taxonomie complète des espèces.

🎧 Le Casque-Permanent : toujours avec son casque même quand il n'écoute rien. Signal clair : "ne me parlez pas".

📞 Le Téléphone-Fort : passe ses appels perso à voix haute. On connaît sa vie, ses enfants, ses problèmes de voisinage.

🥗 Le Repas-Odorant : apporte du poisson réchauffé au micro-onde le vendredi à 12h45.

☕ Le Machine-à-Café : passe 40% de sa journée à la machine. Expert en rumeurs d'entreprise.

🖥️ Le Multi-Écrans : a 3 écrans, 47 onglets ouverts, et une productivité mystérieuse.

Et le pire de tous : Le Réunion-Debout qui organise une "réunion rapide" de 5 minutes qui dure 45 minutes.

Lequel êtes-vous ?`,
  },
];

const COMMENTS_POOL = [
  // Pour le post ChatGPT vs Claude
  { postIdx: 0, authorIdx: 1, content: "Totalement d'accord sur Claude pour l'analyse. J'utilise les deux aussi selon les tâches. Claude est bien meilleur pour les longs documents et les nuances juridiques." },
  { postIdx: 0, authorIdx: 2, content: "Pour du code, Copilot + GPT-4 c'est imbattable en ce moment. Claude rattrape mais GPT reste plus rapide sur les snippets." },
  { postIdx: 0, authorIdx: 3, content: "Intéressant comme comparaison. Tu as testé Gemini 1.5 Pro aussi ? Il est vraiment fort sur les longues fenêtres contextuelles." },
  { postIdx: 0, authorIdx: 4, content: "Moi je suis passé à Claude pour tout et je ne regrette pas. La qualité des réponses en français est nettement meilleure." },

  // Pour React 19
  { postIdx: 1, authorIdx: 0, content: "Le compilateur React c'est la feature qui m'excite le plus. Finir avec l'optimisation manuelle des memo et useCallback ça va être un soulagement." },
  { postIdx: 1, authorIdx: 3, content: "J'ai migré un projet Next.js vers React 19 et effectivement les Server Components stables c'est un game changer pour les performances." },
  { postIdx: 1, authorIdx: 6, content: "Toujours pas prêt à migrer. Mon stack Zustand + React Query marche parfaitement, je vais attendre l'écosystème mûrisse." },

  // Pour Linux
  { postIdx: 2, authorIdx: 2, content: "Je tourne sous Fedora depuis 3 ans et pareil, impossible de revenir. L'écosystème dev est tellement plus agréable." },
  { postIdx: 2, authorIdx: 5, content: "J'hésite encore à cause d'Adobe. Vous utilisez quoi comme alternative à Photoshop et Premiere sous Linux ?" },
  { postIdx: 2, authorIdx: 0, content: "Gimp + Kdenlive sont honorables mais vraiment pas au niveau d'Adobe. C'est mon seul frein aussi. Dual boot reste la meilleure option si vous travaillez avec ces outils." },

  // Pour Fusion nucléaire
  { postIdx: 3, authorIdx: 0, content: "Post très bien sourcé. Le point sur l'efficacité des lasers est crucial et souvent omis dans les articles grand public qui ne retiennent que le 'gain net'." },
  { postIdx: 3, authorIdx: 7, content: "Honnêtement je me demande si la fusion arrivera avant que le solaire + stockage couvre 100% de nos besoins. La course est intéressante." },

  // Pour Elden Ring DLC
  { postIdx: 5, authorIdx: 0, content: "Messmer MVP absolument. J'ai mis 3 heures sur lui et c'était les 3 meilleures heures de jeu de l'année. La phase 2 m'a retourné le cerveau." },
  { postIdx: 5, authorIdx: 3, content: "Je suis à moitié de la map et je trouve la densité de secrets incroyable. J'ai trouvé une zone souterraine entière par hasard en tombant d'une falaise." },
  { postIdx: 5, authorIdx: 1, content: "9.5 c'est généreux selon moi, certains boss secrets sont en dessous du niveau des boss principaux. Mais globalement oui, excellent DLC." },

  // Pour Balatro
  { postIdx: 6, authorIdx: 5, content: "Il m'a aussi volé 150h. La build Flush avec le joker Riff-Raff c'est de la thérapie." },
  { postIdx: 6, authorIdx: 3, content: "Joué en 30 minutes pendant une pause, racheté depuis. Un des meilleurs rapports qualité/prix du jeu vidéo récent." },

  // Pour Kendrick vs Drake
  { postIdx: 7, authorIdx: 2, content: "Not Like Us au Super Bowl était le moment de clôture parfait. Culturellement c'est plié." },
  { postIdx: 7, authorIdx: 5, content: "Drake a quand même sorti de bonnes tracks pendant le beef. Push Ups était solide. Mais Kendrick a été supérieur sur tous les plans narratifs." },
  { postIdx: 7, authorIdx: 6, content: "Le concert à LA va rester dans les livres. 60 000 personnes qui chantent une diss track ensemble c'est du jamais vu." },

  // Pour Dune 2
  { postIdx: 9, authorIdx: 4, content: "La scène de l'arène en noir et blanc est mon moment de cinéma préféré de l'année. Villeneuve est dans sa meilleure période." },
  { postIdx: 9, authorIdx: 2, content: "Austin Butler en Feyd-Rautha c'est une performance sous-estimée. Il est terrifiant sans jamais tomber dans la caricature." },
  { postIdx: 9, authorIdx: 0, content: "J'ai relu le livre après le film et je comprends mieux les compromis scénaristiques. Villeneuve a bien géré ce qui était adaptable en 2h40." },

  // Pour Mbappé
  { postIdx: 10, authorIdx: 5, content: "Le problème c'est tactique. Ancelotti ne sait pas comment intégrer Mbappé, Vini et Bellingham ensemble sans sacrifier l'un des trois." },
  { postIdx: 10, authorIdx: 1, content: "18 buts en 25 matchs c'est quand même loin d'être catastrophique. Il est dans le rythme, l'adaptation prend du temps pour tout le monde." },

  // Pour open space
  { postIdx: 12, authorIdx: 0, content: "Le Réunion-Debout m'a traumatisé dans mon ancienne boîte. 'Ça prend 5 minutes' = code pour 'bloque ton après-midi'." },
  { postIdx: 12, authorIdx: 3, content: "Coupable du casque permanent. C'est le seul moyen de survivre en open space. Zero remords." },
  { postIdx: 12, authorIdx: 6, content: "J'ai connu un collègue qui combinait Téléphone-Fort + Repas-Odorant. Il était aimé de personne et semblait s'en foutre royalement." },
  { postIdx: 12, authorIdx: 4, content: "Je suis définitivement le Multi-Écrans. 4 écrans, 89 onglets, et une productivité que j'ai du mal à justifier moi-même." },
];

//  Seed function
async function seed() {
  console.log('\n🌱 Démarrage du seeding…\n');

  // 1. Utilisateurs 
  console.log('👥 Création des utilisateurs…');
  const userIds = [];
  for (const u of USERS) {
    // Vérifier si l'utilisateur existe déjà
    const existing = await db.query('SELECT id FROM users WHERE email=?', [u.email]);
    if (existing.length) {
      userIds.push(existing[0].id);
      console.log(`   ↳ ${u.username} existe déjà (ignoré)`);
      continue;
    }
    const id     = uuidv4();
    const hashed = await bcrypt.hash(u.password, 10);
    await db.query(
      'INSERT INTO users (id, username, email, password, avatar) VALUES (?,?,?,?,?)',
      [id, u.username, u.email, hashed, u.avatar]
    );
    userIds.push(id);
    console.log(`   ✅ ${u.username} créé`);
  }

  // 2. Catégories (déjà dans schema.sql, on récupère juste les ids)
  const cats = await db.query('SELECT id, name FROM categories');
  const catMap = {};
  cats.forEach(c => { catMap[c.name] = c.id; });

  // 3. Posts 
  console.log('\n📝 Création des posts…');
  const postIds = [];
  for (const p of POSTS) {
    const postId = uuidv4();

    // Date aléatoire dans les 30 derniers jours
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);
    const createdAtStr = createdAt.toISOString().slice(0, 19).replace('T', ' ');

    await db.query(
      'INSERT INTO posts (id, user_id, title, content, created_at) VALUES (?,?,?,?,?)',
      [postId, userIds[p.authorIdx], p.title, p.content, createdAtStr]
    );

    // Catégories
    for (const catName of p.categories) {
      if (catMap[catName]) {
        await db.query(
          'INSERT IGNORE INTO post_categories (post_id, category_id) VALUES (?,?)',
          [postId, catMap[catName]]
        );
      }
    }

    postIds.push(postId);
    console.log(`   ✅ "${p.title.substring(0, 50)}…"`);
  }

  // 4. Commentaires
  console.log('\n💬 Création des commentaires…');
  const commentIds = [];
  for (const c of COMMENTS_POOL) {
    const cmId = uuidv4();
    const postId = postIds[c.postIdx];
    if (!postId) continue;

    const daysAgo = Math.floor(Math.random() * 15);
    const hoursAgo = Math.floor(Math.random() * 12);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);
    const createdAtStr = createdAt.toISOString().slice(0, 19).replace('T', ' ');

    await db.query(
      'INSERT INTO comments (id, post_id, user_id, content, created_at) VALUES (?,?,?,?,?)',
      [cmId, postId, userIds[c.authorIdx], c.content, createdAtStr]
    );
    commentIds.push({ id: cmId, postIdx: c.postIdx });
    console.log(`   ✅ Commentaire ajouté sur post #${c.postIdx}`);
  }

  // 5. Réactions sur les posts 
  console.log('\n👍 Ajout des réactions sur les posts…');
  for (let pi = 0; pi < postIds.length; pi++) {
    const postId = postIds[pi];
    // Chaque utilisateur a une chance aléatoire de réagir
    const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);
    const reactingCount = Math.floor(Math.random() * 6) + 2; // 2 à 7 réactions

    for (let i = 0; i < Math.min(reactingCount, shuffledUsers.length); i++) {
      const userId = shuffledUsers[i];
      // 75% like, 25% dislike
      const type = Math.random() < 0.75 ? 'like' : 'dislike';
      try {
        await db.query(
          'INSERT IGNORE INTO reactions (user_id, post_id, type) VALUES (?,?,?)',
          [userId, postId, type]
        );
      } catch {}
    }
    process.stdout.write('.');
  }
  console.log('\n');

  // 6. Réactions sur les commentaires 
  console.log('👍 Ajout des réactions sur les commentaires…');
  for (const cm of commentIds) {
    const reactingCount = Math.floor(Math.random() * 4); // 0 à 3
    const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(reactingCount, shuffledUsers.length); i++) {
      const type = Math.random() < 0.8 ? 'like' : 'dislike';
      try {
        await db.query(
          'INSERT IGNORE INTO reactions (user_id, comment_id, type) VALUES (?,?,?)',
          [shuffledUsers[i], cm.id, type]
        );
      } catch {}
    }
    process.stdout.write('.');
  }
  console.log('\n');

  // Résumé
  console.log('═══════════════════════════════════════════════');
  console.log('✅ SEEDING TERMINÉ !');
  console.log(`   👥 ${USERS.length} utilisateurs`);
  console.log(`   📝 ${POSTS.length} publications`);
  console.log(`   💬 ${COMMENTS_POOL.length} commentaires`);
  console.log('');
  console.log('🔑 Tous les comptes ont le mot de passe : demo1234');
  console.log('');
  console.log('   Exemples de connexion :');
  console.log('   alex@demo.com    / demo1234');
  console.log('   sophie@demo.com  / demo1234');
  console.log('   marc@demo.com    / demo1234');
  console.log('═══════════════════════════════════════════════\n');
}

// Lancement 
(async () => {
  try {
    await db.init();
    await seed();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur de seeding :', err.message);
    console.error(err);
    process.exit(1);
  }
})();