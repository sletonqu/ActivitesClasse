const assert = require('node:assert/strict');
const { test } = require('node:test');
const SqliteDatabase = require('./sqliteDatabase');

function runWithCallback(invoke) {
  return new Promise((resolve, reject) => {
    invoke(function onComplete(error, ...values) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ context: this, values });
    });
  });
}

test('preserves callback query results and run metadata', async (t) => {
  const db = new SqliteDatabase(':memory:');
  t.after(() => db.close());

  await runWithCallback((callback) => db.exec(
    'CREATE TABLE students (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)',
    callback
  ));

  const inserted = await runWithCallback((callback) => db.run(
    'INSERT INTO students (name) VALUES (?)',
    ['Camille'],
    callback
  ));
  assert.equal(inserted.context.lastID, 1);
  assert.equal(inserted.context.changes, 1);

  const selected = await runWithCallback((callback) => db.get(
    'SELECT id, name FROM students WHERE id = ?',
    [inserted.context.lastID],
    callback
  ));
  assert.deepEqual(selected.values[0], { id: 1, name: 'Camille' });

  const updated = await runWithCallback((callback) => db.run(
    'UPDATE students SET name = ? WHERE id = ?',
    ['Camille D.', inserted.context.lastID],
    callback
  ));
  assert.equal(updated.context.changes, 1);

  const rows = await runWithCallback((callback) => db.all('SELECT name FROM students', callback));
  assert.deepEqual(rows.values[0], [{ name: 'Camille D.' }]);
});

test('reports statement errors through callbacks', async (t) => {
  const db = new SqliteDatabase(':memory:');
  t.after(() => db.close());

  await assert.rejects(
    runWithCallback((callback) => db.get('SELECT * FROM missing_table', callback)),
    /no such table: missing_table/
  );
});

test('executes operations inside serialize in order', async (t) => {
  const db = new SqliteDatabase(':memory:');
  t.after(() => db.close());

  await runWithCallback((callback) => db.exec(
    'CREATE TABLE values_table (value INTEGER)',
    callback
  ));

  await runWithCallback((callback) => db.serialize(() => {
    db.run('INSERT INTO values_table (value) VALUES (?)', [1], callback);
    db.run('INSERT INTO values_table (value) VALUES (?)', [2]);
  }));

  const rows = await runWithCallback((callback) => db.all(
    'SELECT value FROM values_table ORDER BY value',
    callback
  ));
  assert.deepEqual(rows.values[0], [{ value: 1 }, { value: 2 }]);
});
