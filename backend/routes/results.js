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

router.post('/', (req, res) => {
  const { student_id, activity_id, score, activity_level, activity_level_label, completed_at, game_state } = req.body;
  db.run(
    'INSERT INTO results (student_id, activity_id, score, activity_level, activity_level_label, completed_at, game_state) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [student_id, activity_id, score, activity_level || null, activity_level_label || null, completed_at, game_state || null],
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
  const { student_id, activity_id, score, activity_level, activity_level_label, completed_at, game_state } = req.body;
  db.run(
    'UPDATE results SET student_id = ?, activity_id = ?, score = ?, activity_level = ?, activity_level_label = ?, completed_at = ?, game_state = ? WHERE id = ?',
    [student_id, activity_id, score, activity_level || null, activity_level_label || null, completed_at, game_state || null, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// DELETE result
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM results WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
