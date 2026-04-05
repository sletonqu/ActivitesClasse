// Route CRUD pour les élèves
const express = require('express');
const router = express.Router();
const db = require('../db');

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? NaN : parsed;
}

function validateGroupAssignment(classId, groupId, callback) {
  if (groupId === null) {
    return callback(null);
  }

  if (Number.isNaN(groupId)) {
    return callback(new Error('group_id invalide'));
  }

  if (classId === null || Number.isNaN(classId)) {
    return callback(new Error('class_id invalide'));
  }

  db.get('SELECT id, class_id FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(new Error('Groupe non trouvé'));
    if (String(row.class_id) !== String(classId)) {
      return callback(new Error("Le groupe sélectionné n'appartient pas à cette classe"));
    }
    return callback(null);
  });
}

function getValidationStatus(errorMessage) {
  return ['group_id invalide', 'class_id invalide', 'Groupe non trouvé', "Le groupe sélectionné n'appartient pas à cette classe"].includes(errorMessage)
    ? 400
    : 500;
}

// Limite de 35 élèves par classe
router.post('/', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const firstname = String(req.body?.firstname || '').trim();
  const classId = normalizeNullableNumber(req.body?.class_id);
  const groupId = normalizeNullableNumber(req.body?.group_id);

  if (!name || !firstname) {
    return res.status(400).json({ error: 'Les champs nom et prénom sont obligatoires' });
  }

  if (classId === null || Number.isNaN(classId)) {
    return res.status(400).json({ error: 'class_id invalide' });
  }

  validateGroupAssignment(classId, groupId, (groupErr) => {
    if (groupErr) {
      return res.status(getValidationStatus(groupErr.message)).json({ error: groupErr.message });
    }

    db.get('SELECT COUNT(*) as count FROM students WHERE class_id = ?', [classId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row.count >= 35) {
        return res.status(400).json({ error: 'Limite de 35 élèves atteinte pour cette classe.' });
      }

      db.run(
        'INSERT INTO students (name, firstname, class_id, group_id) VALUES (?, ?, ?, ?)',
        [name, firstname, classId, groupId],
        function onInsert(insertErr) {
          if (insertErr) return res.status(500).json({ error: insertErr.message });
          return res.json({ id: this.lastID });
        }
      );
    });
  });
});

// GET all students
router.get('/', (req, res) => {
  db.all(
    `
      SELECT students.*, groups.name AS group_name
      FROM students
      LEFT JOIN groups ON groups.id = students.group_id
      ORDER BY LOWER(students.firstname) ASC, LOWER(students.name) ASC, students.id ASC
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json(rows);
    }
  );
});

// GET student by id
router.get('/:id', (req, res) => {
  db.get(
    `
      SELECT students.*, groups.name AS group_name
      FROM students
      LEFT JOIN groups ON groups.id = students.group_id
      WHERE students.id = ?
    `,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Élève non trouvé' });
      return res.json(row);
    }
  );
});

// PUT update student
router.put('/:id', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const firstname = String(req.body?.firstname || '').trim();
  const classId = normalizeNullableNumber(req.body?.class_id);
  const groupId = normalizeNullableNumber(req.body?.group_id);

  if (!name || !firstname) {
    return res.status(400).json({ error: 'Les champs nom et prénom sont obligatoires' });
  }

  validateGroupAssignment(classId, groupId, (groupErr) => {
    if (groupErr) {
      return res.status(getValidationStatus(groupErr.message)).json({ error: groupErr.message });
    }

    db.run(
      'UPDATE students SET name = ?, firstname = ?, class_id = ?, group_id = ? WHERE id = ?',
      [name, firstname, classId, groupId, req.params.id],
      function onUpdate(err) {
        if (err) return res.status(500).json({ error: err.message });
        return res.json({ updated: this.changes });
      }
    );
  });
});

// DELETE student
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM students WHERE id = ?', [req.params.id], function onDelete(err) {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ deleted: this.changes });
  });
});

module.exports = router;
