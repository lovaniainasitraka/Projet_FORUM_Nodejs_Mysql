// database.js — Connexion MySQL + initialisation automatique
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

// Configuration 
const DB_CONFIG = {
  host    : process.env.DB_HOST ?? 'localhost',
  port    : Number(process.env.DB_PORT ?? 3306),
  user    : process.env.DB_USER ?? 'forum_user',
  password: process.env.DB_PASSWORD ?? 'Forum2026!',
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit   : 10,
};

let pool;

// Initialisation 
async function init() {
  // Créer le pool sans sélectionner de base pour pouvoir la créer
  const tmpPool = mysql.createPool(DB_CONFIG);

  try {
    // Lire et exécuter le schema.sql (CREATE DATABASE + tables + données)
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await tmpPool.query(schema);
  } catch (error) {
    await tmpPool.end().catch(() => {});
    throw error;
  }

  await tmpPool.end();

  // Pool final avec la base sélectionnée
  try {
    pool = mysql.createPool({ ...DB_CONFIG, database: 'forum_db' });
    await pool.query('SELECT 1');
  } catch (error) {
    const hint = `Vérifiez DB_HOST, DB_PORT, DB_USER et DB_PASSWORD. Configuration actuelle: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}`;
    throw new Error(`${error.message} | ${hint}`);
  }

  console.log('✅ Base de données MySQL connectée et initialisée.');
  return pool;
}

// Helpers 
function getPool() {
  if (!pool) throw new Error('DB non initialisée — appelez init() d\'abord.');
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = { init, getPool, query };
