import React, { useMemo, useState } from "react";

export const defaultSortNumbersActivityContent = {
  title: "Classe les nombres dans l'ordre croissant",
  instruction:
    "Fais glisser chaque nombre dans la bonne case pour reconstituer une suite du plus petit au plus grand.",
  defaultLevel: "level1",
  levels: {
    level1: { label: "Niveau 1", count: 5, min: 1, max: 99 },
    level2: { label: "Niveau 2", count: 7, min: 1, max: 999 },
    level3: { label: "Niveau 3", count: 9, min: 1, max: 9999 },
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

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseIntWithFallback(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
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

function randomRotation() {
  const rotationRange = TILE_ROTATION_MAX_DEGREES - TILE_ROTATION_MIN_DEGREES;
  return Math.round((Math.random() * rotationRange + TILE_ROTATION_MIN_DEGREES) * 10) / 10;
}

function buildNumberTiles(values) {
  return values.map((value, index) => ({
    id: `number-${index}-${value}`,
    value,
    rotation: randomRotation(),
  }));
}

function formatNumberWithThousandsSpace(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value ?? "");
  }

  return Math.trunc(numericValue)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
    <div id="sort-numbers-activity-root" className="space-y-6">
      <section
        id="sort-numbers-hero"
        className="rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 p-[1px]"
      >
        <div className="rounded-2xl bg-white p-5 sm:p-6">
          <div className="w-full">
            <h3 id="sort-numbers-title" className="mb-2 block w-full text-2xl font-bold text-slate-800">
              {displayTitle}
            </h3>
            <p id="sort-numbers-instructions" className="block w-full text-sm text-slate-800 sm:text-base">
              {displayInstruction}
            </p>

            <div id="sort-numbers-current-settings" className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                {totalSlots} nombre{totalSlots > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                Entre {formatNumberWithThousandsSpace(currentLevelRule.min)} et {formatNumberWithThousandsSpace(currentLevelRule.max)}
              </span>
            </div>
          </div>

          <div id="sort-numbers-levels" className="mt-5 flex flex-wrap justify-center gap-2">
            {allowedLevelKeys.map((levelKey) => (
              <button
                key={levelKey}
                id={`sort-numbers-bouton-${levelKey}`}
                type="button"
                disabled={finished}
                onClick={() => handleSelectLevel(levelKey)}
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  currentLevel === levelKey
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                } ${finished ? "disabled:opacity-60 disabled:cursor-not-allowed" : ""}`}
              >
                {configuredLevels[levelKey].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        id="sort-numbers-status-panel"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            id="sort-numbers-progress-bar"
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      <section
        id="sort-numbers-word-pool-section"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-800">Nombres à classer maintenant</h4>
            </div>
            <div className="text-sm text-slate-600">
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
          className="flex min-h-[110px] flex-wrap justify-center gap-3 bg-slate-50/70 p-4 sm:p-5"
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
                className="min-h-[64px] min-w-[88px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 disabled:cursor-default"
                style={{ transform: `rotate(${tile.rotation}deg)` }}
              >
                <span className="block text-2xl font-bold text-slate-800">
                  {formatNumberWithThousandsSpace(tile.value)}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <section
        id="sort-numbers-categories"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div
          id="sort-numbers-drop-zone-row"
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        >
          {slotIndexes.map((slotIndex) => {
            const assignedTile = assignments[slotIndex];
            const isCorrect = assignedTile?.value === expectedValues[slotIndex];

            return (
              <React.Fragment key={`sort-slot-${slotIndex}`}>
                <div
                  id={`sort-numbers-drop-zone-${slotIndex}`}
                  className={`flex min-h-[72px] min-w-[72px] items-center justify-center rounded-2xl border-2 border-dashed px-3 py-2 text-2xl font-bold shadow-sm transition-all sm:min-h-[88px] sm:min-w-[88px] ${
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
                    className="select-none text-3xl font-bold text-slate-400 sm:text-4xl"
                  >
                    {"<"}
                  </span>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      <div id="sort-numbers-actions" className="flex flex-wrap justify-center gap-3">
        <button
          id="sort-numbers-validate-button"
          type="button"
          className="rounded-full bg-green-500 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleValidate}
          disabled={finished || !allAssigned}
        >
          Valider
        </button>
        <button
          id="sort-numbers-restart-button"
          type="button"
          className="rounded-full bg-slate-700 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleRestart}
          disabled={restartLocked}
        >
          Recommencer
        </button>
      </div>

      {finished && (
        <section
          id="sort-numbers-summary"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold">Activité terminée</p>
              <p className="text-sm text-emerald-800">
                {correctCount === totalSlots
                  ? "Bravo, tous les nombres sont dans le bon ordre !"
                  : "Observe les cases colorées pour repérer les positions correctes et celles à corriger."}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Score</p>
              <p className="text-3xl font-bold">{score} / 20</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Bonnes positions</div>
              <div className="text-2xl font-bold">{correctCount}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Total traité</div>
              <div className="text-2xl font-bold">{totalSlots}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Erreurs</div>
              <div className="text-2xl font-bold">{Math.max(0, totalSlots - correctCount)}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default SortNumbersActivity;
