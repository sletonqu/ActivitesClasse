// Connexion à la base SQLite (fichier séparé pour éviter les circular dependencies)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion à SQLite:', err.message);
  } else {
    console.log('Connecté à SQLite');
    // Initialiser les tables au démarrage
    initializeTables();
  }
});

// Fonction pour initialiser les tables
function initializeTables() {
  const sqlPath = path.join(__dirname, 'init_db.sql');
  if (!fs.existsSync(sqlPath)) {
    console.warn('Fichier init_db.sql non trouvé, création des tables manuellement');
    createTables();
    return;
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  db.exec(sql, (err) => {
    if (err) {
      console.error('Erreur lors de l\'initialisation des tables:', err.message);
    } else {
      console.log('Tables initialisées avec succès');
    }

    ensureGroupsSchema();
    ensureGeneratedSentencesSchema();
  });
}

function ensureGroupsSchema() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        class_id INTEGER NOT NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id)
      )
    `);

    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_name_class ON groups(name, class_id)');

    db.all('PRAGMA table_info(students)', [], (err, columns) => {
      if (err) {
        console.error('Erreur lors de la vérification du schéma students:', err.message);
        return;
      }

      const hasGroupId = Array.isArray(columns) && columns.some((column) => column.name === 'group_id');
      if (!hasGroupId) {
        db.run('ALTER TABLE students ADD COLUMN group_id INTEGER REFERENCES groups(id)', (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration group_id:', alterErr.message);
          }
        });
      }
    });

    db.all('PRAGMA table_info(results)', [], (err, columns) => {
      if (err) {
        console.error('Erreur lors de la vérification du schéma results:', err.message);
        return;
      }

      const hasActivityLevel = Array.isArray(columns) && columns.some((column) => column.name === 'activity_level');
      const hasActivityLevelLabel = Array.isArray(columns) && columns.some((column) => column.name === 'activity_level_label');

      if (!hasActivityLevel) {
        db.run('ALTER TABLE results ADD COLUMN activity_level TEXT', (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration activity_level:', alterErr.message);
          }
        });
      }

      if (!hasActivityLevelLabel) {
        db.run('ALTER TABLE results ADD COLUMN activity_level_label TEXT', (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration activity_level_label:', alterErr.message);
          }
        });
      }
    });
  });
}

function ensureGeneratedSentencesSchema() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS generated_sentences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sentence TEXT NOT NULL,
        level TEXT,
        theme TEXT,
        provider TEXT,
        model TEXT,
        payload TEXT NOT NULL,
        compteur INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(
      'CREATE INDEX IF NOT EXISTS idx_generated_sentences_lookup ON generated_sentences(level, theme, compteur, id)'
    );
    db.run(
      'CREATE INDEX IF NOT EXISTS idx_generated_sentences_compteur ON generated_sentences(compteur, id)'
    );
  });
}

// Fonction pour créer les tables manuellement
function createTables() {
  const tables = `
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      teacher_id INTEGER,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_name_class
    ON groups(name, class_id);

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      firstname TEXT NOT NULL,
      class_id INTEGER,
      group_id INTEGER,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (group_id) REFERENCES groups(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_students_name_firstname
    ON students(name, firstname);

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      status TEXT,
      js_file TEXT
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      echelon_db INTEGER,
      nature TEXT,
      category TEXT,
      school_class TEXT,
      level INTEGER,
      source TEXT DEFAULT 'Dubois-Buyse'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_words_unique_entry
    ON words(word, echelon_db, nature, category, school_class, level, source);

    CREATE TABLE IF NOT EXISTS generated_sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sentence TEXT NOT NULL,
      level TEXT,
      theme TEXT,
      provider TEXT,
      model TEXT,
      payload TEXT NOT NULL,
      compteur INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_generated_sentences_lookup
    ON generated_sentences(level, theme, compteur, id);

    CREATE INDEX IF NOT EXISTS idx_generated_sentences_compteur
    ON generated_sentences(compteur, id);

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      activity_id INTEGER,
      score INTEGER,
      activity_level TEXT,
      activity_level_label TEXT,
      completed_at TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (activity_id) REFERENCES activities(id)
    );
  `;
  db.exec(tables, (err) => {
    if (err) {
      console.error('Erreur lors de la création des tables:', err.message);
    } else {
      console.log('Tables créées avec succès');
    }

    ensureGroupsSchema();
  });
}

module.exports = db;
