// Route CRUD pour les résultats
const express = require('express');
const router = express.Router();
const db = require('../db');

// CRUD Results
router.get('/', (req, res) => {
  db.all('SELECT * FROM results', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET dernier état de jeu pour un élève + activité donnés
router.get('/game-state', (req, res) => {
  const { student_id, activity_id } = req.query;
  if (!student_id || !activity_id) {
    return res.status(400).json({ error: 'Les paramètres student_id et activity_id sont requis.' });
  }
  db.get(
    'SELECT * FROM results WHERE student_id = ? AND activity_id = ? ORDER BY id DESC LIMIT 1',
    [student_id, activity_id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Aucun résultat trouvé pour cet élève et cette activité.' });
      res.json(row);
    }
  );
});

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolve the data directory (next to the sqlite file or default backend directory)
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, '..');
const screenshotsDir = path.join(dataDir, 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function saveScreenshot(base64Data) {
  if (!base64Data) return null;
  try {
    // Remove header like "data:image/png;base64,"
    const base64Image = base64Data.split(';base64,').pop();
    const fileName = crypto.randomUUID() + '.png';
    const filePath = path.join(screenshotsDir, fileName);
    fs.writeFileSync(filePath, base64Image, { encoding: 'base64' });
    return 'screenshots/' + fileName;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la capture d'écran:", error);
    return null;
  }
}

router.post('/', (req, res) => {
  const { student_id, activity_id, score, activity_level, activity_level_label, completed_at, game_state, game_state_summary, screenshot } = req.body;
  
  const screenshotPath = saveScreenshot(screenshot);

  db.run(
    'INSERT INTO results (student_id, activity_id, score, activity_level, activity_level_label, completed_at, game_state, game_state_summary, screenshot_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [student_id, activity_id, score, activity_level || null, activity_level_label || null, completed_at, game_state || null, game_state_summary || null, screenshotPath],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});


// GET result by id
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM results WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Résultat non trouvé' });
    res.json(row);
  });
});

// PUT update result
router.put('/:id', (req, res) => {
  const { student_id, activity_id, score, activity_level, activity_level_label, completed_at, game_state, game_state_summary, screenshot } = req.body;
  
  let query = 'UPDATE results SET student_id = ?, activity_id = ?, score = ?, activity_level = ?, activity_level_label = ?, completed_at = ?, game_state = ?, game_state_summary = ? WHERE id = ?';
  let params = [student_id, activity_id, score, activity_level || null, activity_level_label || null, completed_at, game_state || null, game_state_summary || null, req.params.id];

  if (screenshot) {
    const screenshotPath = saveScreenshot(screenshot);
    query = 'UPDATE results SET student_id = ?, activity_id = ?, score = ?, activity_level = ?, activity_level_label = ?, completed_at = ?, game_state = ?, game_state_summary = ?, screenshot_path = ? WHERE id = ?';
    params = [student_id, activity_id, score, activity_level || null, activity_level_label || null, completed_at, game_state || null, game_state_summary || null, screenshotPath, req.params.id];
  }

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// DELETE result
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM results WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
