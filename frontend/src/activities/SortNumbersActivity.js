import React, { useState } from "react";

export const defaultSortNumbersActivityContent = {
  defaultLevel: "level1",
  levels: {
    level1: { label: "Niveau 1", count: 5, min: 1, max: 99 },
    level2: { label: "Niveau 2", count: 7, min: 1, max: 999 },
    level3: { label: "Niveau 3", count: 9, min: 1, max: 9999 },
  },
};

const TILE_ROTATION_MIN_DEGREES = -10;
const TILE_ROTATION_MAX_DEGREES = 10;

// Utilitaire pour mélanger un tableau
function shuffle(array) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
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

const SortNumbersActivity = ({ content, onComplete }) => {
  const defaultLevels = defaultSortNumbersActivityContent.levels;

  const configuredLevels = {
    level1: normalizeLevelRule(content?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(content?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(content?.levels?.level3, defaultLevels.level3),
  };

  const allowedLevelKeys = ["level1", "level2", "level3"];
  const initialLevel = allowedLevelKeys.includes(content?.defaultLevel)
    ? content.defaultLevel
    : "level1";

  const buildTilesForLevel = (levelKey) => {
    const level = configuredLevels[levelKey] || configuredLevels.level1;
    let values;
    if (Array.isArray(content?.numbersByLevel?.[levelKey]) && content.numbersByLevel[levelKey].length > 0) {
      values = shuffle(content.numbersByLevel[levelKey].map((n) => Number(n)).filter((n) => Number.isFinite(n)));
    } else {
      values = shuffle(generateUniqueRandomNumbers(level.count, level.min, level.max));
    }
    return values.map((v) => ({ value: v, rotation: randomRotation() }));
  };

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [tiles, setTiles] = useState(buildTilesForLevel(initialLevel));
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [finished, setFinished] = useState(false);

  const getExpectedValues = (tileList) => tileList.map((tile) => tile.value).slice().sort((a, b) => a - b);

  const handleDragStart = (idx) => setDraggedIdx(idx);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (idx) => {
    if (draggedIdx === null) return;
    const newTiles = tiles.slice();
    const [removed] = newTiles.splice(draggedIdx, 1);
    newTiles.splice(idx, 0, removed);
    setTiles(newTiles);
    setDraggedIdx(null);
  };

  const handleValidate = () => {
    const expectedValues = getExpectedValues(tiles);
    const isSorted = tiles.every((tile, index) => tile.value === expectedValues[index]);
    setFinished(true);
    if (onComplete) onComplete(isSorted ? 20 : 0);
  };

  const handleRestart = () => {
    setTiles(buildTilesForLevel(currentLevel));
    setDraggedIdx(null);
    setFinished(false);
  };

  const handleSelectLevel = (levelKey) => {
    setCurrentLevel(levelKey);
    setTiles(buildTilesForLevel(levelKey));
    setDraggedIdx(null);
    setFinished(false);
  };

  return (
    <div id="sort-numbers-activity">
      <h3 id="sort-numbers-titre" className="text-lg font-bold mb-4">Classe les nombres dans l'ordre croissant</h3>

      <div id="sort-numbers-niveaux" className="flex flex-wrap justify-center gap-2 mb-4">
        {allowedLevelKeys.map((levelKey) => (
          <button
            key={levelKey}
            id={`sort-numbers-bouton-${levelKey}`}
            type="button"
            disabled={finished}
            onClick={() => handleSelectLevel(levelKey)}
            className={`px-4 py-2 rounded font-semibold ${
              currentLevel === levelKey
                ? "bg-indigo-600 text-white"
                : "bg-slate-200 text-slate-800 hover:bg-slate-300"
            } ${
              finished ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {configuredLevels[levelKey].label}
          </button>
        ))}
      </div>

      <div id="sort-numbers-tuiles" className="flex gap-4 justify-center mb-6">
        {tiles.map((t, idx) => {
          const expectedValues = getExpectedValues(tiles);
          const isCorrect = t.value === expectedValues[idx];

          return (
            <div
              key={idx}
              id={`sort-numbers-tuile-${idx}`}
              className={`w-16 h-16 flex items-center justify-center rounded shadow text-2xl font-bold select-none ${
                finished
                  ? isCorrect
                    ? "bg-emerald-100 border-2 border-emerald-500 text-emerald-800"
                    : "bg-rose-100 border-2 border-rose-500 text-rose-800"
                  : "bg-blue-200 cursor-move hover:scale-105"
              }`}
              draggable={!finished}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
              style={{ opacity: finished ? 1 : 1, transform: `rotate(${t.rotation}deg)` }}
            >
              {t.value}
            </div>
          );
        })}
      </div>

      {!finished && (
        <div id="sort-numbers-actions" className="flex justify-center gap-3">
          <button
            id="sort-numbers-bouton-valider"
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
            onClick={handleValidate}
          >
            Valider
          </button>
        <button
          id="sort-numbers-bouton-recommencer"
          className="px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 font-semibold"
          onClick={handleRestart}
        >
          Recommencer
        </button>
        </div>
      )}

      {finished && (
        <p id="sort-numbers-message-resultat" className="mt-4 text-center text-lg font-medium text-gray-700">
          {tiles.every((tile, index) => tile.value === getExpectedValues(tiles)[index])
            ? "Bravo, c'est correct !"
            : "Ce n'est pas l'ordre croissant."}
        </p>
      )}
    </div>
  );
};

export default SortNumbersActivity;
