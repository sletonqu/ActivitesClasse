// Connexion à la base SQLite (fichier séparé pour éviter les circular dependencies)
const SqliteDatabase = require('./sqliteDatabase');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

// Si on utilise une base de développement dédiée à la branche (ex: database-dev-vocab.sqlite)
// et qu'elle n'existe pas encore, on la clone une seule fois depuis database.sqlite (main)
// afin de conserver la base main intacte tout en ayant les données existantes.
try {
  const baseFileName = path.basename(dbPath);
  if (baseFileName !== 'database.sqlite' && !fs.existsSync(dbPath)) {
    const mainDbPath = path.join(path.dirname(dbPath), 'database.sqlite');
    if (fs.existsSync(mainDbPath)) {
      fs.copyFileSync(mainDbPath, dbPath);
      console.log(`Base de développement initialisée par copie de ${mainDbPath} vers ${dbPath}`);
    }
  }
} catch (copyErr) {
  console.warn('Impossible de cloner database.sqlite vers la base de dev:', copyErr.message);
}

const db = new SqliteDatabase(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion à SQLite:', err.message);
  } else {
    console.log('Connecté à SQLite');
    db.run('PRAGMA foreign_keys = ON');
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
    ensureActivitiesSchema();
    ensureGeneratedSentencesSchema();
    ensureVocabularySchema();
  });
}

function ensureGroupsSchema() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        class_id INTEGER NOT NULL,
        color TEXT DEFAULT '#6b7280',
        FOREIGN KEY (class_id) REFERENCES classes(id)
      )
    `);

    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_name_class ON groups(name, class_id)');

    db.all('PRAGMA table_info(groups)', [], (groupsErr, groupColumns) => {
      if (groupsErr) {
        console.error('Erreur lors de la vérification du schéma groups:', groupsErr.message);
        return;
      }

      const hasColor = Array.isArray(groupColumns) && groupColumns.some((column) => column.name === 'color');
      if (!hasColor) {
        db.run("ALTER TABLE groups ADD COLUMN color TEXT DEFAULT '#6b7280'", (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration color sur groups:', alterErr.message);
          }
        });
      }
    });

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

      const hasGameState = Array.isArray(columns) && columns.some((column) => column.name === 'game_state');
      if (!hasGameState) {
        db.run('ALTER TABLE results ADD COLUMN game_state TEXT', (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration game_state:', alterErr.message);
          }
        });
      }

      const hasGameStateSummary = Array.isArray(columns) && columns.some((column) => column.name === 'game_state_summary');
      if (!hasGameStateSummary) {
        db.run('ALTER TABLE results ADD COLUMN game_state_summary TEXT', (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration game_state_summary:', alterErr.message);
          }
        });
      }

      const hasScreenshotPath = Array.isArray(columns) && columns.some((column) => column.name === 'screenshot_path');
      if (!hasScreenshotPath) {
        db.run('ALTER TABLE results ADD COLUMN screenshot_path TEXT', (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration screenshot_path:', alterErr.message);
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
        type TEXT DEFAULT 'grammaire',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.all('PRAGMA table_info(generated_sentences)', [], (err, columns) => {
      if (err) {
        console.error('Erreur lors de la vérification du schéma generated_sentences:', err.message);
        return;
      }

      const hasType = Array.isArray(columns) && columns.some((column) => column.name === 'type');
      if (!hasType) {
        db.run("ALTER TABLE generated_sentences ADD COLUMN type TEXT DEFAULT 'grammaire'", (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration type sur generated_sentences:', alterErr.message);
          }
        });
      }
    });

    db.run(
      'CREATE INDEX IF NOT EXISTS idx_generated_sentences_lookup ON generated_sentences(level, theme, compteur, id)'
    );
    db.run(
      'CREATE INDEX IF NOT EXISTS idx_generated_sentences_compteur ON generated_sentences(compteur, id)'
    );
  });
}

function ensureVocabularySchema() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS vocabulary_sequences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        theme TEXT DEFAULT '',
        level TEXT NOT NULL DEFAULT 'CE1',
        position INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(
      'CREATE INDEX IF NOT EXISTS idx_vocabulary_sequences_level_pos ON vocabulary_sequences(level, status, position, id)'
    );

    db.run(`
      CREATE TABLE IF NOT EXISTS vocabulary_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sequence_id INTEGER NOT NULL,
        word TEXT NOT NULL,
        nature TEXT DEFAULT '',
        definition TEXT NOT NULL DEFAULT '',
        sentence1_cloze TEXT NOT NULL DEFAULT '',
        sentence1_id INTEGER,
        sentence2_cloze TEXT NOT NULL DEFAULT '',
        sentence2_id INTEGER,
        distractors TEXT NOT NULL DEFAULT '[]',
        image_url TEXT DEFAULT '',
        image_prompt TEXT DEFAULT '',
        position INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (sequence_id) REFERENCES vocabulary_sequences(id) ON DELETE CASCADE,
        FOREIGN KEY (sentence1_id) REFERENCES generated_sentences(id) ON DELETE SET NULL,
        FOREIGN KEY (sentence2_id) REFERENCES generated_sentences(id) ON DELETE SET NULL
      )
    `);

    db.run(
      'CREATE INDEX IF NOT EXISTS idx_vocabulary_words_sequence ON vocabulary_words(sequence_id, position, id)'
    );

    db.run(`
      CREATE TABLE IF NOT EXISTS vocabulary_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        word_id INTEGER NOT NULL,
        sequence_id INTEGER NOT NULL,
        stage TEXT NOT NULL DEFAULT 'learning',
        tier_index INTEGER NOT NULL DEFAULT 0,
        interval_days INTEGER NOT NULL DEFAULT 1,
        next_review_date TEXT,
        consecutive_successes INTEGER NOT NULL DEFAULT 0,
        last_reviewed_at TEXT,
        UNIQUE(student_id, word_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (word_id) REFERENCES vocabulary_words(id) ON DELETE CASCADE,
        FOREIGN KEY (sequence_id) REFERENCES vocabulary_sequences(id) ON DELETE CASCADE
      )
    `);

    db.run(
      'CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_student ON vocabulary_progress(student_id, stage, next_review_date)'
    );
  });
}

function ensureActivitiesSchema() {
  db.serialize(() => {
    db.all('PRAGMA table_info(activities)', [], (err, columns) => {
      if (err) {
        console.error('Erreur lors de la vérification du schéma activities:', err.message);
        return;
      }

      const hasDiscipline = Array.isArray(columns) && columns.some((column) => column.name === 'discipline');
      if (!hasDiscipline) {
        db.run('ALTER TABLE activities ADD COLUMN discipline TEXT', (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration discipline:', alterErr.message);
          }
        });
      }

      const hasCategory = Array.isArray(columns) && columns.some((column) => column.name === 'category');
      if (!hasCategory) {
        db.run('ALTER TABLE activities ADD COLUMN category TEXT', (alterErr) => {
          if (alterErr && !String(alterErr.message).toLowerCase().includes('duplicate column')) {
            console.error('Erreur lors de la migration category:', alterErr.message);
          }
        });
      }
    });
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
      color TEXT DEFAULT '#6b7280',
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
      js_file TEXT,
      discipline TEXT,
      category TEXT
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
      game_state TEXT,
      game_state_summary TEXT,
      screenshot_path TEXT,
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
    ensureActivitiesSchema();
    ensureGeneratedSentencesSchema();
    ensureVocabularySchema();
  });
}

module.exports = db;
