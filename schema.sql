--  FORUM DATABASE SCHEMA

CREATE DATABASE IF NOT EXISTS forum_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE forum_db;

-- Utilisateurs 
CREATE TABLE IF NOT EXISTS users (
    id       VARCHAR(36)  PRIMARY KEY,
    username VARCHAR(50)  NOT NULL UNIQUE,
    email    VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar   VARCHAR(10)  DEFAULT NULL,
    created_at DATETIME   DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (cookies)
CREATE TABLE IF NOT EXISTS sessions (
    id         VARCHAR(36)  PRIMARY KEY,
    user_id    VARCHAR(36)  NOT NULL,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Catégories
CREATE TABLE IF NOT EXISTS categories (
    id   INT          AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50)  NOT NULL UNIQUE,
    icon VARCHAR(10)  DEFAULT '📁'
);

-- Publications 
CREATE TABLE IF NOT EXISTS posts (
    id         VARCHAR(36)   PRIMARY KEY,
    user_id    VARCHAR(36)   NOT NULL,
    title      VARCHAR(200)  NOT NULL,
    content    TEXT          NOT NULL,
    created_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Association post_catégories
CREATE TABLE IF NOT EXISTS post_categories (
    post_id     VARCHAR(36) NOT NULL,
    category_id INT         NOT NULL,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id)     REFERENCES posts(id)      ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Commentaires
CREATE TABLE IF NOT EXISTS comments (
    id         VARCHAR(36) PRIMARY KEY,
    post_id    VARCHAR(36) NOT NULL,
    user_id    VARCHAR(36) NOT NULL,
    content    TEXT        NOT NULL,
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id)  REFERENCES posts(id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

-- Likes / Dislikes
CREATE TABLE IF NOT EXISTS reactions (
    id         INT         AUTO_INCREMENT PRIMARY KEY,
    user_id    VARCHAR(36) NOT NULL,
    post_id    VARCHAR(36) DEFAULT NULL,
    comment_id VARCHAR(36) DEFAULT NULL,
    type       ENUM('like','dislike') NOT NULL,
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_post_reaction    (user_id, post_id),
    UNIQUE KEY unique_comment_reaction (user_id, comment_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (post_id)    REFERENCES posts(id)    ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Données initiales
INSERT IGNORE INTO categories (name, icon) VALUES
    ('Technologie',  '💻'),
    ('Science',      '🔬'),
    ('Jeux vidéo',   '🎮'),
    ('Musique',      '🎵'),
    ('Cinéma',       '🎬'),
    ('Sport',        '⚽'),
    ('Politique',    '🏛️'),
    ('Humour',       '😂'),
    ('Actualités',   '📰'),
    ('Autre',        '💬');
