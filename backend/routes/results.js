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

router.post('/', (req, res) => {
  const { student_id, activity_id, score, activity_level, activity_level_label, completed_at } = req.body;
  db.run(
    'INSERT INTO results (student_id, activity_id, score, activity_level, activity_level_label, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
    [student_id, activity_id, score, activity_level || null, activity_level_label || null, completed_at],
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
  const { student_id, activity_id, score, activity_level, activity_level_label, completed_at } = req.body;
  db.run(
    'UPDATE results SET student_id = ?, activity_id = ?, score = ?, activity_level = ?, activity_level_label = ?, completed_at = ? WHERE id = ?',
    [student_id, activity_id, score, activity_level || null, activity_level_label || null, completed_at, req.params.id],
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
