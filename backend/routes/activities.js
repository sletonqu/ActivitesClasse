// Route CRUD pour les activités
const express = require('express');
const router = express.Router();
const db = require('../db');

// CRUD Activities
router.get('/', (req, res) => {
  db.all('SELECT * FROM activities', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { title, description, content, status, js_file, discipline, category } = req.body;
  db.run(
    'INSERT INTO activities (title, description, content, status, js_file, discipline, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, description, JSON.stringify(content), status, js_file || null, discipline || null, category || null],
    function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});


// GET activity by id
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM activities WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Activité non trouvée' });
    res.json(row);
  });
});

// PUT update activity
router.put('/:id', (req, res) => {
  const { title, description, content, status, js_file, discipline, category } = req.body;
  db.run(
    'UPDATE activities SET title = ?, description = ?, content = ?, status = ?, js_file = ?, discipline = ?, category = ? WHERE id = ?',
    [title, description, JSON.stringify(content), status, js_file || null, discipline || null, category || null, req.params.id],
    function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// DELETE all activities
router.delete('/', (req, res) => {
  db.run('DELETE FROM results', [], (resultsErr) => {
    if (resultsErr) return res.status(500).json({ error: resultsErr.message });

    db.run('DELETE FROM activities', [], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    });
  });
});

// DELETE activity
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM results WHERE activity_id = ?', [req.params.id], (resultsErr) => {
    if (resultsErr) return res.status(500).json({ error: resultsErr.message });

    db.run('DELETE FROM activities WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    });
  });
});

module.exports = router;
