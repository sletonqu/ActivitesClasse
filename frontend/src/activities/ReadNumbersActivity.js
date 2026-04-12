import React, { useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import {
  formatNumberWithThousandsSpace,
  getSafeDisplayText,
  parseActivityContent,
  parseIntWithFallback,
  randomRotation,
} from "./activityUtils";

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

const ReadNumbersActivity = ({ student, content }) => {
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
      rotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
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
    <div id="read-numbers-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="read-numbers"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "count",
            label: "1 nombre à lire",
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
        getLevelButtonId={(levelKey) => `read-numbers-bouton-${levelKey}`}
      />

      <section
        id="read-numbers-pool-section"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4 sm:py-3">
          <h4 className="text-lg font-bold text-slate-800">Nombre à lire</h4>
        </div>

        <div
          id="read-numbers-tiles-pool"
          className="flex min-h-[120px] items-center justify-center bg-slate-50/70 p-3 sm:min-h-[160px] sm:p-6"
        >
          <div
            key={currentTile.id}
            id="read-numbers-current-tile"
            className="flex min-h-[72px] min-w-[110px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm sm:min-h-[88px] sm:min-w-[140px] sm:px-6 sm:py-5"
            style={{ transform: `rotate(${currentTile.rotation}deg)` }}
          >
            <span className="block text-2xl font-bold text-slate-800 sm:text-4xl">
              {formatNumberWithThousandsSpace(currentTile.value)}
            </span>
          </div>
        </div>
      </section>

      <section
        id="read-numbers-actions"
        className="flex justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
      >
        <ActivityIconButton
          id="read-numbers-restart-button"
          onClick={handleRestart}
          ariaLabel="Recommencer"
          title="Recommencer"
          icon="↻"
          srText="Recommencer"
          variant="warning"
        />
      </section>
    </div>
  );
};

export default ReadNumbersActivity;
