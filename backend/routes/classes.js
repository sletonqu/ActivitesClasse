// Route CRUD pour les classes
const express = require('express');
const router = express.Router();
const db = require('../db');

// Limite de 20 classes
router.post('/', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM classes', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row.count >= 20) return res.status(400).json({ error: 'Limite de 20 classes atteinte.' });
    const { name, teacher_id } = req.body;
    db.run('INSERT INTO classes (name, teacher_id) VALUES (?, ?)', [name, teacher_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  });
});


// GET all classes
router.get('/', (req, res) => {
  db.all('SELECT * FROM classes', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET class by id
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM classes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Classe non trouvée' });
    res.json(row);
  });
});

// PUT update class
router.put('/:id', (req, res) => {
  const { name, teacher_id } = req.body;
  db.run('UPDATE classes SET name = ?, teacher_id = ? WHERE id = ?', [name, teacher_id, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// DELETE class
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM classes WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
