const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  normalizeGeneratedPayload,
  buildSentencePrompt,
  buildGeneratedSentenceExportItem,
  selectBalancedSentencesByEnding,
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

test('selectBalancedSentencesByEnding garantit au moins une phrase pour chaque terminaison demandée', () => {
  const candidateSentences = [
    {
      id: 1,
      sentence: "Il chante.",
      compteur: 0,
      words: [{ word: "chante", nature: "verbe", temps: "présent", infinitif: "chanter" }],
    },
    {
      id: 2,
      sentence: "Tu chantes.",
      compteur: 0,
      words: [{ word: "chantes", nature: "verbe", temps: "présent", infinitif: "chanter" }],
    },
    {
      id: 3,
      sentence: "Vous chantez.",
      compteur: 0,
      words: [{ word: "chantez", nature: "verbe", temps: "présent", infinitif: "chanter" }],
    },
    {
      id: 4,
      sentence: "Ils chantent.",
      compteur: 0,
      words: [{ word: "chantent", nature: "verbe", temps: "présent", infinitif: "chanter" }],
    },
    {
      id: 5,
      sentence: "Ils dansent.",
      compteur: 1,
      words: [{ word: "dansent", nature: "verbe", temps: "présent", infinitif: "danser" }],
    },
    {
      id: 6,
      sentence: "Ils mangent.",
      compteur: 2,
      words: [{ word: "mangent", nature: "verbe", temps: "présent", infinitif: "manger" }],
    },
  ];

  const validEndings = ['e', 'es', 'ez', 'ent'];
  const { selectedSentences } = selectBalancedSentencesByEnding(candidateSentences, validEndings, 4);

  assert.equal(selectedSentences.length, 4, "Doit retourner exactement 4 phrases");

  const endingsRepresented = new Set(selectedSentences.map((s) => s.targetEnding));
  assert.ok(endingsRepresented.has('e'), "Doit contenir une phrase pour 'e'");
  assert.ok(endingsRepresented.has('es'), "Doit contenir une phrase pour 'es'");
  assert.ok(endingsRepresented.has('ez'), "Doit contenir une phrase pour 'ez'");
  assert.ok(endingsRepresented.has('ent'), "Doit contenir une phrase pour 'ent'");

  // Vérifier qu'il n'y a aucun doublon d'ID
  const uniqueIds = new Set(selectedSentences.map((s) => s.id));
  assert.equal(uniqueIds.size, 4, "Toutes les phrases sélectionnées doivent avoir un id unique");
});

test('selectBalancedSentencesByEnding équilibre les terminaisons en round-robin', () => {
  const candidateSentences = [
    { id: 1, sentence: "Tu manges.", words: [{ word: "manges", nature: "verbe" }] },
    { id: 2, sentence: "Tu cours.", words: [{ word: "cours", nature: "verbe" }] }, // pas 'es'
    { id: 3, sentence: "Tu marches.", words: [{ word: "marches", nature: "verbe" }] },
    { id: 4, sentence: "Ils dorment.", words: [{ word: "dorment", nature: "verbe" }] },
    { id: 5, sentence: "Ils chantent.", words: [{ word: "chantent", nature: "verbe" }] },
  ];

  const { selectedSentences } = selectBalancedSentencesByEnding(candidateSentences, ['es', 'ent'], 4);
  assert.equal(selectedSentences.length, 4);

  const countEs = selectedSentences.filter((s) => s.targetEnding === 'es').length;
  const countEnt = selectedSentences.filter((s) => s.targetEnding === 'ent').length;

  assert.equal(countEs, 2, "Doit contenir 2 phrases avec la terminaison 'es'");
  assert.equal(countEnt, 2, "Doit contenir 2 phrases avec la terminaison 'ent'");
});

test('selectBalancedSentencesByEnding en mode strict détecte les terminaisons manquantes (Cas 2)', () => {
  const candidateSentences = [
    { id: 1, sentence: "Tu manges.", words: [{ word: "manges", nature: "verbe" }] },
    { id: 2, sentence: "Ils chantent.", words: [{ word: "chantent", nature: "verbe" }] },
  ];

  // On demande 'es', 'ent' ET 'ons' (or 'ons' n'existe pas dans le pool)
  const result = selectBalancedSentencesByEnding(
    candidateSentences,
    ['es', 'ent', 'ons'],
    4,
    '',
    '',
    true // strict = true
  );

  assert.equal(result.missingEndings.length, 1);
  assert.equal(result.missingEndings[0], 'ons');
  assert.ok(result.strictErrors.length > 0);
  assert.match(result.strictErrors[0], /aucune phrase trouvée pour la ou les terminaisons suivantes : -ons/);
});

test('selectBalancedSentencesByEnding en mode strict détecte le manque de phrases (Cas 3)', () => {
  const candidateSentences = [
    { id: 1, sentence: "Tu manges.", words: [{ word: "manges", nature: "verbe" }] },
    { id: 2, sentence: "Ils chantent.", words: [{ word: "chantent", nature: "verbe" }] },
  ];

  // 6 phrases demandées, mais seulement 2 disponibles
  const result = selectBalancedSentencesByEnding(
    candidateSentences,
    ['es', 'ent'],
    6,
    '',
    '',
    true // strict = true
  );

  assert.equal(result.selectedSentences.length, 2);
  assert.ok(result.strictErrors.length > 0);
  assert.match(result.strictErrors[0], /6 phrases demandées, mais seulement 2 disponibles/);
});

test('selectBalancedSentencesByEnding en mode non-strict ne lève pas d\'erreur si partiel', () => {
  const candidateSentences = [
    { id: 1, sentence: "Tu manges.", words: [{ word: "manges", nature: "verbe" }] },
  ];

  const result = selectBalancedSentencesByEnding(
    candidateSentences,
    ['es', 'ent'],
    4,
    '',
    '',
    false // strict = false
  );

  assert.equal(result.strictErrors.length, 0);
  assert.equal(result.selectedSentences.length, 1);
});


