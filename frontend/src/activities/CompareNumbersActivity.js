import React, { useEffect, useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import BaseTenBlocksVisuals from "../components/BaseTenBlocksVisuals";
import {
  formatNumberWithThousandsSpace,
  getSafeDisplayText,
  parseActivityContent,
  parseIntWithFallback,
  randomRotation,
} from "./activityUtils";

export const defaultCompareNumbersActivityContent = {
  title: "Comparaison de nombres",
  instruction: "Observe les deux nombres, choisis le bon signe puis valide ta réponse.",
  defaultLevel: "level1",
  levels: {
    level1: { label: "Niveau 1", min: 0, max: 20, allowEquality: true, equalityChance: 0.2 },
    level2: { label: "Niveau 2", min: 10, max: 99, allowEquality: true, equalityChance: 0.2 },
    level3: { label: "Niveau 3", min: 100, max: 999, allowEquality: true, equalityChance: 0.2 },
  },
  pairsByLevel: {
    level1: [],
    level2: [],
    level3: [],
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

  return {
    label: source.label || fallbackRule.label,
    min,
    max,
    allowEquality: source.allowEquality ?? fallbackRule.allowEquality ?? true,
    equalityChance,
  };
}

function getRandomNumber(min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
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
      };
    })
    .filter(Boolean);
}

function buildComparison(levelRule, configuredPairs = []) {
  if (configuredPairs.length > 0) {
    const randomPair = configuredPairs[Math.floor(Math.random() * configuredPairs.length)];
    return {
      id: `${randomPair.id}-${Date.now()}`,
      leftValue: randomPair.leftValue,
      rightValue: randomPair.rightValue,
      leftRotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
      rightRotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
      expectedSign: getExpectedSign(randomPair.leftValue, randomPair.rightValue),
    };
  }

  const leftValue = getRandomNumber(levelRule.min, levelRule.max);
  let rightValue = getRandomNumber(levelRule.min, levelRule.max);
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

  return {
    id: `compare-${leftValue}-${rightValue}-${Date.now()}`,
    leftValue,
    rightValue,
    leftRotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
    rightRotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
    expectedSign: getExpectedSign(leftValue, rightValue),
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

const CompareNumbersActivity = ({ student, content, onComplete }) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultCompareNumbersActivityContent.levels;
  const allowedLevelKeys = ["level1", "level2", "level3"];

  const configuredLevels = {
    level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
  };

  const configuredPairsByLevel = {
    level1: sanitizeConfiguredPairs(parsedContent?.pairsByLevel?.level1),
    level2: sanitizeConfiguredPairs(parsedContent?.pairsByLevel?.level2),
    level3: sanitizeConfiguredPairs(parsedContent?.pairsByLevel?.level3),
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

  const restartLocked = Boolean(student) && finished;
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
    resetForLevel(currentLevel);
  };

  return (
    <div id="compare-numbers-activity-root" className="space-y-6">
      <ActivityHero
        idPrefix="compare-numbers"
        title={displayTitle}
        instruction={displayInstruction}
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
        <section
          id="compare-numbers-status-panel"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              id="compare-numbers-progress-bar"
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>
      )}

      {!finished && (
        <section
          id="compare-numbers-sign-pool-section"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-800">Signes disponibles</h4>
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
            className="flex min-h-[92px] flex-wrap justify-center gap-3 bg-slate-50/70 p-4 sm:p-5"
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
                  className={`min-h-[64px] min-w-[88px] rounded-2xl border px-4 py-3 text-center text-2xl font-bold shadow-sm transition-all ${
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
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div
          id="compare-numbers-exercise-area"
          className="grid items-center gap-3 sm:gap-4 md:grid-cols-[1fr_auto_1fr]"
        >
          <div className="flex justify-center md:justify-end">
            <div
              key={`${currentComparison.id}-left`}
              id="compare-numbers-left-value-tile"
              className="flex h-[112px] w-[112px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm sm:h-[124px] sm:w-[124px]"
              style={{ transform: `rotate(${currentComparison.leftRotation || 0}deg)` }}
            >
              <span className="block text-3xl font-bold text-slate-800 sm:text-4xl">
                {formatNumberWithThousandsSpace(currentComparison.leftValue)}
              </span>
            </div>
          </div>

          <div
            id="compare-numbers-answer-slot"
            className={`mx-auto flex min-h-[72px] min-w-[72px] items-center justify-center rounded-2xl border-2 px-3 py-2 text-4xl font-bold shadow-sm transition-all sm:min-h-[88px] sm:min-w-[88px] ${
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
            <div
              key={`${currentComparison.id}-right`}
              id="compare-numbers-right-value-tile"
              className="flex h-[112px] w-[112px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm sm:h-[124px] sm:w-[124px]"
              style={{ transform: `rotate(${currentComparison.rightRotation || 0}deg)` }}
            >
              <span className="block text-3xl font-bold text-slate-800 sm:text-4xl">
                {formatNumberWithThousandsSpace(currentComparison.rightValue)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="compare-numbers-help-section"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        {!showHelp ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <button
              id="compare-numbers-help-button"
              type="button"
              onClick={() => setShowHelp(true)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-2xl shadow-sm transition hover:bg-amber-100"
              aria-label="Afficher une aide"
              title="Afficher une aide"
            >
              <span aria-hidden="true">💡</span>
            </button>
            <p className="text-sm text-slate-600">Besoin d&apos;une aide ?</p>
          </div>
        ) : (
          <div
            id="compare-numbers-help-visuals"
            className="grid gap-4 lg:grid-cols-2"
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

      <div id="compare-numbers-actions" className="flex flex-wrap justify-center gap-3">
        <ActivityIconButton
          id="compare-numbers-validate-button"
          onClick={handleValidate}
          disabled={!selectedSign || finished}
          ariaLabel="Valider"
          title="Valider"
          icon="✓"
          srText="Valider"
          variant="validate"
        />

        <ActivityIconButton
          id="compare-numbers-restart-button"
          onClick={handleRestart}
          disabled={restartLocked}
          ariaLabel="Recommencer"
          title="Recommencer"
          icon="↻"
          srText="Recommencer"
          variant="restart"
        />
      </div>
    </div>
  );
};

export default CompareNumbersActivity;
