import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import ActivityActionsBar from "../components/ActivityActionsBar";
import VocabularyProgressBadge from "../components/VocabularyProgressBadge";
import { resolveVocabularyImageUrl } from "../components/VocabularyImagePreview";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import {
  parseActivityContent,
  getSafeDisplayText,
  parsePositiveInt,
  handleRoundRestart,
} from "../utils/activityUtils";
import { API_URL } from "../config/api";

const ALLOWED_LEVEL_KEYS = ["level1", "level2"];

function buildInlineSvgDataUrl(word, subtitle = "") {
  const safeWord = String(word || "Mot").replace(/[<>&"']/g, "");
  const safeSub = String(subtitle || "").replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="360" height="220">
    <rect width="360" height="220" rx="20" fill="#eef2ff" stroke="#6366f1" stroke-width="3"/>
    <circle cx="180" cy="86" r="42" fill="#c7d2fe" />
    <text x="180" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="#3730a3">${safeWord.slice(0, 1).toUpperCase()}</text>
    <text x="180" y="166" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#1e1b4b">${safeWord}</text>
    <text x="180" y="194" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#4338ca">${safeSub}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_VOCABULARY_WORDS = {
  CE1: [
    {
      id: 1001,
      word: "rusé",
      nature: "adjectif qualificatif",
      definition: "Qui utilise des astuces malines pour réussir.",
      sentence1_cloze: "Le renard est un animal très _____.",
      sentence2_cloze: "Ce petit joueur _____ a trouvé la meilleure cachette.",
      distractors: ["courageux", "timide"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 1002,
      word: "courageux",
      nature: "adjectif qualificatif",
      definition: "Qui n'a pas peur d'affronter le danger ou la difficulté.",
      sentence1_cloze: "Le pompier _____ grimpe tout en haut de la grande échelle.",
      sentence2_cloze: "Cet explorateur est _____ face à la tempête.",
      distractors: ["rusé", "peureux"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 1003,
      word: "timide",
      nature: "adjectif qualificatif",
      definition: "Qui n'ose pas parler fort devant les personnes qu'il ne connaît pas.",
      sentence1_cloze: "Léo est un peu _____ le premier jour de l'école.",
      sentence2_cloze: "Ce petit chaton _____ se cache derrière le canapé.",
      distractors: ["bavard", "joyeux"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 1004,
      word: "curieux",
      nature: "adjectif qualificatif",
      definition: "Qui a très envie de découvrir et de comprendre plein de choses nouvelles.",
      sentence1_cloze: "Cet élève _____ pose beaucoup de questions sur les étoiles.",
      sentence2_cloze: "Le petit écureuil _____ regarde dans le panier.",
      distractors: ["fatigué", "pressé"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 1005,
      word: "généreux",
      nature: "adjectif qualificatif",
      definition: "Qui aime partager et donner aux autres avec plaisir.",
      sentence1_cloze: "Mon ami est _____, il partage toujours son goûter.",
      sentence2_cloze: "Ce voisin _____ offre des pommes de son jardin.",
      distractors: ["égoïste", "sévère"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 1006,
      word: "patient",
      nature: "adjectif qualificatif",
      definition: "Qui sait attendre calmement sans s'énerver.",
      sentence1_cloze: "Le pêcheur reste _____ au bord de la rivière.",
      sentence2_cloze: "Il faut être _____ pour construire ce grand puzzle.",
      distractors: ["pressé", "bruyant"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 1007,
      word: "agile",
      nature: "adjectif qualificatif",
      definition: "Qui bouge avec souplesse, rapidité et adresse.",
      sentence1_cloze: "Le singe _____ saute facilement de branche en branche.",
      sentence2_cloze: "Cette gymnaste est très _____ sur la poutre.",
      distractors: ["maladroit", "lourd"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 1008,
      word: "attentif",
      nature: "adjectif qualificatif",
      definition: "Qui écoute et regarde avec beaucoup de concentration.",
      sentence1_cloze: "L'élève reste bien _____ pendant la lecture du conte.",
      sentence2_cloze: "Sois _____ avant de traverser la rue.",
      distractors: ["distrait", "endormi"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 1009,
      word: "joyeux",
      nature: "adjectif qualificatif",
      definition: "Qui est plein de gaieté et de bonne humeur.",
      sentence1_cloze: "Les enfants poussent des cris _____ dans la cour.",
      sentence2_cloze: "Ce musicien joue un air très _____.",
      distractors: ["triste", "fâché"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 1010,
      word: "poli",
      nature: "adjectif qualificatif",
      definition: "Qui respecte les règles de bonne conduite en disant bonjour et merci.",
      sentence1_cloze: "Cet enfant _____ salue toujours la boulangère.",
      sentence2_cloze: "Il est important d'être _____ avec tout le monde.",
      distractors: ["grossier", "bruyant"],
      phase: "discovery",
      stage: "learning",
    },
  ],
  CE2: [
    {
      id: 2001,
      word: "persévérant",
      nature: "adjectif qualificatif",
      definition: "Qui continue ses efforts sans abandonner malgré les difficultés.",
      sentence1_cloze: "Grâce à son travail _____, elle a réussi à jouer ce morceau.",
      sentence2_cloze: "Un sportif _____ s'entraîne même quand l'exercice est difficile.",
      distractors: ["découragé", "négligent"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 2002,
      word: "observer",
      nature: "verbe",
      definition: "Regarder quelque chose avec beaucoup d'attention pour mieux le connaître.",
      sentence1_cloze: "Nous utilisons une loupe pour _____ les insectes du jardin.",
      sentence2_cloze: "L'astronome aime _____ les planètes pendant la nuit.",
      distractors: ["ignorer", "cacher"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 2003,
      word: "abri",
      nature: "nom commun",
      definition: "Endroit où l'on peut se protéger du mauvais temps ou du danger.",
      sentence1_cloze: "Les randonneurs cherchent un _____ pendant l'orage.",
      sentence2_cloze: "Le hérisson a construit un _____ sous les feuilles mortes.",
      distractors: ["sommet", "sentier"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 2004,
      word: "prudent",
      nature: "adjectif qualificatif",
      definition: "Qui fait attention pour éviter les erreurs ou les accidents.",
      sentence1_cloze: "Le cycliste _____ porte toujours son casque.",
      sentence2_cloze: "Il faut rester _____ sur le chemin verglacé.",
      distractors: ["imprudent", "pressé"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 2005,
      word: "franchir",
      nature: "verbe",
      definition: "Traverser ou passer par-dessus un obstacle.",
      sentence1_cloze: "Le cheval s'élance pour _____ la haie.",
      sentence2_cloze: "Les voyageurs vont _____ le pont de pierre.",
      distractors: ["reculer", "attendre"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 2006,
      word: "paisible",
      nature: "adjectif qualificatif",
      definition: "Qui est calme, tranquille et sans bruit.",
      sentence1_cloze: "Le village reste _____ au lever du soleil.",
      sentence2_cloze: "Les canards nagent sur un lac _____.",
      distractors: ["agité", "bruyant"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 2007,
      word: "sommet",
      nature: "nom commun",
      definition: "La partie la plus haute d'une montagne ou d'un arbre.",
      sentence1_cloze: "La neige recouvre encore le _____ de la montagne.",
      sentence2_cloze: "L'aigle a bâti son nid tout en haut du _____.",
      distractors: ["fossé", "tunnel"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 2008,
      word: "splendide",
      nature: "adjectif qualificatif",
      definition: "Qui est extrêmement beau et magnifique à regarder.",
      sentence1_cloze: "Nous admirons un _____ arc-en-ciel après la pluie.",
      sentence2_cloze: "Ce château ancien possède un jardin _____.",
      distractors: ["ordinaire", "sombre"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 2009,
      word: "assemblée",
      nature: "nom commun",
      definition: "Groupe de personnes réunies au même endroit.",
      sentence1_cloze: "Toute l'_____ écoute le discours du directeur.",
      sentence2_cloze: "Le conteur captive l'_____ avec son histoire.",
      distractors: ["solitude", "absence"],
      phase: "discovery",
      stage: "learning",
    },
    {
      id: 2010,
      word: "scintiller",
      nature: "verbe",
      definition: "Briller avec de petits éclats lumineux qui tremblent.",
      sentence1_cloze: "On voit les étoiles _____ dans le ciel d'été.",
      sentence2_cloze: "Le soleil fait _____ la surface de la mer.",
      distractors: ["s'éteindre", "noircir"],
      phase: "discovery",
      stage: "learning",
    },
  ],
};

export const defaultVocabularyLearningActivityContent = {
  title: "Apprentissage du vocabulaire",
  skill: "Comprendre, retenir et utiliser des mots nouveaux en contexte",
  instruction:
    "Observe bien la carte de découverte ou la question, puis clique sur le bon mot !",
  defaultLevel: "level1",
  wordCount: 10,
  maxRevisionsPerSession: 6,
  evaluationSentenceCount: 6,
  sequenceId: null,
  levels: {
    level1: {
      label: "CE1",
      schoolLevel: "CE1",
      wordCount: 10,
      maxRevisionsPerSession: 6,
      skill: "Comprendre et mémoriser le vocabulaire CE1 en contexte",
    },
    level2: {
      label: "CE2",
      schoolLevel: "CE2",
      wordCount: 10,
      maxRevisionsPerSession: 6,
      skill: "Comprendre et mémoriser le vocabulaire CE2 en contexte",
    },
  },
};

export function shuffleChoices(correctWord, distractors = [], fallbackPool = []) {
  const cleanCorrect = String(correctWord || "").trim();
  const validDistractors = (Array.isArray(distractors) ? distractors : [])
    .map((d) => String(d || "").trim())
    .filter((d) => Boolean(d) && d.toLowerCase() !== cleanCorrect.toLowerCase());

  while (validDistractors.length < 2) {
    const candidate =
      fallbackPool.find(
        (w) =>
          w &&
          w.toLowerCase() !== cleanCorrect.toLowerCase() &&
          !validDistractors.some((d) => d.toLowerCase() === w.toLowerCase())
      ) || `intrus ${validDistractors.length + 1}`;
    validDistractors.push(candidate);
  }

  const choices = [cleanCorrect, validDistractors[0], validDistractors[1]];
  // Mélange aléatoire (en s'assurant que les 3 options sont présentes)
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

export function normalizeWordEntry(entry, index = 0) {
  const word = String(entry?.word || `mot ${index + 1}`).trim();
  const nature = String(entry?.nature || "mot").trim();
  const definition = String(
    entry?.definition || `Définition du mot ${word}.`
  ).trim();
  const sentence1 = String(
    entry?.sentence1_cloze || entry?.sentence1 || `Voici une première phrase avec _____.`
  ).trim();
  const sentence2 = String(
    entry?.sentence2_cloze || entry?.sentence2 || `Voici une deuxième phrase avec _____.`
  ).trim();
  const distractors = Array.isArray(entry?.distractors)
    ? entry.distractors.map((d) => String(d || "").trim()).filter(Boolean)
    : [];
  const phase = entry?.phase === "revision" ? "revision" : "discovery";
  const stage =
    entry?.stage || (phase === "revision" ? "reviewing" : "learning");

  return {
    id: entry?.id || index + 1,
    sequence_id: entry?.sequence_id || entry?.sequenceId || null,
    word,
    nature,
    definition,
    sentence1_cloze: sentence1,
    sentence2_cloze: sentence2,
    distractors: distractors.length >= 2 ? distractors.slice(0, 2) : [...distractors, "autre", "possible"].slice(0, 2),
    image_url: entry?.image_url || entry?.imageUrl || "",
    phase,
    stage,
    tier_index: Number(entry?.tier_index || 0),
    consecutive_successes: Number(entry?.consecutive_successes || 0),
  };
}

export function getStepsForWord(wordObj) {
  if (wordObj?.phase === "revision") {
    return ["definition_qcm", "sentence1", "sentence2"];
  }
  return ["discovery_card", "sentence1", "sentence2"];
}

export function calculateVocabularyProgressPercent(
  completedStepsCount = 0,
  totalStepsInSession = 0,
  finished = false
) {
  if (finished) return 100;
  const safeTotal = Number(totalStepsInSession);
  if (!Number.isFinite(safeTotal) || safeTotal <= 0) return 0;
  const safeCompleted = Math.max(0, Number(completedStepsCount) || 0);
  return Math.min(100, Math.max(0, Math.round((safeCompleted / safeTotal) * 100)));
}

const VocabularyLearningActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
  isFocusedMode = false,
}) => {
  const parsedContent = useMemo(
    () => parseActivityContent(content, defaultVocabularyLearningActivityContent),
    [content]
  );

  const normalizedLevels = useMemo(() => {
    const rawLevels = parsedContent.levels && typeof parsedContent.levels === "object"
      ? parsedContent.levels
      : {};
    const rootWordCount = parsePositiveInt(
      parsedContent.wordCount,
      defaultVocabularyLearningActivityContent.wordCount
    );
    const rootMaxRevisions = parsePositiveInt(
      parsedContent.maxRevisionsPerSession,
      defaultVocabularyLearningActivityContent.maxRevisionsPerSession
    );

    return {
      level1: {
        label: getSafeDisplayText(rawLevels.level1?.label, "CE1"),
        schoolLevel: "CE1",
        wordCount: parsePositiveInt(rawLevels.level1?.wordCount, rootWordCount),
        maxRevisionsPerSession: parsePositiveInt(
          rawLevels.level1?.maxRevisionsPerSession,
          rootMaxRevisions
        ),
        skill: rawLevels.level1?.skill || parsedContent.skill,
      },
      level2: {
        label: getSafeDisplayText(rawLevels.level2?.label, "CE2"),
        schoolLevel: "CE2",
        wordCount: parsePositiveInt(rawLevels.level2?.wordCount, rootWordCount),
        maxRevisionsPerSession: parsePositiveInt(
          rawLevels.level2?.maxRevisionsPerSession,
          rootMaxRevisions
        ),
        skill: rawLevels.level2?.skill || parsedContent.skill,
      },
    };
  }, [parsedContent]);

  const configuredLevelKeys = useMemo(() => {
    const parsedLevels = parsedContent?.levels;
    if (parsedLevels && typeof parsedLevels === "object") {
      const keys = ALLOWED_LEVEL_KEYS.filter((levelKey) => {
        const levelRule = parsedLevels[levelKey];
        return levelRule && typeof levelRule === "object";
      });
      if (keys.length > 0) {
        return keys;
      }
    }

    const explicitSchoolLevel = String(parsedContent?.level || "")
      .trim()
      .toUpperCase();
    if (explicitSchoolLevel === "CE2") {
      return ["level2"];
    }
    if (explicitSchoolLevel === "CE1") {
      return ["level1"];
    }
    if (ALLOWED_LEVEL_KEYS.includes(parsedContent?.defaultLevel)) {
      return [parsedContent.defaultLevel];
    }

    return ALLOWED_LEVEL_KEYS;
  }, [parsedContent]);

  const initialLevelKey = useMemo(() => {
    const explicitSchoolLevel = String(parsedContent.level || "")
      .trim()
      .toUpperCase();
    if (explicitSchoolLevel === "CE2" && configuredLevelKeys.includes("level2")) {
      return "level2";
    }
    if (explicitSchoolLevel === "CE1" && configuredLevelKeys.includes("level1")) {
      return "level1";
    }
    if (configuredLevelKeys.includes(parsedContent.defaultLevel)) {
      return parsedContent.defaultLevel;
    }
    return configuredLevelKeys[0] || "level1";
  }, [configuredLevelKeys, parsedContent.defaultLevel, parsedContent.level]);

  const [currentLevel, setCurrentLevel] = useState(initialLevelKey);

  useEffect(() => {
    if (!configuredLevelKeys.includes(currentLevel)) {
      setCurrentLevel(initialLevelKey);
    }
  }, [configuredLevelKeys, currentLevel, initialLevelKey]);

  const currentLevelRule =
    normalizedLevels[currentLevel] ||
    normalizedLevels[configuredLevelKeys[0]] ||
    normalizedLevels.level1;

  const [sessionWords, setSessionWords] = useState(() => {
    const initialRule = normalizedLevels[initialLevelKey] || normalizedLevels.level1;
    const targetCount = initialRule.wordCount || 10;
    if (Array.isArray(parsedContent.words) && parsedContent.words.length > 0) {
      return parsedContent.words.slice(0, targetCount).map(normalizeWordEntry);
    }
    const pool = DEFAULT_VOCABULARY_WORDS[initialRule.schoolLevel] || DEFAULT_VOCABULARY_WORDS.CE1;
    return pool.slice(0, targetCount).map(normalizeWordEntry);
  });
  const [loading, setLoading] = useState(false);
  const [upToDateInfo, setUpToDateInfo] = useState(null);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);
  const [eliminatedChoices, setEliminatedChoices] = useState([]);
  const [feedbackBanner, setFeedbackBanner] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalScoreOn20, setFinalScoreOn20] = useState(0);

  const clearFeedbackBanner = useCallback(() => {
    setFeedbackBanner(null);
  }, []);

  const correctFeedbackMessage =
    feedbackBanner && feedbackBanner.type === "success" ? feedbackBanner : null;
  const errorFeedbackMessage =
    feedbackBanner && (feedbackBanner.type === "error" || feedbackBanner.type === "warning")
      ? feedbackBanner
      : null;

  // Mode court (1000 ms / 2000 ms) pour les réponses correctes (success)
  const { show: showCorrectFeedback, fade: fadeCorrectFeedback } = useAutoDismissMessage(
    correctFeedbackMessage,
    clearFeedbackBanner,
    1000,
    2000
  );

  // Mode plus long (2500 ms / 3000 ms) pour les messages d'erreur ou d'avertissement (error, warning)
  const { show: showErrorFeedback, fade: fadeErrorFeedback } = useAutoDismissMessage(
    errorFeedbackMessage,
    clearFeedbackBanner,
    2500,
    3000
  );

  const showFeedbackBanner = showCorrectFeedback || showErrorFeedback;
  const fadeFeedbackBanner =
    feedbackBanner?.type === "success" ? fadeCorrectFeedback : fadeErrorFeedback;

  // Suivi des points et erreurs par mot : { [wordId]: { score, maxScore, errors, phase, word } }
  const [wordScoresMap, setWordScoresMap] = useState({});

  const lastLoadSignatureRef = useRef("");

  const isDemoMode = !student;
  const isFocusMode = Boolean(isFocusedMode);
  const isGroupStudentMode = Boolean(student) && !isFocusMode;

  const isLevelStarted =
    currentWordIndex > 0 || currentStepIndex > 0 || hasInteracted || finished;

  const isLevelLocked = isDemoMode
    ? false
    : isGroupStudentMode
      ? isLevelStarted || finished
      : !finished && isLevelStarted;

  let isRestartDisabled = false;
  if (loading) {
    isRestartDisabled = true;
  } else if (isDemoMode) {
    isRestartDisabled = false;
  } else if (isGroupStudentMode) {
    isRestartDisabled = !allStudentsCompleted;
  } else if (isFocusMode) {
    isRestartDisabled = !finished;
  }

  const restartTitle =
    isGroupStudentMode && finished && !allStudentsCompleted
      ? "En attente que tous les élèves terminent..."
      : allStudentsCompleted && student
        ? "Recommencer et réinitialiser la liste des élèves"
        : "Recommencer avec une nouvelle session";

  const resetSessionState = useCallback((wordsToUse, upToDatePayload = null) => {
    setSessionWords(wordsToUse);
    setUpToDateInfo(upToDatePayload);
    setCurrentWordIndex(0);
    setCurrentStepIndex(0);
    setSelectedChoice("");
    setAttemptCount(0);
    setEliminatedChoices([]);
    setFeedbackBanner(null);
    setHasInteracted(false);
    setFinished(false);
    setFinalScoreOn20(0);
    setWordScoresMap({});
  }, []);

  const loadSessionForLevel = useCallback(
    async (levelKey, forcePractice = false) => {
      const rule = normalizedLevels[levelKey] || normalizedLevels.level1;
      const schoolLevel = rule.schoolLevel || "CE1";
      const targetWordCount = rule.wordCount || 10;
      const maxRevisions = rule.maxRevisionsPerSession || 6;

      // Si des mots sont passés directement dans content.words (ex: test ou config locale)
      if (Array.isArray(parsedContent.words) && parsedContent.words.length > 0) {
        const directWords = parsedContent.words
          .slice(0, targetWordCount)
          .map(normalizeWordEntry);
        resetSessionState(directWords, null);
        return;
      }

      const fallbackPool =
        DEFAULT_VOCABULARY_WORDS[schoolLevel] || DEFAULT_VOCABULARY_WORDS.CE1;
      const fallbackWords = fallbackPool
        .slice(0, targetWordCount)
        .map(normalizeWordEntry);

      // En mode démo sans séquence configurée, initialiser immédiatement les mots par défaut
      // tout en tentant de récupérer une éventuelle séquence active en base
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("level", schoolLevel);
        params.set("wordCount", String(targetWordCount));
        params.set("maxRevisions", String(maxRevisions));
        if (student?.id) {
          params.set("studentId", String(student.id));
        }
        if (parsedContent.sequenceId) {
          params.set("sequenceId", String(parsedContent.sequenceId));
        }
        if (forcePractice) {
          params.set("forcePractice", "true");
        }

        const resp = await fetch(`${API_URL}/vocabulary/session?${params.toString()}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data?.upToDate && !forcePractice) {
            resetSessionState([], {
              nextReviewDate: data.nextReviewDate || null,
              stats: data.stats || null,
            });
            return;
          }
          if (Array.isArray(data?.words) && data.words.length > 0) {
            resetSessionState(data.words.map(normalizeWordEntry), null);
            return;
          }
        }
      } catch {
        // Repli silencieux sur les mots par défaut (ex: hors-ligne ou tests unitaires)
      } finally {
        setLoading(false);
      }

      resetSessionState(fallbackWords, null);
    },
    [normalizedLevels, parsedContent.sequenceId, parsedContent.words, resetSessionState, student?.id]
  );

  const currentLoadSignature = useMemo(() => {
    return JSON.stringify({
      level: currentLevel,
      studentId: student?.id || "demo",
      sequenceId: parsedContent.sequenceId || null,
      wordCount: currentLevelRule.wordCount,
      customWordsCount: Array.isArray(parsedContent.words) ? parsedContent.words.length : 0,
    });
  }, [
    currentLevel,
    currentLevelRule.wordCount,
    parsedContent.sequenceId,
    parsedContent.words,
    student?.id,
  ]);

  useEffect(() => {
    if (finished) {
      return;
    }
    if (lastLoadSignatureRef.current === currentLoadSignature) {
      return;
    }
    lastLoadSignatureRef.current = currentLoadSignature;
    void loadSessionForLevel(currentLevel, false);
  }, [currentLevel, currentLoadSignature, finished, loadSessionForLevel]);

  const currentWord = sessionWords[currentWordIndex] || null;
  const currentWordSteps = useMemo(
    () => (currentWord ? getStepsForWord(currentWord) : ["discovery_card", "sentence1", "sentence2"]),
    [currentWord]
  );
  const currentStepType = currentWordSteps[currentStepIndex] || "discovery_card";

  // Options QCM mélangées pour l'étape courante
  const currentChoices = useMemo(() => {
    if (!currentWord || currentStepType === "discovery_card") {
      return [];
    }
    const pool = sessionWords.map((w) => w.word);
    return shuffleChoices(currentWord.word, currentWord.distractors, pool);
  }, [currentWord, currentStepType, currentWordIndex, currentStepIndex, sessionWords]);

  const totalStepsInSession = useMemo(
    () => sessionWords.reduce((sum, w) => sum + getStepsForWord(w).length, 0),
    [sessionWords]
  );

  const completedStepsCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < currentWordIndex; i += 1) {
      count += getStepsForWord(sessionWords[i]).length;
    }
    return count + currentStepIndex;
  }, [currentWordIndex, currentStepIndex, sessionWords]);

  const progressPercent = useMemo(
    () =>
      calculateVocabularyProgressPercent(
        completedStepsCount,
        totalStepsInSession,
        finished
      ),
    [completedStepsCount, totalStepsInSession, finished]
  );

  const finishSession = useCallback(
    async (updatedScoresMap) => {
      let earnedPoints = 0;
      let maxPoints = 0;
      const resultsForBackend = [];

      sessionWords.forEach((wordObj) => {
        const defaultMax = wordObj.phase === "revision" ? 3 : 2;
        const entry = updatedScoresMap[wordObj.id] || {
          score: 0,
          maxScore: defaultMax,
          errors: 1,
        };
        earnedPoints += Number(entry.score || 0);
        maxPoints += Number(entry.maxScore || defaultMax);
        resultsForBackend.push({
          wordId: wordObj.id,
          sequenceId: wordObj.sequence_id,
          word: wordObj.word,
          phase: wordObj.phase,
          score: Number(entry.score || 0),
          maxScore: Number(entry.maxScore || defaultMax),
          errors: Number(entry.errors || 0),
        });
      });

      const calculatedScoreOn20 =
        maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 20) : 20;

      setFinalScoreOn20(calculatedScoreOn20);
      setFinished(true);

      if (student && !isDemoMode) {
        try {
          await fetch(`${API_URL}/vocabulary/progress/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: student.id,
              results: resultsForBackend,
            }),
          });
        } catch {
          // Ne pas bloquer l'enregistrement du résultat général si hors-ligne
        }

        if (onComplete) {
          const learnedWordsCount = resultsForBackend.filter(
            (r) => r.score >= r.maxScore && r.errors === 0
          ).length;

          onComplete(
            {
              success: calculatedScoreOn20 >= 10,
              score: calculatedScoreOn20,
              levelKey: currentLevel,
              levelLabel: currentLevelRule.label,
              game_state_summary: `${learnedWordsCount}/${sessionWords.length} mots validés sans erreur (${earnedPoints}/${maxPoints} pts)`,
              game_state: JSON.stringify({
                level: currentLevelRule.schoolLevel,
                results: resultsForBackend,
              }),
            },
            {
              levelKey: currentLevel,
              levelLabel: currentLevelRule.label,
            }
          );
        }
      }
    },
    [currentLevel, currentLevelRule, isDemoMode, onComplete, sessionWords, student]
  );

  const advanceToNextStepOrFinish = useCallback(
    (nextScoresMap) => {
      setSelectedChoice("");
      setAttemptCount(0);
      setEliminatedChoices([]);

      if (currentStepIndex + 1 < currentWordSteps.length) {
        setCurrentStepIndex((prev) => prev + 1);
        return;
      }

      if (currentWordIndex + 1 < sessionWords.length) {
        setCurrentWordIndex((prev) => prev + 1);
        setCurrentStepIndex(0);
        return;
      }

      void finishSession(nextScoresMap);
    },
    [
      currentStepIndex,
      currentWordIndex,
      currentWordSteps.length,
      finishSession,
      sessionWords.length,
    ]
  );

  const handleValidate = () => {
    if (finished || !currentWord) return;

    setHasInteracted(true);

    // Étape 0 de Découverte : Carte Découverte -> "J'ai compris, je teste !"
    if (currentStepType === "discovery_card") {
      setFeedbackBanner(null);
      advanceToNextStepOrFinish(wordScoresMap);
      return;
    }

    if (!selectedChoice) return;

    const isCorrect =
      selectedChoice.trim().toLowerCase() === currentWord.word.trim().toLowerCase();
    const defaultMax = currentWord.phase === "revision" ? 3 : 2;
    const prevWordScore = wordScoresMap[currentWord.id] || {
      score: 0,
      maxScore: defaultMax,
      errors: 0,
    };

    if (isCorrect) {
      const pointsEarned = attemptCount === 0 ? 1 : 0.5;
      const nextScoresMap = {
        ...wordScoresMap,
        [currentWord.id]: {
          ...prevWordScore,
          score: prevWordScore.score + pointsEarned,
          maxScore: defaultMax,
        },
      };
      setWordScoresMap(nextScoresMap);

      setFeedbackBanner({
        type: attemptCount === 0 ? "success" : "warning",
        text:
          attemptCount === 0
            ? `✅ Bravo ! « ${currentWord.word} » est la bonne réponse (+1 pt).`
            : `🟠 Bien rattrapé au 2e essai avec « ${currentWord.word} » (+0,5 pt).`,
      });

      advanceToNextStepOrFinish(nextScoresMap);
      return;
    }

    // Mauvaise réponse
    const updatedWithError = {
      ...wordScoresMap,
      [currentWord.id]: {
        ...prevWordScore,
        errors: prevWordScore.errors + 1,
        maxScore: defaultMax,
      },
    };
    setWordScoresMap(updatedWithError);

    if (attemptCount === 0) {
      // Activer la 2e chance sur la même question
      setAttemptCount(1);
      setEliminatedChoices((prev) => [...prev, selectedChoice]);
      setSelectedChoice("");
      setFeedbackBanner({
        type: "error",
        text: `❌ Ce n'est pas « ${selectedChoice} ». Essaie encore, tu as une 2e chance !`,
      });
      return;
    }

    // 2e échec : révéler la bonne réponse et passer à la suite (0 pt)
    setFeedbackBanner({
      type: "error",
      text: `❌ Dommage ! La bonne réponse était « ${currentWord.word} » (0 pt).`,
    });
    advanceToNextStepOrFinish(updatedWithError);
  };

  const handleRestart = () => {
    if (isRestartDisabled) {
      return;
    }
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }
    lastLoadSignatureRef.current = "";
    void loadSessionForLevel(currentLevel, false);
  };

  const handleSelectLevel = (levelKey) => {
    if (
      isLevelLocked ||
      levelKey === currentLevel ||
      !configuredLevelKeys.includes(levelKey)
    ) {
      return;
    }
    setCurrentLevel(levelKey);
  };

  const isAnswerReady =
    !finished &&
    Boolean(currentWord) &&
    (currentStepType === "discovery_card" || Boolean(selectedChoice));

  const resolvedImageSrc = useMemo(() => {
    if (!currentWord) return "";
    if (currentWord.image_url) {
      return resolveVocabularyImageUrl(currentWord.image_url);
    }
    const labelForFallback =
      currentStepType === "definition_qcm" ? "?" : currentWord.word;
    return buildInlineSvgDataUrl(labelForFallback, currentWord.nature);
  }, [currentWord, currentStepType]);

  const currentClozeSentence =
    currentStepType === "sentence1"
      ? currentWord?.sentence1_cloze
      : currentStepType === "sentence2"
        ? currentWord?.sentence2_cloze
        : "";

  const renderClozeWithSelection = (clozeText) => {
    const parts = String(clozeText || "").split("_____");
    if (parts.length <= 1) {
      return <span>{clozeText}</span>;
    }
    return parts.map((part, idx) => (
      <React.Fragment key={idx}>
        <span>{part}</span>
        {idx < parts.length - 1 && (
          <span
            className={`mx-1.5 inline-block min-w-28 rounded-lg border-2 px-3 py-0.5 text-center font-extrabold transition-colors ${selectedChoice
              ? "border-indigo-500 bg-indigo-100 text-indigo-900"
              : "border-dashed border-indigo-400 bg-indigo-50/70 text-indigo-500"
              }`}
          >
            {selectedChoice || "_____"}
          </span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <section
      id="vocabulary-learning-activity"
      className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-2 sm:p-4"
    >
      {/* 1. ActivityHero */}
      <ActivityHero
        idPrefix="vocabulary-learning"
        title={getSafeDisplayText(parsedContent.title, "Apprentissage du vocabulaire")}
        instruction={getSafeDisplayText(
          parsedContent.instruction,
          defaultVocabularyLearningActivityContent.instruction
        )}
        activityContent={parsedContent}
        showBadges={isDemoMode}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(key) => `vocabulary-learning-level-${key}`}
        disableAllLevels={isLevelLocked}
        levels={configuredLevelKeys.map((key) => ({
          key,
          label: normalizedLevels[key].label,
          disabled: isLevelLocked,
        }))}
      />

      {/* 2. ActivityStatus (progression tant que non terminé) */}
      {!finished && sessionWords.length > 0 && (
        <ActivityStatus
          id="vocabulary-learning-status"
          progressBarId="vocabulary-learning-progress-bar"
          progressPercent={progressPercent}
          label={`Mot ${currentWordIndex + 1} sur ${sessionWords.length}`}
        />
      )}

      {/* Feedback immédiat temporaire (affiché dès qu'une réponse est soumise) */}
      {showFeedbackBanner && feedbackBanner && (
        <div
          id="vocabulary-learning-feedback-banner"
          role="status"
          className={`rounded-xl border-2 px-4 py-2.5 text-sm sm:text-base font-extrabold shadow-xs transition-opacity duration-500 ${fadeFeedbackBanner ? "opacity-0" : "opacity-100"
            } ${feedbackBanner.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : feedbackBanner.type === "warning"
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-rose-300 bg-rose-50 text-rose-900"
            }`}
        >
          {feedbackBanner.text}
        </div>
      )}

      {/* 3. Contenu manipulable */}
      {loading ? (
        <div
          id="vocabulary-learning-loading"
          className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-600"
        >
          Chargement des mots de vocabulaire...
        </div>
      ) : upToDateInfo && sessionWords.length === 0 ? (
        <div
          id="vocabulary-learning-up-to-date"
          className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 p-6 text-center space-y-4 shadow-xs"
        >
          <div className="text-4xl">🎉</div>
          <h3 className="text-xl font-extrabold text-emerald-950">
            Bravo, tu es complètement à jour pour aujourd'hui !
          </h3>
          <p className="text-sm sm:text-base font-medium text-emerald-900">
            Tu as découvert tous les mots actifs et aucune révision n'est en retard aujourd'hui.
            {upToDateInfo.nextReviewDate
              ? ` Ta prochaine révision est prévue le ${upToDateInfo.nextReviewDate}.`
              : ""}
          </p>
          <div>
            <button
              id="vocabulary-learning-practice-anyway-button"
              type="button"
              onClick={() => void loadSessionForLevel(currentLevel, true)}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700"
            >
              💪 S'entraîner quand même (révision anticipée)
            </button>
          </div>
        </div>
      ) : !finished && currentWord ? (
        <div
          id="vocabulary-learning-workspace"
          className="rounded-2xl border-2 border-indigo-100 bg-white p-4 sm:p-2 shadow-xs space-y-5"
        >
          {/* En-tête de la carte du mot */}
          <div
            id="vocabulary-learning-workspace-header"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-1 !mbe-0 !mb-0"
            style={{ marginBlockEnd: 0 }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                id="vocabulary-word-counter"
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-extrabold text-indigo-800 border border-indigo-200"
              >
                Mot {currentWordIndex + 1} / {sessionWords.length}
              </span>
              <VocabularyProgressBadge
                id="vocabulary-current-word-badge"
                variant="word"
                stage={currentWord.stage}
                consecutiveSuccesses={currentWord.consecutive_successes}
              />
              {/*<span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {currentStepType === "discovery_card"
                  ? "Étape 1/3 • Découverte du mot"
                  : currentStepType === "definition_qcm"
                    ? "Étape 1/3 • Définition"
                    : currentStepType === "sentence1"
                      ? "Étape 2/3 • Phrase en contexte n°1"
                      : "Étape 3/3 • Phrase en contexte n°2"}
              </span> */}
            </div>

            {attemptCount === 1 && (
              <span
                id="vocabulary-second-chance-indicator"
                className="rounded-full border border-amber-300 bg-amber-100 px-3 py-0.5 text-xs font-extrabold text-amber-900"
              >
                🎯 2e chance (0,5 pt)
              </span>
            )}
          </div>

          {/* ÉTAPE 0 (DÉCOUVERTE) : Carte d'exposition Mot + Image + Définition */}
          {currentStepType === "discovery_card" && (
            <div
              id="vocabulary-discovery-card"
              className="flex flex-col items-center gap-4 text-center py-2"
            >
              {resolvedImageSrc && (
                <img
                  id="vocabulary-discovery-image"
                  src={resolvedImageSrc}
                  alt={currentWord.word}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = buildInlineSvgDataUrl(
                      currentWord.word,
                      currentWord.nature
                    );
                  }}
                  className="h-44 w-64 rounded-2xl border-2 border-indigo-200 object-cover shadow-xs bg-indigo-50"
                />
              )}

              <div className="space-y-1">
                <div
                  id="vocabulary-discovery-word"
                  className="text-2xl sm:text-3xl font-black text-indigo-950"
                >
                  {currentWord.word}
                </div>
                {currentWord.nature && (
                  <span
                    id="vocabulary-discovery-nature"
                    className="inline-block rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-800"
                  >
                    {currentWord.nature}
                  </span>
                )}
              </div>

              <div
                id="vocabulary-discovery-definition"
                className="max-w-xl rounded-2xl border border-indigo-200 bg-indigo-50/70 px-5 py-3.5 text-base sm:text-lg font-semibold text-slate-800"
              >
                « {currentWord.definition} »
              </div>
            </div>
          )}

          {/* ÉTAPE 1 (RÉVISION) : Image + Définition -> Trouver le mot en QCM */}
          {currentStepType === "definition_qcm" && (
            <div
              id="vocabulary-definition-qcm-step"
              className="flex flex-col items-center gap-4 text-center"
            >
              {resolvedImageSrc && (
                <img
                  id="vocabulary-revision-image"
                  src={resolvedImageSrc}
                  alt="Illustration indice"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = buildInlineSvgDataUrl("?", currentWord.nature);
                  }}
                  className="h-40 w-60 rounded-2xl border-2 border-indigo-200 object-cover shadow-xs bg-indigo-50"
                />
              )}

              <div className="space-y-2 max-w-xl">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-indigo-700">
                  Quel mot correspond à cette définition ?
                </p>
                <div
                  id="vocabulary-revision-definition-prompt"
                  className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 px-5 py-3.5 text-base sm:text-lg font-bold text-slate-900"
                >
                  « {currentWord.definition} »
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPES PHRASE 1 & PHRASE 2 À TROUS */}
          {(currentStepType === "sentence1" || currentStepType === "sentence2") && (
            <div
              id={`vocabulary-sentence-step-${currentStepType}`}
              className="flex flex-col items-center gap-4 text-center py-2"
            >
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-indigo-700">
                Clique sur le mot qui complète correctement la phrase :
              </p>

              <div
                id="vocabulary-cloze-sentence-display"
                className="w-full max-w-2xl rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-lg sm:text-2xl font-bold leading-relaxed text-slate-900"
              >
                {renderClozeWithSelection(currentClozeSentence)}
              </div>
            </div>
          )}

          {/* BOUTONS DE CHOIX QCM (3 propositions) */}
          {currentStepType !== "discovery_card" && (
            <div
              id="vocabulary-qcm-choices"
              className="grid gap-3 sm:grid-cols-3 pt-2"
            >
              {currentChoices.map((choice, idx) => {
                const isSelected = selectedChoice === choice;
                const isEliminated = eliminatedChoices.includes(choice);

                return (
                  <button
                    key={`${choice}-${idx}`}
                    id={`vocabulary-choice-button-${idx}`}
                    type="button"
                    disabled={isEliminated}
                    onClick={() => {
                      setHasInteracted(true);
                      setSelectedChoice(choice);
                    }}
                    className={`rounded-2xl border-2 px-4 py-3.5 text-base sm:text-lg font-extrabold transition-all ${isEliminated
                      ? "cursor-not-allowed border-rose-300 bg-rose-50 text-rose-400 line-through opacity-70"
                      : isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-md scale-[1.02]"
                        : "border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50"
                      }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* 4. ActivitySummaryCard (affiché en fin de session) */}
      {finished && (
        <div id="vocabulary-learning-summary-wrapper" className="space-y-4">
          <ActivitySummaryCard
            id="vocabulary-learning-summary-card"
            score={finalScoreOn20}
            scoreMax={20}
            tone={finalScoreOn20 >= 10 ? "success" : "error"}
            title="Session de vocabulaire terminée !"
          />

          <div
            id="vocabulary-learning-words-recap"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5"
          >
            <h4 className="text-sm font-extrabold text-slate-800">
              📋 Bilan de tes mots sur cette session :
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {sessionWords.map((w) => {
                const maxPts = w.phase === "revision" ? 3 : 2;
                const res = wordScoresMap[w.id] || { score: 0, maxScore: maxPts, errors: 1 };
                const isPerfect = res.score >= maxPts && res.errors === 0;
                const nextConsecutive =
                  w.phase === "revision"
                    ? isPerfect
                      ? Number(w.consecutive_successes || 0) + 1
                      : 0
                    : 0;
                const nextStage = isPerfect
                  ? nextConsecutive >= 3
                    ? "mastered"
                    : "reviewing"
                  : w.phase === "revision"
                    ? "reviewing"
                    : "learning";

                return (
                  <div
                    key={w.id}
                    id={`vocabulary-recap-word-${w.id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm"
                  >
                    <div>
                      <span className="font-extrabold text-slate-900">{w.word}</span>
                      <span className="ml-2 text-xs text-slate-600">
                        ({res.score} / {maxPts} pts)
                      </span>
                    </div>
                    <VocabularyProgressBadge
                      variant="word"
                      stage={nextStage}
                      consecutiveSuccesses={nextConsecutive}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. ActivityActionsBar — Toujours en dernier tout en bas */}
      <ActivityActionsBar
        id="vocabulary-learning-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          {
            id: "vocabulary-learning-validate-button",
            onClick: handleValidate,
            disabled: finished || !isAnswerReady,
            ariaLabel: "Valider",
            title:
              currentStepType === "discovery_card"
                ? "Passer aux phrases"
                : "Valider ma réponse",
            icon: "✓",
            srText: "Valider",
            variant: "validate",
          },
          {
            id: "vocabulary-learning-restart-button",
            onClick: handleRestart,
            disabled: isRestartDisabled,
            ariaLabel: "Recommencer",
            title: restartTitle,
            icon: "↻",
            srText: "Recommencer",
            variant: allStudentsCompleted ? "warning" : "restart",
          },
        ]}
      />
    </section>
  );
};

export default VocabularyLearningActivity;
