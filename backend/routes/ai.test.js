const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  normalizeGeneratedPayload,
  buildSentencePrompt,
  buildGeneratedSentenceExportItem,
} = require('./ai');

test('normalizeGeneratedPayload preserves and normalizes verb temps and infinitif', () => {
  const payload = {
    sentence: "Le chat dort sur le lit.",
    words: [
      { position: 1, word: "Le", nature: "déterminant", category: "mot variable" },
      { position: 2, word: "chat", nature: "nom commun", category: "mot variable" },
      {
        position: 3,
        word: "dort",
        nature: "verbe",
        category: "mot variable",
        temps: "PRÉSENT",
        infinitif: "DORMIR",
      },
      { position: 4, word: "sur", nature: "préposition", category: "mot invariable" },
      { position: 5, word: "le", nature: "déterminant", category: "mot variable" },
      { position: 6, word: "lit", nature: "nom commun", category: "mot variable" },
      { position: 7, word: ".", nature: "ponctuation", category: "ponctuation" },
    ],
  };

  const context = {
    level: "CE1",
    theme: "animaux",
    provider: "gemini",
    model: "gemini-2.0-flash",
  };

  const result = normalizeGeneratedPayload(payload, context);

  assert.equal(result.sentence, "Le chat dort sur le lit.");
  assert.equal(result.words.length, 7);

  const verbWord = result.words.find((w) => w.word === "dort");
  assert.ok(verbWord, "Le verbe dort doit exister");
  assert.equal(verbWord.nature, "verbe");
  assert.equal(verbWord.temps, "présent");
  assert.equal(verbWord.infinitif, "dormir");

  const nounWord = result.words.find((w) => w.word === "chat");
  assert.equal(nounWord.temps, undefined, "Les mots non verbes ne doivent pas avoir de temps");
});

test('normalizeGeneratedPayload supports English alias tense and infinitive', () => {
  const payload = {
    sentence: "Nous marchions.",
    words: [
      { position: 1, word: "Nous", nature: "pronom", category: "mot variable" },
      {
        position: 2,
        word: "marchions",
        nature: "verbe",
        category: "mot variable",
        tense: "imparfait",
        infinitive: "marcher",
      },
      { position: 3, word: ".", nature: "ponctuation", category: "ponctuation" },
    ],
  };

  const result = normalizeGeneratedPayload(payload, { level: "CE2" });
  const verb = result.words.find((w) => w.word === "marchions");

  assert.equal(verb.temps, "imparfait");
  assert.equal(verb.infinitif, "marcher");
});

test('buildSentencePrompt includes instructions for verb tense and infinitive', () => {
  const prompt = buildSentencePrompt({
    level: "CE1",
    theme: "nature",
    maxWords: 8,
    customInstruction: "",
    phraseCount: 1,
  });

  assert.match(prompt, /temps/);
  assert.match(prompt, /infinitif/);
  assert.match(prompt, /présent/);
});

test('buildGeneratedSentenceExportItem normalizes words payload with temps and infinitif', () => {
  const row = {
    id: 99,
    sentence: "Il chantera.",
    level: "CE2",
    theme: "musique",
    provider: "openai",
    model: "gpt-4.1-mini",
    compteur: 2,
    created_at: "2026-10-24 10:00:00",
    payload: JSON.stringify({
      sentence: "Il chantera.",
      words: [
        { position: 1, word: "Il", nature: "pronom", category: "mot variable" },
        {
          position: 2,
          word: "chantera",
          nature: "verbe",
          category: "mot variable",
          temps: "futur simple",
          infinitif: "chanter",
        },
        { position: 3, word: ".", nature: "ponctuation", category: "ponctuation" },
      ],
    }),
  };

  const exported = buildGeneratedSentenceExportItem(row);

  assert.equal(exported.id, 99);
  assert.equal(exported.payload.words[1].temps, "futur simple");
  assert.equal(exported.payload.words[1].infinitif, "chanter");
});
