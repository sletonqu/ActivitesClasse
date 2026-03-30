import React, { useState } from "react";

export const defaultSortNumbersActivityContent = {
  defaultLevel: "level1",
  levels: {
    level1: { label: "Niveau 1", count: 5, min: 1, max: 99 },
    level2: { label: "Niveau 2", count: 7, min: 1, max: 999 },
    level3: { label: "Niveau 3", count: 9, min: 1, max: 9999 },
  },
};

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
    if (Array.isArray(content?.numbersByLevel?.[levelKey]) && content.numbersByLevel[levelKey].length > 0) {
      return shuffle(content.numbersByLevel[levelKey].map((n) => Number(n)).filter((n) => Number.isFinite(n)));
    }
    return shuffle(generateUniqueRandomNumbers(level.count, level.min, level.max));
  };

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [tiles, setTiles] = useState(buildTilesForLevel(initialLevel));
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [finished, setFinished] = useState(false);

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
    const isSorted = tiles.every((n, i, arr) => i === 0 || arr[i - 1] <= n);
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
    <div>
      <h3 className="text-lg font-bold mb-4">Classe les nombres dans l'ordre croissant</h3>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {allowedLevelKeys.map((levelKey) => (
          <button
            key={levelKey}
            type="button"
            onClick={() => handleSelectLevel(levelKey)}
            className={`px-4 py-2 rounded font-semibold ${
              currentLevel === levelKey
                ? "bg-indigo-600 text-white"
                : "bg-slate-200 text-slate-800 hover:bg-slate-300"
            }`}
          >
            {configuredLevels[levelKey].label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 justify-center mb-6">
        {tiles.map((n, idx) => (
          <div
            key={idx}
            className="w-16 h-16 flex items-center justify-center bg-blue-200 rounded shadow cursor-move text-2xl font-bold select-none transition-transform hover:scale-105"
            draggable={!finished}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            style={{ opacity: finished ? 0.5 : 1 }}
          >
            {n}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-3">
        {!finished && (
          <button
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
            onClick={handleValidate}
          >
            Valider
          </button>
        )}
        <button
          className="px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 font-semibold"
          onClick={handleRestart}
        >
          Recommencer
        </button>
      </div>
      {finished && (
        <p className="mt-4 text-center text-lg font-medium text-gray-700">
          {tiles.every((n, i, arr) => i === 0 || arr[i - 1] <= n)
            ? "Bravo, c'est correct !"
            : "Ce n'est pas l'ordre croissant."}
        </p>
      )}
    </div>
  );
};

export default SortNumbersActivity;
