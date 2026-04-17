import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import CharacterSprite from "../components/CharacterSprite";
import { API_URL } from "../config/api";
import {
  handleRoundRestart,
  getSafeDisplayText,
  parseActivityContent,
  parsePositiveInt,
  randomRotation,
} from "./activityUtils";

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
  verbes: "verbe",
  adjectifs: "adjectif",
  pronoms: "pronom",
  determinant: "determinant",
  determinants: "determinant",
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

function resolveSpriteImageByCategory(categoryLabel) {
  const categoryKey = normalizeCategoryKey(categoryLabel);
  return CATEGORY_SPRITE_IMAGE_BY_KEY[categoryKey] || null;
}

function getCategoryTheme(categoryLabel) {
  return CATEGORY_THEME_BY_KEY[normalizeCategoryKey(categoryLabel)] || DEFAULT_CATEGORY_THEME;
}

function normalizeCategoryKey(value) {
  const normalizedValue = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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

const WordClassificationActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
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
  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const answeredCount = Math.max(0, loadedWordsCount - visibleWords.length - remainingWords.length);
  const remainingCount = visibleWords.length + remainingWords.length;
  const progressPercent = loadedWordsCount > 0 ? Math.round((answeredCount / loadedWordsCount) * 100) : 0;
  const selectedWord = visibleWords.find((word) => word.runtimeId === selectedWordId) || null;
  const spritePositionByCategory = useMemo(() => {
    return currentLevelRule.classifications.reduce((accumulator, categoryLabel) => {
      const categoryKey = normalizeCategoryKey(categoryLabel);
      accumulator[categoryKey] = Math.floor(Math.random() * 9);
      return accumulator;
    }, {});
  }, [currentLevelRule.classifications]);
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
      rotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
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
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }

    loadWordsForLevel(currentLevel);
  };

  return (
    <div id="word-classification-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="word-classification"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={currentLevelRule.classifications.map((categoryLabel) => {
          const theme = getCategoryTheme(categoryLabel);
          return {
            key: `badge-${categoryLabel}`,
            label: formatCategoryLabel(categoryLabel),
            className: `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`,
          };
        })}
        badgesId="word-classification-current-categories"
        levels={ALLOWED_LEVEL_KEYS.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
          disabled: loadingWords || finished,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `word-classification-level-${levelKey}`}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="word-classification-status-panel"
          progressBarId="word-classification-progress-bar"
          progressPercent={progressPercent}
          label="Progression du classement des mots"
        />
      )}

      {loadingWords ? (
        <div id="word-classification-loading" className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-800 sm:p-4">
          Chargement des mots...
        </div>
      ) : loadingError ? (
        <div id="word-classification-error" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700 sm:p-4">
          {loadingError}
        </div>
      ) : (
        <>
          {!finished && (
            <section id="word-classification-word-pool-section" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
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
                className="flex min-h-[80px] flex-wrap justify-center gap-2 bg-slate-50/70 p-2.5 sm:min-h-[99px] sm:gap-3 sm:p-4"
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
                        className={`min-w-[90px] rounded-2xl border px-2.5 py-1.5 text-center shadow-sm select-none transition-all sm:min-w-[108px] sm:px-3.5 sm:py-2.5 ${
                          isSelected
                            ? "border-amber-400 bg-amber-100 ring-4 ring-amber-200"
                            : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50"
                        } ${finished ? "cursor-default" : "cursor-move"}`}
                        style={{
                          transform: `${isSelected ? "scale(1.02) " : ""}rotate(${word.rotation ?? 0}deg)`,
                        }}
                      >
                        <span className="block text-base font-bold text-slate-800 sm:text-lg">{word.word}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          )}

          <div
            id="word-classification-categories"
            className="grid grid-cols-2 lg:flex lg:flex-wrap lg:justify-center gap-2 sm:gap-2.5 pb-1 w-full"
          >
            {currentLevelRule.classifications.map((categoryLabel) => {
              const categoryKey = normalizeCategoryKey(categoryLabel);
              const formattedCategoryLabel = formatCategoryLabel(categoryLabel);
              const mistakes = mistakesByCategory[categoryKey] || [];
              const theme = getCategoryTheme(categoryLabel);
              const spriteImage = resolveSpriteImageByCategory(categoryLabel);
              return (
                <section
                  key={categoryKey}
                  id={`word-classification-category-${categoryKey}`}
                  className={`min-h-[100px] sm:min-h-[120px] rounded-2xl border-2 p-2 sm:p-2.5 transition-all lg:flex-1 lg:min-w-[180px] ${
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

                    <div className="flex min-w-0 justify-center text-center w-full">
                      <span
                        title={formattedCategoryLabel}
                        className={`inline-flex max-w-full flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 overflow-hidden rounded-xl sm:rounded-full px-2 py-2 sm:px-6 sm:py-3 text-lg font-bold shadow-sm sm:text-2xl lg:text-3xl ${theme.badge} ${theme.title} w-full`}
                      >
                        {spriteImage && (
                          <CharacterSprite
                            id={`word-classification-category-sprite-${categoryKey}`}
                            src={spriteImage}
                            position={spritePositionByCategory[categoryKey] ?? 0}
                            columns={3}
                            rows={3}
                            size={60}
                            alt={`Personnage ${formattedCategoryLabel}`}
                            className="shrink-0 !w-10 !h-10 sm:!w-[50px] sm:!h-[50px] lg:!w-[60px] lg:!h-[60px]"
                          />
                        )}
                        <span className="truncate w-full text-center">{formattedCategoryLabel}</span>
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
        <ActivityIconButton
          id="word-classification-restart-button"
          onClick={handleRestart}
          disabled={loadingWords || restartLocked}
          ariaLabel="Recommencer avec de nouveaux mots"
          title="Recommencer avec de nouveaux mots"
          icon="↻"
          srText="Recommencer avec de nouveaux mots"
          variant={allStudentsCompleted ? "warning" : "restart"}
        />
      </div>

      {finished && (
        <ActivitySummaryCard
          id="word-classification-summary"
          title="Activité terminée"
          score={score}
          stats={[
            { key: "correct", label: "Bonnes réponses", value: correctCount },
            { key: "total", label: "Total traité", value: loadedWordsCount },
            { key: "errors", label: "Erreurs", value: Math.max(0, loadedWordsCount - correctCount) },
          ]}
        />
      )}
    </div>
  );
};

export default WordClassificationActivity;
