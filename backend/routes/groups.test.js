const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('../db');
const groupsRouter = require('./groups');

function createTestApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/groups', groupsRouter);
  return app;
}

test('API Groups - Gestion des couleurs', async (t) => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/groups`;

  t.after(() => {
    server.close();
  });

  // Créer une classe de test directement en base si elle n'existe pas
  let classId = 1;
  await new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO classes (id, name) VALUES (?, ?)',
      [9999, 'Classe Test Couleur'],
      function onInsert(err) {
        if (err) return reject(err);
        classId = 9999;
        resolve();
      }
    );
  });

  t.after(async () => {
    await new Promise((resolve) => {
      db.run('DELETE FROM groups WHERE class_id = ?', [classId], () => {
        db.run('DELETE FROM classes WHERE id = ?', [classId], () => resolve());
      });
    });
  });

  let createdGroupId;

  // 1. Création d'un groupe avec couleur par défaut (grise #6b7280)
  await t.test('POST /api/groups sans couleur utilise la couleur grise par défaut', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Groupe Gris', class_id: classId }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.id);
    assert.equal(data.name, 'Groupe Gris');
    assert.equal(data.color, '#6b7280');
    createdGroupId = data.id;
  });

  // 2. Récupération du groupe avec GET /:id
  await t.test('GET /api/groups/:id renvoie la couleur du groupe', async () => {
    const res = await fetch(`${baseUrl}/${createdGroupId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.id, createdGroupId);
    assert.equal(data.color, '#6b7280');
  });

  // 3. Mise à jour de la couleur via PATCH /:id
  await t.test('PATCH /api/groups/:id met à jour la couleur du groupe', async () => {
    const res = await fetch(`${baseUrl}/${createdGroupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: '#3b82f6' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.color, '#3b82f6');

    // Vérifier par un GET
    const checkRes = await fetch(`${baseUrl}/${createdGroupId}`);
    const checkData = await checkRes.json();
    assert.equal(checkData.color, '#3b82f6');
  });

  // 4. Création d'un groupe avec couleur spécifiée
  await t.test('POST /api/groups avec couleur enregistre la couleur fournie', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Groupe Vert', class_id: classId, color: '#10b981' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.color, '#10b981');

    // Liste des groupes
    const listRes = await fetch(`${baseUrl}?class_id=${classId}`);
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    const greenGroup = list.find((g) => g.id === data.id);
    assert.ok(greenGroup);
    assert.equal(greenGroup.color, '#10b981');
  });
});

