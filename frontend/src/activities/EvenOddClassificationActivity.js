import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import PlacementDropZone from "../components/PlacementDropZone";
import PlacementTileButton from "../components/PlacementTileButton";
import useHybridPlacementInteraction from "../hooks/useHybridPlacementInteraction";
import {
  handleRoundRestart,
  getSafeDisplayText,
  parseActivityContent,
  parsePositiveInt,
  parseIntWithFallback,
  randomRotation,
  formatNumberWithThousandsSpace,
} from "./activityUtils";

export const defaultEvenOddClassificationActivityContent = {
  title: "Tri de nombres pairs ou impairs",
  instruction:
    "Fais glisser chaque nombre dans la bonne colonne (Pair ou Impair). Tu peux aussi cliquer sur un nombre puis sur sa catégorie.",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      totalNumbers: 10,
      numbersPerRound: 1,
      min: 0,
      max: 20,
      classifications: ["Pair", "Impair"],
    },
    level2: {
      label: "Niveau 2",
      totalNumbers: 12,
      numbersPerRound: 2,
      min: 20,
      max: 99,
      classifications: ["Pair", "Impair"],
    },
    level3: {
      label: "Niveau 3",
      totalNumbers: 15,
      numbersPerRound: 4,
      min: 100,
      max: 999,
      classifications: ["Pair", "Impair"],
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
  pair: {
    badge: "bg-indigo-100 text-indigo-800",
    panel: "border-indigo-200 bg-indigo-50/70",
    activePanel: "border-indigo-400 bg-indigo-50 shadow-sm",
    title: "text-indigo-900",
  },
  impair: {
    badge: "bg-amber-100 text-amber-800",
    panel: "border-amber-200 bg-amber-50/70",
    activePanel: "border-amber-400 bg-amber-50 shadow-sm",
    title: "text-amber-900",
  },
};

function getCategoryTheme(categoryLabel) {
  return CATEGORY_THEME_BY_KEY[normalizeCategoryKey(categoryLabel)] || DEFAULT_CATEGORY_THEME;
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

function generateRandomNumbers(count, min, max) {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const rangeSize = safeMax - safeMin + 1;

  if (rangeSize >= count) {
    const set = new Set();
    while (set.size < count) {
      const val = Math.floor(Math.random() * rangeSize) + safeMin;
      set.add(val);
    }
    return Array.from(set);
  } else {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(Math.floor(Math.random() * rangeSize) + safeMin);
    }
    return list;
  }
}

function buildNumberTiles(values) {
  return values.map((value, index) => ({
    id: `number-${index}-${value}-${Math.random().toString(36).slice(2, 9)}`,
    value,
    rotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
  }));
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};

  const fallbackTotalNumbers = parsePositiveInt(fallbackRule.totalNumbers, 10);
  const totalNumbers = parsePositiveInt(source.totalNumbers, fallbackTotalNumbers);
  const numbersPerRound = Math.min(
    parsePositiveInt(source.numbersPerRound, fallbackRule.numbersPerRound),
    totalNumbers
  );
  const min = parseIntWithFallback(source.min, fallbackRule.min);
  const max = parseIntWithFallback(source.max, fallbackRule.max);
  const classifications = Array.isArray(source.classifications)
    ? source.classifications
    : fallbackRule.classifications;

  return {
    label: source.label || fallbackRule.label,
    totalNumbers,
    numbersPerRound,
    min: Math.min(min, max),
    max: Math.max(min, max),
    classifications: classifications.length > 0 ? classifications : ["Pair", "Impair"],
  };
}

function buildEmptyMistakes(classifications) {
  return classifications.reduce((accumulator, label) => {
    accumulator[normalizeCategoryKey(label)] = [];
    return accumulator;
  }, {});
}

const EvenOddClassificationActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultEvenOddClassificationActivityContent.levels;

  const configuredLevelKeys = useMemo(() => {
    const parsedLevels = parsedContent?.levels;
    if (!parsedLevels || typeof parsedLevels !== "object") {
      return ALLOWED_LEVEL_KEYS;
    }
    const keys = ALLOWED_LEVEL_KEYS.filter((levelKey) => {
      const levelRule = parsedLevels[levelKey];
      return levelRule && typeof levelRule === "object";
    });
    return keys.length > 0 ? keys : ALLOWED_LEVEL_KEYS;
  }, [parsedContent]);

  const configuredLevels = useMemo(
    () => ({
      level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
      level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
      level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
    }),
    [parsedContent, defaultLevels]
  );

  const initialLevel = configuredLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : configuredLevelKeys[0] || "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [loading, setLoading] = useState(true);
  const [visibleNumbers, setVisibleNumbers] = useState([]);
  const [remainingNumbers, setRemainingNumbers] = useState([]);
  const [totalNumbersCount, setTotalNumbersCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakesByCategory, setMistakesByCategory] = useState({});
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);

  const {
    activeItemId,
    selectedItemId,
    startDrag,
    endDrag,
    toggleSelection,
    clearInteraction,
  } = useHybridPlacementInteraction({ disabled: loading || finished });

  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const answeredCount = Math.max(0, totalNumbersCount - visibleNumbers.length - remainingNumbers.length);
  const progressPercent = totalNumbersCount > 0 ? Math.round((answeredCount / totalNumbersCount) * 100) : 0;
  const selectedNumber = visibleNumbers.find((n) => n.id === selectedItemId) || null;

  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultEvenOddClassificationActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultEvenOddClassificationActivityContent.instruction
  );

  const initializeNumbers = useCallback((levelKey) => {
    setLoading(true);
    const levelRule = configuredLevels[levelKey] || configuredLevels.level1;
    
    // Génération aléatoire des nombres
    const randomVals = generateRandomNumbers(levelRule.totalNumbers, levelRule.min, levelRule.max);
    const tiles = buildNumberTiles(randomVals);

    const initialVisibleCount = Math.min(levelRule.numbersPerRound, tiles.length);
    setVisibleNumbers(tiles.slice(0, initialVisibleCount));
    setRemainingNumbers(tiles.slice(initialVisibleCount));
    setTotalNumbersCount(tiles.length);
    setCorrectCount(0);
    setMistakesByCategory(buildEmptyMistakes(levelRule.classifications));
    clearInteraction();
    setFinished(false);
    setScore(null);
    setLoading(false);
  }, [configuredLevels, clearInteraction]);

  useEffect(() => {
    setCurrentLevel(initialLevel);
  }, [initialLevel]);

  useEffect(() => {
    initializeNumbers(currentLevel);
  }, [currentLevel, initializeNumbers]);

  const completeActivityIfNeeded = (nextVisible, nextRemaining, nextCorrect, nextMistakes) => {
    if (nextVisible.length > 0 || nextRemaining.length > 0) {
      return;
    }

    const finalScore = Math.round((nextCorrect / Math.max(1, totalNumbersCount)) * 20);
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

  const classifyNumber = (targetCategoryLabel, numberTileId) => {
    if (loading || finished) {
      return;
    }

    const numberIndex = visibleNumbers.findIndex((n) => n.id === numberTileId);
    if (numberIndex === -1) {
      return;
    }

    const numberTile = visibleNumbers[numberIndex];
    const isEven = numberTile.value % 2 === 0;
    const expectedLabel = isEven ? "Pair" : "Impair";
    const targetKey = normalizeCategoryKey(targetCategoryLabel);
    const expectedKey = normalizeCategoryKey(expectedLabel);

    const isCorrect = targetKey === expectedKey;

    const nextVisible = visibleNumbers.slice();
    const nextRemaining = remainingNumbers.slice();
    const replacementTile = nextRemaining.shift();

    if (replacementTile) {
      nextVisible.splice(numberIndex, 1, replacementTile);
    } else {
      nextVisible.splice(numberIndex, 1);
    }

    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    const nextMistakes = { ...mistakesByCategory };

    if (!isCorrect) {
      nextMistakes[targetKey] = [
        ...(nextMistakes[targetKey] || []),
        {
          id: numberTile.id,
          value: numberTile.value,
          expectedCategory: expectedLabel,
        },
      ];
    }

    setVisibleNumbers(nextVisible);
    setRemainingNumbers(nextRemaining);
    setCorrectCount(nextCorrect);
    setMistakesByCategory(nextMistakes);
    clearInteraction();

    completeActivityIfNeeded(nextVisible, nextRemaining, nextCorrect, nextMistakes);
  };

  const handleCategoryDrop = (event, categoryLabel) => {
    event.preventDefault();
    const activeTileId = activeItemId;
    if (!activeTileId) {
      return;
    }
    classifyNumber(categoryLabel, activeTileId);
  };

  const handleCategoryClick = (categoryLabel) => {
    if (!selectedItemId) {
      return;
    }
    classifyNumber(categoryLabel, selectedItemId);
  };

  const handleSelectLevel = (levelKey) => {
    if (loading || finished) {
      return;
    }
    setCurrentLevel(levelKey);
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }
    initializeNumbers(currentLevel);
  };

  return (
    <div id="even-odd-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="even-odd"
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
        badgesId="even-odd-current-categories"
        levels={configuredLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
          disabled: loading || finished,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `even-odd-level-${levelKey}`}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="even-odd-status-panel"
          progressBarId="even-odd-progress-bar"
          progressPercent={progressPercent}
          label="Progression du classement"
        />
      )}

      {loading ? (
        <div id="even-odd-loading" className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-800 sm:p-4">
          Génération des nombres...
        </div>
      ) : (
        <>
          {!finished && (
            <section id="even-odd-pool-section" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">Nombres à classer</h4>
                  </div>
                  <div className="text-sm text-slate-600">
                    {selectedNumber ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                        Nombre sélectionné : {formatNumberWithThousandsSpace(selectedNumber.value)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        Sélectionne un nombre
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                id="even-odd-pool"
                className="flex min-h-[80px] flex-wrap justify-center gap-2 bg-slate-50/70 p-2.5 sm:min-h-[99px] sm:gap-3 sm:p-4"
              >
                {visibleNumbers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-500 w-full">
                    Tous les nombres ont été classés.
                  </div>
                ) : (
                  visibleNumbers.map((numTile, index) => {
                    const isSelected = selectedItemId === numTile.id;
                    return (
                      <PlacementTileButton
                        key={numTile.id}
                        id={`even-odd-tile-${index}`}
                        type="button"
                        draggable={!finished}
                        onDragStart={() => startDrag(numTile.id)}
                        onDragEnd={endDrag}
                        onClick={() => toggleSelection(numTile.id)}
                        className={`min-w-[90px] rounded-2xl border px-2.5 py-1.5 text-center shadow-sm select-none transition-all sm:min-w-[108px] sm:px-3.5 sm:py-2.5 ${
                          isSelected
                            ? "border-amber-400 bg-amber-100 ring-4 ring-amber-200"
                            : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50"
                        } ${finished ? "cursor-default" : "cursor-move"}`}
                        style={{
                          transform: `${isSelected ? "scale(1.02) " : ""}rotate(${numTile.rotation ?? 0}deg)`,
                        }}
                      >
                        <span className="block text-base font-bold text-slate-800 sm:text-lg">
                          {formatNumberWithThousandsSpace(numTile.value)}
                        </span>
                      </PlacementTileButton>
                    );
                  })
                )}
              </div>
            </section>
          )}

          <div
            id="even-odd-categories"
            className="grid grid-cols-2 lg:flex lg:flex-wrap lg:justify-center gap-2 sm:gap-2.5 pb-1 w-full"
          >
            {currentLevelRule.classifications.map((categoryLabel) => {
              const categoryKey = normalizeCategoryKey(categoryLabel);
              const formattedCategoryLabel = formatCategoryLabel(categoryLabel);
              const mistakes = mistakesByCategory[categoryKey] || [];
              const theme = getCategoryTheme(categoryLabel);
              return (
                <PlacementDropZone
                  key={categoryKey}
                  id={`even-odd-category-${categoryKey}`}
                  className={`min-h-[100px] sm:min-h-[120px] rounded-2xl border-2 p-2 sm:p-2.5 transition-all lg:flex-1 lg:min-w-[180px] ${
                    selectedItemId && !finished ? theme.activePanel : theme.panel
                  } ${finished ? "" : "flex items-center justify-center"}`}
                  onDrop={(event) => handleCategoryDrop(event, categoryLabel)}
                  onClick={() => handleCategoryClick(categoryLabel)}
                >
                  <div className={`relative ${finished ? "min-h-[52px]" : "w-full text-center"}`}>
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
                        <span className="truncate w-full text-center">{formattedCategoryLabel}</span>
                      </span>
                    </div>
                  </div>

                  {finished && mistakes.length > 0 && (
                    <div id={`even-odd-errors-${categoryKey}`} className="mt-3">
                      <ul className="space-y-2 text-sm text-left">
                        {mistakes.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl bg-white border border-rose-200 px-3 py-2 text-rose-800 shadow-sm"
                          >
                            <span className="font-semibold text-lg">{formatNumberWithThousandsSpace(item.value)}</span>
                            <span className="block text-xs mt-1 text-slate-500">Catégorie attendue : {item.expectedCategory}</span>
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
                </PlacementDropZone>
              );
            })}
          </div>
        </>
      )}

      {finished && (
        <ActivitySummaryCard
          id="even-odd-summary"
          title="Activité terminée"
          score={score}
          stats={[
            { key: "correct", label: "Bonnes réponses", value: correctCount },
            { key: "total", label: "Total traité", value: totalNumbersCount },
            { key: "errors", label: "Erreurs", value: Math.max(0, totalNumbersCount - correctCount) },
          ]}
        />
      )}

      <ActivityActionsBar
        id="even-odd-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          {
            id: "even-odd-restart-button",
            onClick: handleRestart,
            disabled: loading || restartLocked || !finished,
            ariaLabel: "Recommencer avec de nouveaux nombres",
            title: "Recommencer avec de nouveaux nombres",
            icon: "↻",
            srText: "Recommencer avec de nouveaux nombres",
            variant: allStudentsCompleted ? "warning" : "restart",
          },
        ]}
      />
    </div>
  );
};

export default EvenOddClassificationActivity;
