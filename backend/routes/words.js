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

router.get('/', async (req, res) => {
  try {
    const { search = '', category = '', nature = '', classe = '', level = '', limit = '200' } = req.query;
    const where = [];
    const params = [];

    if (String(search).trim()) {
      where.push('LOWER(word) LIKE ?');
      params.push(`%${String(search).trim().toLowerCase()}%`);
    }

    if (String(category).trim()) {
      where.push('LOWER(category) = ?');
      params.push(String(category).trim().toLowerCase());
    }

    if (String(nature).trim()) {
      where.push('LOWER(nature) = ?');
      params.push(String(nature).trim().toLowerCase());
    }

    if (String(classe).trim()) {
      where.push('LOWER(school_class) = ?');
      params.push(String(classe).trim().toLowerCase());
    }

    if (String(level).trim()) {
      const parsedLevel = Number(level);
      if (Number.isNaN(parsedLevel)) {
        return res.status(400).json({ error: 'Paramètre level invalide' });
      }
      where.push('level = ?');
      params.push(parsedLevel);
    }

    const parsedLimit = Number(limit);
    const safeLimit = Number.isNaN(parsedLimit) ? 200 : Math.min(Math.max(parsedLimit, 1), 1000);

    const sql = `
      SELECT *
      FROM words
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY level ASC, echelon_db ASC, word COLLATE NOCASE ASC
      LIMIT ?
    `;

    const rows = await allAsync(sql, [...params, safeLimit]);
    return res.json(rows);
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
