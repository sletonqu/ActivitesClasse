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

function getGroupById(groupId, callback) {
  db.get('SELECT id, name, class_id FROM groups WHERE id = ?', [groupId], (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(new Error('Groupe non trouvé'));
    return callback(null, row);
  });
}

router.post('/', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const classId = Number(req.body?.class_id);

  if (!name) {
    return res.status(400).json({ error: 'Le nom du groupe est obligatoire' });
  }

  if (Number.isNaN(classId)) {
    return res.status(400).json({ error: 'class_id invalide' });
  }

  db.get('SELECT id FROM classes WHERE id = ?', [classId], (classErr, classRow) => {
    if (classErr) return res.status(500).json({ error: classErr.message });
    if (!classRow) return res.status(404).json({ error: 'Classe non trouvée' });

    db.get(
      'SELECT id FROM groups WHERE LOWER(name) = LOWER(?) AND class_id = ?',
      [name, classId],
      (existingErr, existingRow) => {
        if (existingErr) return res.status(500).json({ error: existingErr.message });
        if (existingRow) {
          return res.status(400).json({ error: 'Un groupe portant ce nom existe déjà dans cette classe' });
        }

        db.run('INSERT INTO groups (name, class_id) VALUES (?, ?)', [name, classId], function onInsert(insertErr) {
          if (insertErr) return res.status(500).json({ error: insertErr.message });
          return res.json({ id: this.lastID, name, class_id: classId });
        });
      }
    );
  });
});

router.get('/', (req, res) => {
  const classId = normalizeNullableNumber(req.query?.class_id);
  if (Number.isNaN(classId)) {
    return res.status(400).json({ error: 'class_id invalide' });
  }

  const hasClassFilter = classId !== null;
  const sql = `
    SELECT g.id, g.name, g.class_id, COUNT(s.id) AS student_count
    FROM groups g
    LEFT JOIN students s ON s.group_id = g.id
    ${hasClassFilter ? 'WHERE g.class_id = ?' : ''}
    GROUP BY g.id, g.name, g.class_id
    ORDER BY LOWER(g.name) ASC, g.id ASC
  `;

  db.all(sql, hasClassFilter ? [classId] : [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows);
  });
});

router.get('/:id/students', (req, res) => {
  db.all(
    'SELECT id, name, firstname, class_id, group_id FROM students WHERE group_id = ? ORDER BY LOWER(firstname) ASC, LOWER(name) ASC',
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json(rows);
    }
  );
});

router.get('/:id', (req, res) => {
  db.get(
    `
      SELECT g.id, g.name, g.class_id, COUNT(s.id) AS student_count
      FROM groups g
      LEFT JOIN students s ON s.group_id = g.id
      WHERE g.id = ?
      GROUP BY g.id, g.name, g.class_id
    `,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Groupe non trouvé' });
      return res.json(row);
    }
  );
});

router.put('/:id', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const classId = Number(req.body?.class_id);

  if (!name) {
    return res.status(400).json({ error: 'Le nom du groupe est obligatoire' });
  }

  if (Number.isNaN(classId)) {
    return res.status(400).json({ error: 'class_id invalide' });
  }

  db.get('SELECT id FROM classes WHERE id = ?', [classId], (classErr, classRow) => {
    if (classErr) return res.status(500).json({ error: classErr.message });
    if (!classRow) return res.status(404).json({ error: 'Classe non trouvée' });

    db.get(
      'SELECT id FROM groups WHERE LOWER(name) = LOWER(?) AND class_id = ? AND id <> ?',
      [name, classId, req.params.id],
      (existingErr, existingRow) => {
        if (existingErr) return res.status(500).json({ error: existingErr.message });
        if (existingRow) {
          return res.status(400).json({ error: 'Un groupe portant ce nom existe déjà dans cette classe' });
        }

        db.run(
          'UPDATE groups SET name = ?, class_id = ? WHERE id = ?',
          [name, classId, req.params.id],
          function onUpdate(updateErr) {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            return res.json({ updated: this.changes });
          }
        );
      }
    );
  });
});

router.post('/:id/students', (req, res) => {
  const groupId = Number(req.params.id);
  const studentId = Number(req.body?.student_id);

  if (Number.isNaN(groupId) || Number.isNaN(studentId)) {
    return res.status(400).json({ error: 'Identifiants invalides' });
  }

  getGroupById(groupId, (groupErr, group) => {
    if (groupErr) {
      return res.status(groupErr.message === 'Groupe non trouvé' ? 404 : 500).json({ error: groupErr.message });
    }

    db.get('SELECT id, name, firstname, class_id, group_id FROM students WHERE id = ?', [studentId], (studentErr, student) => {
      if (studentErr) return res.status(500).json({ error: studentErr.message });
      if (!student) return res.status(404).json({ error: 'Élève non trouvé' });

      if (String(student.class_id) !== String(group.class_id)) {
        return res.status(400).json({ error: 'Cet élève n\'appartient pas à la même classe que le groupe' });
      }

      if (student.group_id !== null && String(student.group_id) !== String(groupId)) {
        return res.status(400).json({ error: 'Cet élève appartient déjà à un autre groupe' });
      }

      db.run('UPDATE students SET group_id = ? WHERE id = ?', [groupId, studentId], function onAssign(assignErr) {
        if (assignErr) return res.status(500).json({ error: assignErr.message });
        return res.json({ updated: this.changes, group_id: groupId, student_id: studentId });
      });
    });
  });
});

router.delete('/:id/students/:studentId', (req, res) => {
  const groupId = Number(req.params.id);
  const studentId = Number(req.params.studentId);

  if (Number.isNaN(groupId) || Number.isNaN(studentId)) {
    return res.status(400).json({ error: 'Identifiants invalides' });
  }

  db.run(
    'UPDATE students SET group_id = NULL WHERE id = ? AND group_id = ?',
    [studentId, groupId],
    function onRemove(err) {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ updated: this.changes });
    }
  );
});

router.delete('/:id/students', (req, res) => {
  const groupId = Number(req.params.id);
  if (Number.isNaN(groupId)) {
    return res.status(400).json({ error: 'Identifiant de groupe invalide' });
  }

  db.run('UPDATE students SET group_id = NULL WHERE group_id = ?', [groupId], function onRemoveAll(err) {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ updated: this.changes });
  });
});

router.delete('/:id', (req, res) => {
  const groupId = Number(req.params.id);
  if (Number.isNaN(groupId)) {
    return res.status(400).json({ error: 'Identifiant de groupe invalide' });
  }

  db.serialize(() => {
    db.run('UPDATE students SET group_id = NULL WHERE group_id = ?', [groupId], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: updateErr.message });

      db.run('DELETE FROM groups WHERE id = ?', [groupId], function onDelete(deleteErr) {
        if (deleteErr) return res.status(500).json({ error: deleteErr.message });
        return res.json({ deleted: this.changes });
      });
    });
  });
});

module.exports = router;
