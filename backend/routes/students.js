// Route CRUD pour les élèves
const express = require('express');
const router = express.Router();
const db = require('../db');

// Limite de 35 élèves par classe
router.post('/', (req, res) => {
  const { name, firstname, class_id } = req.body;
  db.get('SELECT COUNT(*) as count FROM students WHERE class_id = ?', [class_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row.count >= 35) return res.status(400).json({ error: 'Limite de 35 élèves atteinte pour cette classe.' });
    db.run('INSERT INTO students (name, firstname, class_id) VALUES (?, ?, ?)', [name, firstname, class_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  });
});


// GET all students
router.get('/', (req, res) => {
  db.all('SELECT * FROM students', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET student by id
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM students WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Élève non trouvé' });
    res.json(row);
  });
});

// PUT update student
router.put('/:id', (req, res) => {
  const { name, firstname, class_id } = req.body;
  db.run('UPDATE students SET name = ?, firstname = ?, class_id = ? WHERE id = ?', [name, firstname, class_id, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// DELETE student
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM students WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
