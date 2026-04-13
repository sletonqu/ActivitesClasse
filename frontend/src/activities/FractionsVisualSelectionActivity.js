import React, { useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import {
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
  parseIntWithFallback,
  parsePositiveInt,
  randomRotation,
} from "./activityUtils";

export const defaultFractionsVisualSelectionActivityContent = {
  title: "Reconnais la bonne fraction",
  instruction:
    "Observe la figure colorée à gauche puis clique sur la fraction qui lui correspond.",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      answerCount: 3,
      fractions: [
        { numerator: 1, denominator: 2 },
        { numerator: 1, denominator: 3 },
        { numerator: 1, denominator: 4 },
      ],
      visualTypes: ["circle", "bar", "square"],
    },
    level2: {
      label: "Niveau 2",
      answerCount: 6,
      fractions: [
        { numerator: 1, denominator: 2 },
        { numerator: 1, denominator: 3 },
        { numerator: 1, denominator: 4 },
        { numerator: 1, denominator: 5 },
        { numerator: 1, denominator: 6 },
        { numerator: 1, denominator: 7 },
        { numerator: 1, denominator: 8 },
        { numerator: 1, denominator: 9 },
      ],
      visualTypes: ["circle", "bar", "square"],
    },
    level3: {
      label: "Niveau 3",
      answerCount: 6,
      minDenominator: 2,
      maxDenominator: 10,
      maxNumerator: 9,
      visualTypes: ["circle", "bar", "square"],
    },
  },
};

const DEFAULT_PROPER_FRACTION = { numerator: 1, denominator: 2, key: "1/2" };
const TILE_ROTATION_MIN_DEGREES = -6;
const TILE_ROTATION_MAX_DEGREES = 6;
const SUPPORTED_VISUAL_TYPES = ["circle", "bar", "square"];
const VISUAL_TYPE_ALIASES = {
  circle: "circle",
  cercle: "circle",
  bar: "bar",
  barre: "bar",
  square: "square",
  carre: "square",
  "carré": "square",
};
const VISUAL_TYPE_LABELS = {
  circle: "Cercle",
  bar: "Barre",
  square: "Carré",
};

function shuffle(array) {
  const copy = array.slice();

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
  }

  return copy;
}

function getFractionKey(numerator, denominator) {
  return `${numerator}/${denominator}`;
}

function formatFraction(fraction) {
  return `${fraction.numerator}/${fraction.denominator}`;
}

function normalizeFractionEntry(fraction) {
  const numerator = parseIntWithFallback(
    fraction?.numerator ?? fraction?.a,
    Number.NaN
  );
  const denominator = parseIntWithFallback(
    fraction?.denominator ?? fraction?.b,
    Number.NaN
  );

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }

  const safeDenominator = Math.max(2, Math.trunc(denominator));
  const safeNumerator = Math.trunc(numerator);

  if (safeNumerator < 1 || safeNumerator >= safeDenominator) {
    return null;
  }

  return {
    numerator: safeNumerator,
    denominator: safeDenominator,
    key: getFractionKey(safeNumerator, safeDenominator),
  };
}

function sanitizeFractionList(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  const seen = new Set();

  return list
    .map((fraction) => normalizeFractionEntry(fraction))
    .filter((fraction) => {
      if (!fraction || seen.has(fraction.key)) {
        return false;
      }

      seen.add(fraction.key);
      return true;
    });
}

function normalizeVisualTypes(visualTypes, fallback = ["circle"]) {
  const source = Array.isArray(visualTypes) && visualTypes.length > 0 ? visualTypes : fallback;
  const normalized = source
    .map((visualType) => {
      const candidate = typeof visualType === "string" ? visualType.toLowerCase() : "";
      return VISUAL_TYPE_ALIASES[candidate] || null;
    })
    .filter(Boolean);

  return normalized.length > 0 ? Array.from(new Set(normalized)) : ["circle"];
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};
  const fallbackAnswerCount = Math.max(2, parsePositiveInt(fallbackRule.answerCount, 3));
  const sourceFractions = sanitizeFractionList(source.fractions);
  const fallbackFractions = sanitizeFractionList(fallbackRule.fractions);
  const defaultMinDenominator = Math.max(
    2,
    parseIntWithFallback(fallbackRule.minDenominator, 2)
  );
  const minDenominator = Math.max(
    2,
    parseIntWithFallback(source.minDenominator, defaultMinDenominator)
  );
  const maxDenominator = Math.max(
    minDenominator,
    parseIntWithFallback(source.maxDenominator, fallbackRule.maxDenominator ?? 10)
  );
  const maxNumerator = Math.max(
    1,
    parseIntWithFallback(source.maxNumerator, fallbackRule.maxNumerator ?? maxDenominator - 1)
  );

  return {
    label: source.label || fallbackRule.label,
    answerCount: Math.max(2, parsePositiveInt(source.answerCount, fallbackAnswerCount)),
    fractions: sourceFractions.length > 0 ? sourceFractions : fallbackFractions,
    minDenominator,
    maxDenominator,
    maxNumerator,
    visualTypes: normalizeVisualTypes(
      source.visualTypes,
      normalizeVisualTypes(fallbackRule.visualTypes, ["circle"])
    ),
  };
}

function buildGeneratedFractionPool(levelRule) {
  const generatedFractions = [];

  for (let denominator = levelRule.minDenominator; denominator <= levelRule.maxDenominator; denominator += 1) {
    const maxNumeratorForDenominator = Math.min(
      denominator - 1,
      Math.max(1, levelRule.maxNumerator)
    );

    for (let numerator = 1; numerator <= maxNumeratorForDenominator; numerator += 1) {
      generatedFractions.push({ numerator, denominator });
    }
  }

  return sanitizeFractionList(generatedFractions);
}

function buildChallenge(levelRule) {
  const configuredPool = Array.isArray(levelRule.fractions) ? levelRule.fractions : [];
  const generatedPool = configuredPool.length > 0 ? configuredPool : buildGeneratedFractionPool(levelRule);
  const safePool = generatedPool.length > 0 ? generatedPool : [DEFAULT_PROPER_FRACTION];
  const safeAnswerCount = Math.min(Math.max(2, levelRule.answerCount), safePool.length);
  const correctFraction = safePool[Math.floor(Math.random() * safePool.length)] || DEFAULT_PROPER_FRACTION;
  const distractors = shuffle(
    safePool.filter((fraction) => fraction.key !== correctFraction.key)
  ).slice(0, Math.max(0, safeAnswerCount - 1));
  const answerOptions = shuffle([correctFraction, ...distractors]).map((fraction, index) => ({
    ...fraction,
    tileId: `fractions-selection-tile-${fraction.key.replace("/", "-")}-${index}`,
    rotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
  }));
  const visualTypes = levelRule.visualTypes.length > 0 ? levelRule.visualTypes : SUPPORTED_VISUAL_TYPES;
  const visualType = visualTypes[Math.floor(Math.random() * visualTypes.length)] || "circle";

  return {
    id: `fractions-selection-${correctFraction.key.replace("/", "-")}-${visualType}-${Date.now()}`,
    correctFraction,
    answerOptions,
    visualType,
  };
}

function FractionLabel({ numerator, denominator, className = "" }) {
  return (
    <span
      className={`inline-grid grid-rows-[auto_2px_auto] items-center justify-items-center ${className}`}
      aria-label={`fraction ${numerator} sur ${denominator}`}
    >
      <span className="leading-none">{numerator}</span>
      <span className="my-1 block h-[2px] w-6 rounded-full bg-current" />
      <span className="leading-none">{denominator}</span>
    </span>
  );
}

function FractionChoiceTile({
  fraction,
  selected = false,
  disabled = false,
  finished = false,
  isCorrect = false,
  isIncorrect = false,
  onSelect,
}) {
  let className = "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50";

  if (selected) {
    className = "border-indigo-600 bg-indigo-600 text-white";
  }

  if (finished && isCorrect) {
    className = "border-emerald-500 bg-emerald-500 text-white";
  } else if (finished && isIncorrect) {
    className = "border-rose-500 bg-rose-500 text-white";
  }

  return (
    <button
      id={fraction.tileId}
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`mx-auto flex aspect-square min-h-[59px] w-full max-w-[69px] items-center justify-center rounded-2xl border px-1.5 py-1.5 text-xl font-bold shadow-sm transition-all sm:min-h-[66px] sm:max-w-[78px] ${className} ${disabled ? "disabled:cursor-not-allowed disabled:opacity-70" : ""}`}
      style={{ transform: `rotate(${fraction.rotation || 0}deg)` }}
      aria-pressed={selected}
      aria-label={`Choisir ${formatFraction(fraction)}`}
    >
      <FractionLabel
        numerator={fraction.numerator}
        denominator={fraction.denominator}
        className="text-xl font-bold sm:text-2xl"
      />
    </button>
  );
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeSectorPath(centerX, centerY, radius, startAngle, endAngle) {
  const startPoint = polarToCartesian(centerX, centerY, radius, endAngle);
  const endPoint = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${centerX} ${centerY}`,
    `L ${startPoint.x} ${startPoint.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endPoint.x} ${endPoint.y}`,
    "Z",
  ].join(" ");
}

function CircleFractionVisual({ id, numerator, denominator }) {
  const safeDenominator = Math.max(2, denominator);
  const stepAngle = 360 / safeDenominator;

  return (
    <svg
      id={id}
      viewBox="0 0 120 120"
      className="h-36 w-36 sm:h-40 sm:w-40"
      aria-label={`Cercle fractionné en ${safeDenominator} parts, avec ${numerator} part${numerator > 1 ? "s" : ""} colorée${numerator > 1 ? "s" : ""}`}
      role="img"
    >
      {Array.from({ length: safeDenominator }, (_, index) => {
        const startAngle = index * stepAngle;
        const endAngle = startAngle + stepAngle;

        return (
          <path
            key={`${id}-slice-${index}`}
            d={describeSectorPath(60, 60, 48, startAngle, endAngle)}
            fill={index < numerator ? "#6366f1" : "#e2e8f0"}
            stroke="#ffffff"
            strokeWidth="2"
          />
        );
      })}
      <circle cx="60" cy="60" r="48" fill="none" stroke="#475569" strokeWidth="1.5" />
    </svg>
  );
}

function StripFractionVisual({ id, numerator, denominator, orientation = "horizontal" }) {
  const safeDenominator = Math.max(2, denominator);
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      id={id}
      className={`grid overflow-hidden border-2 border-slate-300 bg-white shadow-inner ${
        isHorizontal ? "h-14 w-full max-w-[280px]" : "h-36 w-36 sm:h-40 sm:w-40"
      }`}
      style={
        isHorizontal
          ? { gridTemplateColumns: `repeat(${safeDenominator}, minmax(0, 1fr))` }
          : { gridTemplateRows: `repeat(${safeDenominator}, minmax(0, 1fr))` }
      }
      aria-label={`${isHorizontal ? "Barre" : "Carré"} fractionné${isHorizontal ? "e" : ""} en ${safeDenominator} parts, avec ${numerator} part${numerator > 1 ? "s" : ""} colorée${numerator > 1 ? "s" : ""}`}
      role="img"
    >
      {Array.from({ length: safeDenominator }, (_, index) => (
        <div
          key={`${id}-part-${index}`}
          className={`${
            index < numerator ? "bg-indigo-500" : "bg-slate-100"
          } ${
            isHorizontal
              ? "border-r border-slate-300 last:border-r-0"
              : "border-b border-slate-300 last:border-b-0"
          }`}
        />
      ))}
    </div>
  );
}

function FractionVisual({ id, fraction, visualType }) {
  if (visualType === "bar") {
    return (
      <StripFractionVisual
        id={id}
        numerator={fraction.numerator}
        denominator={fraction.denominator}
        orientation="horizontal"
      />
    );
  }

  if (visualType === "square") {
    return (
      <StripFractionVisual
        id={id}
        numerator={fraction.numerator}
        denominator={fraction.denominator}
        orientation="vertical"
      />
    );
  }

  return (
    <CircleFractionVisual
      id={id}
      numerator={fraction.numerator}
      denominator={fraction.denominator}
    />
  );
}

const FractionsVisualSelectionActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultFractionsVisualSelectionActivityContent.levels;
  const allowedLevelKeys = ["level1", "level2", "level3"];

  const configuredLevels = {
    level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
  };

  const initialLevel = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [currentChallenge, setCurrentChallenge] = useState(() =>
    buildChallenge(configuredLevels[initialLevel] || configuredLevels.level1)
  );
  const [selectedAnswerKey, setSelectedAnswerKey] = useState("");
  const [finished, setFinished] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(null);

  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultFractionsVisualSelectionActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultFractionsVisualSelectionActivityContent.instruction
  );
  const selectedFraction = currentChallenge.answerOptions.find(
    (fraction) => fraction.key === selectedAnswerKey
  ) || null;
  const progressPercent = selectedAnswerKey ? 100 : 0;
  const visualTypeLabel = VISUAL_TYPE_LABELS[currentChallenge.visualType] || "Figure";

  const resetForLevel = (levelKey) => {
    setCurrentChallenge(buildChallenge(configuredLevels[levelKey] || configuredLevels.level1));
    setSelectedAnswerKey("");
    setFinished(false);
    setIsCorrect(null);
    setScore(null);
  };

  const handleSelectLevel = (levelKey) => {
    if (finished) {
      return;
    }

    setCurrentLevel(levelKey);
    resetForLevel(levelKey);
  };

  const handleValidate = () => {
    if (!selectedAnswerKey || finished) {
      return;
    }

    const nextIsCorrect = selectedAnswerKey === currentChallenge.correctFraction.key;
    const nextScore = nextIsCorrect ? 20 : 0;

    setFinished(true);
    setIsCorrect(nextIsCorrect);
    setScore(nextScore);

    if (onComplete) {
      onComplete(nextScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
        selectedFraction: selectedFraction ? formatFraction(selectedFraction) : null,
        correctFraction: formatFraction(currentChallenge.correctFraction),
        visualType: currentChallenge.visualType,
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
    <div id="fractions-selection-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="fractions-selection"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[]}
        levels={allowedLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `fractions-selection-bouton-${levelKey}`}
        disableAllLevels={finished}
      />

      {!finished && (
        <ActivityStatus
          id="fractions-selection-status-panel"
          progressBarId="fractions-selection-progress-bar"
          progressPercent={progressPercent}
          label="Progression de la sélection de la fraction"
        />
      )}

      <div
        id="fractions-selection-main-layout"
        className="grid items-start gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
      >
        <section
          id="fractions-selection-visual-section"
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
          <div className="mb-3 border-b border-slate-100 pb-3">
            <h4 className="text-lg font-bold text-slate-800">Observe la fraction</h4>
            {!student && (
              <p className="text-sm text-slate-600">
                Compte les parts égales et regarde combien sont colorées.
              </p>
            )}
          </div>

          <div
            id="fractions-selection-visual-wrapper"
            className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50/80 p-3"
          >
            <FractionVisual
              id="fractions-selection-visual"
              fraction={currentChallenge.correctFraction}
              visualType={currentChallenge.visualType}
            />
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {visualTypeLabel} partagé en {currentChallenge.correctFraction.denominator} parts égales
            </span>
          </div>
        </section>

        <section
          id="fractions-selection-answers-section"
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
          <div className="mb-3 border-b border-slate-100 pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-800">Choisis la bonne fraction</h4>
                {!student && (
                  <p className="text-sm text-slate-600">
                    Une seule réponse correspond au visuel.
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  selectedFraction
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {selectedFraction ? `Choix : ${formatFraction(selectedFraction)}` : "Choisis une réponse"}
              </span>
            </div>
          </div>

          <div
            id="fractions-selection-answer-grid"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {currentChallenge.answerOptions.map((fraction) => {
              const isTileSelected = selectedAnswerKey === fraction.key;
              const isTileCorrect = finished && fraction.key === currentChallenge.correctFraction.key;
              const isTileIncorrect = finished && isTileSelected && fraction.key !== currentChallenge.correctFraction.key;

              return (
                <FractionChoiceTile
                  key={`${currentChallenge.id}-${fraction.tileId}`}
                  fraction={fraction}
                  selected={isTileSelected}
                  disabled={finished}
                  finished={finished}
                  isCorrect={isTileCorrect}
                  isIncorrect={isTileIncorrect}
                  onSelect={() => setSelectedAnswerKey(fraction.key)}
                />
              );
            })}
          </div>
        </section>
      </div>

      {finished && (
        <ActivitySummaryCard
          id="fractions-selection-summary"
          title="Activité terminée"
          message={
            isCorrect
              ? "Bravo ! Tu as reconnu la bonne fraction."
              : "Ce n'était pas la bonne fraction. Observe bien le nombre total de parts et le nombre de parts colorées."
          }
          score={score}
          tone={isCorrect ? "success" : "error"}
          stats={[
            {
              key: "selected",
              label: "Ta réponse",
              value: selectedFraction ? formatFraction(selectedFraction) : "-",
            },
            {
              key: "expected",
              label: "Bonne fraction",
              value: formatFraction(currentChallenge.correctFraction),
            },
          ]}
          footer={null}
        />
      )}

      <div id="fractions-selection-actions" className="flex flex-wrap justify-center gap-3">
        <ActivityIconButton
          id="fractions-selection-validate-button"
          onClick={handleValidate}
          disabled={!selectedAnswerKey || finished}
          ariaLabel="Valider"
          title="Valider"
          icon="✓"
          srText="Valider"
          variant="validate"
        />

        <ActivityIconButton
          id="fractions-selection-restart-button"
          onClick={handleRestart}
          disabled={restartLocked}
          ariaLabel="Recommencer"
          title="Recommencer"
          icon="↻"
          srText="Recommencer"
          variant={allStudentsCompleted ? "warning" : "restart"}
        />
      </div>
    </div>
  );
};

export default FractionsVisualSelectionActivity;
