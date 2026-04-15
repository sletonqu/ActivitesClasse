const express = require("express");
const db = require("../db");

const router = express.Router();

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(Array.isArray(rows) ? rows : []);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row || null);
    });
  });
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

const PROVIDERS = {
  openai: {
    id: "openai",
    label: "ChatGPT / OpenAI",
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4.1-mini",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    apiKeyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.0-flash",
  },
  mistral: {
    id: "mistral",
    label: "MistralAI",
    apiKeyEnv: "MISTRAL_API_KEY",
    modelEnv: "MISTRAL_MODEL",
    defaultModel: "mistral-small-latest",
  },
};

const ALLOWED_LEVELS = new Set(["CE1", "CE2"]);
const VARIABLE_NATURES = [
  "déterminant",
  "determinant",
  "nom",
  "nom commun",
  "nom propre",
  "verbe",
  "adjectif",
  "adjectif qualificatif",
  "pronom",
];
const INVARIABLE_NATURES = [
  "adverbe",
  "préposition",
  "preposition",
  "conjonction",
  "interjection",
];

function normalizeText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function createProviderError(message, providerContent = "") {
  const error = new Error(message);

  if (providerContent) {
    error.providerContent = providerContent;
  }

  return error;
}

function parseJsonSafely(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stripCodeFences(value) {
  return String(value || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractFirstJsonObject(value) {
  const cleaned = stripCodeFences(value);
  const directParse = parseJsonSafely(cleaned);
  if (directParse && typeof directParse === "object") {
    return directParse;
  }

  const startIndex = cleaned.indexOf("{");
  if (startIndex === -1) {
    throw new Error("La réponse du fournisseur IA ne contient pas de JSON exploitable");
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const jsonSlice = cleaned.slice(startIndex, index + 1);
        const parsed = parseJsonSafely(jsonSlice);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    }
  }

  throw new Error("Impossible de lire le JSON renvoyé par le fournisseur IA");
}

function isPunctuationToken(token) {
  return !/[\p{L}\p{N}]/u.test(token);
}

function splitFrenchElisionToken(token) {
  const cleanToken = normalizeText(token);
  const match = cleanToken.match(/^([\p{L}]+)(['’])([\p{L}].*)$/u);
  if (!match) {
    return [cleanToken];
  }

  const prefix = String(match[1] || "").toLowerCase();
  const apostrophe = match[2];
  const suffix = String(match[3] || "").trim();
  const splitPrefixes = new Set(["j", "l", "m", "t", "s", "c", "n", "d", "qu"]);

  if (!suffix || !splitPrefixes.has(prefix)) {
    return [cleanToken];
  }

  return [`${match[1]}${apostrophe}`, suffix];
}

function tokenizeSentence(sentence) {
  const tokens = String(sentence || "").match(/\p{L}+(?:['’\-]\p{L}+)*|\p{N}+|[^\s]/gu);
  if (!Array.isArray(tokens)) {
    return [];
  }

  return tokens
    .map((token) => token.trim())
    .filter(Boolean)
    .flatMap((token) => splitFrenchElisionToken(token));
}

function inferElisionPrefixNature(tokenPrefix) {
  const normalizedPrefix = normalizeText(tokenPrefix).toLowerCase().replace(/['’]/g, "");

  if (!normalizedPrefix) {
    return "";
  }

  if (normalizedPrefix === "j" || normalizedPrefix === "m" || normalizedPrefix === "t" || normalizedPrefix === "s" || normalizedPrefix === "c") {
    return "pronom";
  }

  if (normalizedPrefix === "l") {
    return "déterminant";
  }

  if (normalizedPrefix === "d") {
    return "préposition";
  }

  if (normalizedPrefix === "n") {
    return "adverbe";
  }

  if (normalizedPrefix === "qu") {
    return "pronom";
  }

  return "";
}

function inferElisionSuffixNature(tokenPrefix, tokenSuffix, proposedNature) {
  const normalizedPrefix = normalizeText(tokenPrefix).toLowerCase().replace(/['’]/g, "");
  const normalizedSuffix = normalizeText(tokenSuffix).toLowerCase();
  const normalizedProposedNature = normalizeNature(proposedNature);

  if (normalizedPrefix === "j") {
    return "verbe";
  }

  if (normalizedPrefix === "l") {
    if (/\b(nom|adjectif|verbe|pronom)\b/.test(normalizedProposedNature)) {
      return proposedNature;
    }

    if (/^(a|ai|as|avait|avons|avez|ont|est|es|etait|etaient|ete)$/.test(normalizedSuffix)) {
      return "verbe";
    }
  }

  return proposedNature;
}

function expandSourceWords(sourceWords) {
  return sourceWords.flatMap((entry) => {
    const sourceEntry = entry && typeof entry === "object" ? entry : {};
    const sourceWord = normalizeText(sourceEntry.word);
    const sourceNature = normalizeText(sourceEntry.nature || sourceEntry.pos || sourceEntry.type);
    const sourceCategory = normalizeText(
      sourceEntry.category || sourceEntry.categorie || sourceEntry.classification
    );
    const parts = splitFrenchElisionToken(sourceWord);

    if (parts.length < 2) {
      return [{
        word: sourceWord,
        nature: sourceNature,
        category: sourceCategory,
      }];
    }

    const [prefixPart, suffixPart] = parts;
    const prefixNature = inferElisionPrefixNature(prefixPart);
    const suffixNature = inferElisionSuffixNature(prefixPart, suffixPart, sourceNature);

    return [
      {
        word: prefixPart,
        nature: prefixNature || sourceNature,
        category: sourceCategory || guessCategoryFromNature(prefixNature || sourceNature),
      },
      {
        word: suffixPart,
        nature: suffixNature,
        category: sourceCategory || guessCategoryFromNature(suffixNature),
      },
    ];
  });
}

function inferTokenNatureFromContext(tokens, index) {
  const token = normalizeText(tokens[index]);
  if (!token) {
    return "à préciser";
  }

  if (isPunctuationToken(token)) {
    return "ponctuation";
  }

  const directNature = inferElisionPrefixNature(token);
  if (directNature) {
    return directNature;
  }

  const previousToken = normalizeText(tokens[index - 1]);
  if (/['’]$/u.test(previousToken)) {
    const suffixNature = inferElisionSuffixNature(previousToken, token, "");
    if (suffixNature) {
      return suffixNature;
    }
  }

  return "à préciser";
}

function buildTokenizationPreview(sentence) {
  const tokens = tokenizeSentence(sentence);

  return tokens.map((token, index) => {
    const nature = inferTokenNatureFromContext(tokens, index);
    const category = nature === "ponctuation" ? "ponctuation" : guessCategoryFromNature(nature);

    return {
      position: index + 1,
      word: token,
      nature,
      category,
    };
  });
}

function normalizeNature(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveNatureFamily(value) {
  const normalizedNature = normalizeNature(value);

  if (!normalizedNature) {
    return "";
  }

  if (/\bpronoms?\b/.test(normalizedNature)) {
    return "pronom";
  }

  if (/\bdeterminants?\b/.test(normalizedNature)) {
    return "determinant";
  }

  if (/\badjectifs?\b/.test(normalizedNature)) {
    return "adjectif";
  }

  if (/\bverbes?\b/.test(normalizedNature)) {
    return "verbe";
  }

  if (/\bnoms?\b/.test(normalizedNature)) {
    return "nom";
  }

  return normalizedNature;
}

function guessCategoryFromNature(nature) {
  const normalizedNature = normalizeNature(nature);

  if (VARIABLE_NATURES.includes(normalizedNature)) {
    return "mot variable";
  }

  if (INVARIABLE_NATURES.includes(normalizedNature)) {
    return "mot invariable";
  }

  return "autre";
}

function normalizeGeneratedPayload(payload, context) {
  const sentence = normalizeText(payload?.sentence || payload?.phrase);
  if (!sentence) {
    throw new Error("La phrase générée est vide");
  }

  const tokens = tokenizeSentence(sentence);
  if (tokens.length === 0) {
    throw new Error("Aucun mot n'a pu être extrait de la phrase générée");
  }

  const sourceWords = Array.isArray(payload?.words)
    ? payload.words
    : Array.isArray(payload?.mots)
      ? payload.mots
      : [];
  const expandedSourceWords = expandSourceWords(sourceWords);
  const canUseSourceAlignment = expandedSourceWords.length === tokens.length;

  const words = tokens.map((token, index) => {
    const sourceEntry = canUseSourceAlignment ? expandedSourceWords[index] || {} : {};
    const proposedNature = normalizeText(sourceEntry.nature);
    const proposedCategory = normalizeText(sourceEntry.category);
    const prefixNature = inferElisionPrefixNature(token);

    if (isPunctuationToken(token)) {
      return {
        position: index + 1,
        word: token,
        nature: "ponctuation",
        category: "ponctuation",
      };
    }

    return {
      position: index + 1,
      word: token,
      nature: proposedNature || prefixNature || "à préciser",
      category: proposedCategory || guessCategoryFromNature(proposedNature || prefixNature),
    };
  });

  return {
    sentence,
    level: context.level,
    theme: context.theme || "libre",
    provider: context.provider,
    model: context.model,
    words,
  };
}

function normalizeGeneratedPayloadList(payload, context, requestedCount) {
  const rawEntries = Array.isArray(payload?.sentences)
    ? payload.sentences
    : Array.isArray(payload?.phrases)
      ? payload.phrases
      : payload && typeof payload === "object"
        ? [payload]
        : [];

  const normalizedEntries = rawEntries
    .map((entry) => normalizeGeneratedPayload(entry, context))
    .filter((entry) => Boolean(entry?.sentence));

  if (normalizedEntries.length === 0) {
    throw new Error("Aucune phrase exploitable n'a été renvoyée par le fournisseur IA");
  }

  return normalizedEntries.slice(0, requestedCount);
}

function normalizeRequiredNatureFilters(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => resolveNatureFamily(item))
        .filter(Boolean)
    )
  );
}

function buildGeneratedSentenceFromRow(row) {
  const parsedPayload = parseJsonSafely(row?.payload);
  const payload = parsedPayload && typeof parsedPayload === "object"
    ? parsedPayload
    : {
        sentence: row?.sentence || "",
        words: [],
      };

  return {
    id: row?.id,
    compteur: Number(row?.compteur || 0),
    createdAt: row?.created_at || null,
    ...normalizeGeneratedPayload(payload, {
      level: row?.level || payload?.level || "CE1",
      theme: row?.theme || payload?.theme || "libre",
      provider: row?.provider || payload?.provider || "",
      model: row?.model || payload?.model || "",
    }),
  };
}

function sentenceContainsRequiredNatures(sentence, requiredNatureKeys) {
  if (!Array.isArray(requiredNatureKeys) || requiredNatureKeys.length === 0) {
    return true;
  }

  const words = Array.isArray(sentence?.words) ? sentence.words : [];

  return requiredNatureKeys.every((requiredNature) => {
    const requiredFamily = resolveNatureFamily(requiredNature);

    return words.some((item) => {
      const natureFamily = resolveNatureFamily(item?.nature);
      return Boolean(natureFamily) && natureFamily !== "ponctuation" && natureFamily === requiredFamily;
    });
  });
}

function selectPracticeSentences(sentences, requestedCount) {
  const groupedByCounter = new Map();

  sentences.forEach((sentence) => {
    const counter = Number(sentence?.compteur || 0);
    if (!groupedByCounter.has(counter)) {
      groupedByCounter.set(counter, []);
    }

    groupedByCounter.get(counter).push(sentence);
  });

  const orderedCounters = Array.from(groupedByCounter.keys()).sort((first, second) => first - second);
  const selectedSentences = [];

  orderedCounters.forEach((counter) => {
    if (selectedSentences.length >= requestedCount) {
      return;
    }

    const shuffledGroup = [...groupedByCounter.get(counter)].sort(() => Math.random() - 0.5);
    selectedSentences.push(...shuffledGroup.slice(0, requestedCount - selectedSentences.length));
  });

  return selectedSentences;
}

function buildSentencePrompt({ level, theme, maxWords, customInstruction, phraseCount }) {
  const extraInstruction = normalizeText(customInstruction);
  const cleanTheme = normalizeText(theme, "vie quotidienne");

  return [
    "Rôle : assistant de français pour l'école élémentaire.",
    `Produit ${phraseCount} phrase(s) très simple(s) pour ${level}, thème \"${cleanTheme}\", avec ${maxWords} mots maximum hors ponctuation par phrase.`,
    "Utilise un vocabulaire concret, positif et adapté au CE1/CE2.",
    extraInstruction ? `Contrainte : ${extraInstruction}` : "",
    "Règle obligatoire de segmentation : en cas d'élision avec apostrophe, sépare toujours en deux mots distincts dans words[].",
    "Exemples obligatoires : « J'ai » => [\"J'\", \"ai\"] ; « L'artiste » => [\"L'\", \"artiste\"].",
    "Le token avant apostrophe garde l'apostrophe (ex: J', L').",
    "Attribue une nature grammaticale juste pour chaque token séparé (ex: J' = pronom ; L' devant un nom = déterminant ; ai = verbe ; artiste = nom commun).",
    "Réponds uniquement avec un JSON valide, sans Markdown.",
    'Format attendu : {"sentences":[{"sentence":"Le petit chat dort.","words":[{"position":1,"word":"Le","nature":"déterminant","category":"mot variable"},{"position":2,"word":"petit","nature":"adjectif qualificatif","category":"mot variable"},{"position":3,"word":"chat","nature":"nom commun","category":"mot variable"},{"position":4,"word":"dort","nature":"verbe","category":"mot variable"},{"position":5,"word":".","nature":"ponctuation","category":"ponctuation"}]}]}',
    "Chaque entrée de sentences doit suivre exactement l'ordre des mots de la phrase, ponctuation comprise.",
  ]
    .filter(Boolean)
    .join("\n");
}

function estimateOutputTokenLimit(phraseCount, maxWords) {
  const estimatedWordObjects = phraseCount * (maxWords + 1);
  const estimated = (estimatedWordObjects * 45) + (phraseCount * 120);

  return Math.min(Math.max(estimated, 600), 5000);
}

async function parseErrorResponse(response, fallbackMessage) {
  const rawText = await response.text();
  const json = parseJsonSafely(rawText);

  return {
    message:
      json?.error?.message ||
      json?.error ||
      json?.message ||
      rawText ||
      fallbackMessage,
    providerContent: rawText || "",
  };
}

async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Le fournisseur IA a mis trop de temps à répondre");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestOpenAiLikeCompletion(providerConfig, prompt, endpoint, outputTokenLimit) {
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: providerConfig.model,
      temperature: 0.2,
      max_tokens: outputTokenLimit,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Tu produis uniquement du JSON valide pour une application scolaire en français.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const { message, providerContent } = await parseErrorResponse(
      response,
      `Erreur lors de l'appel à ${providerConfig.label}`
    );
    throw createProviderError(message, providerContent);
  }

  const data = await response.json();
  const choice = data?.choices?.[0] || {};

  return {
    content: choice?.message?.content || "",
    finishReason: String(choice?.finish_reason || ""),
    usage: data?.usage || null,
  };
}

async function requestGeminiCompletion(providerConfig, prompt, outputTokenLimit) {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${providerConfig.model}:generateContent?key=${providerConfig.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.1,
          maxOutputTokens: outputTokenLimit,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const { message, providerContent } = await parseErrorResponse(
      response,
      "Erreur lors de l'appel à Gemini"
    );
    throw createProviderError(message, providerContent);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  return Array.isArray(parts) ? parts.map((part) => part?.text || "").join("\n") : "";
}

function getProviderSetup(providerId) {
  const provider = PROVIDERS[providerId] || PROVIDERS.openai;
  return {
    ...provider,
    apiKey: normalizeText(process.env[provider.apiKeyEnv]),
    model: normalizeText(process.env[provider.modelEnv], provider.defaultModel),
  };
}

router.get('/providers', (req, res) => {
  const providers = Object.values(PROVIDERS).map((provider) => {
    const setup = getProviderSetup(provider.id);
    return {
      id: provider.id,
      label: provider.label,
      configured: Boolean(setup.apiKey),
      model: setup.model,
    };
  });

  return res.json({ providers });
});

async function storeGeneratedSentences(sentences) {
  const insertedSentences = [];

  for (const sentenceEntry of sentences) {
    const serializedPayload = JSON.stringify(sentenceEntry);
    const insertResult = await runAsync(
      `INSERT INTO generated_sentences (sentence, level, theme, provider, model, payload, compteur)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        sentenceEntry.sentence,
        sentenceEntry.level || null,
        sentenceEntry.theme || null,
        sentenceEntry.provider || null,
        sentenceEntry.model || null,
        serializedPayload,
      ]
    );

    const insertedRow = await getAsync(
      `SELECT id, compteur, created_at
       FROM generated_sentences
       WHERE id = ?`,
      [insertResult.lastID]
    );

    insertedSentences.push({
      ...sentenceEntry,
      id: insertedRow?.id || insertResult.lastID,
      compteur: insertedRow?.compteur ?? 0,
      createdAt: insertedRow?.created_at || null,
    });
  }

  return insertedSentences;
}

function buildGeneratedSentenceSignature(entry) {
  return [
    normalizeText(entry?.sentence).toLowerCase(),
    normalizeText(entry?.level).toUpperCase(),
    normalizeText(entry?.theme).toLowerCase(),
    normalizeText(entry?.provider).toLowerCase(),
    normalizeText(entry?.model).toLowerCase(),
  ].join("::");
}

function normalizeImportedGeneratedSentenceEntry(entry, index = 0) {
  if (!entry || typeof entry !== "object") {
    throw new Error(`L'entrée ${index + 1} du fichier JSON est invalide`);
  }

  const payloadSource = entry.payload && typeof entry.payload === "object"
    ? entry.payload
    : typeof entry.payload === "string"
      ? parseJsonSafely(entry.payload)
      : entry;

  if (!payloadSource || typeof payloadSource !== "object") {
    throw new Error(`Le contenu de l'entrée ${index + 1} ne contient pas de phrase exploitable`);
  }

  const level = normalizeText(entry.level || payloadSource.level, "CE1").toUpperCase();
  if (level && !ALLOWED_LEVELS.has(level)) {
    throw new Error(`Le niveau de l'entrée ${index + 1} doit être CE1 ou CE2`);
  }

  const normalizedEntry = normalizeGeneratedPayload(payloadSource, {
    level,
    theme: normalizeText(entry.theme || payloadSource.theme, "libre"),
    provider: normalizeText(entry.provider || payloadSource.provider),
    model: normalizeText(entry.model || payloadSource.model),
  });

  const parsedCounter = Number(entry.compteur ?? entry.counter ?? 0);

  return {
    ...normalizedEntry,
    compteur: Number.isNaN(parsedCounter) ? 0 : Math.max(0, Math.round(parsedCounter)),
    createdAt: normalizeText(entry.created_at || entry.createdAt) || null,
  };
}

function buildGeneratedSentenceExportItem(row) {
  const parsedPayload = parseJsonSafely(row.payload);
  const payload = parsedPayload && typeof parsedPayload === "object"
    ? parsedPayload
    : {
        sentence: row.sentence,
        level: row.level || "",
        theme: row.theme || "",
        provider: row.provider || "",
        model: row.model || "",
        words: [],
      };

  return {
    id: row.id,
    sentence: row.sentence,
    level: row.level || payload.level || "",
    theme: row.theme || payload.theme || "",
    provider: row.provider || payload.provider || "",
    model: row.model || payload.model || "",
    compteur: Number(row.compteur || 0),
    created_at: row.created_at || null,
    payload,
  };
}

async function storeImportedGeneratedSentences(sentences) {
  const existingRows = await allAsync(
    `SELECT sentence, level, theme, provider, model
     FROM generated_sentences`
  );
  const existingKeys = new Set(existingRows.map((row) => buildGeneratedSentenceSignature(row)));
  const payloadKeys = new Set();
  const insertedSentences = [];
  let skippedDuplicates = 0;

  for (const sentenceEntry of sentences) {
    const signature = buildGeneratedSentenceSignature(sentenceEntry);
    if (existingKeys.has(signature) || payloadKeys.has(signature)) {
      skippedDuplicates += 1;
      continue;
    }

    payloadKeys.add(signature);
    existingKeys.add(signature);

    const serializedPayload = JSON.stringify({
      sentence: sentenceEntry.sentence,
      level: sentenceEntry.level || null,
      theme: sentenceEntry.theme || null,
      provider: sentenceEntry.provider || null,
      model: sentenceEntry.model || null,
      words: Array.isArray(sentenceEntry.words) ? sentenceEntry.words : [],
    });

    const insertResult = sentenceEntry.createdAt
      ? await runAsync(
          `INSERT INTO generated_sentences (sentence, level, theme, provider, model, payload, compteur, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sentenceEntry.sentence,
            sentenceEntry.level || null,
            sentenceEntry.theme || null,
            sentenceEntry.provider || null,
            sentenceEntry.model || null,
            serializedPayload,
            Number(sentenceEntry.compteur || 0),
            sentenceEntry.createdAt,
          ]
        )
      : await runAsync(
          `INSERT INTO generated_sentences (sentence, level, theme, provider, model, payload, compteur)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            sentenceEntry.sentence,
            sentenceEntry.level || null,
            sentenceEntry.theme || null,
            sentenceEntry.provider || null,
            sentenceEntry.model || null,
            serializedPayload,
            Number(sentenceEntry.compteur || 0),
          ]
        );

    const insertedRow = await getAsync(
      `SELECT id, compteur, created_at
       FROM generated_sentences
       WHERE id = ?`,
      [insertResult.lastID]
    );

    insertedSentences.push({
      ...sentenceEntry,
      id: insertedRow?.id || insertResult.lastID,
      compteur: insertedRow?.compteur ?? sentenceEntry.compteur ?? 0,
      createdAt: insertedRow?.created_at || sentenceEntry.createdAt || null,
    });
  }

  return { insertedSentences, skippedDuplicates };
}

function buildGeneratedSentenceFilters(query = {}) {
  const where = [];
  const params = [];
  const level = normalizeText(query?.level).toUpperCase();
  const theme = normalizeText(query?.theme).toLowerCase();
  const search = normalizeText(query?.search).toLowerCase();

  if (level) {
    if (!ALLOWED_LEVELS.has(level)) {
      throw new Error('Le niveau doit être CE1 ou CE2');
    }
    where.push('UPPER(level) = ?');
    params.push(level);
  }

  if (theme) {
    where.push('LOWER(theme) LIKE ?');
    params.push(`%${theme}%`);
  }

  if (search) {
    where.push('LOWER(sentence) LIKE ?');
    params.push(`%${search}%`);
  }

  return { where, params };
}

async function getLeastUsedSentence(level, theme) {
  const attempts = [];
  const normalizedLevel = normalizeText(level).toUpperCase();
  const normalizedTheme = normalizeText(theme).toLowerCase();

  if (normalizedLevel && normalizedTheme) {
    attempts.push({ level: normalizedLevel, theme: normalizedTheme });
  }
  if (normalizedLevel) {
    attempts.push({ level: normalizedLevel, theme: "" });
  }
  if (normalizedTheme) {
    attempts.push({ level: "", theme: normalizedTheme });
  }
  attempts.push({ level: "", theme: "" });

  const seenKeys = new Set();

  for (const attempt of attempts) {
    const key = `${attempt.level}|${attempt.theme}`;
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    const where = [];
    const params = [];

    if (attempt.level) {
      where.push("UPPER(level) = ?");
      params.push(attempt.level);
    }

    if (attempt.theme) {
      where.push("LOWER(theme) = ?");
      params.push(attempt.theme);
    }

    const row = await getAsync(
      `SELECT *
       FROM generated_sentences
       ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY COALESCE(compteur, 0) ASC, id ASC
       LIMIT 1`,
      params
    );

    if (row) {
      return row;
    }
  }

  return null;
}

router.get('/generated-sentences', async (req, res) => {
  try {
    const parsedLimit = Number(req.query?.limit);
    const limit = Number.isNaN(parsedLimit)
      ? 100
      : Math.min(Math.max(Math.round(parsedLimit), 1), 500);
    const { where, params } = buildGeneratedSentenceFilters(req.query);
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [rows, totalRow] = await Promise.all([
      allAsync(
        `SELECT id, sentence, level, theme, provider, model, compteur, created_at
         FROM generated_sentences
         ${whereClause}
         ORDER BY COALESCE(compteur, 0) ASC, id DESC
         LIMIT ?`,
        [...params, limit]
      ),
      getAsync(
        `SELECT COUNT(*) AS total
         FROM generated_sentences
         ${whereClause}`,
        params
      ),
    ]);

    return res.json({
      total: totalRow?.total ?? rows.length,
      sentences: rows,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erreur lors du chargement des phrases générées',
    });
  }
});

router.get('/generated-sentences/export', async (req, res) => {
  try {
    const { where, params } = buildGeneratedSentenceFilters(req.query);
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await allAsync(
      `SELECT id, sentence, level, theme, provider, model, compteur, created_at, payload
       FROM generated_sentences
       ${whereClause}
       ORDER BY COALESCE(compteur, 0) ASC, id DESC`,
      params
    );

    return res.json({
      exportedAt: new Date().toISOString(),
      total: rows.length,
      sentences: rows.map((row) => buildGeneratedSentenceExportItem(row)),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erreur lors de l\'export JSON des phrases générées',
    });
  }
});

router.get('/generated-sentences/practice', async (req, res) => {
  try {
    const parsedCount = Number(req.query?.count);
    const requestedCount = Number.isNaN(parsedCount)
      ? 1
      : Math.min(Math.max(Math.round(parsedCount), 1), 20);
    const level = normalizeText(req.query?.level).toUpperCase();
    const theme = normalizeText(req.query?.theme);
    const requiredNatureKeys = normalizeRequiredNatureFilters(
      req.query?.requiredNatures || req.query?.required_natures
    );

    if (level && !ALLOWED_LEVELS.has(level)) {
      return res.status(400).json({ error: 'Le niveau doit être CE1 ou CE2' });
    }

    const where = [];
    const params = [];

    if (level) {
      where.push('UPPER(level) = ?');
      params.push(level);
    }

    if (theme) {
      where.push('LOWER(theme) LIKE ?');
      params.push(`%${theme.toLowerCase()}%`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await allAsync(
      `SELECT id, sentence, level, theme, provider, model, payload, compteur, created_at
       FROM generated_sentences
       ${whereClause}
       ORDER BY COALESCE(compteur, 0) ASC, id ASC
       LIMIT 500`,
      params
    );

    const eligibleSentences = rows
      .map((row) => buildGeneratedSentenceFromRow(row))
      .filter((sentence) => sentenceContainsRequiredNatures(sentence, requiredNatureKeys));

    if (eligibleSentences.length === 0) {
      return res.status(404).json({
        error: 'Aucune phrase générée ne correspond aux paramètres demandés.',
      });
    }

    const selectedSentences = selectPracticeSentences(eligibleSentences, requestedCount);

    for (const sentence of selectedSentences) {
      await runAsync(
        'UPDATE generated_sentences SET compteur = COALESCE(compteur, 0) + 1 WHERE id = ?',
        [sentence.id]
      );
      sentence.compteur = Number(sentence.compteur || 0) + 1;
    }

    return res.json({
      requestedCount,
      returnedCount: selectedSentences.length,
      totalAvailable: eligibleSentences.length,
      sentences: selectedSentences,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erreur lors de la récupération des phrases pour l\'activité',
    });
  }
});

router.get('/generated-sentences/next', async (req, res) => {
  try {
    const level = normalizeText(req.query?.level).toUpperCase();
    const theme = normalizeText(req.query?.theme);

    if (level && !ALLOWED_LEVELS.has(level)) {
      return res.status(400).json({ error: 'Le niveau doit être CE1 ou CE2' });
    }

    const row = await getLeastUsedSentence(level, theme);
    if (!row) {
      return res.status(404).json({ error: 'Aucune phrase générée n\'est disponible dans la base.' });
    }

    await runAsync(
      'UPDATE generated_sentences SET compteur = COALESCE(compteur, 0) + 1 WHERE id = ?',
      [row.id]
    );

    const payload = parseJsonSafely(row.payload);
    const sentence = payload && typeof payload === 'object'
      ? payload
      : {
          sentence: row.sentence,
          level: row.level || level || 'CE1',
          theme: row.theme || theme || 'libre',
          provider: row.provider || '',
          model: row.model || '',
          words: [],
        };

    return res.json({
      sentence: {
        ...sentence,
        id: row.id,
        compteur: Number(row.compteur || 0) + 1,
        createdAt: row.created_at || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erreur lors de la récupération de la phrase en base',
    });
  }
});

router.post('/generated-sentences/import', async (req, res) => {
  try {
    const input = typeof req.body?.json === 'string'
      ? parseJsonSafely(req.body.json)
      : req.body;

    if (!input) {
      return res.status(400).json({
        error: 'Le fichier JSON est vide ou invalide',
      });
    }

    const rawSentences = Array.isArray(input)
      ? input
      : Array.isArray(input?.sentences)
        ? input.sentences
        : [];

    if (rawSentences.length === 0) {
      return res.status(400).json({
        error: 'Aucune phrase à importer n\'a été trouvée dans le JSON',
      });
    }

    const normalizedSentences = rawSentences.map((entry, index) =>
      normalizeImportedGeneratedSentenceEntry(entry, index)
    );

    const { insertedSentences, skippedDuplicates } = await storeImportedGeneratedSentences(normalizedSentences);

    return res.json({
      received: rawSentences.length,
      imported: insertedSentences.length,
      skippedDuplicates,
    });
  } catch (err) {
    return res.status(400).json({
      error: err.message || 'Erreur lors de l\'import JSON des phrases générées',
    });
  }
});

router.post('/generated-sentences/reset-counters', async (req, res) => {
  try {
    const { where, params } = buildGeneratedSentenceFilters(req.query);
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const result = await runAsync(
      `UPDATE generated_sentences SET compteur = 0 ${whereClause}`,
      params
    );

    return res.json({ reset: result.changes || 0 });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erreur lors de la réinitialisation des compteurs',
    });
  }
});

router.delete('/generated-sentences/:id', async (req, res) => {
  try {
    const sentenceId = Number(req.params.id);
    if (Number.isNaN(sentenceId)) {
      return res.status(400).json({ error: 'Identifiant de phrase invalide' });
    }

    const result = await runAsync('DELETE FROM generated_sentences WHERE id = ?', [sentenceId]);
    if (!result.changes) {
      return res.status(404).json({ error: 'Phrase non trouvée' });
    }

    return res.json({ deleted: result.changes });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erreur lors de la suppression de la phrase',
    });
  }
});

router.delete('/generated-sentences', async (req, res) => {
  try {
    const { where, params } = buildGeneratedSentenceFilters(req.query);
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const result = await runAsync(
      `DELETE FROM generated_sentences ${whereClause}`,
      params
    );

    return res.json({ deleted: result.changes || 0 });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erreur lors de la suppression des phrases générées',
    });
  }
});

router.post('/generate-sentence', async (req, res) => {
  try {
    const providerId = normalizeText(req.body?.provider, 'openai').toLowerCase();
    const level = normalizeText(req.body?.level, 'CE1').toUpperCase();
    const theme = normalizeText(req.body?.theme, 'vie quotidienne');
    const customInstruction = normalizeText(req.body?.customInstruction);
    const parsedMaxWords = Number(req.body?.maxWords);
    const maxWords = Number.isNaN(parsedMaxWords)
      ? 6
      : Math.min(Math.max(Math.round(parsedMaxWords), 3), 10);
    const parsedPhraseCount = Number(req.body?.phraseCount);
    const phraseCount = Number.isNaN(parsedPhraseCount)
      ? 1
      : Math.min(Math.max(Math.round(parsedPhraseCount), 1), 12);

    if (!PROVIDERS[providerId]) {
      return res.status(400).json({ error: 'Fournisseur IA non pris en charge' });
    }

    if (!ALLOWED_LEVELS.has(level)) {
      return res.status(400).json({ error: 'Le niveau doit être CE1 ou CE2' });
    }

    const providerSetup = getProviderSetup(providerId);
    if (!providerSetup.apiKey) {
      return res.status(400).json({
        error: `La clé API ${providerSetup.apiKeyEnv} est absente sur le backend`,
      });
    }

    const prompt = buildSentencePrompt({
      level,
      theme,
      maxWords,
      customInstruction,
      phraseCount,
    });
    const outputTokenLimit = estimateOutputTokenLimit(phraseCount, maxWords);

    let rawContent = '';
    let finishReason = '';
    let usage = null;

    if (providerId === 'gemini') {
      rawContent = await requestGeminiCompletion(providerSetup, prompt, outputTokenLimit);
    } else if (providerId === 'mistral') {
      const completion = await requestOpenAiLikeCompletion(
        providerSetup,
        prompt,
        'https://api.mistral.ai/v1/chat/completions',
        outputTokenLimit
      );
      rawContent = completion.content;
      finishReason = completion.finishReason;
      usage = completion.usage;
    } else {
      const completion = await requestOpenAiLikeCompletion(
        providerSetup,
        prompt,
        'https://api.openai.com/v1/chat/completions',
        outputTokenLimit
      );
      rawContent = completion.content;
      finishReason = completion.finishReason;
      usage = completion.usage;
    }

    if (finishReason && finishReason !== 'stop') {
      console.warn('[AI][generate-sentence] Réponse potentiellement tronquée', {
        provider: providerId,
        model: providerSetup.model,
        finishReason,
        outputTokenLimit,
        usage,
        rawLength: rawContent.length,
      });
    }

    let normalizedSentences = [];

    try {
      const parsedPayload = extractFirstJsonObject(rawContent);
      normalizedSentences = normalizeGeneratedPayloadList(
        parsedPayload,
        {
          level,
          theme,
          provider: providerId,
          model: providerSetup.model,
        },
        phraseCount
      );
    } catch (err) {
      console.error('[AI][generate-sentence] Échec d\'analyse de la réponse fournisseur', {
        provider: providerId,
        model: providerSetup.model,
        finishReason,
        outputTokenLimit,
        usage,
        rawLength: rawContent.length,
        rawPreview: String(rawContent || '').slice(0, 1200),
      });

      const debugDetails = [
        `Fournisseur : ${providerId}`,
        `Modèle : ${providerSetup.model}`,
        `finish_reason : ${finishReason || 'indisponible'}`,
        `max_tokens demandé : ${outputTokenLimit}`,
        `Longueur brute : ${rawContent.length} caractères`,
        usage ? `Usage : ${JSON.stringify(usage, null, 2)}` : '',
        '',
        'Contenu brut retourné :',
        rawContent,
      ]
        .filter(Boolean)
        .join('\n');

      throw createProviderError(
        err.message || 'Erreur lors de l\'analyse de la réponse du fournisseur IA',
        debugDetails
      );
    }

    const storedSentences = await storeGeneratedSentences(normalizedSentences);

    return res.json({
      result: {
        requestedCount: phraseCount,
        generatedCount: storedSentences.length,
        importedCount: storedSentences.length,
        sentences: storedSentences,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erreur lors de la génération de la phrase par IA',
      providerContent: normalizeText(err.providerContent),
    });
  }
});

router.post('/debug-tokenization', (req, res) => {
  try {
    const sentence = normalizeText(req.body?.sentence);

    if (!sentence) {
      return res.status(400).json({
        error: 'La phrase est obligatoire pour tester le découpage',
      });
    }

    const preview = buildTokenizationPreview(sentence);
    if (preview.length === 0) {
      return res.status(400).json({
        error: 'Aucun token exploitable n\'a été détecté dans la phrase fournie',
      });
    }

    return res.json({
      sentence,
      tokenCount: preview.length,
      words: preview,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erreur lors de l\'analyse de la phrase',
    });
  }
});

module.exports = router;
