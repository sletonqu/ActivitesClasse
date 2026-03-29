// Route CRUD pour les enseignants
const express = require('express');
const router = express.Router();
const db = require('../db');

// Limite de classes par enseignant (gérée côté classe)

// CRUD Teachers
router.get('/', (req, res) => {
  db.all('SELECT * FROM teachers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { name, email, password } = req.body;
  db.run('INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)', [name, email, password], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});


// GET all teachers
router.get('/', (req, res) => {
  db.all('SELECT * FROM teachers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET teacher by id
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM teachers WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Enseignant non trouvé' });
    res.json(row);
  });
});

// PUT update teacher
router.put('/:id', (req, res) => {
  const { name, email, password } = req.body;
  db.run('UPDATE teachers SET name = ?, email = ?, password = ? WHERE id = ?', [name, email, password, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// DELETE teacher
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM teachers WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
