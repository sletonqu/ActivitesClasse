import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import CharacterSprite from "../components/CharacterSprite";
import { API_URL } from "../config/api";
import {
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
  parsePositiveInt,
} from "./activityUtils";

export const defaultSentenceWordClassificationActivityContent = {
  title: "Classification des mots d'une phrase",
  instruction:
    "Lis chaque phrase puis classe les mots demandés dans la bonne catégorie grammaticale.",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      sentenceCount: 1,
      sourceLevel: "CE1",
      sourceTheme: "",
      requiredNatures: ["nom", "verbe"],
    },
    level2: {
      label: "Niveau 2",
      sentenceCount: 2,
      sourceLevel: "CE1",
      sourceTheme: "",
      requiredNatures: ["nom", "verbe", "determinant"],
    },
    level3: {
      label: "Niveau 3",
      sentenceCount: 3,
      sourceLevel: "CE1",
      sourceTheme: "",
      requiredNatures: ["nom", "verbe", "pronom", "adjectif"],
    },
  },
};

const ALLOWED_LEVEL_KEYS = ["level1", "level2", "level3"];

const DEFAULT_CATEGORY_THEME = {
  badge: "bg-slate-100 text-slate-800",
  panel: "border-slate-200 bg-slate-50",
  activePanel: "border-slate-400 bg-slate-100 shadow-sm",
  title: "text-slate-900",
};

const CATEGORY_THEME_BY_KEY = {
  nom: {
    badge: "bg-indigo-100 text-indigo-800",
    panel: "border-indigo-200 bg-indigo-50/70",
    activePanel: "border-indigo-400 bg-indigo-50 shadow-sm",
    title: "text-indigo-900",
  },
  verbe: {
    badge: "bg-red-100 text-red-800",
    panel: "border-red-200 bg-red-50/70",
    activePanel: "border-red-400 bg-red-50 shadow-sm",
    title: "text-red-900",
  },
  adjectif: {
    badge: "bg-amber-100 text-amber-800",
    panel: "border-amber-200 bg-amber-50/70",
    activePanel: "border-amber-400 bg-amber-50 shadow-sm",
    title: "text-amber-900",
  },
  pronom: {
    badge: "bg-fuchsia-100 text-fuchsia-800",
    panel: "border-fuchsia-200 bg-fuchsia-50/70",
    activePanel: "border-fuchsia-400 bg-fuchsia-50 shadow-sm",
    title: "text-fuchsia-900",
  },
  determinant: {
    badge: "bg-emerald-100 text-emerald-800",
    panel: "border-emerald-200 bg-emerald-50/70",
    activePanel: "border-emerald-400 bg-emerald-50 shadow-sm",
    title: "text-emerald-900",
  },
  autres: {
    badge: "bg-slate-100 text-slate-800",
    panel: "border-slate-200 bg-slate-50",
    activePanel: "border-slate-400 bg-slate-100 shadow-sm",
    title: "text-slate-900",
  },
};

const CATEGORY_KEY_ALIASES = {
  noms: "nom",
  "nomcommun": "nom",
  "nomscommuns": "nom",
  "nompropre": "nom",
  "nomspropres": "nom",
  verbes: "verbe",
  adjectifs: "adjectif",
  "adjectifqualificatif": "adjectif",
  "adjectifsqualificatifs": "adjectif",
  pronoms: "pronom",
  "pronompersonnel": "pronom",
  "pronompersonnels": "pronom",
  "pronomdemonstratif": "pronom",
  "pronomdemonstratifs": "pronom",
  "pronomrelatif": "pronom",
  "pronomrelatifs": "pronom",
  "pronomindefini": "pronom",
  "pronomindefinis": "pronom",
  "pronominterrogatif": "pronom",
  "pronominterrogatifs": "pronom",
  "pronompossessif": "pronom",
  "pronompossessifs": "pronom",
  determinant: "determinant",
  determinants: "determinant",
  "déterminant": "determinant",
  "déterminants": "determinant",
  "determinantdefini": "determinant",
  "determinantindefini": "determinant",
  "determinantpossessif": "determinant",
  "determinantdemonstratif": "determinant",
  autre: "autres",
};

const CATEGORY_DISPLAY_LABELS = {
  nom: "Nom",
  verbe: "Verbe",
  adjectif: "Adjectif",
  pronom: "Pronom",
  determinant: "Déterminant",
  autres: "Autres",
};

const CATEGORY_SPRITE_IMAGE_BY_KEY = {
  nom: "/images/Nom.png",
  verbe: "/images/Verbe.png",
  adjectif: "/images/Adjectif.png",
  pronom: "/images/PronomPersonnel.png",
  determinant: "/images/Déterminant.png",
};

function normalizeCategoryKey(value) {
  const normalizedValue = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  return CATEGORY_KEY_ALIASES[normalizedValue] || normalizedValue;
}

function formatCategoryLabel(value) {
  const key = normalizeCategoryKey(value);
  if (CATEGORY_DISPLAY_LABELS[key]) {
    return CATEGORY_DISPLAY_LABELS[key];
  }

  const label = String(value || "").trim();
  if (!label) {
    return "Autres";
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getCategoryTheme(categoryLabel) {
  return CATEGORY_THEME_BY_KEY[normalizeCategoryKey(categoryLabel)] || DEFAULT_CATEGORY_THEME;
}

function resolveSpriteImageByCategory(categoryLabel) {
  const categoryKey = normalizeCategoryKey(categoryLabel);
  return CATEGORY_SPRITE_IMAGE_BY_KEY[categoryKey] || null;
}

function normalizeRequiredNatures(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  const uniqueByKey = new Map();

  source.forEach((item) => {
    const key = normalizeCategoryKey(item);
    if (!key || uniqueByKey.has(key)) {
      return;
    }

    uniqueByKey.set(key, key);
  });

  return Array.from(uniqueByKey.values());
}

function normalizeSourceLevel(value, fallback = "") {
  const nextValue = String(value || fallback || "").trim().toUpperCase();
  return nextValue === "CE1" || nextValue === "CE2" ? nextValue : "";
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};
  const sentenceCount = Math.max(1, parsePositiveInt(source.sentenceCount, fallbackRule.sentenceCount));
  const requiredNatures = normalizeRequiredNatures(
    source.requiredNatures,
    fallbackRule.requiredNatures
  );

  return {
    label: getSafeDisplayText(source.label, fallbackRule.label),
    sentenceCount,
    sourceLevel: normalizeSourceLevel(source.sourceLevel, fallbackRule.sourceLevel),
    sourceTheme: getSafeDisplayText(source.sourceTheme, fallbackRule.sourceTheme),
    requiredNatures: requiredNatures.length > 0 ? requiredNatures : normalizeRequiredNatures(["nom", "verbe"]),
  };
}

function buildEmptyMistakes(classifications) {
  return classifications.reduce((accumulator, label) => {
    accumulator[normalizeCategoryKey(label)] = [];
    return accumulator;
  }, {});
}

function isPunctuationEntry(item) {
  const word = String(item?.word || "").trim();
  const nature = normalizeCategoryKey(item?.nature);

  return !word || nature === "ponctuation" || !/[A-Za-zÀ-ÿ0-9]/.test(word);
}

function tokenizeSentence(sentence) {
  const tokens = String(sentence || "").match(/\p{L}+(?:['’\-]\p{L}+)*|\p{N}+|[^\s]/gu);
  return Array.isArray(tokens) ? tokens.map((token) => token.trim()).filter(Boolean) : [];
}

function buildWordsFromSentence(entry) {
  if (Array.isArray(entry?.words) && entry.words.length > 0) {
    return entry.words;
  }

  return tokenizeSentence(entry?.sentence).map((word, index) => ({
    position: index + 1,
    word,
    nature: isPunctuationEntry({ word }) ? "ponctuation" : "autres",
    category: isPunctuationEntry({ word }) ? "ponctuation" : "autres",
  }));
}

function findMatchingCategoryForNature(nature, requiredNatures) {
  const normalizedNature = normalizeCategoryKey(nature);
  if (!normalizedNature) {
    return "";
  }

  return requiredNatures.find((requiredNature) => {
    const requiredKey = normalizeCategoryKey(requiredNature);
    return normalizedNature === requiredKey;
  }) || "";
}

function buildSentenceRound(sentenceEntry, index, requiredNatures) {
  const words = buildWordsFromSentence(sentenceEntry);
  const displayTokens = [];
  const wordsToClassify = [];

  words.forEach((item, itemIndex) => {
    const word = String(item?.word || "").trim();
    if (!word) {
      return;
    }

    const isPunctuation = isPunctuationEntry(item);
    const matchingCategory = isPunctuation ? "" : findMatchingCategoryForNature(item?.nature, requiredNatures);
    const runtimeId = `${sentenceEntry?.id || `phrase-${index + 1}`}-word-${itemIndex}`;

    displayTokens.push({
      id: `${sentenceEntry?.id || `phrase-${index + 1}`}-token-${itemIndex}`,
      runtimeId: matchingCategory ? runtimeId : "",
      text: word,
      isClassifiable: Boolean(matchingCategory),
      categoryKey: matchingCategory,
    });

    if (matchingCategory) {
      wordsToClassify.push({
        runtimeId,
        word,
        categoryKey: matchingCategory,
        nature: String(item?.nature || "").trim(),
      });
    }
  });

  return {
    id: sentenceEntry?.id || `phrase-${index + 1}`,
    sentenceText: getSafeDisplayText(sentenceEntry?.sentence, displayTokens.map((token) => token.text).join(" ")),
    displayTokens,
    wordsToClassify,
  };
}

const SentenceWordClassificationActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultSentenceWordClassificationActivityContent.levels;

  const configuredLevels = useMemo(
    () => ({
      level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
      level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
      level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
    }),
    [parsedContent]
  );

  const initialLevel = ALLOWED_LEVEL_KEYS.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [loadingSentences, setLoadingSentences] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [sentenceRounds, setSentenceRounds] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentWords, setCurrentWords] = useState([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakesByCategory, setMistakesByCategory] = useState(
    buildEmptyMistakes(configuredLevels[initialLevel]?.requiredNatures || [])
  );
  const [draggedWordId, setDraggedWordId] = useState(null);
  const [selectedWordId, setSelectedWordId] = useState("");
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const requestIdRef = useRef(0);

  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const currentSentence = sentenceRounds[currentSentenceIndex] || null;
  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const totalClassifiableWords = useMemo(
    () => sentenceRounds.reduce((total, sentence) => total + sentence.wordsToClassify.length, 0),
    [sentenceRounds]
  );
  const progressPercent = totalClassifiableWords > 0
    ? Math.round((processedCount / totalClassifiableWords) * 100)
    : 0;
  const selectedWord = currentWords.find((word) => word.runtimeId === selectedWordId) || null;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultSentenceWordClassificationActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultSentenceWordClassificationActivityContent.instruction
  );
  const spritePositionByCategory = useMemo(() => {
    return currentLevelRule.requiredNatures.reduce((accumulator, categoryLabel) => {
      const categoryKey = normalizeCategoryKey(categoryLabel);
      accumulator[categoryKey] = Math.floor(Math.random() * 9);
      return accumulator;
    }, {});
  }, [currentLevelRule.requiredNatures]);

  const resetWithSentences = useCallback((sentences, levelRule) => {
    const preparedSentences = sentences
      .map((sentence, index) => buildSentenceRound(sentence, index, levelRule.requiredNatures))
      .filter((sentence) => sentence.wordsToClassify.length > 0);

    if (preparedSentences.length === 0) {
      throw new Error("Aucune phrase ne contient les mots à classer demandés.");
    }

    setSentenceRounds(preparedSentences);
    setCurrentSentenceIndex(0);
    setCurrentWords(preparedSentences[0].wordsToClassify);
    setProcessedCount(0);
    setCorrectCount(0);
    setMistakesByCategory(buildEmptyMistakes(levelRule.requiredNatures));
    setDraggedWordId(null);
    setSelectedWordId("");
    setFinished(false);
    setScore(null);
  }, []);

  const loadSentencesForLevel = useCallback(async (levelKey) => {
    const levelRule = configuredLevels[levelKey] || configuredLevels.level1;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoadingSentences(true);
    setLoadingError("");
    setFinished(false);
    setScore(null);

    try {
      const params = new URLSearchParams({
        count: String(levelRule.sentenceCount),
      });

      if (levelRule.sourceLevel) {
        params.set("level", levelRule.sourceLevel);
      }
      if (levelRule.sourceTheme) {
        params.set("theme", levelRule.sourceTheme);
      }
      if (levelRule.requiredNatures.length > 0) {
        params.set("requiredNatures", levelRule.requiredNatures.join(","));
      }

      const response = await fetch(`${API_URL}/ai/generated-sentences/practice?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement des phrases");
      }

      const nextSentences = Array.isArray(data?.sentences) ? data.sentences : [];
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (nextSentences.length === 0) {
        throw new Error("Aucune phrase n'est disponible pour ces paramètres.");
      }

      resetWithSentences(nextSentences, levelRule);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSentenceRounds([]);
      setCurrentSentenceIndex(0);
      setCurrentWords([]);
      setProcessedCount(0);
      setCorrectCount(0);
      setMistakesByCategory(buildEmptyMistakes(levelRule.requiredNatures));
      setDraggedWordId(null);
      setSelectedWordId("");
      setFinished(false);
      setScore(null);
      setLoadingError(err.message || "Erreur inconnue");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingSentences(false);
      }
    }
  }, [configuredLevels, resetWithSentences]);

  useEffect(() => {
    setCurrentLevel(initialLevel);
  }, [initialLevel]);

  useEffect(() => {
    loadSentencesForLevel(currentLevel);
  }, [currentLevel]);

  const finishActivity = (nextCorrectCount, nextMistakes) => {
    const finalScore = Math.round((nextCorrectCount / Math.max(1, totalClassifiableWords)) * 20);
    setFinished(true);
    setScore(finalScore);
    setMistakesByCategory(nextMistakes);

    if (onComplete) {
      onComplete(finalScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
      });
    }
  };

  const moveToNextSentenceOrFinish = (nextCorrectCount, nextMistakes) => {
    const nextSentenceIndex = currentSentenceIndex + 1;

    if (nextSentenceIndex < sentenceRounds.length) {
      setCurrentSentenceIndex(nextSentenceIndex);
      setCurrentWords(sentenceRounds[nextSentenceIndex].wordsToClassify);
      return;
    }

    setCurrentWords([]);
    finishActivity(nextCorrectCount, nextMistakes);
  };

  const classifyWord = (targetCategoryLabel, runtimeId) => {
    if (loadingSentences || finished) {
      return;
    }

    const wordIndex = currentWords.findIndex((word) => word.runtimeId === runtimeId);
    if (wordIndex === -1) {
      return;
    }

    const word = currentWords[wordIndex];
    const targetKey = normalizeCategoryKey(targetCategoryLabel);
    const isCorrect = targetKey === word.categoryKey;
    const nextWords = currentWords.slice();
    nextWords.splice(wordIndex, 1);

    const nextProcessedCount = processedCount + 1;
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextMistakes = { ...mistakesByCategory };

    if (!isCorrect) {
      nextMistakes[targetKey] = [
        ...(nextMistakes[targetKey] || []),
        {
          id: word.runtimeId,
          word: word.word,
          expectedCategory: formatCategoryLabel(word.categoryKey),
        },
      ];
    }

    setProcessedCount(nextProcessedCount);
    setCorrectCount(nextCorrectCount);
    setMistakesByCategory(nextMistakes);
    setDraggedWordId(null);
    setSelectedWordId("");

    if (nextWords.length > 0) {
      setCurrentWords(nextWords);
      return;
    }

    moveToNextSentenceOrFinish(nextCorrectCount, nextMistakes);
  };

  const handleDragStart = (runtimeId) => {
    if (loadingSentences || finished) {
      return;
    }

    setDraggedWordId(runtimeId);
    setSelectedWordId(runtimeId);
  };

  const handleWordClick = (runtimeId) => {
    if (loadingSentences || finished) {
      return;
    }

    setSelectedWordId((previousValue) => {
      const nextValue = previousValue === runtimeId ? "" : runtimeId;
      setDraggedWordId(nextValue || null);
      return nextValue;
    });
  };

  const handleCategoryDrop = (event, categoryLabel) => {
    event.preventDefault();
    const activeWordId = draggedWordId || selectedWordId;
    if (!activeWordId) {
      return;
    }

    classifyWord(categoryLabel, activeWordId);
  };

  const handleCategoryClick = (categoryLabel) => {
    if (!selectedWordId) {
      return;
    }

    classifyWord(categoryLabel, selectedWordId);
  };

  const handleSelectLevel = (levelKey) => {
    if (loadingSentences) {
      return;
    }

    setCurrentLevel(levelKey);
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }

    loadSentencesForLevel(currentLevel);
  };

  return (
    <div id="sentence-word-classification-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="sentence-word-classification"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={currentLevelRule.requiredNatures.map((categoryLabel) => {
          const theme = getCategoryTheme(categoryLabel);
          return {
            key: `badge-${categoryLabel}`,
            label: formatCategoryLabel(categoryLabel),
            className: `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`,
          };
        })}
        badgesId="sentence-word-classification-current-categories"
        levels={ALLOWED_LEVEL_KEYS.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
          disabled: loadingSentences,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `sentence-word-classification-level-${levelKey}`}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="sentence-word-classification-status-panel"
          progressBarId="sentence-word-classification-progress-bar"
          progressPercent={progressPercent}
          label="Progression du classement des mots dans les phrases"
        />
      )}

      {loadingSentences ? (
        <div id="sentence-word-classification-loading" className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-800 sm:p-4">
          Chargement des phrases à analyser...
        </div>
      ) : loadingError ? (
        <div id="sentence-word-classification-error" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700 sm:p-4">
          {loadingError}
        </div>
      ) : (
        <>
          {!finished && currentSentence && (
            <section id="sentence-word-pool-section" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">Phrase et mots à classer</h4>
                    <p className="text-sm text-slate-500">
                      Phrase {currentSentenceIndex + 1} sur {sentenceRounds.length}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    {selectedWord ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                        Mot sélectionné : {selectedWord.word}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        Sélectionne un mot dans la phrase
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4">
                <div id="sentence-word-current-sentence" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 sm:px-4">

                  <div id="sentence-word-pool" className="flex flex-wrap items-center justify-center gap-2 text-base sm:text-lg">
                    {currentSentence.displayTokens.map((token, index) => {
                      const pendingWord = token.runtimeId
                        ? currentWords.find((word) => word.runtimeId === token.runtimeId)
                        : null;
                      const isSelected = Boolean(token.runtimeId) && selectedWordId === token.runtimeId;

                      if (pendingWord) {
                        return (
                          <button
                            key={token.id}
                            id={`sentence-word-classification-word-${index}`}
                            type="button"
                            draggable={!finished}
                            onDragStart={() => handleDragStart(pendingWord.runtimeId)}
                            onDragEnd={() => setDraggedWordId(null)}
                            onClick={() => handleWordClick(pendingWord.runtimeId)}
                            className={`rounded-xl border-2 bg-white px-2.5 py-1.5 text-center font-semibold text-slate-800 shadow-sm select-none transition-all ${
                              isSelected
                                ? "border-slate-500 ring-4 ring-slate-200"
                                : "border-slate-200 hover:border-slate-300"
                            } ${finished ? "cursor-default" : "cursor-move"}`}
                          >
                            <span className="block text-sm font-bold text-slate-800 sm:text-base">{token.text}</span>
                          </button>
                        );
                      }

                      return (
                        <span
                          key={token.id}
                          className={`rounded-xl border px-2.5 py-1 text-slate-700 ${
                            token.isClassifiable
                              ? "border-slate-200 bg-white font-semibold opacity-75"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          {token.text}
                        </span>
                      );
                    })}
                  </div>

                  {currentWords.length === 0 && (
                    <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-slate-500">
                      Tous les mots de cette phrase ont été classés.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <div
            id="word-classification-categories"
            className={`grid w-full grid-flow-col overflow-x-auto pb-1 ${
              student ? "auto-cols-[minmax(0,1fr)] gap-2" : "auto-cols-[minmax(170px,1fr)] gap-2.5"
            }`}
          >
            {currentLevelRule.requiredNatures.map((categoryLabel) => {
              const categoryKey = normalizeCategoryKey(categoryLabel);
              const formattedCategoryLabel = formatCategoryLabel(categoryLabel);
              const mistakes = mistakesByCategory[categoryKey] || [];
              const theme = getCategoryTheme(categoryLabel);
              const spriteImage = resolveSpriteImageByCategory(categoryLabel);

              return (
                <section
                  key={categoryKey}
                  id={`sentence-word-classification-category-${categoryKey}`}
                  className={`rounded-2xl border-2 transition-all ${
                    student ? "min-h-[84px] p-1.5 sm:min-h-[96px] sm:p-2" : "min-h-[120px] p-2.5 sm:min-h-[144px] sm:p-3"
                  } ${selectedWordId && !finished ? theme.activePanel : theme.panel} ${
                    finished ? "" : "flex items-center justify-center"
                  }`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleCategoryDrop(event, categoryLabel)}
                  onClick={() => handleCategoryClick(categoryLabel)}
                >
                  <div className={`relative ${finished ? "min-h-[52px]" : "w-full"}`}>
                    {finished && mistakes.length > 0 && (
                      <span className="absolute right-0 top-0 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        {mistakes.length} erreur{mistakes.length > 1 ? "s" : ""}
                      </span>
                    )}

                    <div className="flex min-w-0 justify-center text-center">
                      <span
                        title={formattedCategoryLabel}
                        aria-label={formattedCategoryLabel}
                        className={`inline-flex items-center justify-center rounded-full shadow-sm ${
                          student
                            ? `w-full px-3 py-2 sm:px-4 sm:py-3 ${theme.badge}`
                            : `px-4 py-3 sm:px-5 sm:py-4 ${theme.badge}`
                        }`}
                      >
                        {spriteImage && (
                          <CharacterSprite
                            id={`sentence-word-classification-category-sprite-${categoryKey}`}
                            src={spriteImage}
                            position={spritePositionByCategory[categoryKey] ?? 0}
                            columns={3}
                            rows={3}
                            size={student ? 56 : 84}
                            alt={`Personnage ${formattedCategoryLabel}`}
                            className="shrink-0"
                          />
                        )}
                        <span className="sr-only">{formattedCategoryLabel}</span>
                      </span>
                    </div>
                  </div>

                  {finished && mistakes.length > 0 && (
                    <div id={`sentence-word-classification-errors-${categoryKey}`} className="mt-3">
                      <ul className="space-y-2 text-sm">
                        {mistakes.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-rose-800 shadow-sm"
                          >
                            <span className="font-semibold">{item.word}</span>
                            <span className="mt-1 block text-xs">Catégorie attendue : {item.expectedCategory}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {finished && mistakes.length === 0 && (
                    <div className="mt-3 flex justify-center">
                      <span
                        aria-label="Correct"
                        title="Correct"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700"
                      >
                        ✓
                      </span>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      {finished && (
        <ActivitySummaryCard
          id="sentence-word-classification-summary"
          title="Activité terminée"
          score={score}
          message="Toutes les phrases ont été analysées."
          stats={[
            { key: "correct", label: "Mots bien classés", value: correctCount },
            { key: "total", label: "Mots à classer", value: totalClassifiableWords },
            { key: "sentences", label: "Phrases traitées", value: sentenceRounds.length },
          ]}
        />
      )}

      <ActivityActionsBar
        id="sentence-word-classification-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          {
            id: "sentence-word-classification-restart-button",
            onClick: handleRestart,
            disabled: loadingSentences || restartLocked,
            ariaLabel: "Recommencer avec d'autres phrases",
            title: "Recommencer avec d'autres phrases",
            icon: "↻",
            srText: "Recommencer avec d'autres phrases",
            variant: allStudentsCompleted ? "warning" : "restart",
          },
        ]}
      />
    </div>
  );
};

export default SentenceWordClassificationActivity;
