// Script d'initialisation de la base SQLite au démarrage
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database.sqlite');
const sqlPath = path.join(__dirname, 'init_db.sql');

const db = new sqlite3.Database(dbPath);
const initSQL = fs.readFileSync(sqlPath, 'utf-8');

db.exec(initSQL, (err) => {
  if (err) {
    console.error('Erreur lors de l\'initialisation de la base:', err.message);
  } else {
    console.log('Base de données initialisée.');
  }
  db.close();
});
