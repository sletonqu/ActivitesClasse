import React, { useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import {
  formatNumberWithThousandsSpace,
  getSafeDisplayText,
  parseActivityContent,
  parseIntWithFallback,
  parsePositiveInt,
  randomRotation,
} from "./activityUtils";

export const defaultSortNumbersActivityContent = {
  title: "Classe les nombres dans l'ordre croissant",
  instruction:
    "Fais glisser chaque nombre dans la bonne case pour reconstituer une suite du plus petit au plus grand.",
  defaultLevel: "level1",
  levels: {
    level1: { label: "Niveau 1", count: 4, min: 1, max: 99 },
    level2: { label: "Niveau 2", count: 4, min: 1, max: 999 },
    level3: { label: "Niveau 3", count: 4, min: 1, max: 9999 },
  },
};

const TILE_ROTATION_MIN_DEGREES = -10;
const TILE_ROTATION_MAX_DEGREES = 10;

const SLOT_THEME = {
  badge: "bg-indigo-100 text-indigo-800",
  panel: "border-slate-200 bg-slate-50",
  activePanel: "border-sky-400 bg-sky-50 shadow-sm",
};

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateUniqueRandomNumbers(count, min, max) {
  const safeCount = Math.max(1, count);
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const rangeSize = safeMax - safeMin + 1;
  const targetCount = Math.min(safeCount, rangeSize);

  const set = new Set();
  while (set.size < targetCount) {
    const value = Math.floor(Math.random() * rangeSize) + safeMin;
    set.add(value);
  }

  return Array.from(set);
}

function buildNumberTiles(values) {
  return values.map((value, index) => ({
    id: `number-${index}-${value}`,
    value,
    rotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
  }));
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};

  const fallbackCount = parsePositiveInt(fallbackRule.count, 5);
  const fallbackMin = parseIntWithFallback(fallbackRule.min, 1);
  const fallbackMax = parseIntWithFallback(fallbackRule.max, 99);

  let count = parsePositiveInt(source.count, fallbackCount);
  const min = parseIntWithFallback(source.min, fallbackMin);
  const max = parseIntWithFallback(source.max, fallbackMax);

  const rangeSize = Math.max(1, Math.abs(max - min) + 1);
  if (count > rangeSize) count = rangeSize;

  return {
    label: source.label || fallbackRule.label,
    count,
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

const SortNumbersActivity = ({ student, content, onComplete }) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultSortNumbersActivityContent.levels;

  const configuredLevels = {
    level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
  };

  const allowedLevelKeys = ["level1", "level2", "level3"];
  const initialLevel = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const buildTilesForLevel = (levelKey) => {
    const level = configuredLevels[levelKey] || configuredLevels.level1;
    const configuredNumbers = Array.isArray(parsedContent?.numbersByLevel?.[levelKey])
      ? parsedContent.numbersByLevel[levelKey]
          .map((numberValue) => Number(numberValue))
          .filter((numberValue) => Number.isFinite(numberValue))
      : [];

    const values = configuredNumbers.length > 0
      ? shuffle(configuredNumbers)
      : shuffle(generateUniqueRandomNumbers(level.count, level.min, level.max));

    return buildNumberTiles(values);
  };

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [availableTiles, setAvailableTiles] = useState(() => buildTilesForLevel(initialLevel));
  const [assignments, setAssignments] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [finished, setFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(null);

  const restartLocked = Boolean(student) && finished;
  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultSortNumbersActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultSortNumbersActivityContent.instruction
  );

  const getExpectedValues = (tileList) => tileList.map((tile) => tile.value).slice().sort((a, b) => a - b);

  const allTiles = [...availableTiles, ...Object.values(assignments)];
  const expectedValues = getExpectedValues(allTiles);
  const slotIndexes = expectedValues.map((_, index) => index);
  const totalSlots = slotIndexes.length;
  const answeredCount = slotIndexes.filter((slotIndex) => assignments[slotIndex] !== undefined).length;
  const remainingCount = availableTiles.length;
  const progressPercent = totalSlots > 0 ? Math.round((answeredCount / totalSlots) * 100) : 0;
  const allAssigned = slotIndexes.every((slotIndex) => assignments[slotIndex] !== undefined);
  const selectedTile = draggedItem?.tile || null;

  const resetForLevel = (levelKey) => {
    const nextTiles = buildTilesForLevel(levelKey);
    setAvailableTiles(nextTiles);
    setAssignments({});
    setDraggedItem(null);
    setFinished(false);
    setCorrectCount(0);
    setScore(null);
  };

  const handleDragStartFromPool = (tile) => {
    if (finished) return;
    setDraggedItem({ tile, source: "pool" });
  };

  const handleDragStartFromSlot = (slotIndex) => {
    if (finished) return;
    const tile = assignments[slotIndex];
    if (tile === undefined) return;
    setDraggedItem({ tile, source: "slot", slotIndex });
  };

  const handleDropToSlot = (slotIndex) => {
    if (finished || !draggedItem) return;

    const { tile, source, slotIndex: sourceSlotIndex } = draggedItem;
    if (source === "slot" && sourceSlotIndex === slotIndex) {
      setDraggedItem(null);
      return;
    }

    const nextAssignments = { ...assignments };
    const nextAvailableTiles = availableTiles.slice();
    const previousTargetTile = nextAssignments[slotIndex];

    if (source === "pool") {
      const tileIndex = nextAvailableTiles.findIndex((candidate) => candidate.id === tile.id);
      if (tileIndex !== -1) {
        nextAvailableTiles.splice(tileIndex, 1);
      }
    } else if (source === "slot") {
      delete nextAssignments[sourceSlotIndex];
    }

    nextAssignments[slotIndex] = tile;

    if (previousTargetTile !== undefined) {
      if (source === "slot") {
        nextAssignments[sourceSlotIndex] = previousTargetTile;
      } else {
        nextAvailableTiles.push(previousTargetTile);
      }
    }

    setAssignments(nextAssignments);
    setAvailableTiles(nextAvailableTiles);
    setDraggedItem(null);
  };

  const handleDropToPool = () => {
    if (finished || !draggedItem) return;
    if (draggedItem.source !== "slot") {
      setDraggedItem(null);
      return;
    }

    const nextAssignments = { ...assignments };
    delete nextAssignments[draggedItem.slotIndex];

    setAssignments(nextAssignments);
    setAvailableTiles((previousTiles) => [...previousTiles, draggedItem.tile]);
    setDraggedItem(null);
  };

  const handleValidate = () => {
    const nextCorrectCount = slotIndexes.reduce((count, slotIndex) => {
      return count + (assignments[slotIndex]?.value === expectedValues[slotIndex] ? 1 : 0);
    }, 0);

    const nextScore = Math.round((nextCorrectCount / Math.max(1, totalSlots)) * 20);

    setCorrectCount(nextCorrectCount);
    setScore(nextScore);
    setFinished(true);
    setDraggedItem(null);

    if (onComplete) {
      onComplete(nextScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
      });
    }
  };

  const handleRestart = () => {
    resetForLevel(currentLevel);
  };

  const handleSelectLevel = (levelKey) => {
    if (finished) return;
    setCurrentLevel(levelKey);
    resetForLevel(levelKey);
  };

  return (
    <div id="sort-numbers-activity-root" className="space-y-2.5 sm:space-y-3">
      <ActivityHero
        idPrefix="sort-numbers"
        title={displayTitle}
        instruction={displayInstruction}
        badges={[
          {
            key: "count",
            label: `${totalSlots} nombre${totalSlots > 1 ? "s" : ""}`,
            className: "inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800",
          },
          {
            key: "range",
            label: `Entre ${formatNumberWithThousandsSpace(currentLevelRule.min)} et ${formatNumberWithThousandsSpace(currentLevelRule.max)}`,
            className: "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800",
          },
        ]}
        levels={allowedLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `sort-numbers-bouton-${levelKey}`}
        disableAllLevels={finished}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="sort-numbers-status-panel"
          progressBarId="sort-numbers-progress-bar"
          progressPercent={progressPercent}
          label="Progression du classement"
        />
      )}

      {!finished && (
        <section
          id="sort-numbers-word-pool-section"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-2.5 py-2 sm:px-3 sm:py-2.5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-800 sm:text-lg">Nombres à classer maintenant</h4>
              </div>
              <div className="text-xs text-slate-600 sm:text-sm">
                {selectedTile ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                    Nombre sélectionné : {formatNumberWithThousandsSpace(selectedTile.value)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    Fais glisser un nombre
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            id="sort-numbers-tiles-pool"
            className="flex min-h-[76px] flex-wrap justify-center gap-1.5 bg-slate-50/70 p-2.5 sm:min-h-[110px] sm:gap-3 sm:p-5"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropToPool}
          >
            {availableTiles.length === 0 ? (
              <div className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-500">
                Tous les nombres ont été placés.
              </div>
            ) : (
              availableTiles.map((tile, index) => (
                <button
                  key={tile.id}
                  id={`sort-numbers-tuile-${index}`}
                  type="button"
                  draggable={!finished}
                  onDragStart={() => handleDragStartFromPool(tile)}
                  onDragEnd={() => setDraggedItem(null)}
                  className="min-h-[50px] min-w-[64px] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 disabled:cursor-default sm:min-h-[64px] sm:min-w-[88px] sm:rounded-2xl sm:px-4 sm:py-3"
                  style={{ transform: `rotate(${tile.rotation}deg)` }}
                >
                  <span className="block text-lg font-bold text-slate-800 sm:text-2xl">
                    {formatNumberWithThousandsSpace(tile.value)}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      <section
        id="sort-numbers-categories"
        className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4"
      >
        <div
          id="sort-numbers-drop-zone-row"
          className="flex flex-wrap items-center justify-center gap-1 sm:gap-2.5"
        >
          {slotIndexes.map((slotIndex) => {
            const assignedTile = assignments[slotIndex];
            const isCorrect = assignedTile?.value === expectedValues[slotIndex];

            return (
              <React.Fragment key={`sort-slot-${slotIndex}`}>
                <div
                  id={`sort-numbers-drop-zone-${slotIndex}`}
                  className={`flex min-h-[54px] min-w-[54px] items-center justify-center rounded-xl border-2 border-dashed px-2 py-1 text-lg font-bold shadow-sm transition-all sm:min-h-[88px] sm:min-w-[88px] sm:rounded-2xl sm:px-3 sm:py-2 sm:text-2xl ${
                    finished
                      ? isCorrect
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-sky-300 bg-white text-slate-700"
                  }`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDropToSlot(slotIndex)}
                >
                  {assignedTile !== undefined ? (
                    <button
                      id={`sort-numbers-assigned-tile-${slotIndex}`}
                      type="button"
                      draggable={!finished}
                      onDragStart={() => handleDragStartFromSlot(slotIndex)}
                      onDragEnd={() => setDraggedItem(null)}
                      className={!finished ? "cursor-move select-none" : "select-none"}
                      style={{ transform: `rotate(${assignedTile.rotation}deg)` }}
                    >
                      {formatNumberWithThousandsSpace(assignedTile.value)}
                    </button>
                  ) : (
                    "?"
                  )}
                </div>

                {slotIndex < slotIndexes.length - 1 ? (
                  <span
                    id={`sort-numbers-separator-${slotIndex}`}
                    className="select-none text-xl font-bold text-slate-400 sm:text-4xl"
                  >
                    {"<"}
                  </span>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      <div id="sort-numbers-actions" className="flex flex-wrap justify-center gap-2">
        <ActivityIconButton
          id="sort-numbers-validate-button"
          onClick={handleValidate}
          disabled={finished || !allAssigned}
          ariaLabel="Valider"
          title="Valider"
          icon="✓"
          srText="Valider"
          variant="validate"
        />
        <ActivityIconButton
          id="sort-numbers-restart-button"
          onClick={handleRestart}
          disabled={restartLocked}
          ariaLabel="Recommencer"
          title="Recommencer"
          icon="↻"
          srText="Recommencer"
          variant="restart"
        />
      </div>

      {finished && (
        <ActivitySummaryCard
          id="sort-numbers-summary"
          title="Activité terminée"
          message={
            correctCount === totalSlots
              ? "Bravo, tous les nombres sont dans le bon ordre !"
              : "Observe les cases colorées pour repérer les positions correctes et celles à corriger."
          }
          score={score}
          stats={[
            { key: "correct", label: "Bonnes positions", value: correctCount },
            { key: "total", label: "Total traité", value: totalSlots },
            { key: "errors", label: "Erreurs", value: Math.max(0, totalSlots - correctCount) },
          ]}
        />
      )}
    </div>
  );
};

export default SortNumbersActivity;
