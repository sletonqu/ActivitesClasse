// Export de données (CSV)
const express = require('express');
const router = express.Router();
const db = require('../db');

function escapeCsvValue(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get('/csv', (req, res) => {
  const classId = req.query.class_id;
  const hasClassFilter = classId !== undefined && classId !== null && classId !== '';
  if (hasClassFilter && Number.isNaN(Number(classId))) {
    return res.status(400).json({ error: 'class_id invalide' });
  }

  const sql = hasClassFilter
    ? 'SELECT id, name, firstname, class_id FROM students WHERE class_id = ? ORDER BY id ASC'
    : 'SELECT id, name, firstname, class_id FROM students ORDER BY id ASC';
  const params = hasClassFilter ? [Number(classId)] : [];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const headers = ['id', 'name', 'firstname', 'class_id'];
    const csvLines = [headers.join(',')];

    rows.forEach((row) => {
      const line = [
        escapeCsvValue(row.id),
        escapeCsvValue(row.name),
        escapeCsvValue(row.firstname),
        escapeCsvValue(row.class_id),
      ].join(',');
      csvLines.push(line);
    });

    const csv = `${csvLines.join('\n')}\n`;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const filename = `students_export_${y}${m}${d}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  });
});

router.get('/global-csv', (req, res) => {
  db.serialize(() => {
    db.all('SELECT name, email, password FROM teachers ORDER BY id ASC', [], (errTeachers, teachers) => {
      if (errTeachers) return res.status(500).json({ error: errTeachers.message });

      db.all('SELECT name, teacher_id FROM classes ORDER BY id ASC', [], (errClasses, classes) => {
        if (errClasses) return res.status(500).json({ error: errClasses.message });

        db.all('SELECT name, firstname, class_id FROM students ORDER BY id ASC', [], (errStudents, students) => {
          if (errStudents) return res.status(500).json({ error: errStudents.message });

          db.all('SELECT title, description, content, status, js_file FROM activities ORDER BY id ASC', [], (errActivities, activities) => {
            if (errActivities) return res.status(500).json({ error: errActivities.message });

            db.all('SELECT student_id, activity_id, score, completed_at FROM results ORDER BY id ASC', [], (errResults, results) => {
              if (errResults) return res.status(500).json({ error: errResults.message });

              const headers = ['entity', 'name', 'email', 'password', 'firstname', 'teacher_id', 'class_id', 'title', 'description', 'content', 'status', 'js_file', 'student_id', 'activity_id', 'score', 'completed_at'];
              const csvLines = [headers.join(',')];

              teachers.forEach((t) => {
                csvLines.push([
                  'teacher',
                  escapeCsvValue(t.name),
                  escapeCsvValue(t.email),
                  escapeCsvValue(t.password),
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                ].join(','));
              });

              classes.forEach((c) => {
                csvLines.push([
                  'class',
                  escapeCsvValue(c.name),
                  '',
                  '',
                  '',
                  escapeCsvValue(c.teacher_id),
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                ].join(','));
              });

              students.forEach((s) => {
                csvLines.push([
                  'student',
                  escapeCsvValue(s.name),
                  '',
                  '',
                  escapeCsvValue(s.firstname),
                  '',
                  escapeCsvValue(s.class_id),
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                ].join(','));
              });

              activities.forEach((a) => {
                csvLines.push([
                  'activity',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  escapeCsvValue(a.title),
                  escapeCsvValue(a.description),
                  escapeCsvValue(a.content),
                  escapeCsvValue(a.status),
                  escapeCsvValue(a.js_file),
                  '',
                  '',
                  '',
                  '',
                ].join(','));
              });

              results.forEach((r) => {
                csvLines.push([
                  'result',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  '',
                  escapeCsvValue(r.student_id),
                  escapeCsvValue(r.activity_id),
                  escapeCsvValue(r.score),
                  escapeCsvValue(r.completed_at),
                ].join(','));
              });

              const csv = `${csvLines.join('\n')}\n`;
              const now = new Date();
              const y = now.getFullYear();
              const m = String(now.getMonth() + 1).padStart(2, '0');
              const d = String(now.getDate()).padStart(2, '0');
              const filename = `global_export_${y}${m}${d}.csv`;

              res.setHeader('Content-Type', 'text/csv; charset=utf-8');
              res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
              res.send(csv);
            });
          });
        });
      });
    });
  });
});

module.exports = router;
