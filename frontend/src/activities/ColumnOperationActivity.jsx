import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import FloatingNumberPad from "../components/FloatingNumberPad";
import {
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
  parseIntWithFallback,
  parsePositiveInt,
} from "../utils/activityUtils";

/* ───────────────────────── default content ───────────────────────── */

export const defaultColumnOperationActivityContent = {
  title: "Addition posée avec retenues",
  operation: "addition",
  instruction:
    "Pose l'addition en colonne, complète les retenues si besoin, puis écris le résultat.",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      min: 10,
      max: 50,
      step: 1,
      prefilled: true,
      requireCarry: true,
    },
    level2: {
      label: "Niveau 2",
      min: 10,
      max: 99,
      step: 1,
      prefilled: true,
      requireCarry: true,
    },
    level3: {
      label: "Niveau 3",
      min: 10,
      max: 99,
      step: 1,
      prefilled: false,
      requireCarry: true,
    },
    level4: {
      label: "Niveau 4",
      min: 100,
      max: 999,
      step: 1,
      prefilled: false,
      requireCarry: true,
    },
  },
};



/* ───────────────────────── colour palette ───────────────────────── */
// Units = Blue (#4749EB), Tens = Red (#E5395E), Hundreds = Green (#179858), Thousands = Yellow (#CA8A04), Carry = Purple (#9333EA)
const COLORS = {
  thousands: {
    text: "text-[#CA8A04]",
    border: "border-[#CA8A04]",
    ring: "ring-[#CA8A04]/30",
    borderLight: "border-[#CA8A04]/40",
    hoverBorder: "hover:border-[#CA8A04]",
    bg: "bg-[#CA8A04]/10",
    raw: "#CA8A04",
    animation: "animate-pulse-slow-yellow",
  },
  hundreds: {
    text: "text-[#179858]",
    border: "border-[#179858]",
    ring: "ring-[#179858]/30",
    borderLight: "border-[#179858]/40",
    hoverBorder: "hover:border-[#179858]",
    bg: "bg-[#179858]/10",
    raw: "#179858",
    animation: "animate-pulse-slow-green",
  },
  tens: {
    text: "text-[#E5395E]",
    border: "border-[#E5395E]",
    ring: "ring-[#E5395E]/30",
    borderLight: "border-[#E5395E]/40",
    hoverBorder: "hover:border-[#E5395E]",
    bg: "bg-[#E5395E]/10",
    raw: "#E5395E",
    animation: "animate-pulse-slow-red",
  },
  units: {
    text: "text-[#4749EB]",
    border: "border-[#4749EB]",
    ring: "ring-[#4749EB]/30",
    borderLight: "border-[#4749EB]/40",
    hoverBorder: "hover:border-[#4749EB]",
    bg: "bg-[#4749EB]/10",
    raw: "#4749EB",
    animation: "animate-pulse-slow-blue",
  },
  carry: {
    text: "text-[#9333EA]",
    border: "border-[#9333EA]",
    ring: "ring-[#9333EA]/30",
    borderLight: "border-[#9333EA]/40",
    hoverBorder: "hover:border-[#9333EA]",
    bg: "bg-[#9333EA]/10",
    raw: "#9333EA",
    animation: "animate-pulse-slow-purple",
  },
};

/* ───────────────────────── helpers ───────────────────────── */

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};

  const min = parseIntWithFallback(source.min, parseIntWithFallback(fallbackRule.min, 10));
  const max = parseIntWithFallback(source.max, parseIntWithFallback(fallbackRule.max, 99));
  const step = parsePositiveInt(source.step, parsePositiveInt(fallbackRule.step, 1));
  const prefilled = source.prefilled !== undefined ? Boolean(source.prefilled) : Boolean(fallbackRule.prefilled);
  const requireCarry = source.requireCarry !== undefined ? Boolean(source.requireCarry) : Boolean(fallbackRule.requireCarry);

  return {
    label: source.label || fallbackRule.label,
    skill: source.skill ?? fallbackRule.skill,
    min: Math.min(min, max),
    max: Math.max(min, max),
    step,
    prefilled,
    requireCarry,
  };
}

function getRandomFromRange(min, max, step = 1) {
  const safeStep = Math.max(1, step);
  const stepsCount = Math.floor((max - min) / safeStep) + 1;
  if (stepsCount <= 0) return min;
  const randomStepIndex = Math.floor(Math.random() * stepsCount);
  return min + randomStepIndex * safeStep;
}

/**
 * Checks whether adding `a + b` produces at least one carry (column overflow).
 */
function hasCarry(a, b) {
  const strA = String(a);
  const strB = String(b);
  const maxLen = Math.max(strA.length, strB.length);
  let carry = 0;
  for (let i = 0; i < maxLen; i++) {
    const dA = Number(strA[strA.length - 1 - i] || 0);
    const dB = Number(strB[strB.length - 1 - i] || 0);
    const colSum = dA + dB + carry;
    if (colSum >= 10) return true;
    carry = 0;
  }
  return false;
}

function hasBorrow(a, b) {
  const strA = String(a);
  const strB = String(b);
  const maxLen = Math.max(strA.length, strB.length);
  const padA = strA.padStart(maxLen, "0");
  const padB = strB.padStart(maxLen, "0");
  for (let i = 0; i < maxLen; i++) {
    if (Number(padA[i]) < Number(padB[i])) return true;
  }
  return false;
}

/**
 * Returns the number of digits (columns) needed to represent the addition.
 * Equal to the number of digits of the *result* (left + right).
 */
function digitCount(n) {
  if (n === 0) return 1;
  return String(Math.abs(n)).length;
}

/**
 * Generates a pair {left, right} for the given level rule.
 * If `requireCarry` is set, we retry until we find a pair with a carry.
 */
function generatePair(levelRule, operation) {
  const maxAttempts = 200;
  for (let i = 0; i < maxAttempts; i++) {
    const left = getRandomFromRange(levelRule.min, levelRule.max, levelRule.step);
    const right = getRandomFromRange(levelRule.min, levelRule.max, levelRule.step);
    
    if (operation === "soustraction") {
      if (left <= right) continue;
      if (hasBorrow(left, right)) continue;
      return { left, right, result: left - right };
    } else {
      if (levelRule.requireCarry && !hasCarry(left, right)) continue;
      return { left, right, result: left + right };
    }
  }
  // Fallback
  const left = getRandomFromRange(levelRule.min, levelRule.max, levelRule.step);
  const right = getRandomFromRange(levelRule.min, levelRule.max, levelRule.step);
  if (operation === "soustraction") {
    const maxVal = Math.max(left, right, 1);
    const minVal = Math.min(left, right, maxVal - 1);
    return { left: maxVal, right: minVal, result: maxVal - minVal };
  }
  return { left, right, result: left + right };
}

/**
 * Returns digit arrays padded to `cols` length.
 * Index 0 = leftmost (highest place value).
 */
function toDigitArray(n, cols) {
  const digits = String(n).split("").map(Number);
  while (digits.length < cols) digits.unshift(0);
  return digits;
}

/**
 * Compute expected carries for each column.
 * carries[i] = carry INTO column i (0 = leftmost).
 * The carry into the leftmost column is the potential extra digit of the result.
 */
function computeCarries(leftDigits, rightDigits, cols) {
  // carries[i] = carry into column i from the right
  // We compute from right to left
  const carries = new Array(cols).fill(0);
  let carry = 0;
  for (let i = cols - 1; i >= 0; i--) {
    const colSum = (leftDigits[i] || 0) + (rightDigits[i] || 0) + carry;
    carry = colSum >= 10 ? 1 : 0;
    if (i > 0) {
      carries[i - 1] = carry;
    }
  }
  // If there's still a carry after the leftmost column, we might need an extra column
  return { carries, overflowCarry: carry };
}

/* ───────────────────────── component ───────────────────────── */

const ColumnOperationActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultColumnOperationActivityContent.levels;

  const allowedLevelKeys = useMemo(() => {
    const allKeys = ["level1", "level2", "level3", "level4"];
    if (parsedContent?.levels && typeof parsedContent.levels === "object") {
      const configuredKeys = allKeys.filter((k) => parsedContent.levels[k] !== undefined);
      if (configuredKeys.length > 0) return configuredKeys;
    }
    return allKeys;
  }, [parsedContent]);

  const configuredLevels = useMemo(() => {
    const allKeys = ["level1", "level2", "level3", "level4"];
    const result = {};
    allKeys.forEach((k) => {
      const fallback = defaultLevels[k] || defaultLevels.level1;
      result[k] = normalizeLevelRule(parsedContent?.levels?.[k], fallback);
    });
    return result;
  }, [parsedContent, defaultLevels]);

  const initialLevel = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : allowedLevelKeys[0] || "level1";

  const operation = parsedContent?.operation === "soustraction" ? "soustraction" : "addition";

  /* ─── state ─── */
  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [problem, setProblem] = useState(() => generatePair(configuredLevels[initialLevel] || configuredLevels.level1, operation));
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [activeInput, setActiveInput] = useState(null);

  // Derived sizes
  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const cols = Math.max(String(problem.left).length, String(problem.right).length, String(problem.result).length);
  const leftDigits = toDigitArray(problem.left, cols);
  const rightDigits = toDigitArray(problem.right, cols);
  const resultDigits = toDigitArray(problem.result, cols);
  const { carries } = computeCarries(
    toDigitArray(problem.left, cols),
    toDigitArray(problem.right, cols),
    cols,
  );

  // Answers: { leftN: "digit", rightN: "digit", carryN: "digit", resultN: "digit" }
  const buildEmptyAnswers = useCallback((prob, lvlRule) => {
    const c = Math.max(String(prob.left).length, String(prob.right).length, String(prob.result).length);
    const lDigits = toDigitArray(prob.left, c);
    const rDigits = toDigitArray(prob.right, c);
    const ans = {};
    for (let i = 0; i < c; i++) {
      // If prefilled, pre-populate the operand digits (excluding leading zeros from padding)
      if (lvlRule.prefilled) {
        // Only show digits that belong to the actual number (skip padded zeros)
        const leftActualLen = String(prob.left).length;
        const rightActualLen = String(prob.right).length;
        ans[`left${i}`] = i >= c - leftActualLen ? String(lDigits[i]) : "";
        ans[`right${i}`] = i >= c - rightActualLen ? String(rDigits[i]) : "";
      } else {
        ans[`left${i}`] = "";
        ans[`right${i}`] = "";
      }
      ans[`carry${i}`] = "";
      ans[`result${i}`] = "";
    }
    return ans;
  }, []);

  const [answers, setAnswers] = useState(() => buildEmptyAnswers(problem, currentLevelRule));

  // Track input refs for navigation
  const inputRefs = useRef({});

  const registerRef = useCallback((key, el) => {
    if (el) inputRefs.current[key] = el;
  }, []);

  /* ─── derived display texts ─── */
  const displayTitle = getSafeDisplayText(parsedContent?.title, defaultColumnAdditionActivityContent.title);
  const displayInstruction = getSafeDisplayText(parsedContent?.instruction, defaultColumnAdditionActivityContent.instruction);

  /* ─── input helpers ─── */
  const updateAnswer = (key, value) => {
    if (finished) return;
    // Accept only single digit
    const filtered = value.replace(/[^0-9]/g, "").slice(-1);
    setAnswers((prev) => ({ ...prev, [key]: filtered }));
  };

  const openNumberPad = (key) => {
    if (finished) return;
    setActiveInput(key);
  };

  /* ─── number pad handlers ─── */
  const handleNumberPadKey = (keyValue) => {
    if (!activeInput) return;

    if (keyValue === "=") {
      // Move to next field
      moveToNextField(activeInput);
      return;
    }
    if (keyValue === "<") {
      moveToPrevField(activeInput);
      return;
    }
    if (keyValue === ">") {
      moveToNextField(activeInput);
      return;
    }

    updateAnswer(activeInput, keyValue);
    // Auto-advance after entering a digit
    setTimeout(() => moveToNextField(activeInput), 100);
  };

  const handleNumberPadBackspace = () => {
    if (!activeInput) return;
    updateAnswer(activeInput, "");
  };

  const handleNumberPadClose = () => {
    setActiveInput(null);
  };

  // Build ordered list of fillable fields for navigation
  const getFieldOrder = useCallback(() => {
    const fields = [];
    // For each column (left to right):
    // If not prefilled: left row digits, then right row digits
    // Carry row, result row
    for (let i = 0; i < cols; i++) {
      if (!currentLevelRule.prefilled) {
        fields.push(`left${i}`);
      }
    }
    for (let i = 0; i < cols; i++) {
      if (!currentLevelRule.prefilled) {
        fields.push(`right${i}`);
      }
    }
    // Carry fields (only where there could be a carry, i.e. not the rightmost column)
    for (let i = 0; i < cols; i++) {
      const posFromRight = cols - 1 - i;
      if (posFromRight > 0) {
        fields.push(`carry${i}`);
      }
    }
    // Result row
    for (let i = 0; i < cols; i++) {
      fields.push(`result${i}`);
    }
    return fields;
  }, [cols, currentLevelRule.prefilled, carries]);

  const moveToNextField = (currentKey) => {
    const fields = getFieldOrder();
    const idx = fields.indexOf(currentKey);
    if (idx >= 0 && idx < fields.length - 1) {
      const nextKey = fields[idx + 1];
      setActiveInput(nextKey);
      inputRefs.current[nextKey]?.focus();
    }
  };

  const moveToPrevField = (currentKey) => {
    const fields = getFieldOrder();
    const idx = fields.indexOf(currentKey);
    if (idx > 0) {
      const prevKey = fields[idx - 1];
      setActiveInput(prevKey);
      inputRefs.current[prevKey]?.focus();
    }
  };

  /* ─── validation ─── */
  const isResultCorrect = () => {
    for (let i = 0; i < cols; i++) {
      const expected = resultDigits[i];
      const given = Number(answers[`result${i}`]);
      if (!Number.isFinite(given) || given !== expected) return false;

      // If not prefilled, also check operand digits
      if (!currentLevelRule.prefilled) {
        const expectedLeft = leftDigits[i];
        const expectedRight = rightDigits[i];
        const givenLeft = Number(answers[`left${i}`]);
        const givenRight = Number(answers[`right${i}`]);
        // Only validate digits that are part of the actual number (not padding zeros)
        const leftActualLen = String(problem.left).length;
        const rightActualLen = String(problem.right).length;
        if (i >= cols - leftActualLen) {
          if (!Number.isFinite(givenLeft) || givenLeft !== expectedLeft) return false;
        }
        if (i >= cols - rightActualLen) {
          if (!Number.isFinite(givenRight) || givenRight !== expectedRight) return false;
        }
      }
    }
    return true;
  };

  const allResultFieldsFilled = () => {
    for (let i = 0; i < cols; i++) {
      if (answers[`result${i}`] === "") return false;
      if (!currentLevelRule.prefilled) {
        const leftActualLen = String(problem.left).length;
        const rightActualLen = String(problem.right).length;
        if (i >= cols - leftActualLen && answers[`left${i}`] === "") return false;
        if (i >= cols - rightActualLen && answers[`right${i}`] === "") return false;
      }
    }
    return true;
  };

  const handleValidate = () => {
    const correct = isResultCorrect();
    const nextScore = correct ? 20 : 0;
    setScore(nextScore);
    setFinished(true);
    setActiveInput(null);

    if (onComplete) {
      onComplete(nextScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
      });
    }
  };

  const resetForLevel = (levelKey) => {
    const lvlRule = configuredLevels[levelKey] || configuredLevels.level1;
    const nextProblem = generatePair(lvlRule, operation);
    setProblem(nextProblem);
    setAnswers(buildEmptyAnswers(nextProblem, lvlRule));
    setFinished(false);
    setScore(null);
    setActiveInput(null);
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) return;
    resetForLevel(currentLevel);
  };

  const handleSelectLevel = (levelKey) => {
    setCurrentLevel(levelKey);
    resetForLevel(levelKey);
  };

  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;

  /* ─── progress ─── */
  const totalFields = (() => {
    let count = cols; // result fields
    if (!currentLevelRule.prefilled) {
      count += String(problem.left).length + String(problem.right).length;
    }
    return count;
  })();
  const filledFields = (() => {
    let count = 0;
    for (let i = 0; i < cols; i++) {
      if (answers[`result${i}`] !== "") count++;
      if (!currentLevelRule.prefilled) {
        const leftActualLen = String(problem.left).length;
        const rightActualLen = String(problem.right).length;
        if (i >= cols - leftActualLen && answers[`left${i}`] !== "") count++;
        if (i >= cols - rightActualLen && answers[`right${i}`] !== "") count++;
      }
    }
    return count;
  })();
  const progressPercent = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  /* ─── column color helper ─── */
  const getColumnColor = (colIndex) => {
    // colIndex 0 = leftmost
    const posFromRight = cols - 1 - colIndex;
    if (posFromRight === 0) return COLORS.units;
    if (posFromRight === 1) return COLORS.tens;
    if (posFromRight === 2) return COLORS.hundreds;
    return COLORS.thousands;
  };

  const getColumnLabel = (colIndex) => {
    const posFromRight = cols - 1 - colIndex;
    if (posFromRight === 0) return "u";
    if (posFromRight === 1) return "d";
    if (posFromRight === 2) return "c";
    return "m";
  };

  const getColumnFullLabel = (colIndex) => {
    const posFromRight = cols - 1 - colIndex;
    if (posFromRight === 0) return "Unités";
    if (posFromRight === 1) return "Dizaines";
    if (posFromRight === 2) return "Centaines";
    return "Milliers";
  };

  /* ─── active field label for number pad ─── */
  const getActiveFieldLabel = () => {
    if (!activeInput) return null;
    const match = activeInput.match(/^(left|right|carry|result)(\d+)$/);
    if (!match) return null;
    const [, type, idxStr] = match;
    const idx = Number(idxStr);
    const colLabel = getColumnFullLabel(idx);
    const typeLabels = { left: "1er nombre", right: "2e nombre", carry: "Retenue", result: "Résultat" };
    return `${typeLabels[type]} — ${colLabel}`;
  };

  /* ─── cell rendering ─── */
  const renderDigitInput = (key, colIndex, { readonly = false, isCarry = false } = {}) => {
    const color = isCarry ? COLORS.carry : getColumnColor(colIndex);
    const isFocused = activeInput === key;
    const value = answers[key] || "";

    const baseSize = isCarry
      ? "w-8 h-8 text-base sm:w-9 sm:h-9 sm:text-lg"
      : "w-10 h-10 text-xl sm:w-12 sm:h-12 sm:text-2xl";

    const borderClass = isFocused
      ? `${color.border} ring-2 ${color.ring}`
      : `${color.borderLight} ${color.hoverBorder}`;

    const animClass = !finished && !isFocused && !readonly && value === ""
      ? `${color.animation} motion-reduce:animate-none`
      : "";

    if (readonly) {
      return (
        <div
          key={key}
          id={`column-addition-${key}`}
          className={`activity-number-tile-text inline-flex items-center justify-center rounded-lg border-2 font-bold ${baseSize} ${color.text} ${color.border} ${color.bg}`}
        >
          {value}
        </div>
      );
    }

    return (
      <input
        key={key}
        id={`column-addition-${key}`}
        ref={(el) => registerRef(key, el)}
        type="text"
        inputMode="none"
        autoComplete="off"
        maxLength={1}
        value={value}
        onFocus={() => openNumberPad(key)}
        onClick={() => openNumberPad(key)}
        onChange={(e) => updateAnswer(key, e.target.value)}
        disabled={finished}
        aria-label={getActiveFieldLabel()}
        className={`activity-number-tile-text inline-flex items-center justify-center rounded-lg border-2 text-center font-bold ${baseSize} ${color.text} ${borderClass} ${animClass} ${isCarry ? "border-dashed" : ""
          }`}
      />
    );
  };

  /* ─── render ─── */
  return (
    <div id="column-addition-activity-root" className="space-y-2.5 sm:space-y-3">
      <ActivityHero
        idPrefix="column-addition"
        activityContent={parsedContent}
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "range",
            label: `Nombres entre ${currentLevelRule.min} et ${currentLevelRule.max}`,
            className: "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800",
          },
          {
            key: "mode",
            label: currentLevelRule.prefilled ? "Nombres pré-remplis" : "Nombres à saisir",
            className: "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800",
          },
        ]}
        levels={allowedLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `column-addition-bouton-${levelKey}`}
        disableAllLevels={finished}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="column-addition-status-panel"
          progressBarId="column-addition-progress-bar"
          progressPercent={progressPercent}
          label="Progression de l'addition"
        />
      )}

      {/* ─── Operation section ─── */}
      <section
        id="column-addition-operation-section"
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
      >
        {/* Inline display: left + right = ? */}
        <div
          id="column-addition-inline"
          className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3"
        >
          <span className="activity-number-tile-text text-xl font-bold text-slate-800 sm:text-2xl">
            {problem.left}
          </span>
          <span className="text-xl font-bold text-slate-400 sm:text-2xl">{operation === "soustraction" ? "-" : "+"}</span>
          <span className="activity-number-tile-text text-xl font-bold text-slate-800 sm:text-2xl">
            {problem.right}
          </span>
          <span className="text-xl font-bold text-slate-400 sm:text-2xl">=</span>
          <span className="activity-number-tile-text text-xl font-bold text-slate-800 sm:text-2xl">
            {finished ? problem.result : "?"}
          </span>
        </div>

        {/* Column headers */}
        <div id="column-addition-grid-container" className="mx-auto w-max">
          <div id="column-addition-headers-row" className="flex items-end justify-end gap-1 sm:gap-1.5 mb-1">
            {/* Spacer for the + sign column */}
            <div className="w-8 sm:w-10" />
            {Array.from({ length: cols }, (_, i) => {
              const color = getColumnColor(i);
              return (
                <div
                  key={`header-${i}`}
                  id={`column-addition-header-${i}`}
                  className={`flex w-10 items-center justify-center text-xs font-bold uppercase sm:w-12 ${color.text}`}
                >
                  {getColumnLabel(i)}
                </div>
              );
            })}
          </div>

          {/* Carry row */}
          {operation !== "soustraction" && (
            <div id="column-addition-carry-row" className="flex items-center justify-end gap-1 sm:gap-1.5 mb-1">
              <div className="w-8 sm:w-10" />
            {Array.from({ length: cols }, (_, i) => {
              // Show carry input only for columns that can receive a carry
              // (i.e. not the rightmost column)
              const posFromRight = cols - 1 - i;
              if (posFromRight === 0) {
                // Rightmost column: no carry input (always 0)
                return <div key={`carry-spacer-${i}`} className="w-10 sm:w-12" />;
              }
              return (
                <div key={`carry-cell-${i}`} id={`column-addition-carry-cell-${i}`} className="flex w-10 sm:w-12 items-center justify-center">
                  {renderDigitInput(`carry${i}`, i, { isCarry: true })}
                </div>
              );
            })}
            </div>
          )}

          {/* First operand row */}
          <div id="column-addition-left-operand-row" className="flex items-center justify-end gap-1 sm:gap-1.5 mb-1">
            <div className="w-8 sm:w-10" />
            {Array.from({ length: cols }, (_, i) => {
              const leftActualLen = String(problem.left).length;
              const isPadded = i < cols - leftActualLen;
              if (isPadded) {
                return <div key={`left-spacer-${i}`} className="w-10 sm:w-12" />;
              }
              return (
                <div key={`left-cell-${i}`} id={`column-addition-left-cell-${i}`} className="flex w-10 sm:w-12 items-center justify-center">
                  {renderDigitInput(`left${i}`, i, { readonly: currentLevelRule.prefilled })}
                </div>
              );
            })}
          </div>

          {/* Second operand row with operator sign */}
          <div id="column-addition-right-operand-row" className="flex items-center justify-end gap-1 sm:gap-1.5 mb-1">
            <div id="column-addition-plus-sign" className="flex w-8 items-center justify-center text-xl font-bold text-slate-600 sm:w-10 sm:text-2xl">
              {operation === "soustraction" ? "-" : "+"}
            </div>
            {Array.from({ length: cols }, (_, i) => {
              const rightActualLen = String(problem.right).length;
              const isPadded = i < cols - rightActualLen;
              if (isPadded) {
                return <div key={`right-spacer-${i}`} className="w-10 sm:w-12" />;
              }
              return (
                <div key={`right-cell-${i}`} id={`column-addition-right-cell-${i}`} className="flex w-10 sm:w-12 items-center justify-center">
                  {renderDigitInput(`right${i}`, i, { readonly: currentLevelRule.prefilled })}
                </div>
              );
            })}
          </div>

          {/* Separator line */}
          <div id="column-addition-separator-row" className="mb-1 w-full">
            <div className="border-t-2 border-slate-800 w-full" />
          </div>

          {/* Result row */}
          <div id="column-addition-result-row" className="flex items-center justify-end gap-1 sm:gap-1.5">
            <div className="w-8 sm:w-10" />
            {Array.from({ length: cols }, (_, i) => (
              <div key={`result-cell-${i}`} id={`column-addition-result-cell-${i}`} className="flex w-10 sm:w-12 items-center justify-center">
                {renderDigitInput(`result${i}`, i)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {finished && (
        <ActivitySummaryCard
          id="column-addition-summary"
          title="Activité terminée"
          message={
            score === 20
              ? `Bravo, l'${operation === "soustraction" ? "soustraction" : "addition"} est correctement posée !`
              : "Observe la correction et réessaie."
          }
          score={score}
          valueClassName="activity-number-tile-text"
          stats={[
            { key: "result", label: "Résultat attendu", value: problem.result },
            { key: "score", label: "Score", value: `${score} / 20` },
          ]}
        />
      )}

      <ActivityActionsBar
        id="column-addition-actions"
        className="flex flex-wrap justify-center gap-2"
        actions={[
          {
            id: "column-addition-validate-button",
            onClick: handleValidate,
            disabled: finished || !allResultFieldsFilled(),
            ariaLabel: "Valider",
            title: "Valider",
            icon: "✓",
            srText: "Valider",
            variant: "validate",
          },
          {
            id: "column-addition-restart-button",
            onClick: handleRestart,
            disabled: restartLocked || !finished,
            ariaLabel: "Recommencer",
            title: "Recommencer",
            icon: "↻",
            srText: "Recommencer",
            variant: allStudentsCompleted ? "warning" : "restart",
          },
        ]}
      />

      {/* Floating Number Pad */}
      <FloatingNumberPad
        isOpen={activeInput !== null && !finished}
        activeFieldLabel={getActiveFieldLabel()}
        onKeyPress={handleNumberPadKey}
        onBackspace={handleNumberPadBackspace}
        onClose={handleNumberPadClose}
      />
    </div>
  );
};

export default ColumnOperationActivity;
