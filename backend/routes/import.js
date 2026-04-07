// Import/Export de données (CSV)
const express = require('express');
const router = express.Router();
const db = require('../db');

function parseCsvTable(csvText) {
  const text = String(csvText || '');
  const rows = [];
  const rawLines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const delimiter =
    rawLines.length > 0 && (rawLines[0].match(/;/g) || []).length > (rawLines[0].match(/,/g) || []).length
      ? ';'
      : ',';

  let row = [];
  let field = '';
  let inQuotes = false;
  let lineNumber = 1;
  let rowStartLine = 1;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n' || char === '\r') {
      if (inQuotes) {
        field += '\n';
      } else {
        row.push(field);
        field = '';

        const hasAnyValue = row.some((cell) => String(cell).trim().length > 0);
        if (hasAnyValue) {
          rows.push({ cols: row, line: rowStartLine });
        }
        row = [];
      }

      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
      }

      lineNumber += 1;
      rowStartLine = lineNumber;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error(`CSV invalide: guillemet non fermé (ligne ${rowStartLine})`);
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    const hasAnyValue = row.some((cell) => String(cell).trim().length > 0);
    if (hasAnyValue) {
      rows.push({ cols: row, line: rowStartLine });
    }
  }

  if (rows.length < 2) {
    return { headers: [], dataRows: [] };
  }

  const expectedColumnCount = rows[0].cols.length;
  for (let i = 1; i < rows.length; i += 1) {
    const currentColumnCount = rows[i].cols.length;
    if (currentColumnCount !== expectedColumnCount) {
      throw new Error(
        `CSV invalide: nombre de colonnes incorrect a la ligne ${rows[i].line} (attendu ${expectedColumnCount}, recu ${currentColumnCount})`
      );
    }
  }

  const headers = rows[0].cols.map((h) => String(h).trim().toLowerCase().replace(/^\uFEFF/, ''));
  const dataRows = rows.slice(1);

  return { headers, dataRows };
}

function normalizeCsvHeaderKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseCsvRows(csvText) {
  const { headers, dataRows } = parseCsvTable(csvText);
  if (dataRows.length === 0) {
    return [];
  }

  const idxName = headers.indexOf('name');
  const idxFirstname = headers.indexOf('firstname');
  const idxClassId = headers.indexOf('class_id');
  const idxGroupId = headers.indexOf('group_id');
  const idxGroupName = headers.indexOf('group_name');

  if (idxName === -1 || idxFirstname === -1) {
    throw new Error('CSV invalide: colonnes name et firstname obligatoires');
  }

  return dataRows.map((row) => {
    const cols = row.cols;
    const getCol = (idx) => {
      if (idx === -1 || idx >= cols.length) return '';
      return String(cols[idx]).trim();
    };

    return {
      name: getCol(idxName),
      firstname: getCol(idxFirstname),
      class_id: idxClassId === -1 || getCol(idxClassId) === '' ? null : Number(getCol(idxClassId)),
      group_id: idxGroupId === -1 || getCol(idxGroupId) === '' ? null : getCol(idxGroupId),
      group_name: idxGroupName === -1 ? '' : getCol(idxGroupName),
    };
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function resolveStudentImportReferences({ class_id, group_id, group_name }) {
  let resolvedClassId =
    class_id === undefined || class_id === null || class_id === '' ? null : Number(class_id);

  if (resolvedClassId !== null && Number.isNaN(resolvedClassId)) {
    throw new Error('class_id invalide');
  }

  let resolvedGroupId = null;
  const normalizedGroupName = String(group_name || '').trim();

  if (group_id !== undefined && group_id !== null && group_id !== '') {
    const parsedGroupId = Number(group_id);
    if (Number.isNaN(parsedGroupId)) {
      throw new Error('group_id invalide');
    }

    const groupRow = await getAsync('SELECT id, class_id FROM groups WHERE id = ?', [parsedGroupId]);
    if (!groupRow) {
      throw new Error(`Groupe introuvable pour group_id ${group_id}`);
    }

    if (resolvedClassId !== null && String(groupRow.class_id) !== String(resolvedClassId)) {
      throw new Error("Le groupe indiqué n'appartient pas à la classe ciblée");
    }

    resolvedClassId = resolvedClassId ?? groupRow.class_id;
    resolvedGroupId = groupRow.id;
  } else if (normalizedGroupName) {
    if (resolvedClassId === null) {
      throw new Error(`class_id obligatoire pour résoudre le groupe \"${normalizedGroupName}\"`);
    }

    const groupRow = await getAsync(
      'SELECT id, class_id FROM groups WHERE LOWER(name) = LOWER(?) AND class_id = ?',
      [normalizedGroupName, resolvedClassId]
    );

    if (!groupRow) {
      throw new Error(
        `Groupe introuvable pour le nom \"${normalizedGroupName}\" dans la classe ${resolvedClassId}`
      );
    }

    resolvedGroupId = groupRow.id;
  }

  return {
    classId: resolvedClassId,
    groupId: resolvedGroupId,
  };
}

function parseGlobalCsvRows(csvText) {
  const { headers, dataRows } = parseCsvTable(csvText);
  if (dataRows.length === 0) return [];

  const idxEntity = headers.indexOf('entity');
  if (idxEntity === -1) {
    throw new Error('CSV global invalide: colonne entity obligatoire');
  }

  const getVal = (cols, key) => {
    const idx = headers.indexOf(key);
    if (idx === -1 || idx >= cols.length) return '';
    return String(cols[idx]).trim();
  };

  return dataRows.map((row) => {
    const cols = row.cols;
    return {
      entity: getVal(cols, 'entity').toLowerCase(),
      name: getVal(cols, 'name'),
      email: getVal(cols, 'email'),
      password: getVal(cols, 'password'),
      firstname: getVal(cols, 'firstname'),
      teacher_id: getVal(cols, 'teacher_id'),
      class_id: getVal(cols, 'class_id'),
      group_id: getVal(cols, 'group_id'),
      group_name: getVal(cols, 'group_name'),
      title: getVal(cols, 'title'),
      description: getVal(cols, 'description'),
      content: getVal(cols, 'content'),
      status: getVal(cols, 'status'),
      js_file: getVal(cols, 'js_file'),
      student_id: getVal(cols, 'student_id'),
      activity_id: getVal(cols, 'activity_id'),
      score: getVal(cols, 'score'),
      completed_at: getVal(cols, 'completed_at'),
      activity_level: getVal(cols, 'activity_level'),
      activity_level_label: getVal(cols, 'activity_level_label'),
    };
  });
}

function parseWordsCsvRows(csvText) {
  const { headers, dataRows } = parseCsvTable(csvText);
  if (dataRows.length === 0) {
    return [];
  }

  const normalizedHeaders = headers.map(normalizeCsvHeaderKey);
  const findIndex = (...keys) =>
    normalizedHeaders.findIndex((header) =>
      keys.some((key) => header === normalizeCsvHeaderKey(key))
    );

  const idxWord = findIndex('mot', 'word');
  const idxEchelon = findIndex('echelondb', 'echelon');
  const idxNature = findIndex('nature');
  const idxCategory = findIndex('categorie', 'category');
  const idxClass = findIndex('classe', 'class');
  const idxLevel = findIndex('niveau', 'level');

  if (idxWord === -1) {
    throw new Error('CSV mots invalide: colonne Mot obligatoire');
  }

  return dataRows.map((row) => {
    const cols = row.cols;
    const getCol = (idx) => {
      if (idx === -1 || idx >= cols.length) return '';
      return String(cols[idx]).trim();
    };

    const echelonValue = getCol(idxEchelon);
    const levelValue = getCol(idxLevel);

    return {
      word: getCol(idxWord),
      echelon_db: echelonValue === '' ? null : Number(echelonValue),
      nature: getCol(idxNature),
      category: getCol(idxCategory),
      school_class: getCol(idxClass),
      level: levelValue === '' ? null : Number(levelValue),
    };
  });
}

router.post('/csv', (req, res) => {
  (async () => {
    try {
      const { csv, students, class_id } = req.body || {};
      const forcedClassId =
        class_id === undefined || class_id === null || class_id === '' ? null : Number(class_id);
      if (forcedClassId !== null && Number.isNaN(forcedClassId)) {
        return res.status(400).json({ error: 'class_id invalide' });
      }

      let parsedRows = [];
      if (Array.isArray(students)) {
        parsedRows = students.map((s) => ({
          name: String(s?.name || '').trim(),
          firstname: String(s?.firstname || '').trim(),
          class_id:
            s?.class_id === undefined || s?.class_id === null || s?.class_id === ''
              ? null
              : Number(s.class_id),
          group_id:
            s?.group_id === undefined || s?.group_id === null || s?.group_id === ''
              ? null
              : s.group_id,
          group_name: String(s?.group_name || '').trim(),
        }));
      } else if (typeof csv === 'string') {
        parsedRows = parseCsvRows(csv);
      } else {
        return res.status(400).json({
          error: 'Format invalide. Envoyer soit { csv: "..." } soit { students: [...] }',
        });
      }

      const validRows = parsedRows
        .filter((r) => r.name && r.firstname)
        .map((r) => ({
          ...r,
          class_id: forcedClassId !== null ? forcedClassId : r.class_id,
        }));
      if (validRows.length === 0) {
        return res.status(400).json({ error: 'Aucune ligne valide à importer' });
      }

      const existing = await allAsync('SELECT name, firstname FROM students');
      const existingKeys = new Set(
        existing.map((row) => `${String(row.name).toLowerCase()}::${String(row.firstname).toLowerCase()}`)
      );

      const payloadKeys = new Set();
      let inserted = 0;
      let skippedDuplicates = 0;

      for (const row of validRows) {
        const key = `${row.name.toLowerCase()}::${row.firstname.toLowerCase()}`;

        if (existingKeys.has(key) || payloadKeys.has(key)) {
          skippedDuplicates += 1;
          continue;
        }

        const { classId, groupId } = await resolveStudentImportReferences(row);

        await runAsync(
          'INSERT INTO students (name, firstname, class_id, group_id) VALUES (?, ?, ?, ?)',
          [row.name, row.firstname, classId, groupId]
        );

        payloadKeys.add(key);
        inserted += 1;
      }

      return res.json({
        imported: inserted,
        skippedDuplicates,
        received: parsedRows.length,
        valid: validRows.length,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  })();
});

router.get('/csv', (req, res) => {
  res.status(405).json({ error: 'Utiliser POST /api/import/csv pour importer' });
});

router.post('/words-csv', (req, res) => {
  (async () => {
    try {
      const { csv } = req.body || {};
      if (typeof csv !== 'string') {
        return res.status(400).json({ error: 'Body attendu: { csv: "..." }' });
      }

      const parsedRows = parseWordsCsvRows(csv);
      const validRows = parsedRows.filter((row) => row.word);

      if (validRows.length === 0) {
        return res.status(400).json({ error: 'Aucune ligne valide à importer' });
      }

      const existingWords = await allAsync(
        'SELECT word, echelon_db, nature, category, school_class, level FROM words'
      );
      const buildWordKey = (row) =>
        [
          String(row.word || '').trim().toLowerCase(),
          row.echelon_db ?? '',
          String(row.nature || '').trim().toLowerCase(),
          String(row.category || '').trim().toLowerCase(),
          String(row.school_class || '').trim().toLowerCase(),
          row.level ?? '',
        ].join('::');

      const existingKeys = new Set(existingWords.map(buildWordKey));
      const payloadKeys = new Set();
      let inserted = 0;
      let skippedDuplicates = 0;

      await runAsync('BEGIN TRANSACTION');
      try {
        for (const row of validRows) {
          const normalizedRow = {
            word: String(row.word || '').trim(),
            echelon_db: Number.isNaN(row.echelon_db) ? null : row.echelon_db,
            nature: String(row.nature || '').trim(),
            category: String(row.category || '').trim(),
            school_class: String(row.school_class || '').trim(),
            level: Number.isNaN(row.level) ? null : row.level,
          };

          const key = buildWordKey(normalizedRow);
          if (existingKeys.has(key) || payloadKeys.has(key)) {
            skippedDuplicates += 1;
            continue;
          }

          await runAsync(
            `INSERT INTO words (word, echelon_db, nature, category, school_class, level, source)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              normalizedRow.word,
              normalizedRow.echelon_db,
              normalizedRow.nature,
              normalizedRow.category,
              normalizedRow.school_class,
              normalizedRow.level,
              'Dubois-Buyse',
            ]
          );

          payloadKeys.add(key);
          inserted += 1;
        }

        await runAsync('COMMIT');
      } catch (insertErr) {
        await runAsync('ROLLBACK');
        throw insertErr;
      }

      const totalRow = await getAsync('SELECT COUNT(*) AS total FROM words');

      return res.json({
        received: parsedRows.length,
        valid: validRows.length,
        imported: inserted,
        skippedDuplicates,
        totalWordsInDb: totalRow?.total ?? 0,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  })();
});

router.post('/global-csv', (req, res) => {
  (async () => {
    try {
      const { csv } = req.body || {};
      if (typeof csv !== 'string') {
        return res.status(400).json({ error: 'Body attendu: { csv: "..." }' });
      }

      const rows = parseGlobalCsvRows(csv);
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Aucune ligne à importer' });
      }

      const existingTeachers = await allAsync('SELECT email FROM teachers');
      const existingTeacherEmails = new Set(existingTeachers.map((t) => String(t.email).toLowerCase()));
      const teacherPayloadEmails = new Set();

      const existingClasses = await allAsync('SELECT name FROM classes');
      const existingClassNames = new Set(existingClasses.map((c) => String(c.name).toLowerCase()));
      const classPayloadNames = new Set();

      const existingGroups = await allAsync('SELECT name, class_id FROM groups');
      const existingGroupKeys = new Set(
        existingGroups.map((g) => `${String(g.class_id)}::${String(g.name).toLowerCase()}`)
      );
      const groupPayloadKeys = new Set();

      const existingStudents = await allAsync('SELECT name, firstname FROM students');
      const existingStudentKeys = new Set(
        existingStudents.map((s) => `${String(s.name).toLowerCase()}::${String(s.firstname).toLowerCase()}`)
      );
      const studentPayloadKeys = new Set();

      const existingActivities = await allAsync('SELECT title FROM activities');
      const existingActivityTitles = new Set(existingActivities.map((a) => String(a.title).toLowerCase()));
      const activityPayloadTitles = new Set();

      let teachersImported = 0;
      let classesImported = 0;
      let groupsImported = 0;
      let studentsImported = 0;
      let activitiesImported = 0;
      let resultsImported = 0;
      let skippedDuplicates = 0;

      for (const row of rows) {
        if (row.entity === 'teacher') {
          if (!row.name || !row.email || !row.password) continue;
          const emailKey = row.email.toLowerCase();
          if (existingTeacherEmails.has(emailKey) || teacherPayloadEmails.has(emailKey)) {
            skippedDuplicates += 1;
            continue;
          }

          await runAsync(
            'INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)',
            [row.name, row.email, row.password]
          );
          teacherPayloadEmails.add(emailKey);
          teachersImported += 1;
          continue;
        }

        if (row.entity === 'class') {
          if (!row.name) continue;
          const classKey = row.name.toLowerCase();
          if (existingClassNames.has(classKey) || classPayloadNames.has(classKey)) {
            skippedDuplicates += 1;
            continue;
          }

          const parsedTeacherId = row.teacher_id === '' ? null : Number(row.teacher_id);
          const teacherId = parsedTeacherId === null || Number.isNaN(parsedTeacherId) ? null : parsedTeacherId;

          await runAsync('INSERT INTO classes (name, teacher_id) VALUES (?, ?)', [row.name, teacherId]);
          classPayloadNames.add(classKey);
          classesImported += 1;
          continue;
        }

        if (row.entity === 'group') {
          const groupName = row.name || row.group_name;
          if (!groupName || !row.class_id) continue;

          const parsedClassId = Number(row.class_id);
          if (Number.isNaN(parsedClassId)) continue;

          const groupKey = `${parsedClassId}::${groupName.toLowerCase()}`;
          if (existingGroupKeys.has(groupKey) || groupPayloadKeys.has(groupKey)) {
            skippedDuplicates += 1;
            continue;
          }

          await runAsync('INSERT INTO groups (name, class_id) VALUES (?, ?)', [groupName, parsedClassId]);
          groupPayloadKeys.add(groupKey);
          groupsImported += 1;
          continue;
        }

        if (row.entity === 'student') {
          if (!row.name || !row.firstname) continue;
          const studentKey = `${row.name.toLowerCase()}::${row.firstname.toLowerCase()}`;
          if (existingStudentKeys.has(studentKey) || studentPayloadKeys.has(studentKey)) {
            skippedDuplicates += 1;
            continue;
          }

          const { classId, groupId } = await resolveStudentImportReferences({
            class_id: row.class_id,
            group_id: row.group_id,
            group_name: row.group_name,
          });

          await runAsync(
            'INSERT INTO students (name, firstname, class_id, group_id) VALUES (?, ?, ?, ?)',
            [row.name, row.firstname, classId, groupId]
          );
          studentPayloadKeys.add(studentKey);
          studentsImported += 1;
          continue;
        }

        if (row.entity === 'activity') {
          if (!row.title) continue;
          const activityKey = row.title.toLowerCase();
          if (existingActivityTitles.has(activityKey) || activityPayloadTitles.has(activityKey)) {
            skippedDuplicates += 1;
            continue;
          }

          let parsedContent = {};
          if (row.content) {
            try {
              parsedContent = JSON.parse(row.content);
            } catch {
              parsedContent = {};
            }
          }

          await runAsync(
            'INSERT INTO activities (title, description, content, status, js_file) VALUES (?, ?, ?, ?, ?)',
            [row.title, row.description || '', JSON.stringify(parsedContent), row.status || 'Active', row.js_file || null]
          );
          activityPayloadTitles.add(activityKey);
          activitiesImported += 1;
          continue;
        }

        if (row.entity === 'result') {
          if (!row.student_id || !row.activity_id) continue;
          const parsedStudentId = Number(row.student_id);
          const parsedActivityId = Number(row.activity_id);
          if (Number.isNaN(parsedStudentId) || Number.isNaN(parsedActivityId)) continue;

          const parsedScore = row.score === '' ? 0 : Number(row.score);
          const score = Number.isNaN(parsedScore) ? 0 : parsedScore;

          await runAsync(
            'INSERT INTO results (student_id, activity_id, score, activity_level, activity_level_label, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
            [
              parsedStudentId,
              parsedActivityId,
              score,
              row.activity_level || null,
              row.activity_level_label || null,
              row.completed_at || new Date().toISOString(),
            ]
          );
          resultsImported += 1;
        }
      }

      return res.json({
        received: rows.length,
        teachersImported,
        classesImported,
        groupsImported,
        studentsImported,
        activitiesImported,
        resultsImported,
        skippedDuplicates,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  })();
});

module.exports = router;
