const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('../db');
const vocabularyRouter = require('./vocabulary');

const {
  PALIERS,
  addSchoolDays,
  buildClozeSentence,
  computeNextVocabularyProgress,
} = vocabularyRouter;

function createTestApp() {
  const app = express();
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use('/api/vocabulary', vocabularyRouter);
  return app;
}

test('Utilitaires Vocabulaire - Jours de classe et Répétition espacée', async (t) => {
  await t.test('addSchoolDays exclut les samedis et dimanches', () => {
    // 2026-11-13 est un vendredi
    assert.equal(addSchoolDays('2026-11-13', 1), '2026-11-16'); // Lundi
    assert.equal(addSchoolDays('2026-11-13', 3), '2026-11-18'); // Mercredi
  });

  await t.test('buildClozeSentence remplace le mot cible par _____', () => {
    assert.equal(
      buildClozeSentence('Le renard est un animal très rusé.', 'rusé'),
      'Le renard est un animal très _____.'
    );
    assert.equal(
      buildClozeSentence('Le renard est _____.', 'rusé'),
      'Le renard est _____.'
    );
  });

  await t.test('computeNextVocabularyProgress : Découverte nécessite 2/2 sans erreur', () => {
    const failedDiscovery = computeNextVocabularyProgress(
      null,
      { phase: 'discovery', score: 1.5, maxScore: 2, errors: 1 },
      '2026-11-13'
    );
    assert.equal(failedDiscovery.stage, 'learning');
    assert.equal(failedDiscovery.interval_days, 0);

    const passedDiscovery = computeNextVocabularyProgress(
      null,
      { phase: 'discovery', score: 2, maxScore: 2, errors: 0 },
      '2026-11-13'
    );
    assert.equal(passedDiscovery.stage, 'reviewing');
    assert.equal(passedDiscovery.tier_index, 0);
    assert.equal(passedDiscovery.interval_days, PALIERS[0]);
    assert.equal(passedDiscovery.next_review_date, '2026-11-16');
  });

  await t.test('computeNextVocabularyProgress : Révision par paliers symétriques et couronne à 3 succès', () => {
    let state = {
      stage: 'reviewing',
      tier_index: 0,
      interval_days: 1,
      consecutive_successes: 0,
    };

    // 1re révision parfaite (3/3) -> palier 1 (J+3), 1 étoile
    state = computeNextVocabularyProgress(state, { phase: 'revision', score: 3, maxScore: 3, errors: 0 }, '2026-11-16');
    assert.equal(state.stage, 'reviewing');
    assert.equal(state.tier_index, 1);
    assert.equal(state.interval_days, 3);
    assert.equal(state.consecutive_successes, 1);

    // 2e révision parfaite -> palier 2 (J+7), 2 étoiles
    state = computeNextVocabularyProgress(state, { phase: 'revision', score: 3, maxScore: 3, errors: 0 }, '2026-11-19');
    assert.equal(state.stage, 'reviewing');
    assert.equal(state.tier_index, 2);
    assert.equal(state.interval_days, 7);
    assert.equal(state.consecutive_successes, 2);

    // 3e révision parfaite -> palier 3 (J+14), couronne (mastered)
    state = computeNextVocabularyProgress(state, { phase: 'revision', score: 3, maxScore: 3, errors: 0 }, '2026-11-30');
    assert.equal(state.stage, 'mastered');
    assert.equal(state.tier_index, 3);
    assert.equal(state.interval_days, 14);
    assert.equal(state.consecutive_successes, 3);

    // Petite erreur (2.5/3) -> descend d'un palier (palier 2 = J+7) et remet consecutive_successes à 0
    state = computeNextVocabularyProgress(state, { phase: 'revision', score: 2.5, maxScore: 3, errors: 1 }, '2026-12-18');
    assert.equal(state.stage, 'reviewing');
    assert.equal(state.tier_index, 2);
    assert.equal(state.interval_days, 7);
    assert.equal(state.consecutive_successes, 0);

    // Grosse erreur (1/3) -> retour direct à J+1 (palier 0)
    state = computeNextVocabularyProgress(state, { phase: 'revision', score: 1, maxScore: 3, errors: 2 }, '2026-12-28');
    assert.equal(state.stage, 'reviewing');
    assert.equal(state.tier_index, 0);
    assert.equal(state.interval_days, 1);
    assert.equal(state.consecutive_successes, 0);
  });
});

test('API Vocabulaire - Séquences, Session mixte et Réinitialisation', async (t) => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/vocabulary`;

  const classId = 9998;
  const studentId = 99981;
  let createdSequenceId = null;

  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('INSERT OR IGNORE INTO classes (id, name) VALUES (?, ?)', [classId, 'Classe Test Vocabulaire']);
      db.run(
        'INSERT OR IGNORE INTO students (id, name, firstname, class_id) VALUES (?, ?, ?, ?)',
        [studentId, 'Dupont', 'Léo', classId],
        (err) => (err ? reject(err) : resolve())
      );
    });
  });

  t.after(async () => {
    server.close();
    await new Promise((resolve) => {
      db.serialize(() => {
        if (createdSequenceId) {
          db.run('DELETE FROM vocabulary_progress WHERE sequence_id = ?', [createdSequenceId]);
          db.run('DELETE FROM vocabulary_words WHERE sequence_id = ?', [createdSequenceId]);
          db.run('DELETE FROM vocabulary_sequences WHERE id = ?', [createdSequenceId]);
        }
        db.run('DELETE FROM students WHERE id = ?', [studentId]);
        db.run('DELETE FROM classes WHERE id = ?', [classId], () => resolve());
      });
    });
  });

  await t.test('POST /api/vocabulary/sequences crée une séquence et ses mots avec phrases à trous', async () => {
    const res = await fetch(`${baseUrl}/sequences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Séquence Test Émotions',
        theme: '',
        level: 'CE1',
        status: 'active',
        words: [
          {
            word: 'rusé',
            nature: 'adjectif qualificatif',
            definition: 'Qui utilise des astuces pour réussir.',
            sentence1_full: 'Le renard est très rusé.',
            sentence2_full: 'Ce joueur rusé gagne la partie.',
            distractors: ['timide', 'courageux'],
          },
          {
            word: 'courageux',
            nature: 'adjectif qualificatif',
            definition: "Qui n'a pas peur devant le danger.",
            sentence1_full: 'Le pompier courageux sauve le chat.',
            sentence2_full: 'Ce chevalier est très courageux.',
            distractors: ['rusé', 'peureux'],
          },
        ],
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.id);
    assert.equal(data.wordCount, 2);
    assert.equal(data.words[0].sentence1_cloze, 'Le renard est très _____.');
    assert.ok(data.words[0].sentence1_id, 'La phrase complète doit être enregistrée dans generated_sentences');
    createdSequenceId = data.id;
  });

  await t.test('GET /api/vocabulary/session renvoie les mots en découverte puis met à jour la progression', async () => {
    const sessionRes = await fetch(
      `${baseUrl}/session?studentId=${studentId}&level=CE1&sequenceId=${createdSequenceId}&wordCount=10`
    );
    assert.equal(sessionRes.status, 200);
    const sessionData = await sessionRes.json();
    assert.equal(sessionData.words.length, 2);
    assert.equal(sessionData.words[0].phase, 'discovery');

    // Simuler 2/2 sur le 1er mot et 1/2 sur le 2e mot
    const updateRes = await fetch(`${baseUrl}/progress/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        results: [
          { wordId: sessionData.words[0].id, sequenceId: createdSequenceId, phase: 'discovery', score: 2, maxScore: 2, errors: 0 },
          { wordId: sessionData.words[1].id, sequenceId: createdSequenceId, phase: 'discovery', score: 1, maxScore: 2, errors: 1 },
        ],
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.equal(updateData.progress[0].stage, 'reviewing');
    assert.equal(updateData.progress[1].stage, 'learning');
  });

  await t.test('DELETE /api/vocabulary/progress réinitialise la progression de la classe sans supprimer les mots', async () => {
    const delRes = await fetch(`${baseUrl}/progress?classId=${classId}`, { method: 'DELETE' });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.ok(delData.deleted >= 1);

    const seqRes = await fetch(`${baseUrl}/sequences/${createdSequenceId}`);
    const seqData = await seqRes.json();
    assert.equal(seqData.words.length, 2, 'Les mots de la séquence doivent rester intacts');
  });

  await t.test('Export et import unitaire et global de séquences (images incluses)', async () => {
    const svgBase64 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>').toString('base64');
    const uploadRes = await fetch(`${baseUrl}/image-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: `data:image/svg+xml;base64,${svgBase64}`,
      }),
    });
    assert.equal(uploadRes.status, 200);
    const uploadData = await uploadRes.json();
    assert.ok(uploadData.imageUrl.startsWith('vocabulary-images/'));

    // Associer l'image au 1er mot de la séquence
    const seqRes = await fetch(`${baseUrl}/sequences/${createdSequenceId}`);
    const seqData = await seqRes.json();
    const updatedWords = seqData.words.map((w, idx) =>
      idx === 0 ? { ...w, image_url: uploadData.imageUrl } : w
    );

    const putRes = await fetch(`${baseUrl}/sequences/${createdSequenceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: updatedWords }),
    });
    assert.equal(putRes.status, 200);

    // 1. Export d'une seule séquence
    const singleExportRes = await fetch(`${baseUrl}/sequences/${createdSequenceId}/export`);
    assert.equal(singleExportRes.status, 200);
    const singleExportData = await singleExportRes.json();
    assert.equal(singleExportData.sequenceCount, 1);
    assert.equal(singleExportData.sequences[0].title, 'Séquence Test Émotions');
    assert.ok(
      singleExportData.sequences[0].words[0].image_data.startsWith('data:image/svg+xml;base64,'),
      "L'export doit inclure l'illustration encodée en base64"
    );

    // 2. Export de toutes les séquences
    const allExportRes = await fetch(`${baseUrl}/sequences/export`);
    assert.equal(allExportRes.status, 200);
    const allExportData = await allExportRes.json();
    assert.ok(allExportData.sequenceCount >= 1);
    assert.ok(allExportData.sequences.some((s) => s.title === 'Séquence Test Émotions'));

    // 3. Supprimer la séquence puis la réimporter avec son image
    const deleteRes = await fetch(`${baseUrl}/sequences/${createdSequenceId}`, {
      method: 'DELETE',
    });
    assert.equal(deleteRes.status, 200);

    const importRes = await fetch(`${baseUrl}/sequences/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(singleExportData),
    });
    assert.equal(importRes.status, 200);
    const importData = await importRes.json();
    assert.equal(importData.importedSequences, 1);
    assert.equal(importData.createdSequences, 1);
    assert.equal(importData.importedWords, 2);
    assert.equal(importData.importedImages, 1);

    // Vérifier que la séquence réimportée existe bien avec ses 2 mots et une image locale recréée
    const listRes = await fetch(`${baseUrl}/sequences`);
    const listData = await listRes.json();
    const reimported = listData.find((s) => s.title === 'Séquence Test Émotions');
    assert.ok(reimported, 'La séquence réimportée doit être présente');
    assert.equal(reimported.words.length, 2);
    assert.ok(
      reimported.words[0].image_url.startsWith('vocabulary-images/'),
      "L'illustration réimportée doit avoir été réécrite sur le disque"
    );

    // Nettoyer la séquence réimportée et son fichier image
    await fetch(`${baseUrl}/sequences/${reimported.id}`, {
      method: 'DELETE',
    });
  });

  await t.test('POST /sequences/reorder met à jour la position des séquences', async () => {
    // Créer deux séquences pour tester le réordonnancement
    const seq1Res = await fetch(`${baseUrl}/sequences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Séquence Ordre 1',
        theme: 'Test',
        level: 'CE1',
        words: [{ word: 'premier', definition: 'D1' }],
      }),
    });
    const seq1 = await seq1Res.json();

    const seq2Res = await fetch(`${baseUrl}/sequences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Séquence Ordre 2',
        theme: 'Test',
        level: 'CE1',
        words: [{ word: 'deuxieme', definition: 'D2' }],
      }),
    });
    const seq2 = await seq2Res.json();

    // Inverser l'ordre : seq2 d'abord, seq1 ensuite
    const reorderRes = await fetch(`${baseUrl}/sequences/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequenceIds: [seq2.id, seq1.id] }),
    });
    assert.equal(reorderRes.status, 200);
    const reorderData = await reorderRes.json();
    assert.equal(reorderData.success, true);
    assert.equal(reorderData.count, 2);

    // Vérifier les nouvelles positions
    const getSeq2 = await (await fetch(`${baseUrl}/sequences/${seq2.id}`)).json();
    const getSeq1 = await (await fetch(`${baseUrl}/sequences/${seq1.id}`)).json();
    assert.equal(getSeq2.position, 1);
    assert.equal(getSeq1.position, 2);

    // Nettoyage
    await fetch(`${baseUrl}/sequences/${seq1.id}`, { method: 'DELETE' });
    await fetch(`${baseUrl}/sequences/${seq2.id}`, { method: 'DELETE' });
  });
});
