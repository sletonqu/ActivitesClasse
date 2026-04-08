import React, { useMemo, useState } from "react";

export const defaultReadNumbersActivityContent = {
  title: "Lecture de nombres",
  instruction: "",
  defaultLevel: "level1",
  levels: {
    level1: { label: "Niveau 1", min: 1, max: 99 },
    level2: { label: "Niveau 2", min: 100, max: 999 },
    level3: { label: "Niveau 3", min: 1000, max: 9999 },
  },
  numbersByLevel: {
    level1: [],
    level2: [],
    level3: [],
  },
};

const TILE_ROTATION_MIN_DEGREES = -8;
const TILE_ROTATION_MAX_DEGREES = 8;

function parseIntWithFallback(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function getSafeDisplayText(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text && fallback === "") {
    return "";
  }
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
  const fallbackMin = parseIntWithFallback(fallbackRule.min, 1);
  const fallbackMax = parseIntWithFallback(fallbackRule.max, 99);

  let min = parseIntWithFallback(source.min, fallbackMin);
  let max = parseIntWithFallback(source.max, fallbackMax);

  if (min > max) {
    [min, max] = [max, min];
  }

  return {
    label: source.label || fallbackRule.label,
    min,
    max,
  };
}

function randomRotation() {
  const rotationRange = TILE_ROTATION_MAX_DEGREES - TILE_ROTATION_MIN_DEGREES;
  return Math.round((Math.random() * rotationRange + TILE_ROTATION_MIN_DEGREES) * 10) / 10;
}

function getRandomNumber(min, max) {
  const safeMin = parseIntWithFallback(min, 1);
  const safeMax = parseIntWithFallback(max, 99);
  const lower = Math.min(safeMin, safeMax);
  const upper = Math.max(safeMin, safeMax);
  const range = upper - lower + 1;

  return Math.floor(Math.random() * Math.max(1, range)) + lower;
}

function sanitizeConfiguredNumbers(numbers) {
  if (!Array.isArray(numbers)) {
    return [];
  }

  return numbers
    .map((numberValue) => Number(numberValue))
    .filter((numberValue) => Number.isFinite(numberValue));
}

const ReadNumbersActivity = ({ content }) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultReadNumbersActivityContent.levels;
  const allowedLevelKeys = ["level1", "level2", "level3"];

  const configuredLevels = {
    level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
  };

  const initialLevel = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const buildTileForLevel = (levelKey) => {
    const level = configuredLevels[levelKey] || configuredLevels.level1;
    const configuredNumbers = sanitizeConfiguredNumbers(parsedContent?.numbersByLevel?.[levelKey]);
    const value = configuredNumbers.length > 0
      ? configuredNumbers[Math.floor(Math.random() * configuredNumbers.length)]
      : getRandomNumber(level.min, level.max);

    return {
      id: `read-number-${levelKey}-${value}-${Date.now()}`,
      value,
      rotation: randomRotation(),
    };
  };

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [currentTile, setCurrentTile] = useState(() => buildTileForLevel(initialLevel));

  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultReadNumbersActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultReadNumbersActivityContent.instruction
  );

  const handleSelectLevel = (levelKey) => {
    setCurrentLevel(levelKey);
    setCurrentTile(buildTileForLevel(levelKey));
  };

  const handleRestart = () => {
    setCurrentTile(buildTileForLevel(currentLevel));
  };

  return (
    <div id="read-numbers-activity-root" className="space-y-6">
      <section
        id="read-numbers-hero"
        className="rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 p-[1px]"
      >
        <div className="rounded-2xl bg-white p-5 sm:p-6">
          <div className="w-full">
            <h3 id="read-numbers-title" className="mb-2 block w-full text-2xl font-bold text-slate-800">
              {displayTitle}
            </h3>
            <p
              id="read-numbers-instructions"
              className="block min-h-[1.5rem] w-full text-sm text-slate-800 sm:text-base"
            >
              {displayInstruction}
            </p>

            <div id="read-numbers-current-settings" className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                1 nombre à lire
              </span>
              <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                Entre {formatNumberWithThousandsSpace(currentLevelRule.min)} et {formatNumberWithThousandsSpace(currentLevelRule.max)}
              </span>
            </div>
          </div>

          <div id="read-numbers-levels" className="mt-5 flex flex-wrap justify-center gap-2">
            {allowedLevelKeys.map((levelKey) => (
              <button
                key={levelKey}
                id={`read-numbers-bouton-${levelKey}`}
                type="button"
                onClick={() => handleSelectLevel(levelKey)}
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  currentLevel === levelKey
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                {configuredLevels[levelKey].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        id="read-numbers-pool-section"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h4 className="text-lg font-bold text-slate-800">Nombre à lire</h4>
        </div>

        <div
          id="read-numbers-tiles-pool"
          className="flex min-h-[160px] items-center justify-center bg-slate-50/70 p-4 sm:p-6"
        >
          <div
            key={currentTile.id}
            id="read-numbers-current-tile"
            className="flex min-h-[88px] min-w-[140px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm"
            style={{ transform: `rotate(${currentTile.rotation}deg)` }}
          >
            <span className="block text-3xl font-bold text-slate-800 sm:text-4xl">
              {formatNumberWithThousandsSpace(currentTile.value)}
            </span>
          </div>
        </div>
      </section>

      <section
        id="read-numbers-actions"
        className="flex justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <button
          id="read-numbers-restart-button"
          type="button"
          onClick={handleRestart}
          aria-label="Recommencer"
          title="Recommencer"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-500 text-2xl font-bold text-white shadow-sm transition hover:bg-amber-600"
        >
          <span aria-hidden="true">↻</span>
          <span className="sr-only">Recommencer</span>
        </button>
      </section>
    </div>
  );
};

export default ReadNumbersActivity;
