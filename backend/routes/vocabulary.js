const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

const PALIERS = [1, 3, 7, 14, 30, 60];
const ALLOWED_LEVELS = new Set(['CE1', 'CE2']);
const ALLOWED_STATUSES = new Set(['draft', 'ready', 'active']);

const dataDir = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(__dirname, '..', 'data');
const vocabularyImagesDir = path.join(dataDir, 'vocabulary-images');

if (!fs.existsSync(vocabularyImagesDir)) {
  fs.mkdirSync(vocabularyImagesDir, { recursive: true });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(Array.isArray(rows) ? rows : []);
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

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ajoute N jours de classe (lundi à vendredi, hors week-end) à une date ISO (YYYY-MM-DD).
 */
function addSchoolDays(baseDateStr, schoolDaysToAdd) {
  const base = baseDateStr ? new Date(`${String(baseDateStr).slice(0, 10)}T12:00:00Z`) : new Date();
  if (Number.isNaN(base.getTime())) {
    return getTodayIsoDate();
  }

  let remaining = Math.max(0, Math.round(Number(schoolDaysToAdd) || 0));
  if (remaining === 0) {
    // Si la date de base tombe un samedi ou dimanche, avancer au lundi suivant
    while (base.getUTCDay() === 0 || base.getUTCDay() === 6) {
      base.setUTCDate(base.getUTCDate() + 1);
    }
    return base.toISOString().slice(0, 10);
  }

  while (remaining > 0) {
    base.setUTCDate(base.getUTCDate() + 1);
    const dayOfWeek = base.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining -= 1;
    }
  }

  return base.toISOString().slice(0, 10);
}

function escapeRegExp(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Génère une phrase à trou en remplaçant le mot cible par _____ s'il n'y a pas déjà de trou.
 */
function buildClozeSentence(sentence, targetWord) {
  const cleanSentence = String(sentence || '').trim();
  const cleanWord = String(targetWord || '').trim();

  if (!cleanSentence) return '';
  if (cleanSentence.includes('_____')) return cleanSentence;
  if (!cleanWord) return cleanSentence;

  const escapedWord = escapeRegExp(cleanWord);
  const exactRegex = new RegExp(`(^|[^\\p{L}])(${escapedWord})(?=[^\\p{L}]|$)`, 'iu');
  if (exactRegex.test(cleanSentence)) {
    return cleanSentence.replace(exactRegex, '$1_____');
  }

  // Fallback si le mot est conjugué ou accordé (racine d'au moins 4 lettres)
  if (cleanWord.length >= 4) {
    const stem = escapeRegExp(cleanWord.slice(0, Math.max(4, cleanWord.length - 2)));
    const stemRegex = new RegExp(`(^|[^\\p{L}])(${stem}[\\p{L}]*)(?=[^\\p{L}]|$)`, 'iu');
    if (stemRegex.test(cleanSentence)) {
      return cleanSentence.replace(stemRegex, '$1_____');
    }
  }

  return `${cleanSentence} (_____)`;
}

function parseDistractors(rawDistractors) {
  if (Array.isArray(rawDistractors)) {
    return rawDistractors.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4);
  }
  if (typeof rawDistractors === 'string' && rawDistractors.trim()) {
    try {
      const parsed = JSON.parse(rawDistractors);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4);
      }
    } catch {
      return rawDistractors
        .split(/[,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4);
    }
  }
  return [];
}

function saveVocabularyImage(imageData) {
  if (!imageData || typeof imageData !== 'string') {
    throw new Error("Données d'image manquantes.");
  }

  const trimmed = imageData.trim();

  if (trimmed.startsWith('data:image/svg+xml')) {
    const isBase64 = trimmed.includes(';base64,');
    const rawPart = trimmed.split(',').slice(1).join(',');
    const svgContent = isBase64
      ? Buffer.from(rawPart, 'base64').toString('utf-8')
      : decodeURIComponent(rawPart);
    const fileName = `${crypto.randomUUID()}.svg`;
    const filePath = path.join(vocabularyImagesDir, fileName);
    fs.writeFileSync(filePath, svgContent, { encoding: 'utf-8' });
    return `vocabulary-images/${fileName}`;
  }

  let ext = 'png';
  const mimeMatch = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
  if (mimeMatch) {
    const subtype = mimeMatch[1].toLowerCase();
    if (subtype === 'jpeg' || subtype === 'jpg') ext = 'jpg';
    else if (subtype === 'webp') ext = 'webp';
    else if (subtype === 'gif') ext = 'gif';
  }

  const base64Payload = trimmed.includes(';base64,')
    ? trimmed.split(';base64,').pop()
    : trimmed;

  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(vocabularyImagesDir, fileName);
  fs.writeFileSync(filePath, base64Payload, { encoding: 'base64' });
  return `vocabulary-images/${fileName}`;
}

function deleteVocabularyImageFile(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  const cleanUrl = imageUrl.replace(/^\/+/, '');
  if (!cleanUrl.startsWith('vocabulary-images/')) return;

  const fileName = path.basename(cleanUrl);
  const filePath = path.join(vocabularyImagesDir, fileName);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn("Impossible de supprimer l'image de vocabulaire:", err.message);
  }
}

function readVocabularyImageAsDataUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  const trimmed = imageUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  const cleanUrl = trimmed.replace(/^\/+/, '');
  if (!cleanUrl.startsWith('vocabulary-images/')) {
    return '';
  }

  const fileName = path.basename(cleanUrl);
  const filePath = path.join(vocabularyImagesDir, fileName);
  try {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';

    return `data:${mimeType};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.warn("Impossible de lire l'image de vocabulaire pour l'export:", err.message);
    return '';
  }
}

function buildSequenceExportObject(seq, wordsRows = []) {
  return {
    title: seq.title || '',
    theme: seq.theme || '',
    level: seq.level || 'CE1',
    position: Number(seq.position || 1),
    status: seq.status || 'active',
    words: wordsRows.map((row) => {
      const formatted = formatWordRow(row);
      const imageData = readVocabularyImageAsDataUrl(formatted.image_url);
      return {
        word: formatted.word,
        nature: formatted.nature,
        definition: formatted.definition,
        sentence1_full: formatted.sentence1_full,
        sentence1_cloze: formatted.sentence1_cloze,
        sentence2_full: formatted.sentence2_full,
        sentence2_cloze: formatted.sentence2_cloze,
        distractors: formatted.distractors,
        image_prompt: formatted.image_prompt,
        image_url: formatted.image_url,
        image_data: imageData,
        position: formatted.position,
      };
    }),
  };
}

/**
 * Insère ou met à jour une phrase complète dans generated_sentences avec type = 'vocabulaire'
 */
async function upsertVocabularyGeneratedSentence({
  existingSentenceId = null,
  fullSentence,
  targetWord,
  targetNature,
  level = 'CE1',
  theme = '',
}) {
  const cleanSentence = String(fullSentence || '').trim();
  if (!cleanSentence || cleanSentence.includes('_____')) {
    return existingSentenceId || null;
  }

  const cleanTheme = String(theme || '').trim() || 'vocabulaire';
  const cleanLevel = ALLOWED_LEVELS.has(String(level || '').toUpperCase())
    ? String(level).toUpperCase()
    : 'CE1';

  const tokens = cleanSentence.match(/\p{L}+(?:['’\-]\p{L}+)*|\p{N}+|[^\s]/gu) || [];
  const words = tokens.map((token, idx) => {
    const isPunct = !/[\p{L}\p{N}]/u.test(token);
    const isTarget =
      !isPunct &&
      targetWord &&
      token.toLowerCase() === String(targetWord).trim().toLowerCase();
    return {
      position: idx + 1,
      word: token,
      nature: isPunct ? 'ponctuation' : isTarget && targetNature ? targetNature : 'à préciser',
      category: isPunct ? 'ponctuation' : 'mot variable',
    };
  });

  const payloadObj = {
    sentence: cleanSentence,
    level: cleanLevel,
    theme: cleanTheme,
    provider: 'vocabulary',
    model: 'vocabulary',
    words,
  };
  const payloadText = JSON.stringify(payloadObj);

  if (existingSentenceId) {
    const existingRow = await getAsync('SELECT id FROM generated_sentences WHERE id = ?', [existingSentenceId]);
    if (existingRow) {
      await runAsync(
        `UPDATE generated_sentences
         SET sentence = ?, level = ?, theme = ?, payload = ?, type = 'vocabulaire'
         WHERE id = ?`,
        [cleanSentence, cleanLevel, cleanTheme, payloadText, existingSentenceId]
      );
      return existingSentenceId;
    }
  }

  const insertRes = await runAsync(
    `INSERT INTO generated_sentences (sentence, level, theme, provider, model, payload, compteur, type)
     VALUES (?, ?, ?, 'vocabulary', 'vocabulary', ?, 0, 'vocabulaire')`,
    [cleanSentence, cleanLevel, cleanTheme, payloadText]
  );
  return insertRes.lastID;
}

/**
 * Calcule le nouvel état de progression d'un mot pour un élève selon les règles :
 * - En Découverte (learning) : 2/2 sans erreur => passe à 'reviewing', tier_index = 0 (J+1). Sinon reste 'learning'.
 * - En Révision (reviewing / mastered) : paliers [1, 3, 7, 14, 30, 60]
 *   - 3/3 sans erreur => tier_index + 1, consecutive_successes + 1 (à 3 => 'mastered' 👑)
 *   - 2 ou 2,5 / 3 => tier_index - 1 (min 0), consecutive_successes = 0, stage = 'reviewing'
 *   - <= 1,5 / 3 => tier_index = 0 (J+1), consecutive_successes = 0, stage = 'reviewing'
 */
function computeNextVocabularyProgress(currentProgress, resultItem, todayDateStr = getTodayIsoDate()) {
  const isDiscoveryPhase =
    resultItem?.phase === 'discovery' ||
    !currentProgress ||
    currentProgress.stage === 'learning';

  const rawScore = Number(resultItem?.score ?? 0);
  const rawMaxScore = Number(resultItem?.maxScore ?? (isDiscoveryPhase ? 2 : 3));
  const errors = Number(resultItem?.errors ?? (rawScore < rawMaxScore ? 1 : 0));
  const isPerfect = rawMaxScore > 0 && rawScore >= rawMaxScore && errors === 0;

  if (isDiscoveryPhase) {
    if (isPerfect) {
      return {
        stage: 'reviewing',
        tier_index: 0,
        interval_days: PALIERS[0],
        next_review_date: addSchoolDays(todayDateStr, PALIERS[0]),
        consecutive_successes: 0,
        last_reviewed_at: todayDateStr,
      };
    }

    return {
      stage: 'learning',
      tier_index: 0,
      interval_days: 0,
      next_review_date: todayDateStr,
      consecutive_successes: 0,
      last_reviewed_at: todayDateStr,
    };
  }

  // Phase de révision
  const prevTier = Math.min(
    Math.max(0, Number(currentProgress?.tier_index ?? 0)),
    PALIERS.length - 1
  );
  const prevConsecutive = Math.max(0, Number(currentProgress?.consecutive_successes ?? 0));
  const scoreOn3 = rawMaxScore > 0 ? (rawScore / rawMaxScore) * 3 : rawScore;

  if (isPerfect && scoreOn3 >= 3) {
    const nextTier = Math.min(prevTier + 1, PALIERS.length - 1);
    const nextConsecutive = prevConsecutive + 1;
    const nextStage = nextConsecutive >= 3 ? 'mastered' : 'reviewing';
    const intervalDays = PALIERS[nextTier];

    return {
      stage: nextStage,
      tier_index: nextTier,
      interval_days: intervalDays,
      next_review_date: addSchoolDays(todayDateStr, intervalDays),
      consecutive_successes: nextConsecutive,
      last_reviewed_at: todayDateStr,
    };
  }

  if (scoreOn3 >= 2) {
    const nextTier = Math.max(prevTier - 1, 0);
    const intervalDays = PALIERS[nextTier];
    return {
      stage: 'reviewing',
      tier_index: nextTier,
      interval_days: intervalDays,
      next_review_date: addSchoolDays(todayDateStr, intervalDays),
      consecutive_successes: 0,
      last_reviewed_at: todayDateStr,
    };
  }

  return {
    stage: 'reviewing',
    tier_index: 0,
    interval_days: PALIERS[0],
    next_review_date: addSchoolDays(todayDateStr, PALIERS[0]),
    consecutive_successes: 0,
    last_reviewed_at: todayDateStr,
  };
}

function formatWordRow(row) {
  if (!row) return null;
  const distractors = parseDistractors(row.distractors);
  return {
    id: row.id,
    sequence_id: row.sequence_id,
    sequenceId: row.sequence_id,
    word: row.word || '',
    nature: row.nature || '',
    definition: row.definition || '',
    sentence1_cloze: row.sentence1_cloze || '',
    sentence1_id: row.sentence1_id || null,
    sentence1_full: row.sentence1_full || '',
    sentence2_cloze: row.sentence2_cloze || '',
    sentence2_id: row.sentence2_id || null,
    sentence2_full: row.sentence2_full || '',
    distractors,
    image_url: row.image_url || '',
    imageUrl: row.image_url || '',
    image_prompt: row.image_prompt || '',
    imagePrompt: row.image_prompt || '',
    position: Number(row.position || 1),
    sequence_title: row.sequence_title || undefined,
    sequence_level: row.sequence_level || undefined,
    sequence_theme: row.sequence_theme || undefined,
  };
}

// ============================================================================
// SÉQUENCES DE VOCABULAIRE
// ============================================================================

router.get('/sequences', async (req, res) => {
  try {
    const { level, status } = req.query;
    const where = [];
    const params = [];

    if (level && ALLOWED_LEVELS.has(String(level).toUpperCase())) {
      where.push('UPPER(level) = ?');
      params.push(String(level).toUpperCase());
    }

    if (status && ALLOWED_STATUSES.has(String(status).toLowerCase())) {
      where.push('LOWER(status) = ?');
      params.push(String(status).toLowerCase());
    }

    const sequences = await allAsync(
      `SELECT * FROM vocabulary_sequences
       ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY position ASC, id ASC`,
      params
    );

    const wordsRows = await allAsync(
      `SELECT vw.*,
              gs1.sentence AS sentence1_full,
              gs2.sentence AS sentence2_full
       FROM vocabulary_words vw
       LEFT JOIN generated_sentences gs1 ON gs1.id = vw.sentence1_id
       LEFT JOIN generated_sentences gs2 ON gs2.id = vw.sentence2_id
       ORDER BY vw.sequence_id ASC, vw.position ASC, vw.id ASC`
    );

    const wordsBySeq = new Map();
    wordsRows.forEach((row) => {
      if (!wordsBySeq.has(row.sequence_id)) {
        wordsBySeq.set(row.sequence_id, []);
      }
      wordsBySeq.get(row.sequence_id).push(formatWordRow(row));
    });

    const enriched = sequences.map((seq) => {
      const seqWords = wordsBySeq.get(seq.id) || [];
      return {
        ...seq,
        wordCount: seqWords.length,
        words: seqWords,
      };
    });

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors du chargement des séquences de vocabulaire.' });
  }
});

router.get('/sequences/export', async (req, res) => {
  try {
    const sequences = await allAsync(
      'SELECT * FROM vocabulary_sequences ORDER BY position ASC, id ASC'
    );
    const wordsRows = await allAsync(
      `SELECT vw.*,
              gs1.sentence AS sentence1_full,
              gs2.sentence AS sentence2_full
       FROM vocabulary_words vw
       LEFT JOIN generated_sentences gs1 ON gs1.id = vw.sentence1_id
       LEFT JOIN generated_sentences gs2 ON gs2.id = vw.sentence2_id
       ORDER BY vw.sequence_id ASC, vw.position ASC, vw.id ASC`
    );

    const wordsBySeq = new Map();
    wordsRows.forEach((row) => {
      if (!wordsBySeq.has(row.sequence_id)) {
        wordsBySeq.set(row.sequence_id, []);
      }
      wordsBySeq.get(row.sequence_id).push(row);
    });

    const exportedSequences = sequences.map((seq) =>
      buildSequenceExportObject(seq, wordsBySeq.get(seq.id) || [])
    );

    return res.json({
      version: 1,
      type: 'vocabulary_sequences_export',
      exportedAt: new Date().toISOString(),
      sequenceCount: exportedSequences.length,
      sequences: exportedSequences,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Erreur lors de l'export de toutes les séquences.",
    });
  }
});

router.post('/sequences/import', async (req, res) => {
  try {
    let rawSequences = null;
    if (Array.isArray(req.body?.sequences)) {
      rawSequences = req.body.sequences;
    } else if (req.body?.sequence && typeof req.body.sequence === 'object') {
      rawSequences = [req.body.sequence];
    } else if (Array.isArray(req.body)) {
      rawSequences = req.body;
    } else if (req.body?.title && Array.isArray(req.body?.words)) {
      rawSequences = [req.body];
    }

    if (!Array.isArray(rawSequences) || rawSequences.length === 0) {
      return res.status(400).json({
        error: 'Aucune séquence valide trouvée dans le fichier JSON.',
      });
    }

    let createdSequences = 0;
    let updatedSequences = 0;
    let skippedSequences = 0;
    let importedWords = 0;
    let importedImages = 0;
    const importedTitles = [];

    for (const rawSeq of rawSequences) {
      const title = String(rawSeq?.title || '').trim();
      if (!title) {
        skippedSequences += 1;
        continue;
      }

      const theme = String(rawSeq?.theme || '').trim();
      const rawLevel = String(rawSeq?.level || 'CE1').trim().toUpperCase();
      const level = ALLOWED_LEVELS.has(rawLevel) ? rawLevel : 'CE1';
      const rawStatus = String(rawSeq?.status || 'active').trim().toLowerCase();
      const status = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : 'active';
      const wordsInput = Array.isArray(rawSeq?.words) ? rawSeq.words : [];

      const existingSeq = await getAsync(
        'SELECT * FROM vocabulary_sequences WHERE LOWER(title) = LOWER(?) AND UPPER(level) = ? LIMIT 1',
        [title, level]
      );

      let sequenceId = null;
      if (existingSeq) {
        sequenceId = Number(existingSeq.id);
        const position =
          rawSeq?.position !== undefined && !Number.isNaN(Number(rawSeq.position)) && Number(rawSeq.position) > 0
            ? Number(rawSeq.position)
            : Number(existingSeq.position || 1);

        await runAsync(
          `UPDATE vocabulary_sequences
           SET title = ?, theme = ?, level = ?, position = ?, status = ?
           WHERE id = ?`,
          [title, theme, level, position, status, sequenceId]
        );
        updatedSequences += 1;
      } else {
        let position = Number(rawSeq?.position);
        if (Number.isNaN(position) || position <= 0) {
          const maxPosRow = await getAsync(
            'SELECT COALESCE(MAX(position), 0) AS maxPos FROM vocabulary_sequences WHERE level = ?',
            [level]
          );
          position = (maxPosRow?.maxPos || 0) + 1;
        }

        const insertSeq = await runAsync(
          `INSERT INTO vocabulary_sequences (title, theme, level, position, status)
           VALUES (?, ?, ?, ?, ?)`,
          [title, theme, level, position, status]
        );
        sequenceId = insertSeq.lastID;
        createdSequences += 1;
      }

      importedTitles.push(title);

      const existingWords = await allAsync(
        'SELECT * FROM vocabulary_words WHERE sequence_id = ? ORDER BY id ASC',
        [sequenceId]
      );
      const existingByLowerWord = new Map();
      existingWords.forEach((ew) => {
        const key = String(ew.word || '').trim().toLowerCase();
        if (key && !existingByLowerWord.has(key)) {
          existingByLowerWord.set(key, ew);
        }
      });

      const keptWordIds = new Set();

      for (let idx = 0; idx < wordsInput.length; idx += 1) {
        const w = wordsInput[idx] || {};
        const wordText = String(w.word || '').trim();
        if (!wordText) continue;

        const nature = String(w.nature || '').trim();
        const definition = String(w.definition || '').trim();
        const sentence1Full = String(w.sentence1_full || w.sentence1 || '').trim();
        const sentence2Full = String(w.sentence2_full || w.sentence2 || '').trim();
        const sentence1Cloze =
          String(w.sentence1_cloze || '').trim() || buildClozeSentence(sentence1Full, wordText);
        const sentence2Cloze =
          String(w.sentence2_cloze || '').trim() || buildClozeSentence(sentence2Full, wordText);
        const distractors = parseDistractors(w.distractors);
        const imagePrompt = String(w.image_prompt || w.imagePrompt || '').trim();
        const wordPos = Number(w.position) > 0 ? Number(w.position) : idx + 1;

        const rawImageData = String(w.image_data || w.imageData || '').trim();
        const rawImageUrl = String(w.image_url || w.imageUrl || '').trim();
        let finalImageUrl = '';

        if (rawImageData && rawImageData.startsWith('data:image/')) {
          finalImageUrl = saveVocabularyImage(rawImageData);
          importedImages += 1;
        } else if (rawImageUrl && rawImageUrl.startsWith('data:image/')) {
          finalImageUrl = saveVocabularyImage(rawImageUrl);
          importedImages += 1;
        } else if (rawImageUrl) {
          const cleanRel = rawImageUrl.replace(/^\/+/, '');
          if (cleanRel.startsWith('vocabulary-images/')) {
            const candidatePath = path.join(vocabularyImagesDir, path.basename(cleanRel));
            if (fs.existsSync(candidatePath)) {
              finalImageUrl = cleanRel;
            }
          } else {
            finalImageUrl = rawImageUrl;
          }
        }

        const matchedPrev = existingByLowerWord.get(wordText.toLowerCase());
        if (matchedPrev && !keptWordIds.has(Number(matchedPrev.id))) {
          const prevWordId = Number(matchedPrev.id);
          keptWordIds.add(prevWordId);

          if (!finalImageUrl && matchedPrev.image_url) {
            finalImageUrl = matchedPrev.image_url;
          } else if (
            matchedPrev.image_url &&
            finalImageUrl &&
            matchedPrev.image_url !== finalImageUrl
          ) {
            deleteVocabularyImageFile(matchedPrev.image_url);
          }

          const sentence1Id = await upsertVocabularyGeneratedSentence({
            existingSentenceId: matchedPrev.sentence1_id || null,
            fullSentence: sentence1Full,
            targetWord: wordText,
            targetNature: nature,
            level,
            theme: theme || title,
          });

          const sentence2Id = await upsertVocabularyGeneratedSentence({
            existingSentenceId: matchedPrev.sentence2_id || null,
            fullSentence: sentence2Full,
            targetWord: wordText,
            targetNature: nature,
            level,
            theme: theme || title,
          });

          await runAsync(
            `UPDATE vocabulary_words
             SET word = ?, nature = ?, definition = ?,
                 sentence1_cloze = ?, sentence1_id = ?,
                 sentence2_cloze = ?, sentence2_id = ?,
                 distractors = ?, image_url = ?, image_prompt = ?, position = ?
             WHERE id = ? AND sequence_id = ?`,
            [
              wordText,
              nature,
              definition,
              sentence1Cloze,
              sentence1Id,
              sentence2Cloze,
              sentence2Id,
              JSON.stringify(distractors),
              finalImageUrl,
              imagePrompt,
              wordPos,
              prevWordId,
              sequenceId,
            ]
          );
          importedWords += 1;
        } else {
          const sentence1Id = await upsertVocabularyGeneratedSentence({
            existingSentenceId: null,
            fullSentence: sentence1Full,
            targetWord: wordText,
            targetNature: nature,
            level,
            theme: theme || title,
          });

          const sentence2Id = await upsertVocabularyGeneratedSentence({
            existingSentenceId: null,
            fullSentence: sentence2Full,
            targetWord: wordText,
            targetNature: nature,
            level,
            theme: theme || title,
          });

          const inserted = await runAsync(
            `INSERT INTO vocabulary_words (
              sequence_id, word, nature, definition,
              sentence1_cloze, sentence1_id,
              sentence2_cloze, sentence2_id,
              distractors, image_url, image_prompt, position
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              sequenceId,
              wordText,
              nature,
              definition,
              sentence1Cloze,
              sentence1Id,
              sentence2Cloze,
              sentence2Id,
              JSON.stringify(distractors),
              finalImageUrl,
              imagePrompt,
              wordPos,
            ]
          );
          keptWordIds.add(inserted.lastID);
          importedWords += 1;
        }
      }

      if (wordsInput.length > 0 && existingWords.length > 0) {
        for (const prev of existingWords) {
          if (!keptWordIds.has(Number(prev.id))) {
            if (prev.image_url) {
              deleteVocabularyImageFile(prev.image_url);
            }
            await runAsync('DELETE FROM vocabulary_progress WHERE word_id = ?', [prev.id]);
            await runAsync('DELETE FROM vocabulary_words WHERE id = ?', [prev.id]);
          }
        }
      }
    }

    if (createdSequences + updatedSequences === 0) {
      return res.status(400).json({
        error: "Aucune séquence valide avec un titre n'a pu être importée.",
      });
    }

    return res.json({
      importedSequences: createdSequences + updatedSequences,
      createdSequences,
      updatedSequences,
      skippedSequences,
      importedWords,
      importedImages,
      titles: importedTitles,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Erreur lors de l'import des séquences de vocabulaire.",
    });
  }
});

router.get('/sequences/:id/export', async (req, res) => {
  try {
    const seqId = Number(req.params.id);
    if (Number.isNaN(seqId) || seqId <= 0) {
      return res.status(400).json({ error: 'Identifiant de séquence invalide.' });
    }

    const sequence = await getAsync('SELECT * FROM vocabulary_sequences WHERE id = ?', [seqId]);
    if (!sequence) {
      return res.status(404).json({ error: 'Séquence de vocabulaire introuvable.' });
    }

    const wordsRows = await allAsync(
      `SELECT vw.*,
              gs1.sentence AS sentence1_full,
              gs2.sentence AS sentence2_full
       FROM vocabulary_words vw
       LEFT JOIN generated_sentences gs1 ON gs1.id = vw.sentence1_id
       LEFT JOIN generated_sentences gs2 ON gs2.id = vw.sentence2_id
       WHERE vw.sequence_id = ?
       ORDER BY vw.position ASC, vw.id ASC`,
      [seqId]
    );

    const exportedSequence = buildSequenceExportObject(sequence, wordsRows);
    return res.json({
      version: 1,
      type: 'vocabulary_sequences_export',
      exportedAt: new Date().toISOString(),
      sequenceCount: 1,
      sequences: [exportedSequence],
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Erreur lors de l'export de la séquence.",
    });
  }
});

router.get('/sequences/:id', async (req, res) => {
  try {
    const seqId = Number(req.params.id);
    if (Number.isNaN(seqId) || seqId <= 0) {
      return res.status(400).json({ error: 'Identifiant de séquence invalide.' });
    }

    const sequence = await getAsync('SELECT * FROM vocabulary_sequences WHERE id = ?', [seqId]);
    if (!sequence) {
      return res.status(404).json({ error: 'Séquence de vocabulaire introuvable.' });
    }

    const wordsRows = await allAsync(
      `SELECT vw.*,
              gs1.sentence AS sentence1_full,
              gs2.sentence AS sentence2_full
       FROM vocabulary_words vw
       LEFT JOIN generated_sentences gs1 ON gs1.id = vw.sentence1_id
       LEFT JOIN generated_sentences gs2 ON gs2.id = vw.sentence2_id
       WHERE vw.sequence_id = ?
       ORDER BY vw.position ASC, vw.id ASC`,
      [seqId]
    );

    const words = wordsRows.map(formatWordRow);
    return res.json({
      ...sequence,
      wordCount: words.length,
      words,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la récupération de la séquence.' });
  }
});

router.post('/sequences', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const theme = String(req.body?.theme || '').trim();
    const rawLevel = String(req.body?.level || 'CE1').trim().toUpperCase();
    const level = ALLOWED_LEVELS.has(rawLevel) ? rawLevel : 'CE1';
    const rawStatus = String(req.body?.status || 'active').trim().toLowerCase();
    const status = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : 'active';
    const wordsInput = Array.isArray(req.body?.words) ? req.body.words : [];

    if (!title) {
      return res.status(400).json({ error: 'Le titre de la séquence est obligatoire.' });
    }

    let position = Number(req.body?.position);
    if (Number.isNaN(position) || position <= 0) {
      const maxPosRow = await getAsync(
        'SELECT COALESCE(MAX(position), 0) AS maxPos FROM vocabulary_sequences WHERE level = ?',
        [level]
      );
      position = (maxPosRow?.maxPos || 0) + 1;
    }

    const insertSeq = await runAsync(
      `INSERT INTO vocabulary_sequences (title, theme, level, position, status)
       VALUES (?, ?, ?, ?, ?)`,
      [title, theme, level, position, status]
    );
    const sequenceId = insertSeq.lastID;

    const insertedWords = [];
    for (let idx = 0; idx < wordsInput.length; idx += 1) {
      const w = wordsInput[idx] || {};
      const wordText = String(w.word || '').trim();
      if (!wordText) continue;

      const nature = String(w.nature || '').trim();
      const definition = String(w.definition || '').trim();
      const sentence1Full = String(w.sentence1_full || w.sentence1 || '').trim();
      const sentence2Full = String(w.sentence2_full || w.sentence2 || '').trim();
      const sentence1Cloze = String(w.sentence1_cloze || '').trim() || buildClozeSentence(sentence1Full, wordText);
      const sentence2Cloze = String(w.sentence2_cloze || '').trim() || buildClozeSentence(sentence2Full, wordText);
      const distractors = parseDistractors(w.distractors);
      const imageUrl = String(w.image_url || w.imageUrl || '').trim();
      const imagePrompt = String(w.image_prompt || w.imagePrompt || '').trim();
      const wordPos = Number(w.position) > 0 ? Number(w.position) : idx + 1;

      const sentence1Id = await upsertVocabularyGeneratedSentence({
        existingSentenceId: w.sentence1_id || null,
        fullSentence: sentence1Full,
        targetWord: wordText,
        targetNature: nature,
        level,
        theme: theme || title,
      });

      const sentence2Id = await upsertVocabularyGeneratedSentence({
        existingSentenceId: w.sentence2_id || null,
        fullSentence: sentence2Full,
        targetWord: wordText,
        targetNature: nature,
        level,
        theme: theme || title,
      });

      const wordInsert = await runAsync(
        `INSERT INTO vocabulary_words (
          sequence_id, word, nature, definition,
          sentence1_cloze, sentence1_id,
          sentence2_cloze, sentence2_id,
          distractors, image_url, image_prompt, position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sequenceId,
          wordText,
          nature,
          definition,
          sentence1Cloze,
          sentence1Id,
          sentence2Cloze,
          sentence2Id,
          JSON.stringify(distractors),
          imageUrl,
          imagePrompt,
          wordPos,
        ]
      );

      insertedWords.push({
        id: wordInsert.lastID,
        sequence_id: sequenceId,
        word: wordText,
        nature,
        definition,
        sentence1_cloze: sentence1Cloze,
        sentence1_id: sentence1Id,
        sentence1_full: sentence1Full,
        sentence2_cloze: sentence2Cloze,
        sentence2_id: sentence2Id,
        sentence2_full: sentence2Full,
        distractors,
        image_url: imageUrl,
        imageUrl,
        image_prompt: imagePrompt,
        imagePrompt,
        position: wordPos,
      });
    }

    const createdSequence = await getAsync('SELECT * FROM vocabulary_sequences WHERE id = ?', [sequenceId]);
    return res.status(201).json({
      ...createdSequence,
      wordCount: insertedWords.length,
      words: insertedWords,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la création de la séquence.' });
  }
});

router.post('/sequences/reorder', async (req, res) => {
  try {
    const sequenceIds = Array.isArray(req.body?.sequenceIds)
      ? req.body.sequenceIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id) && id > 0)
      : [];

    if (sequenceIds.length === 0) {
      return res.status(400).json({ error: 'La liste des identifiants de séquences est requise.' });
    }

    for (let idx = 0; idx < sequenceIds.length; idx += 1) {
      await runAsync(
        'UPDATE vocabulary_sequences SET position = ? WHERE id = ?',
        [idx + 1, sequenceIds[idx]]
      );
    }

    return res.json({ success: true, count: sequenceIds.length });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors du réordonnancement des séquences.' });
  }
});

router.put('/sequences/:id', async (req, res) => {
  try {
    const seqId = Number(req.params.id);
    if (Number.isNaN(seqId) || seqId <= 0) {
      return res.status(400).json({ error: 'Identifiant de séquence invalide.' });
    }

    const existing = await getAsync('SELECT * FROM vocabulary_sequences WHERE id = ?', [seqId]);
    if (!existing) {
      return res.status(404).json({ error: 'Séquence introuvable.' });
    }

    const title = req.body?.title !== undefined ? String(req.body.title).trim() : existing.title;
    if (!title) {
      return res.status(400).json({ error: 'Le titre de la séquence est obligatoire.' });
    }

    const theme = req.body?.theme !== undefined ? String(req.body.theme).trim() : existing.theme;
    const rawLevel = req.body?.level !== undefined ? String(req.body.level).trim().toUpperCase() : existing.level;
    const level = ALLOWED_LEVELS.has(rawLevel) ? rawLevel : existing.level;
    const rawStatus = req.body?.status !== undefined ? String(req.body.status).trim().toLowerCase() : existing.status;
    const status = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : existing.status;
    const position =
      req.body?.position !== undefined && !Number.isNaN(Number(req.body.position))
        ? Number(req.body.position)
        : existing.position;

    await runAsync(
      `UPDATE vocabulary_sequences
       SET title = ?, theme = ?, level = ?, position = ?, status = ?
       WHERE id = ?`,
      [title, theme, level, position, status, seqId]
    );

    if (Array.isArray(req.body?.words)) {
      const existingWords = await allAsync('SELECT * FROM vocabulary_words WHERE sequence_id = ?', [seqId]);
      const existingById = new Map(existingWords.map((w) => [Number(w.id), w]));
      const keptIds = new Set();

      for (let idx = 0; idx < req.body.words.length; idx += 1) {
        const w = req.body.words[idx] || {};
        const wordText = String(w.word || '').trim();
        if (!wordText) continue;

        const nature = String(w.nature || '').trim();
        const definition = String(w.definition || '').trim();
        const sentence1Full = String(w.sentence1_full || w.sentence1 || '').trim();
        const sentence2Full = String(w.sentence2_full || w.sentence2 || '').trim();
        const sentence1Cloze = String(w.sentence1_cloze || '').trim() || buildClozeSentence(sentence1Full, wordText);
        const sentence2Cloze = String(w.sentence2_cloze || '').trim() || buildClozeSentence(sentence2Full, wordText);
        const distractors = parseDistractors(w.distractors);
        const imageUrl = String(w.image_url || w.imageUrl || '').trim();
        const imagePrompt = String(w.image_prompt || w.imagePrompt || '').trim();
        const wordPos = Number(w.position) > 0 ? Number(w.position) : idx + 1;

        const wordId = Number(w.id);
        if (!Number.isNaN(wordId) && existingById.has(wordId)) {
          keptIds.add(wordId);
          const prevWord = existingById.get(wordId);
          if (prevWord.image_url && prevWord.image_url !== imageUrl) {
            deleteVocabularyImageFile(prevWord.image_url);
          }

          const sentence1Id = await upsertVocabularyGeneratedSentence({
            existingSentenceId: w.sentence1_id || prevWord.sentence1_id || null,
            fullSentence: sentence1Full,
            targetWord: wordText,
            targetNature: nature,
            level,
            theme: theme || title,
          });

          const sentence2Id = await upsertVocabularyGeneratedSentence({
            existingSentenceId: w.sentence2_id || prevWord.sentence2_id || null,
            fullSentence: sentence2Full,
            targetWord: wordText,
            targetNature: nature,
            level,
            theme: theme || title,
          });

          await runAsync(
            `UPDATE vocabulary_words
             SET word = ?, nature = ?, definition = ?,
                 sentence1_cloze = ?, sentence1_id = ?,
                 sentence2_cloze = ?, sentence2_id = ?,
                 distractors = ?, image_url = ?, image_prompt = ?, position = ?
             WHERE id = ? AND sequence_id = ?`,
            [
              wordText,
              nature,
              definition,
              sentence1Cloze,
              sentence1Id,
              sentence2Cloze,
              sentence2Id,
              JSON.stringify(distractors),
              imageUrl,
              imagePrompt,
              wordPos,
              wordId,
              seqId,
            ]
          );
        } else {
          const sentence1Id = await upsertVocabularyGeneratedSentence({
            existingSentenceId: w.sentence1_id || null,
            fullSentence: sentence1Full,
            targetWord: wordText,
            targetNature: nature,
            level,
            theme: theme || title,
          });

          const sentence2Id = await upsertVocabularyGeneratedSentence({
            existingSentenceId: w.sentence2_id || null,
            fullSentence: sentence2Full,
            targetWord: wordText,
            targetNature: nature,
            level,
            theme: theme || title,
          });

          const inserted = await runAsync(
            `INSERT INTO vocabulary_words (
              sequence_id, word, nature, definition,
              sentence1_cloze, sentence1_id,
              sentence2_cloze, sentence2_id,
              distractors, image_url, image_prompt, position
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              seqId,
              wordText,
              nature,
              definition,
              sentence1Cloze,
              sentence1Id,
              sentence2Cloze,
              sentence2Id,
              JSON.stringify(distractors),
              imageUrl,
              imagePrompt,
              wordPos,
            ]
          );
          keptIds.add(inserted.lastID);
        }
      }

      for (const prev of existingWords) {
        if (!keptIds.has(Number(prev.id))) {
          if (prev.image_url) {
            deleteVocabularyImageFile(prev.image_url);
          }
          await runAsync('DELETE FROM vocabulary_progress WHERE word_id = ?', [prev.id]);
          await runAsync('DELETE FROM vocabulary_words WHERE id = ?', [prev.id]);
        }
      }
    }

    const updatedSequence = await getAsync('SELECT * FROM vocabulary_sequences WHERE id = ?', [seqId]);
    const wordsRows = await allAsync(
      `SELECT vw.*,
              gs1.sentence AS sentence1_full,
              gs2.sentence AS sentence2_full
       FROM vocabulary_words vw
       LEFT JOIN generated_sentences gs1 ON gs1.id = vw.sentence1_id
       LEFT JOIN generated_sentences gs2 ON gs2.id = vw.sentence2_id
       WHERE vw.sequence_id = ?
       ORDER BY vw.position ASC, vw.id ASC`,
      [seqId]
    );
    const words = wordsRows.map(formatWordRow);

    return res.json({
      ...updatedSequence,
      wordCount: words.length,
      words,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour de la séquence.' });
  }
});

router.delete('/sequences/:id', async (req, res) => {
  try {
    const seqId = Number(req.params.id);
    if (Number.isNaN(seqId) || seqId <= 0) {
      return res.status(400).json({ error: 'Identifiant de séquence invalide.' });
    }

    const words = await allAsync('SELECT id, image_url FROM vocabulary_words WHERE sequence_id = ?', [seqId]);
    words.forEach((w) => {
      if (w.image_url) {
        deleteVocabularyImageFile(w.image_url);
      }
    });

    await runAsync('DELETE FROM vocabulary_progress WHERE sequence_id = ?', [seqId]);
    await runAsync('DELETE FROM vocabulary_words WHERE sequence_id = ?', [seqId]);
    const delRes = await runAsync('DELETE FROM vocabulary_sequences WHERE id = ?', [seqId]);

    return res.json({ deleted: delRes.changes || 0 });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la suppression de la séquence.' });
  }
});

// ============================================================================
// MOTS DE VOCABULAIRE & IMPORT D'IMAGES
// ============================================================================

router.get('/words', async (req, res) => {
  try {
    const { sequenceId } = req.query;
    const where = [];
    const params = [];

    if (sequenceId) {
      where.push('vw.sequence_id = ?');
      params.push(Number(sequenceId));
    }

    const rows = await allAsync(
      `SELECT vw.*,
              gs1.sentence AS sentence1_full,
              gs2.sentence AS sentence2_full
       FROM vocabulary_words vw
       LEFT JOIN generated_sentences gs1 ON gs1.id = vw.sentence1_id
       LEFT JOIN generated_sentences gs2 ON gs2.id = vw.sentence2_id
       ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY vw.sequence_id ASC, vw.position ASC, vw.id ASC`,
      params
    );

    return res.json(rows.map(formatWordRow));
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors du chargement des mots.' });
  }
});

router.post('/image-upload', async (req, res) => {
  try {
    const imageData = req.body?.imageData || req.body?.image;
    const previousImageUrl = req.body?.previousImageUrl || '';
    if (!imageData) {
      return res.status(400).json({ error: "Aucune image fournie pour l'import." });
    }

    if (previousImageUrl) {
      deleteVocabularyImageFile(previousImageUrl);
    }

    const imageUrl = saveVocabularyImage(imageData);
    return res.json({ imageUrl });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Erreur lors de l'enregistrement de l'image." });
  }
});

router.post('/words/:id/image-upload', async (req, res) => {
  try {
    const wordId = Number(req.params.id);
    if (Number.isNaN(wordId) || wordId <= 0) {
      return res.status(400).json({ error: 'Identifiant de mot invalide.' });
    }

    const existing = await getAsync('SELECT * FROM vocabulary_words WHERE id = ?', [wordId]);
    if (!existing) {
      return res.status(404).json({ error: 'Mot introuvable.' });
    }

    const imageData = req.body?.imageData || req.body?.image;
    if (!imageData) {
      return res.status(400).json({ error: "Aucune image fournie pour l'import." });
    }

    if (existing.image_url) {
      deleteVocabularyImageFile(existing.image_url);
    }

    const imageUrl = saveVocabularyImage(imageData);
    const imagePrompt = req.body?.imagePrompt !== undefined ? String(req.body.imagePrompt).trim() : existing.image_prompt;

    await runAsync(
      'UPDATE vocabulary_words SET image_url = ?, image_prompt = ? WHERE id = ?',
      [imageUrl, imagePrompt, wordId]
    );

    const updated = await getAsync('SELECT * FROM vocabulary_words WHERE id = ?', [wordId]);
    return res.json({
      imageUrl,
      word: formatWordRow(updated),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erreur lors de l'import de l'image." });
  }
});

router.put('/words/:id', async (req, res) => {
  try {
    const wordId = Number(req.params.id);
    if (Number.isNaN(wordId) || wordId <= 0) {
      return res.status(400).json({ error: 'Identifiant de mot invalide.' });
    }

    const existing = await getAsync('SELECT * FROM vocabulary_words WHERE id = ?', [wordId]);
    if (!existing) {
      return res.status(404).json({ error: 'Mot introuvable.' });
    }

    const seq = await getAsync('SELECT * FROM vocabulary_sequences WHERE id = ?', [existing.sequence_id]);
    const wordText = req.body?.word !== undefined ? String(req.body.word).trim() : existing.word;
    if (!wordText) {
      return res.status(400).json({ error: 'Le mot est obligatoire.' });
    }

    const nature = req.body?.nature !== undefined ? String(req.body.nature).trim() : existing.nature;
    const definition = req.body?.definition !== undefined ? String(req.body.definition).trim() : existing.definition;
    const sentence1Full = String(req.body?.sentence1_full || req.body?.sentence1 || '').trim();
    const sentence2Full = String(req.body?.sentence2_full || req.body?.sentence2 || '').trim();
    const sentence1Cloze =
      req.body?.sentence1_cloze !== undefined
        ? String(req.body.sentence1_cloze).trim()
        : sentence1Full
          ? buildClozeSentence(sentence1Full, wordText)
          : existing.sentence1_cloze;
    const sentence2Cloze =
      req.body?.sentence2_cloze !== undefined
        ? String(req.body.sentence2_cloze).trim()
        : sentence2Full
          ? buildClozeSentence(sentence2Full, wordText)
          : existing.sentence2_cloze;
    const distractors =
      req.body?.distractors !== undefined
        ? parseDistractors(req.body.distractors)
        : parseDistractors(existing.distractors);
    const imageUrl =
      req.body?.image_url !== undefined || req.body?.imageUrl !== undefined
        ? String(req.body.image_url ?? req.body.imageUrl ?? '').trim()
        : existing.image_url;
    const imagePrompt =
      req.body?.image_prompt !== undefined || req.body?.imagePrompt !== undefined
        ? String(req.body.image_prompt ?? req.body.imagePrompt ?? '').trim()
        : existing.image_prompt;
    const position =
      req.body?.position !== undefined && !Number.isNaN(Number(req.body.position))
        ? Number(req.body.position)
        : existing.position;

    if (existing.image_url && existing.image_url !== imageUrl) {
      deleteVocabularyImageFile(existing.image_url);
    }

    const sentence1Id = await upsertVocabularyGeneratedSentence({
      existingSentenceId: existing.sentence1_id,
      fullSentence: sentence1Full,
      targetWord: wordText,
      targetNature: nature,
      level: seq?.level || 'CE1',
      theme: seq?.theme || seq?.title || '',
    });

    const sentence2Id = await upsertVocabularyGeneratedSentence({
      existingSentenceId: existing.sentence2_id,
      fullSentence: sentence2Full,
      targetWord: wordText,
      targetNature: nature,
      level: seq?.level || 'CE1',
      theme: seq?.theme || seq?.title || '',
    });

    await runAsync(
      `UPDATE vocabulary_words
       SET word = ?, nature = ?, definition = ?,
           sentence1_cloze = ?, sentence1_id = ?,
           sentence2_cloze = ?, sentence2_id = ?,
           distractors = ?, image_url = ?, image_prompt = ?, position = ?
       WHERE id = ?`,
      [
        wordText,
        nature,
        definition,
        sentence1Cloze,
        sentence1Id,
        sentence2Cloze,
        sentence2Id,
        JSON.stringify(distractors),
        imageUrl,
        imagePrompt,
        position,
        wordId,
      ]
    );

    const updated = await getAsync(
      `SELECT vw.*,
              gs1.sentence AS sentence1_full,
              gs2.sentence AS sentence2_full
       FROM vocabulary_words vw
       LEFT JOIN generated_sentences gs1 ON gs1.id = vw.sentence1_id
       LEFT JOIN generated_sentences gs2 ON gs2.id = vw.sentence2_id
       WHERE vw.id = ?`,
      [wordId]
    );

    return res.json(formatWordRow(updated));
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la modification du mot.' });
  }
});

router.delete('/words/:id', async (req, res) => {
  try {
    const wordId = Number(req.params.id);
    if (Number.isNaN(wordId) || wordId <= 0) {
      return res.status(400).json({ error: 'Identifiant de mot invalide.' });
    }

    const existing = await getAsync('SELECT * FROM vocabulary_words WHERE id = ?', [wordId]);
    if (existing?.image_url) {
      deleteVocabularyImageFile(existing.image_url);
    }

    await runAsync('DELETE FROM vocabulary_progress WHERE word_id = ?', [wordId]);
    const delRes = await runAsync('DELETE FROM vocabulary_words WHERE id = ?', [wordId]);
    return res.json({ deleted: delRes.changes || 0 });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la suppression du mot.' });
  }
});

// ============================================================================
// SESSION MIXTE ADAPTATIVE & PROGRESSION ÉLÈVE
// ============================================================================

router.get('/session', async (req, res) => {
  try {
    const studentId = req.query.studentId ? Number(req.query.studentId) : null;
    const rawLevel = String(req.query.level || 'CE1').trim().toUpperCase();
    const level = ALLOWED_LEVELS.has(rawLevel) ? rawLevel : 'CE1';
    const sequenceId = req.query.sequenceId ? Number(req.query.sequenceId) : null;
    const parsedWordCount = Number(req.query.wordCount);
    const wordCount = Number.isNaN(parsedWordCount) || parsedWordCount <= 0
      ? 10
      : Math.min(Math.max(Math.round(parsedWordCount), 1), 30);
    const parsedMaxRevisions = Number(req.query.maxRevisions);
    const maxRevisions = Number.isNaN(parsedMaxRevisions) || parsedMaxRevisions < 0
      ? Math.max(1, Math.round(wordCount * 0.6))
      : Math.min(Math.round(parsedMaxRevisions), wordCount);
    const forcePractice = String(req.query.forcePractice || '').toLowerCase() === 'true';
    const today = getTodayIsoDate();

    let candidateWords = [];
    if (sequenceId && !Number.isNaN(sequenceId)) {
      candidateWords = await allAsync(
        `SELECT vw.*, vs.title AS sequence_title, vs.level AS sequence_level, vs.theme AS sequence_theme
         FROM vocabulary_words vw
         INNER JOIN vocabulary_sequences vs ON vs.id = vw.sequence_id
         WHERE vw.sequence_id = ?
         ORDER BY vw.position ASC, vw.id ASC`,
        [sequenceId]
      );
    } else {
      candidateWords = await allAsync(
        `SELECT vw.*, vs.title AS sequence_title, vs.level AS sequence_level, vs.theme AS sequence_theme
         FROM vocabulary_words vw
         INNER JOIN vocabulary_sequences vs ON vs.id = vw.sequence_id
         WHERE UPPER(vs.level) = ? AND LOWER(vs.status) = 'active'
         ORDER BY vs.position ASC, vs.id ASC, vw.position ASC, vw.id ASC`,
        [level]
      );

      // Si aucune séquence active pour ce niveau, tenter toutes les séquences actives
      if (candidateWords.length === 0) {
        candidateWords = await allAsync(
          `SELECT vw.*, vs.title AS sequence_title, vs.level AS sequence_level, vs.theme AS sequence_theme
           FROM vocabulary_words vw
           INNER JOIN vocabulary_sequences vs ON vs.id = vw.sequence_id
           WHERE LOWER(vs.status) = 'active'
           ORDER BY vs.position ASC, vs.id ASC, vw.position ASC, vw.id ASC`
        );
      }
    }

    const formattedWords = candidateWords.map(formatWordRow);

    // Mode Démo (aucun élève sélectionné)
    if (!studentId || Number.isNaN(studentId)) {
      const demoWords = formattedWords.slice(0, wordCount).map((w) => ({
        ...w,
        phase: 'discovery',
        stage: 'learning',
        tier_index: 0,
        consecutive_successes: 0,
      }));
      return res.json({
        mode: 'demo',
        level,
        wordCount: demoWords.length,
        upToDate: false,
        isBonusPractice: false,
        nextReviewDate: null,
        words: demoWords,
      });
    }

    const progressRows = await allAsync(
      'SELECT * FROM vocabulary_progress WHERE student_id = ?',
      [studentId]
    );
    const progressByWordId = new Map(progressRows.map((p) => [Number(p.word_id), p]));

    const dueRevisions = [];
    const discoveryWords = [];
    const futureRevisions = [];

    formattedWords.forEach((word) => {
      const prog = progressByWordId.get(Number(word.id)) || null;
      if (!prog || prog.stage === 'learning') {
        discoveryWords.push({
          ...word,
          phase: 'discovery',
          stage: 'learning',
          tier_index: 0,
          interval_days: 0,
          consecutive_successes: 0,
          next_review_date: prog?.next_review_date || null,
        });
      } else {
        const nextDate = prog.next_review_date || today;
        const enrichedWord = {
          ...word,
          phase: 'revision',
          stage: prog.stage,
          tier_index: Number(prog.tier_index || 0),
          interval_days: Number(prog.interval_days || 1),
          consecutive_successes: Number(prog.consecutive_successes || 0),
          next_review_date: nextDate,
        };
        if (nextDate <= today) {
          dueRevisions.push(enrichedWord);
        } else {
          futureRevisions.push(enrichedWord);
        }
      }
    });

    // Trier les révisions dues par date d'échéance la plus ancienne d'abord
    dueRevisions.sort((a, b) => String(a.next_review_date).localeCompare(String(b.next_review_date)) || a.id - b.id);
    futureRevisions.sort((a, b) => String(a.next_review_date).localeCompare(String(b.next_review_date)) || a.id - b.id);

    // Sélection : jusqu'à maxRevisions révisions dues (ou plus s'il y a peu de mots en découverte)
    const minDiscoveryTarget = Math.min(discoveryWords.length, Math.max(0, wordCount - maxRevisions));
    const maxRevisionSlots = Math.max(0, wordCount - minDiscoveryTarget);

    const chosenRevisions = dueRevisions.slice(0, maxRevisionSlots);
    const remainingSlots = Math.max(0, wordCount - chosenRevisions.length);
    const chosenDiscoveries = discoveryWords.slice(0, remainingSlots);

    let sessionWords = [...chosenRevisions, ...chosenDiscoveries];

    // S'il reste encore de la place et qu'il y avait plus de révisions dues que maxRevisionSlots
    if (sessionWords.length < wordCount && dueRevisions.length > chosenRevisions.length) {
      const extraRevisions = dueRevisions.slice(
        chosenRevisions.length,
        chosenRevisions.length + (wordCount - sessionWords.length)
      );
      sessionWords = [...sessionWords, ...extraRevisions];
    }

    const stats = {
      totalActiveWords: formattedWords.length,
      dueTodayCount: dueRevisions.length,
      learningCount: discoveryWords.length,
      reviewingCount: [...dueRevisions, ...futureRevisions].filter((w) => w.stage === 'reviewing').length,
      masteredCount: [...dueRevisions, ...futureRevisions].filter((w) => w.stage === 'mastered').length,
    };

    const earliestNextDate = futureRevisions.length > 0 ? futureRevisions[0].next_review_date : null;

    if (sessionWords.length === 0 && formattedWords.length > 0) {
      if (forcePractice && futureRevisions.length > 0) {
        return res.json({
          mode: 'student',
          level,
          wordCount: Math.min(wordCount, futureRevisions.length),
          upToDate: false,
          isBonusPractice: true,
          nextReviewDate: earliestNextDate,
          stats,
          words: futureRevisions.slice(0, wordCount),
        });
      }

      return res.json({
        mode: 'student',
        level,
        wordCount: 0,
        upToDate: true,
        isBonusPractice: false,
        nextReviewDate: earliestNextDate,
        stats,
        words: [],
      });
    }

    return res.json({
      mode: 'student',
      level,
      wordCount: sessionWords.length,
      upToDate: false,
      isBonusPractice: false,
      nextReviewDate: earliestNextDate,
      stats,
      words: sessionWords,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la composition de la session de vocabulaire.' });
  }
});

router.post('/progress/update', async (req, res) => {
  try {
    const studentId = Number(req.body?.studentId);
    const results = Array.isArray(req.body?.results) ? req.body.results : [];
    const today = getTodayIsoDate();

    if (Number.isNaN(studentId) || studentId <= 0) {
      return res.status(400).json({ error: 'studentId invalide.' });
    }

    const updatedItems = [];

    for (const item of results) {
      const wordId = Number(item?.wordId);
      if (Number.isNaN(wordId) || wordId <= 0) continue;

      const wordRow = await getAsync('SELECT id, sequence_id FROM vocabulary_words WHERE id = ?', [wordId]);
      if (!wordRow) continue;

      const sequenceId = Number(item?.sequenceId) || wordRow.sequence_id;
      const existingProgress = await getAsync(
        'SELECT * FROM vocabulary_progress WHERE student_id = ? AND word_id = ?',
        [studentId, wordId]
      );

      const nextState = computeNextVocabularyProgress(existingProgress, item, today);

      if (existingProgress) {
        await runAsync(
          `UPDATE vocabulary_progress
           SET stage = ?, tier_index = ?, interval_days = ?, next_review_date = ?,
               consecutive_successes = ?, last_reviewed_at = ?
           WHERE id = ?`,
          [
            nextState.stage,
            nextState.tier_index,
            nextState.interval_days,
            nextState.next_review_date,
            nextState.consecutive_successes,
            nextState.last_reviewed_at,
            existingProgress.id,
          ]
        );
      } else {
        await runAsync(
          `INSERT INTO vocabulary_progress (
            student_id, word_id, sequence_id, stage, tier_index,
            interval_days, next_review_date, consecutive_successes, last_reviewed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            studentId,
            wordId,
            sequenceId,
            nextState.stage,
            nextState.tier_index,
            nextState.interval_days,
            nextState.next_review_date,
            nextState.consecutive_successes,
            nextState.last_reviewed_at,
          ]
        );
      }

      updatedItems.push({
        wordId,
        sequenceId,
        ...nextState,
      });
    }

    return res.json({
      studentId,
      updatedCount: updatedItems.length,
      progress: updatedItems,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour de la progression.' });
  }
});

router.get('/progress/:studentId', async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    if (Number.isNaN(studentId) || studentId <= 0) {
      return res.status(400).json({ error: 'Identifiant élève invalide.' });
    }

    const rawLevel = req.query.level ? String(req.query.level).trim().toUpperCase() : '';
    const today = getTodayIsoDate();

    const activeWords = await allAsync(
      `SELECT vw.id, vw.word, vw.sequence_id, vs.level, vs.title AS sequence_title
       FROM vocabulary_words vw
       INNER JOIN vocabulary_sequences vs ON vs.id = vw.sequence_id
       WHERE LOWER(vs.status) = 'active'
       ${rawLevel && ALLOWED_LEVELS.has(rawLevel) ? 'AND UPPER(vs.level) = ?' : ''}
       ORDER BY vs.position ASC, vw.position ASC`,
      rawLevel && ALLOWED_LEVELS.has(rawLevel) ? [rawLevel] : []
    );

    const progressRows = await allAsync(
      `SELECT vp.*, vw.word, vw.nature
       FROM vocabulary_progress vp
       LEFT JOIN vocabulary_words vw ON vw.id = vp.word_id
       WHERE vp.student_id = ?`,
      [studentId]
    );
    const progressByWordId = new Map(progressRows.map((p) => [Number(p.word_id), p]));

    let dueTodayCount = 0;
    let learningCount = 0;
    let reviewingCount = 0;
    let masteredCount = 0;
    let earliestNextDate = null;

    activeWords.forEach((w) => {
      const p = progressByWordId.get(Number(w.id));
      if (!p || p.stage === 'learning') {
        learningCount += 1;
      } else {
        if (p.stage === 'mastered') masteredCount += 1;
        else reviewingCount += 1;

        if (!p.next_review_date || p.next_review_date <= today) {
          dueTodayCount += 1;
        } else if (!earliestNextDate || p.next_review_date < earliestNextDate) {
          earliestNextDate = p.next_review_date;
        }
      }
    });

    return res.json({
      studentId,
      totalActiveWords: activeWords.length,
      dueTodayCount,
      learningCount,
      reviewingCount,
      masteredCount,
      nextReviewDate: earliestNextDate,
      items: progressRows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la lecture de la progression.' });
  }
});

router.delete('/progress', async (req, res) => {
  try {
    const classId = req.query.classId || req.body?.classId;
    const studentId = req.query.studentId || req.body?.studentId;

    if (studentId) {
      const parsedStudentId = Number(studentId);
      if (Number.isNaN(parsedStudentId) || parsedStudentId <= 0) {
        return res.status(400).json({ error: 'studentId invalide.' });
      }
      const delRes = await runAsync('DELETE FROM vocabulary_progress WHERE student_id = ?', [parsedStudentId]);
      return res.json({ deleted: delRes.changes || 0, scope: 'student', studentId: parsedStudentId });
    }

    if (classId) {
      const parsedClassId = Number(classId);
      if (Number.isNaN(parsedClassId) || parsedClassId <= 0) {
        return res.status(400).json({ error: 'classId invalide.' });
      }
      const delRes = await runAsync(
        'DELETE FROM vocabulary_progress WHERE student_id IN (SELECT id FROM students WHERE class_id = ?)',
        [parsedClassId]
      );
      return res.json({ deleted: delRes.changes || 0, scope: 'class', classId: parsedClassId });
    }

    const delRes = await runAsync('DELETE FROM vocabulary_progress');
    return res.json({ deleted: delRes.changes || 0, scope: 'all' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la réinitialisation de la progression.' });
  }
});

router.get('/dashboard/:classId', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    if (Number.isNaN(classId) || classId <= 0) {
      return res.status(400).json({ error: 'Identifiant de classe invalide.' });
    }

    const rawLevel = req.query.level ? String(req.query.level).trim().toUpperCase() : '';
    const today = getTodayIsoDate();

    const students = await allAsync(
      `SELECT students.*, groups.name AS group_name, COALESCE(groups.color, '#6b7280') AS group_color
       FROM students
       LEFT JOIN groups ON groups.id = students.group_id
       WHERE students.class_id = ?
       ORDER BY LOWER(students.firstname) ASC, LOWER(students.name) ASC`,
      [classId]
    );

    const activeWords = await allAsync(
      `SELECT vw.*, vs.title AS sequence_title, vs.level AS sequence_level, vs.status AS sequence_status
       FROM vocabulary_words vw
       INNER JOIN vocabulary_sequences vs ON vs.id = vw.sequence_id
       WHERE LOWER(vs.status) = 'active'
       ${rawLevel && ALLOWED_LEVELS.has(rawLevel) ? 'AND UPPER(vs.level) = ?' : ''}
       ORDER BY vs.position ASC, vw.position ASC`,
      rawLevel && ALLOWED_LEVELS.has(rawLevel) ? [rawLevel] : []
    );

    const allProgress = await allAsync(
      `SELECT vp.*, vw.word, vw.nature
       FROM vocabulary_progress vp
       INNER JOIN students s ON s.id = vp.student_id
       LEFT JOIN vocabulary_words vw ON vw.id = vp.word_id
       WHERE s.class_id = ?`,
      [classId]
    );

    const progressByStudent = new Map();
    allProgress.forEach((p) => {
      if (!progressByStudent.has(p.student_id)) {
        progressByStudent.set(p.student_id, new Map());
      }
      progressByStudent.get(p.student_id).set(Number(p.word_id), p);
    });

    const studentSummaries = students.map((student) => {
      const studentMap = progressByStudent.get(student.id) || new Map();
      let dueTodayCount = 0;
      let learningCount = 0;
      let reviewingCount = 0;
      let masteredCount = 0;
      let nextReviewDate = null;
      const dueWords = [];
      const masteredWords = [];

      activeWords.forEach((w) => {
        const p = studentMap.get(Number(w.id));
        if (!p || p.stage === 'learning') {
          learningCount += 1;
        } else {
          if (p.stage === 'mastered') {
            masteredCount += 1;
            masteredWords.push(w.word);
          } else {
            reviewingCount += 1;
          }

          if (!p.next_review_date || p.next_review_date <= today) {
            dueTodayCount += 1;
            dueWords.push({
              id: w.id,
              word: w.word,
              stage: p.stage,
              tier_index: p.tier_index,
              interval_days: p.interval_days,
              consecutive_successes: p.consecutive_successes,
            });
          } else if (!nextReviewDate || p.next_review_date < nextReviewDate) {
            nextReviewDate = p.next_review_date;
          }
        }
      });

      return {
        student,
        totalActiveWords: activeWords.length,
        dueTodayCount,
        learningCount,
        reviewingCount,
        masteredCount,
        nextReviewDate,
        dueWords,
        masteredWords,
      };
    });

    const vocabActivities = await allAsync(
      `SELECT id, title, status, js_file, content
       FROM activities
       WHERE js_file LIKE '%VocabularyLearningActivity%'`
    );

    return res.json({
      classId,
      today,
      totalActiveWords: activeWords.length,
      vocabularyActivities: vocabActivities,
      students: studentSummaries,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur lors du chargement du tableau de bord vocabulaire.' });
  }
});

module.exports = router;
module.exports.PALIERS = PALIERS;
module.exports.addSchoolDays = addSchoolDays;
module.exports.buildClozeSentence = buildClozeSentence;
module.exports.computeNextVocabularyProgress = computeNextVocabularyProgress;
