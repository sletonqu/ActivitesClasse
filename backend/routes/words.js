const express = require('express');
const router = express.Router();
const db = require('../db');

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

function normalizeTextValue(value) {
  return String(value || '').trim().toLowerCase();
}

function parseListParam(value) {
  const source = Array.isArray(value) ? value.join(',') : String(value || '');
  return Array.from(
    new Set(
      source
        .split(',')
        .map((item) => normalizeTextValue(item))
        .filter(Boolean)
    )
  );
}

function buildWordFilters(query = {}, overrideCategories = null) {
  const { search = '', category = '', categories = '', nature = '', classe = '', level = '', maxLevel = '' } = query;
  const where = [];
  const params = [];

  if (String(search).trim()) {
    where.push('LOWER(word) LIKE ?');
    params.push(`%${normalizeTextValue(search)}%`);
  }

  const requestedCategories = Array.isArray(overrideCategories)
    ? overrideCategories
    : Array.from(new Set([...parseListParam(category), ...parseListParam(categories)]));

  if (requestedCategories.length === 1) {
    where.push('LOWER(category) = ?');
    params.push(requestedCategories[0]);
  } else if (requestedCategories.length > 1) {
    where.push(`LOWER(category) IN (${requestedCategories.map(() => '?').join(', ')})`);
    params.push(...requestedCategories);
  }

  if (String(nature).trim()) {
    where.push('LOWER(nature) = ?');
    params.push(normalizeTextValue(nature));
  }

  if (String(classe).trim()) {
    where.push('LOWER(school_class) = ?');
    params.push(normalizeTextValue(classe));
  }

  if (String(level).trim()) {
    const parsedLevel = Number(level);
    if (Number.isNaN(parsedLevel)) {
      throw new Error('Paramètre level invalide');
    }
    where.push('level = ?');
    params.push(parsedLevel);
  }

  if (String(maxLevel).trim()) {
    const parsedMaxLevel = Number(maxLevel);
    if (Number.isNaN(parsedMaxLevel)) {
      throw new Error('Paramètre maxLevel invalide');
    }
    where.push('level <= ?');
    params.push(parsedMaxLevel);
  }

  return { where, params, requestedCategories };
}

function appendExcludedIdsClause(where, params, excludedIds) {
  if (!Array.isArray(excludedIds) || excludedIds.length === 0) {
    return;
  }

  where.push(`id NOT IN (${excludedIds.map(() => '?').join(', ')})`);
  params.push(...excludedIds);
}

router.get('/stats', async (req, res) => {
  try {
    const totalRow = await getAsync('SELECT COUNT(*) AS total FROM words');
    const byCategory = await allAsync(
      `SELECT category, COUNT(*) AS count
       FROM words
       GROUP BY category
       ORDER BY count DESC, category ASC`
    );
    const byClass = await allAsync(
      `SELECT school_class, COUNT(*) AS count, MIN(level) AS min_level
       FROM words
       GROUP BY school_class
       ORDER BY min_level ASC, school_class ASC`
    );

    return res.json({
      total: totalRow?.total ?? 0,
      byCategory,
      byClass,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/random', async (req, res) => {
  try {
    const parsedLimit = Number(req.query.limit);
    const safeLimit = Number.isNaN(parsedLimit) ? 10 : Math.min(Math.max(parsedLimit, 1), 200);
    const requestedCategories = Array.from(
      new Set([...parseListParam(req.query.category), ...parseListParam(req.query.categories)])
    );

    const selectedRows = [];
    const selectedIds = new Set();

    if (requestedCategories.length === 0) {
      const { where, params } = buildWordFilters(req.query);
      const rows = await allAsync(
        `SELECT *
         FROM words
         ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY RANDOM()
         LIMIT ?`,
        [...params, safeLimit]
      );

      return res.json({
        requested: safeLimit,
        returned: rows.length,
        words: rows,
      });
    }

    const baseQuota = Math.floor(safeLimit / requestedCategories.length);
    const extraQuota = safeLimit % requestedCategories.length;

    for (let index = 0; index < requestedCategories.length; index += 1) {
      const categoryKey = requestedCategories[index];
      const targetCount = baseQuota + (index < extraQuota ? 1 : 0);

      if (targetCount <= 0) {
        continue;
      }

      const { where, params } = buildWordFilters(req.query, [categoryKey]);
      appendExcludedIdsClause(where, params, Array.from(selectedIds));

      const rows = await allAsync(
        `SELECT *
         FROM words
         ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY RANDOM()
         LIMIT ?`,
        [...params, targetCount]
      );

      rows.forEach((row) => {
        if (!selectedIds.has(row.id)) {
          selectedIds.add(row.id);
          selectedRows.push(row);
        }
      });
    }

    if (selectedRows.length < safeLimit) {
      const { where, params } = buildWordFilters(req.query, requestedCategories);
      appendExcludedIdsClause(where, params, Array.from(selectedIds));

      const remainingRows = await allAsync(
        `SELECT *
         FROM words
         ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY RANDOM()
         LIMIT ?`,
        [...params, safeLimit - selectedRows.length]
      );

      remainingRows.forEach((row) => {
        if (!selectedIds.has(row.id)) {
          selectedIds.add(row.id);
          selectedRows.push(row);
        }
      });
    }

    return res.json({
      requested: safeLimit,
      returned: selectedRows.length,
      words: selectedRows,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { where, params } = buildWordFilters(req.query);
    const parsedLimit = Number(req.query.limit);
    const safeLimit = Number.isNaN(parsedLimit) ? 200 : Math.min(Math.max(parsedLimit, 1), 1000);
    const shouldRandomize = String(req.query.random || '').toLowerCase() === 'true';

    const sql = `
      SELECT *
      FROM words
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${shouldRandomize ? 'RANDOM()' : 'level ASC, echelon_db ASC, word COLLATE NOCASE ASC'}
      LIMIT ?
    `;

    const rows = await allAsync(sql, [...params, safeLimit]);
    return res.json(rows);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const wordId = Number(req.params.id);
    if (Number.isNaN(wordId) || wordId <= 0) {
      return res.status(400).json({ error: 'Identifiant de mot invalide' });
    }

    const result = await runAsync('DELETE FROM words WHERE id = ?', [wordId]);
    return res.json({ deleted: result.changes });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const result = await runAsync('DELETE FROM words');
    return res.json({ deleted: result.changes });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
