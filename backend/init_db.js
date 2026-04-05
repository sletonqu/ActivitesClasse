// Script d'initialisation de la base SQLite au démarrage
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database.sqlite');
const sqlPath = path.join(__dirname, 'init_db.sql');

const db = new sqlite3.Database(dbPath);
const initSQL = fs.readFileSync(sqlPath, 'utf-8');

function ensureGroupsSchema(done) {
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
        done();
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

      db.all('PRAGMA table_info(results)', [], (resultsErr, resultColumns) => {
        if (resultsErr) {
          console.error('Erreur lors de la vérification du schéma results:', resultsErr.message);
          done();
          return;
        }

        const hasActivityLevel = Array.isArray(resultColumns) && resultColumns.some((column) => column.name === 'activity_level');
        const hasActivityLevelLabel = Array.isArray(resultColumns) && resultColumns.some((column) => column.name === 'activity_level_label');

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

        done();
      });
    });
  });
}

db.exec(initSQL, (err) => {
  if (err) {
    console.error('Erreur lors de l\'initialisation de la base:', err.message);
  } else {
    console.log('Base de données initialisée.');
  }

  ensureGroupsSchema(() => {
    db.close();
  });
});
