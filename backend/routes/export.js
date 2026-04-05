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
    ? `
        SELECT students.id, students.name, students.firstname, students.class_id, students.group_id, groups.name AS group_name
        FROM students
        LEFT JOIN groups ON groups.id = students.group_id
        WHERE students.class_id = ?
        ORDER BY students.id ASC
      `
    : `
        SELECT students.id, students.name, students.firstname, students.class_id, students.group_id, groups.name AS group_name
        FROM students
        LEFT JOIN groups ON groups.id = students.group_id
        ORDER BY students.id ASC
      `;
  const params = hasClassFilter ? [Number(classId)] : [];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const headers = ['id', 'name', 'firstname', 'class_id', 'group_id', 'group_name'];
    const csvLines = [headers.join(',')];

    rows.forEach((row) => {
      const line = [
        escapeCsvValue(row.id),
        escapeCsvValue(row.name),
        escapeCsvValue(row.firstname),
        escapeCsvValue(row.class_id),
        escapeCsvValue(row.group_id),
        escapeCsvValue(row.group_name),
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

        db.all('SELECT id, name, class_id FROM groups ORDER BY id ASC', [], (errGroups, groups) => {
          if (errGroups) return res.status(500).json({ error: errGroups.message });

          db.all(
            'SELECT students.name, students.firstname, students.class_id, students.group_id, groups.name AS group_name FROM students LEFT JOIN groups ON groups.id = students.group_id ORDER BY students.id ASC',
            [],
            (errStudents, students) => {
              if (errStudents) return res.status(500).json({ error: errStudents.message });

              db.all('SELECT title, description, content, status, js_file FROM activities ORDER BY id ASC', [], (errActivities, activities) => {
                if (errActivities) return res.status(500).json({ error: errActivities.message });

                db.all('SELECT student_id, activity_id, score, activity_level, activity_level_label, completed_at FROM results ORDER BY id ASC', [], (errResults, results) => {
                  if (errResults) return res.status(500).json({ error: errResults.message });

                  const headers = ['entity', 'name', 'email', 'password', 'firstname', 'teacher_id', 'class_id', 'group_id', 'group_name', 'title', 'description', 'content', 'status', 'js_file', 'student_id', 'activity_id', 'score', 'completed_at', 'activity_level', 'activity_level_label'];
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
                      '',
                      '',
                    ].join(','));
                  });

                  groups.forEach((g) => {
                    csvLines.push([
                      'group',
                      escapeCsvValue(g.name),
                      '',
                      '',
                      '',
                      '',
                      escapeCsvValue(g.class_id),
                      escapeCsvValue(g.id),
                      escapeCsvValue(g.name),
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
                      escapeCsvValue(s.group_id),
                      escapeCsvValue(s.group_name),
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
                      '',
                      '',
                      escapeCsvValue(r.student_id),
                      escapeCsvValue(r.activity_id),
                      escapeCsvValue(r.score),
                      escapeCsvValue(r.completed_at),
                      escapeCsvValue(r.activity_level),
                      escapeCsvValue(r.activity_level_label),
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
            }
          );
        });
      });
    });
  });
});

module.exports = router;
