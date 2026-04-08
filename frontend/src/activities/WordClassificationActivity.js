import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "../config/api";

export const defaultWordClassificationActivityContent = {
  title: "Classe les mots dans la bonne catégorie",
  instruction:
    "Fais glisser chaque mot dans la bonne catégorie. Tu peux aussi cliquer sur un mot puis sur sa catégorie.",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      totalWords: 10,
      wordsPerRound: 3,
      maxWordLevel: 2,
      classifications: ["nom", "verbe"],
    },
    level2: {
      label: "Niveau 2",
      totalWords: 12,
      wordsPerRound: 3,
      maxWordLevel: 4,
      classifications: ["nom", "adjectif"],
    },
    level3: {
      label: "Niveau 3",
      totalWords: 15,
      wordsPerRound: 4,
      maxWordLevel: 6,
      classifications: ["nom", "adjectif", "pronom"],
    },
  },
};

const ALLOWED_LEVEL_KEYS = ["level1", "level2", "level3"];

const TILE_ROTATION_MIN_DEGREES = -10;
const TILE_ROTATION_MAX_DEGREES = 10;

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
    badge: "bg-emerald-100 text-emerald-800",
    panel: "border-emerald-200 bg-emerald-50/70",
    activePanel: "border-emerald-400 bg-emerald-50 shadow-sm",
    title: "text-emerald-900",
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
    badge: "bg-cyan-100 text-cyan-800",
    panel: "border-cyan-200 bg-cyan-50/70",
    activePanel: "border-cyan-400 bg-cyan-50 shadow-sm",
    title: "text-cyan-900",
  },
  autres: {
    badge: "bg-slate-100 text-slate-800",
    panel: "border-slate-200 bg-slate-50",
    activePanel: "border-slate-400 bg-slate-100 shadow-sm",
    title: "text-slate-900",
  },
};

function getCategoryTheme(categoryLabel) {
  return CATEGORY_THEME_BY_KEY[normalizeCategoryKey(categoryLabel)] || DEFAULT_CATEGORY_THEME;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function randomRotation() {
  const rotationRange = TILE_ROTATION_MAX_DEGREES - TILE_ROTATION_MIN_DEGREES;
  return Math.round((Math.random() * rotationRange + TILE_ROTATION_MIN_DEGREES) * 10) / 10;
}

function normalizeCategoryKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatCategoryLabel(value) {
  const label = String(value || "").trim();
  if (!label) {
    return "Autres";
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getSafeDisplayText(value, fallback) {
  const text = String(value || "").trim();
  if (!text || text.includes("�")) {
    return fallback;
  }
  return text;
}

function parseActivityContent(rawContent) {
  if (!rawContent) {
    return {};
  }

  if (typeof rawContent === "string") {
    try {
      return JSON.parse(rawContent);
    } catch {
      return {};
    }
  }

  return typeof rawContent === "object" ? rawContent : {};
}

function normalizeClassifications(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  const uniqueByKey = new Map();

  source.forEach((item) => {
    const label = String(item || "").trim();
    const key = normalizeCategoryKey(label);
    if (!label || !key || uniqueByKey.has(key)) {
      return;
    }
    uniqueByKey.set(key, label);
  });

  return Array.from(uniqueByKey.values());
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};

  const fallbackTotalWords = parsePositiveInt(fallbackRule.totalWords, 10);
  const totalWords = parsePositiveInt(source.totalWords, fallbackTotalWords);
  const wordsPerRound = Math.min(
    parsePositiveInt(source.wordsPerRound, fallbackRule.wordsPerRound),
    totalWords
  );
  const maxWordLevel = parsePositiveInt(source.maxWordLevel, fallbackRule.maxWordLevel);
  const classifications = normalizeClassifications(
    source.classifications,
    fallbackRule.classifications
  );

  return {
    label: source.label || fallbackRule.label,
    totalWords,
    wordsPerRound,
    maxWordLevel,
    classifications:
      classifications.length > 0
        ? classifications
        : normalizeClassifications(fallbackRule.classifications, ["nom", "verbe"]),
  };
}

function buildEmptyMistakes(classifications) {
  return classifications.reduce((accumulator, label) => {
    accumulator[normalizeCategoryKey(label)] = [];
    return accumulator;
  }, {});
}

const WordClassificationActivity = ({ student, content, onComplete }) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultWordClassificationActivityContent.levels;

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
  const [loadingWords, setLoadingWords] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [visibleWords, setVisibleWords] = useState([]);
  const [remainingWords, setRemainingWords] = useState([]);
  const [loadedWordsCount, setLoadedWordsCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakesByCategory, setMistakesByCategory] = useState(
    buildEmptyMistakes(configuredLevels[initialLevel]?.classifications || [])
  );
  const [draggedWordId, setDraggedWordId] = useState(null);
  const [selectedWordId, setSelectedWordId] = useState("");
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const requestIdRef = useRef(0);

  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const restartLocked = Boolean(student) && finished;
  const answeredCount = Math.max(0, loadedWordsCount - visibleWords.length - remainingWords.length);
  const remainingCount = visibleWords.length + remainingWords.length;
  const progressPercent = loadedWordsCount > 0 ? Math.round((answeredCount / loadedWordsCount) * 100) : 0;
  const selectedWord = visibleWords.find((word) => word.runtimeId === selectedWordId) || null;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultWordClassificationActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultWordClassificationActivityContent.instruction
  );

  const resetWithWords = useCallback((words, levelRule) => {
    const preparedWords = words.map((word, index) => ({
      ...word,
      runtimeId: `${word.id || "word"}-${index}-${Math.random().toString(36).slice(2, 9)}`,
      rotation: randomRotation(),
    }));

    const wordsPerRound = Math.min(levelRule.wordsPerRound, preparedWords.length);
    setVisibleWords(preparedWords.slice(0, wordsPerRound));
    setRemainingWords(preparedWords.slice(wordsPerRound));
    setLoadedWordsCount(preparedWords.length);
    setCorrectCount(0);
    setMistakesByCategory(buildEmptyMistakes(levelRule.classifications));
    setDraggedWordId(null);
    setSelectedWordId("");
    setFinished(false);
    setScore(null);
  }, []);

  const loadWordsForLevel = useCallback(async (levelKey) => {
    const levelRule = configuredLevels[levelKey] || configuredLevels.level1;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoadingWords(true);
    setLoadingError("");
    setFinished(false);
    setScore(null);

    try {
      const params = new URLSearchParams({
        limit: String(levelRule.totalWords),
        maxLevel: String(levelRule.maxWordLevel),
        categories: levelRule.classifications.join(","),
      });

      const response = await fetch(`${API_URL}/words/random?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement des mots");
      }

      const words = Array.isArray(data?.words) ? data.words : [];
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (words.length === 0) {
        throw new Error("Aucun mot disponible pour ces paramètres.");
      }

      resetWithWords(words, levelRule);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setVisibleWords([]);
      setRemainingWords([]);
      setLoadedWordsCount(0);
      setCorrectCount(0);
      setMistakesByCategory(buildEmptyMistakes(levelRule.classifications));
      setDraggedWordId(null);
      setSelectedWordId("");
      setFinished(false);
      setScore(null);
      setLoadingError(err.message || "Erreur inconnue");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingWords(false);
      }
    }
  }, [configuredLevels, resetWithWords]);

  useEffect(() => {
    setCurrentLevel(initialLevel);
    loadWordsForLevel(initialLevel);
  }, [initialLevel, loadWordsForLevel]);

  const completeActivityIfNeeded = (nextVisibleWords, nextRemainingWords, nextCorrectCount, nextMistakes) => {
    if (nextVisibleWords.length > 0 || nextRemainingWords.length > 0) {
      return;
    }

    const finalScore = Math.round((nextCorrectCount / Math.max(1, loadedWordsCount)) * 20);
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

  const classifyWord = (targetCategoryLabel, runtimeId) => {
    if (loadingWords || finished) {
      return;
    }

    const wordIndex = visibleWords.findIndex((word) => word.runtimeId === runtimeId);
    if (wordIndex === -1) {
      return;
    }

    const targetKey = normalizeCategoryKey(targetCategoryLabel);
    const word = visibleWords[wordIndex];
    const expectedKey = normalizeCategoryKey(word.category);
    const isCorrect = targetKey === expectedKey;

    const nextVisibleWords = visibleWords.slice();
    const nextRemainingWords = remainingWords.slice();
    const replacementWord = nextRemainingWords.shift();

    if (replacementWord) {
      nextVisibleWords.splice(wordIndex, 1, replacementWord);
    } else {
      nextVisibleWords.splice(wordIndex, 1);
    }

    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextMistakes = { ...mistakesByCategory };

    if (!isCorrect) {
      nextMistakes[targetKey] = [
        ...(nextMistakes[targetKey] || []),
        {
          id: word.runtimeId,
          word: word.word,
          expectedCategory: formatCategoryLabel(word.category),
        },
      ];
    }

    setVisibleWords(nextVisibleWords);
    setRemainingWords(nextRemainingWords);
    setCorrectCount(nextCorrectCount);
    setMistakesByCategory(nextMistakes);
    setDraggedWordId(null);
    setSelectedWordId("");

    completeActivityIfNeeded(nextVisibleWords, nextRemainingWords, nextCorrectCount, nextMistakes);
  };

  const handleDragStart = (runtimeId) => {
    if (loadingWords || finished) {
      return;
    }
    setDraggedWordId(runtimeId);
    setSelectedWordId(runtimeId);
  };

  const handleWordClick = (runtimeId) => {
    if (loadingWords || finished) {
      return;
    }

    setSelectedWordId((prev) => {
      const nextValue = prev === runtimeId ? "" : runtimeId;
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
    if (loadingWords || finished) {
      return;
    }
    setCurrentLevel(levelKey);
    loadWordsForLevel(levelKey);
  };

  const handleRestart = () => {
    loadWordsForLevel(currentLevel);
  };

  return (
    <div id="word-classification-activity-root" className="space-y-6">
      <section
        id="word-classification-hero"
        className="rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 p-[1px]"
      >
        <div className="rounded-2xl bg-white p-5 sm:p-6">
          <div className="w-full">
            <div className="w-full">
              <h3 id="word-classification-title" className="mb-2 block w-full text-2xl font-bold text-slate-800">
                {displayTitle}
              </h3>
              <p id="word-classification-instructions" className="block w-full text-sm text-slate-800 sm:text-base">
                {displayInstruction}
              </p>

              <div id="word-classification-current-categories" className="mt-4 flex flex-wrap gap-2">
                {currentLevelRule.classifications.map((categoryLabel) => {
                  const theme = getCategoryTheme(categoryLabel);
                  return (
                    <span
                      key={`badge-${categoryLabel}`}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}
                    >
                      {formatCategoryLabel(categoryLabel)}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div id="word-classification-levels" className="mt-5 flex flex-wrap justify-center gap-2">
            {ALLOWED_LEVEL_KEYS.map((levelKey) => (
              <button
                key={levelKey}
                id={`word-classification-level-${levelKey}`}
                type="button"
                disabled={loadingWords || finished}
                onClick={() => handleSelectLevel(levelKey)}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  currentLevel === levelKey
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                } ${loadingWords || finished ? "disabled:opacity-60 disabled:cursor-not-allowed" : ""}`}
              >
                {configuredLevels[levelKey].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="word-classification-status-panel" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            id="word-classification-progress-bar"
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {loadingWords ? (
        <div id="word-classification-loading" className="rounded-2xl bg-sky-50 border border-sky-200 p-4 text-sky-800">
          Chargement des mots...
        </div>
      ) : loadingError ? (
        <div id="word-classification-error" className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700">
          {loadingError}
        </div>
      ) : (
        <>
          <section id="word-classification-word-pool-section" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">Mots à classer maintenant</h4>
                </div>
                <div className="text-sm text-slate-600">
                  {selectedWord ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                      Mot sélectionné : {selectedWord.word}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                      Sélectionne un mot
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div
              id="word-classification-word-pool"
              className="flex flex-wrap justify-center gap-3 min-h-[110px] p-4 sm:p-5 bg-slate-50/70"
            >
              {visibleWords.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-500 w-full">
                  Tous les mots ont été classés.
                </div>
              ) : (
                visibleWords.map((word, index) => {
                  const isSelected = selectedWordId === word.runtimeId;
                  return (
                    <button
                      key={word.runtimeId}
                      id={`word-classification-word-${index}`}
                      type="button"
                      draggable={!finished}
                      onDragStart={() => handleDragStart(word.runtimeId)}
                      onDragEnd={() => setDraggedWordId(null)}
                      onClick={() => handleWordClick(word.runtimeId)}
                      className={`min-w-[120px] rounded-2xl border px-4 py-3 text-center shadow-sm select-none transition-all ${
                        isSelected
                          ? "border-amber-400 bg-amber-100 ring-4 ring-amber-200"
                          : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50"
                      } ${finished ? "cursor-default" : "cursor-move"}`}
                      style={{
                        transform: `${isSelected ? "scale(1.02) " : ""}rotate(${word.rotation ?? 0}deg)`,
                      }}
                    >
                      <span className="block text-lg font-bold text-slate-800">{word.word}</span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <div id="word-classification-categories" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {currentLevelRule.classifications.map((categoryLabel) => {
              const categoryKey = normalizeCategoryKey(categoryLabel);
              const mistakes = mistakesByCategory[categoryKey] || [];
              const theme = getCategoryTheme(categoryLabel);
              return (
                <section
                  key={categoryKey}
                  id={`word-classification-category-${categoryKey}`}
                  className={`rounded-2xl border-2 p-4 min-h-[180px] transition-all ${
                    selectedWordId && !finished ? theme.activePanel : theme.panel
                  } ${finished ? "" : "flex items-center justify-center"}`}
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

                    <div className="flex justify-center text-center">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-2xl font-bold shadow-sm sm:text-3xl ${theme.badge} ${theme.title}`}
                      >
                        {formatCategoryLabel(categoryLabel)}
                      </span>
                    </div>
                  </div>

                  {finished && mistakes.length > 0 && (
                    <div id={`word-classification-errors-${categoryKey}`} className="mt-3">
                      <ul className="space-y-2 text-sm">
                        {mistakes.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl bg-white border border-rose-200 px-3 py-2 text-rose-800 shadow-sm"
                          >
                            <span className="font-semibold">{item.word}</span>
                            <span className="block text-xs mt-1">Catégorie attendue : {item.expectedCategory}</span>
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

      <div id="word-classification-actions" className="flex justify-center gap-3 flex-wrap">
        <button
          id="word-classification-restart-button"
          type="button"
          onClick={handleRestart}
          disabled={loadingWords || restartLocked}
          className="px-6 py-2.5 bg-slate-700 text-white rounded-full hover:bg-slate-800 font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Recommencer avec de nouveaux mots
        </button>
      </div>

      {finished && (
        <section id="word-classification-summary" className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-emerald-900 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold">Activité terminée</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm border border-emerald-100">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Score</p>
              <p className="text-3xl font-bold">{score} / 20</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white border border-emerald-100 p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Bonnes réponses</div>
              <div className="text-2xl font-bold">{correctCount}</div>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Total traité</div>
              <div className="text-2xl font-bold">{loadedWordsCount}</div>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Erreurs</div>
              <div className="text-2xl font-bold">{Math.max(0, loadedWordsCount - correctCount)}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default WordClassificationActivity;
