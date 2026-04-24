import React, { useEffect, useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import BaseTenBlocksVisuals from "../components/BaseTenBlocksVisuals";
import {
  formatNumberWithThousandsSpace,
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
  parseIntWithFallback,
  randomRotation,
} from "./activityUtils";

export const defaultCompareNumbersActivityContent = {
  title: "Comparaison de nombres",
  instruction: "Observe les deux nombres, choisis le bon signe puis valide ta réponse.",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      min: 10,
      max: 99,
      allowEquality: true,
      equalityChance: 0.2,
      decompositionMode: "none",
      decompositionStyle: "medium",
    },
    level2: {
      label: "Niveau 2",
      min: 100,
      max: 999,
      allowEquality: true,
      equalityChance: 0.2,
      decompositionMode: "none",
      decompositionStyle: "medium",
    },
    level3: {
      label: "Niveau 3",
      min: 100,
      max: 999,
      allowEquality: true,
      equalityChance: 0.2,
      decompositionMode: "right",
      decompositionStyle: "strict",
    },
    level4: {
      label: "Niveau 4",
      min: 100,
      max: 999,
      allowEquality: true,
      equalityChance: 0.2,
      decompositionMode: "random",
      decompositionStyle: "medium",
    },
  },
  pairsByLevel: {
    level1: [],
    level2: [],
    level3: [],
    level4: [],
  },
};

const SIGN_OPTIONS = ["<", "=", ">"];
const SIGN_LABELS = {
  "<": "plus petit que",
  "=": "égal à",
  ">": "plus grand que",
};
const TILE_ROTATION_MIN_DEGREES = -8;
const TILE_ROTATION_MAX_DEGREES = 8;
const DECOMPOSITION_MODES = ["none", "left", "right", "random"];
const DECOMPOSITION_STYLE_ALIASES = {
  strict: "strict",
  stricte: "strict",
  medium: "medium",
  moyenne: "medium",
};
const DECOMPOSITION_STYLE_LABELS = {
  strict: "Décomposition stricte",
  medium: "Décomposition moyenne",
};

function normalizeDecompositionMode(value, fallback = "none") {
  const fallbackValue = typeof fallback === "string" ? fallback.toLowerCase() : fallback;
  const candidate = typeof value === "string" ? value.toLowerCase() : fallbackValue;
  return DECOMPOSITION_MODES.includes(candidate) ? candidate : fallbackValue;
}

function normalizeDecompositionStyle(value, fallback = "strict") {
  const normalizedFallback = typeof fallback === "string"
    ? DECOMPOSITION_STYLE_ALIASES[fallback.toLowerCase()] || "strict"
    : null;

  if (typeof value !== "string") {
    return normalizedFallback;
  }

  return DECOMPOSITION_STYLE_ALIASES[value.toLowerCase()] || normalizedFallback || "strict";
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};
  let min = parseIntWithFallback(source.min, fallbackRule.min);
  let max = parseIntWithFallback(source.max, fallbackRule.max);

  if (min > max) {
    [min, max] = [max, min];
  }

  const rawEqualityChance = Number(
    source.equalityChance ?? fallbackRule.equalityChance ?? 0.2
  );
  const equalityChance = Number.isFinite(rawEqualityChance)
    ? Math.min(1, Math.max(0, rawEqualityChance))
    : 0.2;

  const fallbackDecompositionStyle = normalizeDecompositionStyle(
    fallbackRule.decompositionStyle,
    "medium"
  );

  const decompositionStyle = normalizeDecompositionStyle(
    source.decompositionStyle,
    fallbackDecompositionStyle
  );

  return {
    label: source.label || fallbackRule.label,
    min,
    max,
    allowEquality: source.allowEquality ?? fallbackRule.allowEquality ?? true,
    equalityChance,
    decompositionMode: normalizeDecompositionMode(
      source.decompositionMode,
      normalizeDecompositionMode(fallbackRule.decompositionMode, "none")
    ),
    decompositionStyle,
  };
}

function getRandomNumber(min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function buildDecomposedParts(value, decompositionStyle = "strict") {
  const safeValue = Math.max(0, Math.trunc(Number(value) || 0));
  const normalizedStyle = normalizeDecompositionStyle(decompositionStyle, "strict");
  let hundreds = Math.floor(safeValue / 100);
  let tens = Math.floor((safeValue % 100) / 10);
  let units = safeValue % 10;

  if (normalizedStyle === "medium" && tens > 0) {
    tens -= 1;
    units += 10;
  }

  const parts = [];

  if (hundreds > 0) {
    parts.push({
      key: "hundreds",
      value: hundreds * 100,
      toneClassName: "border-amber-200 bg-amber-50 text-amber-800",
    });
  }

  if (tens > 0) {
    parts.push({
      key: "tens",
      value: tens * 10,
      toneClassName: "border-sky-200 bg-sky-50 text-sky-800",
    });
  }

  if (units > 0 || parts.length === 0) {
    parts.push({
      key: "units",
      value: units,
      toneClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
    });
  }

  return parts.map((part) => ({
    ...part,
    label: formatNumberWithThousandsSpace(part.value),
  }));
}

function resolveDecompositionSide(decompositionMode) {
  if (decompositionMode === "left" || decompositionMode === "right") {
    return decompositionMode;
  }

  if (decompositionMode === "random") {
    return Math.random() < 0.5 ? "left" : "right";
  }

  return null;
}

function getExpectedSign(leftValue, rightValue) {
  if (leftValue < rightValue) return "<";
  if (leftValue > rightValue) return ">";
  return "=";
}

function sanitizeConfiguredPairs(pairs) {
  if (!Array.isArray(pairs)) {
    return [];
  }

  return pairs
    .map((pair, index) => {
      const leftValue = Number(pair?.left);
      const rightValue = Number(pair?.right);

      if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
        return null;
      }

      return {
        id: `configured-pair-${index}-${leftValue}-${rightValue}`,
        leftValue: Math.trunc(leftValue),
        rightValue: Math.trunc(rightValue),
        decompositionMode: normalizeDecompositionMode(pair?.decompositionMode, null),
        decompositionStyle: normalizeDecompositionStyle(pair?.decompositionStyle, null),
      };
    })
    .filter(Boolean);
}

function buildComparison(levelRule, configuredPairs = []) {
  let leftValue;
  let rightValue;
  let comparisonId;
  let decompositionMode = levelRule.decompositionMode;
  let decompositionStyle = levelRule.decompositionStyle;

  if (configuredPairs.length > 0) {
    const randomPair = configuredPairs[Math.floor(Math.random() * configuredPairs.length)];
    leftValue = randomPair.leftValue;
    rightValue = randomPair.rightValue;
    comparisonId = `${randomPair.id}-${Date.now()}`;
    decompositionMode = randomPair.decompositionMode || levelRule.decompositionMode;
    decompositionStyle = randomPair.decompositionStyle || levelRule.decompositionStyle;
  } else {
    leftValue = getRandomNumber(levelRule.min, levelRule.max);
    rightValue = getRandomNumber(levelRule.min, levelRule.max);
    const rangeSize = Math.max(1, Math.abs(levelRule.max - levelRule.min) + 1);

    if (levelRule.allowEquality && Math.random() < levelRule.equalityChance) {
      rightValue = leftValue;
    } else if (rangeSize > 1) {
      let guard = 0;
      while (rightValue === leftValue && guard < 20) {
        rightValue = getRandomNumber(levelRule.min, levelRule.max);
        guard += 1;
      }
    }

    comparisonId = `compare-${leftValue}-${rightValue}-${Date.now()}`;
  }

  const decompositionSide = resolveDecompositionSide(decompositionMode);

  return {
    id: comparisonId,
    leftValue,
    rightValue,
    leftRotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
    rightRotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
    expectedSign: getExpectedSign(leftValue, rightValue),
    leftDisplayParts:
      decompositionSide === "left"
        ? buildDecomposedParts(leftValue, decompositionStyle)
        : null,
    rightDisplayParts:
      decompositionSide === "right"
        ? buildDecomposedParts(rightValue, decompositionStyle)
        : null,
  };
}

function getBaseTenParts(value) {
  const safeValue = Math.max(0, Math.trunc(Number(value) || 0));
  return {
    cartons: Math.floor(safeValue / 100),
    pouches: Math.floor((safeValue % 100) / 10),
    units: safeValue % 10,
  };
}

function ComparisonValueCard({ id, rotation = 0, value, displayParts = null, sizeVariant = "default" }) {
  const hasDecomposedDisplay = Array.isArray(displayParts) && displayParts.length > 0;
  const isCompact = sizeVariant === "compact";

  return (
    <div
      id={id}
      className={`flex items-center justify-center rounded-xl border border-slate-200 bg-white text-center shadow-sm ${
        isCompact ? "px-2.5 py-2 sm:px-3 sm:py-3" : "px-3 py-3 sm:px-4 sm:py-4"
      } ${
        hasDecomposedDisplay
          ? isCompact
            ? "min-h-[72px] w-full max-w-[170px] sm:min-h-[80px] sm:max-w-[190px]"
            : "min-h-[96px] w-full max-w-[250px] sm:min-h-[124px] sm:max-w-[290px]"
          : isCompact
            ? "h-[58px] w-[58px] sm:h-[80px] sm:w-[80px]"
            : "h-[88px] w-[88px] sm:h-[124px] sm:w-[124px]"
      }`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {hasDecomposedDisplay ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {displayParts.map((part, index) => (
            <React.Fragment key={`${id}-${part.key}-${part.value}-${index}`}>
              {index > 0 ? (
                <span className={`${isCompact ? "text-sm sm:text-lg" : "text-lg sm:text-2xl"} font-bold text-slate-400`}>+</span>
              ) : null}
              <span
                className={`inline-flex items-center justify-center rounded-xl border font-bold ${
                  isCompact
                    ? "min-h-[32px] min-w-[38px] px-2 py-1 text-xs sm:min-h-[36px] sm:min-w-[42px] sm:px-2.5 sm:py-1 sm:text-sm"
                    : "min-h-[44px] min-w-[52px] px-2.5 py-1.5 text-base sm:min-h-[52px] sm:min-w-[62px] sm:px-3 sm:py-2 sm:text-xl"
                } ${part.toneClassName}`}
              >
                {part.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      ) : (
        <span className={`block font-bold text-slate-800 ${isCompact ? "text-xl sm:text-3xl" : "text-2xl sm:text-4xl"}`}>
          {formatNumberWithThousandsSpace(value)}
        </span>
      )}
    </div>
  );
}

const CompareNumbersActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultCompareNumbersActivityContent.levels;
  const allowedLevelKeys = ["level1", "level2", "level3", "level4"];

  const configuredLevels = {
    level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
    level4: normalizeLevelRule(parsedContent?.levels?.level4, defaultLevels.level4),
  };

  const configuredPairsByLevel = {
    level1: sanitizeConfiguredPairs(parsedContent?.pairsByLevel?.level1),
    level2: sanitizeConfiguredPairs(parsedContent?.pairsByLevel?.level2),
    level3: sanitizeConfiguredPairs(parsedContent?.pairsByLevel?.level3),
    level4: sanitizeConfiguredPairs(parsedContent?.pairsByLevel?.level4),
  };

  const initialLevel = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [currentComparison, setCurrentComparison] = useState(() =>
    buildComparison(
      configuredLevels[initialLevel] || configuredLevels.level1,
      configuredPairsByLevel[initialLevel] || []
    )
  );
  const [selectedSign, setSelectedSign] = useState("");
  const [finished, setFinished] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultCompareNumbersActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultCompareNumbersActivityContent.instruction
  );

  const [leftHelpBlocks, setLeftHelpBlocks] = useState(() => getBaseTenParts(currentComparison.leftValue));
  const [rightHelpBlocks, setRightHelpBlocks] = useState(() => getBaseTenParts(currentComparison.rightValue));
  const progressPercent = selectedSign ? 100 : 0;
  const selectedSignLabel = selectedSign ? `Signe sélectionné : ${selectedSign}` : "Choisis un signe";

  useEffect(() => {
    setLeftHelpBlocks(getBaseTenParts(currentComparison.leftValue));
    setRightHelpBlocks(getBaseTenParts(currentComparison.rightValue));
  }, [currentComparison]);

  const updateHelpBlocks = (side, updater) => {
    const setBlocks = side === "left" ? setLeftHelpBlocks : setRightHelpBlocks;
    setBlocks((previousBlocks) => updater(previousBlocks));
  };

  const handleGroupUnitsToTens = (side) => {
    updateHelpBlocks(side, (previousBlocks) => {
      if (previousBlocks.units < 10) {
        return previousBlocks;
      }

      return {
        ...previousBlocks,
        pouches: previousBlocks.pouches + 1,
        units: previousBlocks.units - 10,
      };
    });
  };

  const handleUngroupTensToUnits = (side) => {
    updateHelpBlocks(side, (previousBlocks) => {
      if (previousBlocks.pouches < 1) {
        return previousBlocks;
      }

      return {
        ...previousBlocks,
        pouches: previousBlocks.pouches - 1,
        units: previousBlocks.units + 10,
      };
    });
  };

  const handleGroupTensToHundreds = (side) => {
    updateHelpBlocks(side, (previousBlocks) => {
      if (previousBlocks.pouches < 10) {
        return previousBlocks;
      }

      return {
        ...previousBlocks,
        cartons: previousBlocks.cartons + 1,
        pouches: previousBlocks.pouches - 10,
      };
    });
  };

  const handleUngroupHundredsToTens = (side) => {
    updateHelpBlocks(side, (previousBlocks) => {
      if (previousBlocks.cartons < 1) {
        return previousBlocks;
      }

      return {
        ...previousBlocks,
        cartons: previousBlocks.cartons - 1,
        pouches: previousBlocks.pouches + 10,
      };
    });
  };

  const resetForLevel = (levelKey) => {
    setCurrentComparison(
      buildComparison(
        configuredLevels[levelKey] || configuredLevels.level1,
        configuredPairsByLevel[levelKey] || []
      )
    );
    setSelectedSign("");
    setFinished(false);
    setIsCorrect(null);
    setScore(null);
    setShowHelp(false);
  };

  const handleSelectLevel = (levelKey) => {
    if (finished) return;
    setCurrentLevel(levelKey);
    resetForLevel(levelKey);
  };

  const handleValidate = () => {
    if (!selectedSign || finished) {
      return;
    }

    const nextIsCorrect = selectedSign === currentComparison.expectedSign;
    const nextScore = nextIsCorrect ? 20 : 0;

    setFinished(true);
    setIsCorrect(nextIsCorrect);
    setScore(nextScore);

    if (onComplete) {
      onComplete(nextScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
        leftValue: currentComparison.leftValue,
        rightValue: currentComparison.rightValue,
        selectedSign,
        expectedSign: currentComparison.expectedSign,
      });
    }
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }

    resetForLevel(currentLevel);
  };

  return (
    <div id="compare-numbers-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="compare-numbers"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "count",
            label: "2 nombres à comparer",
            className: "inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800",
          },
          {
            key: "range",
            label: `Entre ${formatNumberWithThousandsSpace(currentLevelRule.min)} et ${formatNumberWithThousandsSpace(currentLevelRule.max)}`,
            className: "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800",
          },
          ...(currentLevelRule.decompositionMode !== "none"
            ? [{
                key: "decomposition",
                label: DECOMPOSITION_STYLE_LABELS[currentLevelRule.decompositionStyle] || "1 nombre en écriture décomposée",
                className: "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800",
              }]
            : []),
        ]}
        levels={allowedLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `compare-numbers-bouton-${levelKey}`}
        disableAllLevels={finished}
      />

      {!finished && (
        <ActivityStatus
          id="compare-numbers-status-panel"
          progressBarId="compare-numbers-progress-bar"
          progressPercent={progressPercent}
          label="Progression de la comparaison"
        />
      )}

      {!finished && (
        <section
          id="compare-numbers-sign-pool-section"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-800 sm:text-lg">Signes disponibles</h4>
              </div>
              <div className="text-sm text-slate-600">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${
                    selectedSign
                      ? "bg-amber-100 font-semibold text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {selectedSignLabel}
                </span>
              </div>
            </div>
          </div>

          <div
            id="compare-numbers-sign-choices"
            className="flex min-h-[60px] flex-wrap justify-center gap-2 bg-slate-50/70 px-3 py-2.5 sm:min-h-[74px] sm:gap-2.5 sm:px-4 sm:py-4"
          >
            {SIGN_OPTIONS.map((sign) => {
              const signId = sign === "<" ? "inferieur" : sign === ">" ? "superieur" : "egal";
              const isSelected = selectedSign === sign;

              return (
                <button
                  key={sign}
                  id={`compare-numbers-sign-${signId}`}
                  type="button"
                  disabled={finished}
                  onClick={() => setSelectedSign(sign)}
                  aria-label={`Choisir le signe ${SIGN_LABELS[sign]}`}
                  className={`min-h-[45px] min-w-[58px] rounded-2xl border px-2.5 py-1.5 text-center text-lg font-bold shadow-sm transition-all sm:min-h-[51px] sm:min-w-[70px] sm:px-3 sm:py-2 sm:text-xl ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
                  } ${finished ? "disabled:cursor-not-allowed disabled:opacity-70" : ""}`}
                >
                  {sign}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section
        id="compare-numbers-categories"
        className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-2.5"
      >
        <div
          id="compare-numbers-exercise-area"
          className="grid items-center gap-2 sm:gap-2.5 md:grid-cols-[1fr_auto_1fr]"
        >
          <div className="flex justify-center md:justify-end">
            <ComparisonValueCard
              key={`${currentComparison.id}-left`}
              id="compare-numbers-left-value-tile"
              rotation={currentComparison.leftRotation || 0}
              value={currentComparison.leftValue}
              displayParts={currentComparison.leftDisplayParts}
              sizeVariant="compact"
            />
          </div>

          <div
            id="compare-numbers-answer-slot"
            className={`mx-auto flex min-h-[39px] min-w-[39px] items-center justify-center rounded-2xl border-2 px-1.5 py-1 text-2xl font-bold shadow-sm transition-all sm:min-h-[57px] sm:min-w-[57px] sm:px-2 sm:py-1.5 sm:text-3xl ${
              finished
                ? isCorrect
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : "border-rose-400 bg-rose-50 text-rose-700"
                : selectedSign
                  ? "border-sky-300 bg-white text-slate-700"
                  : "border-dashed border-slate-300 bg-amber-50 text-slate-500"
            }`}
          >
            {selectedSign || "?"}
          </div>

          <div className="flex justify-center md:justify-start">
            <ComparisonValueCard
              key={`${currentComparison.id}-right`}
              id="compare-numbers-right-value-tile"
              rotation={currentComparison.rightRotation || 0}
              value={currentComparison.rightValue}
              displayParts={currentComparison.rightDisplayParts}
              sizeVariant="compact"
            />
          </div>
        </div>
      </section>

      <section
        id="compare-numbers-help-section"
        className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${showHelp ? "p-3 sm:p-4" : "p-1.5 sm:p-2"}`}
      >
        {!showHelp ? (
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <button
              id="compare-numbers-help-button"
              type="button"
              onClick={() => setShowHelp(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-lg shadow-sm transition hover:bg-amber-100"
              aria-label="Afficher une aide"
              title="Afficher une aide"
            >
              <span aria-hidden="true">💡</span>
            </button>
            <p className="text-xs text-slate-600">Besoin d&apos;une aide ?</p>
          </div>
        ) : (
          <div
            id="compare-numbers-help-visuals"
            className="grid gap-3 md:grid-cols-2"
          >
            <div
              id="compare-numbers-left-help-card"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <BaseTenBlocksVisuals
                idPrefix="compare-numbers-left-blocks"
                cartons={leftHelpBlocks.cartons}
                pouches={leftHelpBlocks.pouches}
                units={leftHelpBlocks.units}
                onGroupUnitsToTens={() => handleGroupUnitsToTens("left")}
                onGroupTensToHundreds={() => handleGroupTensToHundreds("left")}
                onUngroupTensToUnits={() => handleUngroupTensToUnits("left")}
                onUngroupHundredsToTens={() => handleUngroupHundredsToTens("left")}
                className="space-y-3"
              />
            </div>

            <div
              id="compare-numbers-right-help-card"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <BaseTenBlocksVisuals
                idPrefix="compare-numbers-right-blocks"
                cartons={rightHelpBlocks.cartons}
                pouches={rightHelpBlocks.pouches}
                units={rightHelpBlocks.units}
                onGroupUnitsToTens={() => handleGroupUnitsToTens("right")}
                onGroupTensToHundreds={() => handleGroupTensToHundreds("right")}
                onUngroupTensToUnits={() => handleUngroupTensToUnits("right")}
                onUngroupHundredsToTens={() => handleUngroupHundredsToTens("right")}
                className="space-y-3"
              />
            </div>
          </div>
        )}
      </section>

      {finished && (
        <ActivitySummaryCard
          id="compare-numbers-summary"
          title="Activité terminée"
          message={
            isCorrect
              ? "Bravo ! Les deux nombres ont été bien comparés."
              : "Observe le signe attendu pour mieux comparer les deux nombres."
          }
          score={score}
          tone={isCorrect ? "success" : "error"}
          footer={
            <>
              <span className="font-semibold">Réponse :</span>{" "}
              {formatNumberWithThousandsSpace(currentComparison.leftValue)} {currentComparison.expectedSign} {formatNumberWithThousandsSpace(currentComparison.rightValue)}
            </>
          }
        />
      )}

      <ActivityActionsBar
        id="compare-numbers-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          {
            id: "compare-numbers-validate-button",
            onClick: handleValidate,
            disabled: !selectedSign || finished,
            ariaLabel: "Valider",
            title: "Valider",
            icon: "✓",
            srText: "Valider",
            variant: "validate",
          },
          {
            id: "compare-numbers-restart-button",
            onClick: handleRestart,
            disabled: restartLocked,
            ariaLabel: "Recommencer",
            title: "Recommencer",
            icon: "↻",
            srText: "Recommencer",
            variant: allStudentsCompleted ? "warning" : "restart",
          },
        ]}
      />
    </div>
  );
};

export default CompareNumbersActivity;
