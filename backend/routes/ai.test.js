const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  normalizeGeneratedPayload,
  buildSentencePrompt,
  buildGeneratedSentenceExportItem,
  selectBalancedSentencesByEnding,
  sentenceContainsVerbWithEnding,
  sentenceContainsAnyWord,
  sentenceContainsRequiredNatures,
  normalizeEndingsFilter,
  normalizeWordsFilter,
  normalizeRequiredNatureFilters,
  selectBalancedSentencesByWord,
  sentenceContainsWord,
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

test('normalizeEndingsFilter normalise correctement les listes et chaînes avec tirets et séparateurs', () => {
  assert.deepEqual(normalizeEndingsFilter('-e, -es, -ent'), ['e', 'es', 'ent']);
  assert.deepEqual(normalizeEndingsFilter(['-ons', '-ez']), ['ons', 'ez']);
  assert.deepEqual(normalizeEndingsFilter('ait; aient'), ['ait', 'aient']);
  assert.deepEqual(normalizeEndingsFilter(''), []);
});

test('normalizeWordsFilter normalise les mots et homophones', () => {
  assert.deepEqual(normalizeWordsFilter('a, à'), ['a', 'à']);
  assert.deepEqual(normalizeWordsFilter('et; est'), ['et', 'est']);
  assert.deepEqual(normalizeWordsFilter(['on', 'ont']), ['on', 'ont']);
  assert.deepEqual(normalizeWordsFilter(''), []);
});

test('normalizeRequiredNatureFilters normalise les familles de natures', () => {
  assert.deepEqual(normalizeRequiredNatureFilters('verbe, nom commun, adjectif'), ['verbe', 'nom', 'adjectif']);
  assert.deepEqual(normalizeRequiredNatureFilters(['verbe', 'nom']), ['verbe', 'nom']);
  assert.deepEqual(normalizeRequiredNatureFilters(''), []);
});

test('sentenceContainsVerbWithEnding filtre par temps, infinitif et terminaison de manière flexible', () => {
  const sentence = {
    sentence: "Le renard marchait dans la forêt.",
    words: [
      { word: "Le", nature: "déterminant" },
      { word: "renard", nature: "nom" },
      { word: "marchait", nature: "verbe", temps: "imparfait", infinitif: "marcher" },
      { word: "dans", nature: "préposition" },
      { word: "la", nature: "déterminant" },
      { word: "forêt", nature: "nom" },
    ],
  };

  // Temps seul
  assert.equal(sentenceContainsVerbWithEnding(sentence, [], '', 'imparfait'), true);
  assert.equal(sentenceContainsVerbWithEnding(sentence, [], '', 'présent'), false);

  // Infinitif seul
  assert.equal(sentenceContainsVerbWithEnding(sentence, [], 'er', ''), true);
  assert.equal(sentenceContainsVerbWithEnding(sentence, [], 'ir', ''), false);

  // Terminaison seule
  assert.equal(sentenceContainsVerbWithEnding(sentence, ['ait'], '', ''), true);
  assert.equal(sentenceContainsVerbWithEnding(sentence, ['aient', 'ons'], '', ''), false);

  // Combinaison temps + infinitif + terminaison
  assert.equal(sentenceContainsVerbWithEnding(sentence, ['ait'], 'er', 'imparfait'), true);
  assert.equal(sentenceContainsVerbWithEnding(sentence, ['ait'], 'ir', 'imparfait'), false);
});

test('sentenceContainsAnyWord détecte la présence de n\'importe quel mot recherché', () => {
  const sentence = {
    sentence: "Il a faim et il mange à la cantine.",
    words: [
      { word: "Il", nature: "pronom" },
      { word: "a", nature: "verbe" },
      { word: "faim", nature: "nom" },
      { word: "et", nature: "conjonction" },
      { word: "il", nature: "pronom" },
      { word: "mange", nature: "verbe" },
      { word: "à", nature: "préposition" },
      { word: "la", nature: "déterminant" },
      { word: "cantine", nature: "nom" },
    ],
  };

  assert.equal(sentenceContainsAnyWord(sentence, ['a', 'à']), true);
  assert.equal(sentenceContainsAnyWord(sentence, ['ont', 'on']), false);
  assert.equal(sentenceContainsAnyWord(sentence, []), true);
});

test('sentenceContainsRequiredNatures vérifie la présence de toutes les familles requises', () => {
  const sentence = {
    sentence: "Le petit chat dort.",
    words: [
      { word: "Le", nature: "déterminant" },
      { word: "petit", nature: "adjectif" },
      { word: "chat", nature: "nom" },
      { word: "dort", nature: "verbe" },
    ],
  };

  assert.equal(sentenceContainsRequiredNatures(sentence, ['nom', 'verbe']), true);
  assert.equal(sentenceContainsRequiredNatures(sentence, ['nom', 'verbe', 'adjectif']), true);
  assert.equal(sentenceContainsRequiredNatures(sentence, ['nom', 'verbe', 'adverbe']), false);
  assert.equal(sentenceContainsRequiredNatures(sentence, []), true);
});

test('sentenceContainsWord détecte fidèlement la présence d\'un mot ou homophone', () => {
  const sentence = {
    sentence: "Il est là et il mange du pain.",
    words: [
      { word: "Il" },
      { word: "est" },
      { word: "là" },
      { word: "et" },
      { word: "il" },
      { word: "mange" },
      { word: "du" },
      { word: "pain." },
    ],
  };

  assert.equal(sentenceContainsWord(sentence, 'est'), true);
  assert.equal(sentenceContainsWord(sentence, 'et'), true);
  assert.equal(sentenceContainsWord(sentence, 'pain'), true);
  assert.equal(sentenceContainsWord(sentence, 'es'), false);
  assert.equal(sentenceContainsWord(sentence, 'ont'), false);

  // Cas fallback sans tableau words (phrase brute)
  const rawSentence = { sentence: "Elle a un beau sac à dos !" };
  assert.equal(sentenceContainsWord(rawSentence, 'a'), true);
  assert.equal(sentenceContainsWord(rawSentence, 'à'), true);
  assert.equal(sentenceContainsWord(rawSentence, 'sac'), true);
  assert.equal(sentenceContainsWord(rawSentence, 'dos'), true);
  assert.equal(sentenceContainsWord(rawSentence, 'ont'), false);
});

test('selectBalancedSentencesByWord garantit la présence de chaque homophone demandé et équilibre la sélection', () => {
  const candidateSentences = [
    { id: 1, sentence: "Il est tard.", words: [{ word: "est" }], compteur: 0 },
    { id: 2, sentence: "C'est beau et grand.", words: [{ word: "et" }], compteur: 0 },
    { id: 3, sentence: "Tu es prêt.", words: [{ word: "es" }], compteur: 0 },
    { id: 4, sentence: "Il est gentil.", words: [{ word: "est" }], compteur: 1 },
    { id: 5, sentence: "Toi et moi.", words: [{ word: "et" }], compteur: 1 },
    { id: 6, sentence: "Tu es grand.", words: [{ word: "es" }], compteur: 1 },
  ];

  const words = ['a', 'à']; // Non présents
  const resultMissing = selectBalancedSentencesByWord(candidateSentences, ['est', 'et', 'a'], 3, false);
  assert.deepEqual(resultMissing.missingWords, ['a']);
  assert.equal(resultMissing.selectedSentences.length, 3);

  // Test de garantie >= 1 par homophone
  const resultBalanced = selectBalancedSentencesByWord(candidateSentences, ['est', 'et', 'es'], 6, false);
  assert.equal(resultBalanced.selectedSentences.length, 6);
  const estCount = resultBalanced.selectedSentences.filter((s) => s.targetWord === 'est').length;
  const etCount = resultBalanced.selectedSentences.filter((s) => s.targetWord === 'et').length;
  const esCount = resultBalanced.selectedSentences.filter((s) => s.targetWord === 'es').length;
  assert.equal(estCount, 2);
  assert.equal(etCount, 2);
  assert.equal(esCount, 2);
  // Vérifie que targetWord et targetSound sont bien positionnés
  resultBalanced.selectedSentences.forEach((s) => {
    assert.ok(s.targetWord, 'Doit avoir targetWord');
    assert.equal(s.targetWord, s.targetSound);
  });
});

test('selectBalancedSentencesByWord en mode strict détecte les homophones manquants (Cas 2)', () => {
  const candidateSentences = [
    { id: 1, sentence: "Il est parti.", words: [{ word: "est" }] },
    { id: 2, sentence: "Pomme et poire.", words: [{ word: "et" }] },
  ];

  const result = selectBalancedSentencesByWord(candidateSentences, ['est', 'et', 'es'], 3, true);
  assert.equal(result.missingWords.length, 1);
  assert.equal(result.missingWords[0], 'es');
  assert.ok(result.strictErrors.length > 0);
  assert.match(result.strictErrors[0], /aucune phrase trouvée pour le ou les homophones suivants : « es »/);
});

test('selectBalancedSentencesByWord en mode strict détecte le manque de phrases (Cas 3)', () => {
  const candidateSentences = [
    { id: 1, sentence: "Il est là.", words: [{ word: "est" }] },
    { id: 2, sentence: "Toi et lui.", words: [{ word: "et" }] },
  ];

  const result = selectBalancedSentencesByWord(candidateSentences, ['est', 'et'], 5, true);
  assert.equal(result.selectedSentences.length, 2);
  assert.ok(result.strictErrors.length > 0);
  assert.match(result.strictErrors[0], /5 phrases demandées, mais seulement 2 disponibles/);
});

test('selectBalancedSentencesByWord en mode non-strict ne bloque pas si partiel', () => {
  const candidateSentences = [
    { id: 1, sentence: "Il est là.", words: [{ word: "est" }] },
  ];

  const result = selectBalancedSentencesByWord(candidateSentences, ['est', 'et'], 5, false);
  assert.equal(result.strictErrors.length, 0);
  assert.equal(result.selectedSentences.length, 1);
});
