import React, { useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import BaseTenBlocksVisuals from "../components/BaseTenBlocksVisuals";
import FloatingNumberPad from "../components/FloatingNumberPad";
import HandwritingOCRModal from "../components/HandwritingOCRModal";
import MyScriptHandwritingModal from "../components/MyScriptHandwritingModal";
import {
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
  parsePositiveInt,
  randomRotation,
} from "../utils/activityUtils";

export const defaultBaseTenBlocksActivityContent = {
  title: "Dénombrement en base 10",
  instruction: "Observe les blocs, regroupe-les si besoin, puis écris le nombre de milliers, centaines, dizaines, unités et le total.",
  defaultLevel: "level1",
  inputType: "NumberPad", // "NumberPad" or "OCR" or "MyScript"
  levels: {
    level1: {
      label: "Niveau 1",
      exerciseCount: 2,
      minThousands: 0,
      maxThousands: 0,
      minHundreds: 0,
      maxHundreds: 0,
      minTens: 1,
      maxTens: 9,
      minUnits: 0,
      maxUnits: 9,
    },
    level2: {
      label: "Niveau 2",
      exerciseCount: 2,
      minThousands: 0,
      maxThousands: 0,
      minHundreds: 1,
      maxHundreds: 3,
      minTens: 1,
      maxTens: 9,
      minUnits: 0,
      maxUnits: 9,
    },
    level3: {
      label: "Niveau 3",
      exerciseCount: 2,
      minThousands: 0,
      maxThousands: 0,
      minHundreds: 1,
      maxHundreds: 4,
      minTens: 0,
      maxTens: 16,
      minUnits: 0,
      maxUnits: 16,
    },
    level4: {
      label: "Niveau 4",
      exerciseCount: 2,
      minThousands: 1,
      maxThousands: 3,
      minHundreds: 0,
      maxHundreds: 12,
      minTens: 0,
      maxTens: 12,
      minUnits: 0,
      maxUnits: 15,
    },
  },
};

const TILE_ROTATION_MIN_DEGREES = -3;
const TILE_ROTATION_MAX_DEGREES = 3;
const CLICK_DELAY_MS = 220;
const FIELD_LABELS = {
  milliers: "Milliers",
  centaines: "Centaines",
  dizaines: "Dizaines",
  unites: "Unités",
  total: "Total",
};

function parseIntWithBounds(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const int = Math.trunc(parsed);
  return Math.max(min, Math.min(max, int));
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};

  const exerciseCount = parsePositiveInt(source.exerciseCount, fallbackRule.exerciseCount);
  const minThousands = parseIntWithBounds(
    source.minThousands,
    fallbackRule.minThousands ?? 0,
    0,
    9
  );
  const maxThousands = parseIntWithBounds(
    source.maxThousands,
    fallbackRule.maxThousands ?? 0,
    0,
    9
  );
  const minHundreds = parseIntWithBounds(
    source.minHundreds ?? source.minCartons,
    fallbackRule.minHundreds ?? 0,
    0,
    20
  );
  const maxHundreds = parseIntWithBounds(
    source.maxHundreds ?? source.maxCartons,
    fallbackRule.maxHundreds ?? 0,
    0,
    20
  );
  const minTens = parseIntWithBounds(
    source.minTens ?? source.minPouches,
    fallbackRule.minTens ?? 0,
    0,
    30
  );
  const maxTens = parseIntWithBounds(
    source.maxTens ?? source.maxPouches,
    fallbackRule.maxTens ?? 0,
    0,
    30
  );
  const minUnits = parseIntWithBounds(source.minUnits, fallbackRule.minUnits ?? 0, 0, 99);
  const maxUnits = parseIntWithBounds(source.maxUnits, fallbackRule.maxUnits ?? 0, 0, 99);

  return {
    label: source.label || fallbackRule.label,
    exerciseCount,
    minThousands: Math.min(minThousands, maxThousands),
    maxThousands: Math.max(minThousands, maxThousands),
    minHundreds: Math.min(minHundreds, maxHundreds),
    maxHundreds: Math.max(minHundreds, maxHundreds),
    minTens: Math.min(minTens, maxTens),
    maxTens: Math.max(minTens, maxTens),
    minUnits: Math.min(minUnits, maxUnits),
    maxUnits: Math.max(minUnits, maxUnits),
  };
}

function randomIntBetween(min, max) {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function buildExercises(levelRule) {
  return Array.from({ length: levelRule.exerciseCount }, (_, index) => {
    const thousands = randomIntBetween(levelRule.minThousands, levelRule.maxThousands);
    const hundreds = randomIntBetween(levelRule.minHundreds, levelRule.maxHundreds);
    const tens = randomIntBetween(levelRule.minTens, levelRule.maxTens);
    const units = randomIntBetween(levelRule.minUnits, levelRule.maxUnits);

    return {
      id: index + 1,
      thousands,
      thousands_rotations: Array.from({ length: thousands }, () =>
        randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)
      ),
      hundreds,
      hundreds_rotations: Array.from({ length: hundreds }, () =>
        randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)
      ),
      tens,
      tens_rotations: Array.from({ length: tens }, () =>
        randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)
      ),
      units,
      units_rotations: Array.from({ length: units }, () =>
        randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)
      ),
    };
  });
}

const BaseTenBlocksActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultBaseTenBlocksActivityContent.levels;
  const configuredLevels = {
    level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
    level4: normalizeLevelRule(parsedContent?.levels?.level4, defaultLevels.level4),
  };

  const allowedLevelKeys = ["level1", "level2", "level3", "level4"];
  const initialLevel = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [exercises, setExercises] = useState(
    buildExercises(configuredLevels[initialLevel] || configuredLevels.level1)
  );
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(null);
  const [activeInput, setActiveInput] = useState(null);
  const [ocrPosition, setOcrPosition] = useState(null);
  const inputType = parsedContent?.inputType || defaultBaseTenBlocksActivityContent.inputType;
  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const clickTimeoutRef = useRef(null);

  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultBaseTenBlocksActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultBaseTenBlocksActivityContent.instruction
  );

  const clearPendingClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
  };

  const queueSingleClickAction = (action) => {
    clearPendingClick();
    clickTimeoutRef.current = window.setTimeout(() => {
      clickTimeoutRef.current = null;
      action();
    }, CLICK_DELAY_MS);
  };

  const handleDoubleClickAction = (event, action) => {
    event.preventDefault();
    clearPendingClick();
    action();
  };

  const openNumberPad = (exerciseId, field) => {
    if (finished) return;

    setActiveInput({
      exerciseId,
      field,
      label: FIELD_LABELS[field] || "Réponse",
    });
  };

  const closeNumberPad = () => {
    setActiveInput(null);
  };

  const handleNumberPadKeyPress = (keyValue) => {
    if (!activeInput || finished) return;

    const currentValue = answers[activeInput.exerciseId]?.[activeInput.field] || "";
    updateAnswer(activeInput.exerciseId, activeInput.field, `${currentValue}${keyValue}`);
  };

  const handleOCRRecognized = (recognizedText) => {
    if (!activeInput || finished) return;
    updateAnswer(activeInput.exerciseId, activeInput.field, recognizedText);
    closeNumberPad();
  };

  const handleNumberPadBackspace = () => {
    if (!activeInput || finished) return;

    const currentValue = answers[activeInput.exerciseId]?.[activeInput.field] || "";
    updateAnswer(activeInput.exerciseId, activeInput.field, currentValue.slice(0, -1));
  };

  useEffect(() => {
    if (activeInput && (inputType === "OCR" || inputType === "MyScript")) {
      const inputId = `base-ten-blocks-${activeInput.field}-${activeInput.exerciseId}`;
      const inputEl = document.getElementById(inputId);
      if (inputEl) {
        const rect = inputEl.getBoundingClientRect();
        const modalHeight = inputType === "MyScript" ? 630 : 350;
        const modalWidth = inputType === "MyScript" ? 448 : 350;
        const top =
          rect.top > modalHeight + 20
            ? rect.top - modalHeight - 10
            : rect.bottom + 10;

        setOcrPosition({
          top: Math.max(10, Math.min(window.innerHeight - modalHeight, top)),
          left: Math.max(10, Math.min(window.innerWidth - modalWidth, rect.left)),
        });
      }
    } else {
      setOcrPosition(null);
    }
  }, [activeInput, inputType]);

  useEffect(() => {
    return () => {
      clearPendingClick();
    };
  }, []);

  const showThousandsInput = exercises.some(
    (exercise) =>
      exercise.thousands > 0 ||
      (exercise.hundreds * 100 + exercise.tens * 10 + exercise.units > 999)
  );

  const showCentainesInput =
    showThousandsInput ||
    exercises.some(
      (exercise) => exercise.hundreds * 100 + exercise.tens * 10 + exercise.units > 99
    );

  const isExerciseAnswered = (exercise) => {
    const milliers = answers[exercise.id]?.milliers;
    const centaines = answers[exercise.id]?.centaines;
    const dizaines = answers[exercise.id]?.dizaines;
    const unites = answers[exercise.id]?.unites;
    const total = answers[exercise.id]?.total;

    return (
      (!showThousandsInput || (milliers !== undefined && milliers !== "")) &&
      (!showCentainesInput || (centaines !== undefined && centaines !== "")) &&
      dizaines !== undefined &&
      dizaines !== "" &&
      unites !== undefined &&
      unites !== "" &&
      total !== undefined &&
      total !== ""
    );
  };

  const updateAnswer = (exerciseId, field, rawValue) => {
    if (finished) return;

    const maxLength = field === "total" ? 4 : 2;
    const cleanValue = String(rawValue || "")
      .replace(/[^0-9]/g, "")
      .slice(0, maxLength);

    setAnswers((prev) => ({
      ...prev,
      [exerciseId]: {
        milliers: prev[exerciseId]?.milliers || "",
        centaines: prev[exerciseId]?.centaines || "",
        dizaines: prev[exerciseId]?.dizaines || "",
        unites: prev[exerciseId]?.unites || "",
        total: prev[exerciseId]?.total || "",
        [field]: cleanValue,
      },
    }));
  };

  const restartForLevel = (levelKey) => {
    const rule = configuredLevels[levelKey] || configuredLevels.level1;
    setExercises(buildExercises(rule));
    setAnswers({});
    setFinished(false);
    setCorrectCount(0);
    setScore(null);
    setActiveInput(null);
  };

  const handleSelectLevel = (levelKey) => {
    setCurrentLevel(levelKey);
    restartForLevel(levelKey);
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }

    restartForLevel(currentLevel);
  };

  const handleGroupUnitsToTens = (exerciseId) => {
    if (finished) return;

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId || exercise.units < 10) {
          return exercise;
        }

        return {
          ...exercise,
          tens: exercise.tens + 1,
          tens_rotations: [
            ...exercise.tens_rotations,
            randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
          ],
          units: exercise.units - 10,
          units_rotations: exercise.units_rotations.slice(
            0,
            Math.max(0, exercise.units_rotations.length - 10)
          ),
        };
      })
    );
  };

  const handleUngroupTensToUnits = (exerciseId) => {
    if (finished) return;

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId || exercise.tens < 1) {
          return exercise;
        }

        return {
          ...exercise,
          tens: exercise.tens - 1,
          tens_rotations: exercise.tens_rotations.slice(
            0,
            Math.max(0, exercise.tens_rotations.length - 1)
          ),
          units: exercise.units + 10,
          units_rotations: [
            ...exercise.units_rotations,
            ...Array.from({ length: 10 }, () =>
              randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)
            ),
          ],
        };
      })
    );
  };

  const handleGroupTensToHundreds = (exerciseId) => {
    if (finished) return;

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId || exercise.tens < 10) {
          return exercise;
        }

        return {
          ...exercise,
          hundreds: exercise.hundreds + 1,
          hundreds_rotations: [
            ...exercise.hundreds_rotations,
            randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
          ],
          tens: exercise.tens - 10,
          tens_rotations: exercise.tens_rotations.slice(
            0,
            Math.max(0, exercise.tens_rotations.length - 10)
          ),
        };
      })
    );
  };

  const handleUngroupHundredsToTens = (exerciseId) => {
    if (finished) return;

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId || exercise.hundreds < 1) {
          return exercise;
        }

        return {
          ...exercise,
          hundreds: exercise.hundreds - 1,
          hundreds_rotations: exercise.hundreds_rotations.slice(
            0,
            Math.max(0, exercise.hundreds_rotations.length - 1)
          ),
          tens: exercise.tens + 10,
          tens_rotations: [
            ...exercise.tens_rotations,
            ...Array.from({ length: 10 }, () =>
              randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)
            ),
          ],
        };
      })
    );
  };

  const handleGroupHundredsToThousands = (exerciseId) => {
    if (finished) return;

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId || exercise.hundreds < 10) {
          return exercise;
        }

        return {
          ...exercise,
          thousands: (exercise.thousands || 0) + 1,
          thousands_rotations: [
            ...(exercise.thousands_rotations || []),
            randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
          ],
          hundreds: exercise.hundreds - 10,
          hundreds_rotations: exercise.hundreds_rotations.slice(
            0,
            Math.max(0, exercise.hundreds_rotations.length - 10)
          ),
        };
      })
    );
  };

  const handleUngroupThousandsToHundreds = (exerciseId) => {
    if (finished) return;

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId || (exercise.thousands || 0) < 1) {
          return exercise;
        }

        return {
          ...exercise,
          thousands: exercise.thousands - 1,
          thousands_rotations: (exercise.thousands_rotations || []).slice(
            0,
            Math.max(0, (exercise.thousands_rotations || []).length - 1)
          ),
          hundreds: exercise.hundreds + 10,
          hundreds_rotations: [
            ...exercise.hundreds_rotations,
            ...Array.from({ length: 10 }, () =>
              randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)
            ),
          ],
        };
      })
    );
  };

  const isExerciseCorrect = (exercise) => {
    const givenMilliers = Number(answers[exercise.id]?.milliers);
    const givenCentaines = Number(answers[exercise.id]?.centaines);
    const givenDizaines = Number(answers[exercise.id]?.dizaines);
    const givenUnites = Number(answers[exercise.id]?.unites);
    const givenTotal = Number(answers[exercise.id]?.total);
    const expectedTotal =
      (exercise.thousands || 0) * 1000 +
      exercise.hundreds * 100 +
      exercise.tens * 10 +
      exercise.units;

    if (
      !Number.isFinite(givenDizaines) ||
      !Number.isFinite(givenUnites) ||
      !Number.isFinite(givenTotal)
    )
      return false;
    if (showThousandsInput && !Number.isFinite(givenMilliers)) return false;
    if (showCentainesInput && !Number.isFinite(givenCentaines)) return false;

    return (
      (!showThousandsInput || givenMilliers === (exercise.thousands || 0)) &&
      (!showCentainesInput || givenCentaines === exercise.hundreds) &&
      givenDizaines === exercise.tens &&
      givenUnites === exercise.units &&
      givenTotal === expectedTotal
    );
  };

  const handleValidate = () => {
    const nextCorrectCount = exercises.reduce((count, exercise) => {
      return count + (isExerciseCorrect(exercise) ? 1 : 0);
    }, 0);

    const nextScore = Math.round((nextCorrectCount / Math.max(1, exercises.length)) * 20);
    setCorrectCount(nextCorrectCount);
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

  const totalExercises = exercises.length;
  const answeredCount = exercises.filter((exercise) => isExerciseAnswered(exercise)).length;
  const progressPercent =
    totalExercises > 0 ? Math.round((answeredCount / totalExercises) * 100) : 0;
  const allAnswered = totalExercises > 0 && answeredCount === totalExercises;

  const getInputGridColsClass = () => {
    if (showThousandsInput) {
      return "grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr]";
    }
    if (showCentainesInput) {
      return "grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]";
    }
    return "grid-cols-[1fr_auto_1fr_auto_1fr]";
  };

  return (
    <div id="base-ten-blocks-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="base-ten-blocks"
        activityContent={parsedContent}
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "count",
            label: `${totalExercises} exercice${totalExercises > 1 ? "s" : ""}`,
            className:
              "inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800",
          },
          ...(currentLevelRule.minThousands > 0 || currentLevelRule.maxThousands > 0
            ? [
                {
                  key: "thousands",
                  label: `${currentLevelRule.minThousands} à ${currentLevelRule.maxThousands} millier${
                    currentLevelRule.maxThousands > 1 ? "s" : ""
                  }`,
                  className:
                    "inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800",
                },
              ]
            : []),
          ...(currentLevelRule.minHundreds > 0 || currentLevelRule.maxHundreds > 0
            ? [
                {
                  key: "hundreds",
                  label: `${currentLevelRule.minHundreds} à ${currentLevelRule.maxHundreds} centaine${
                    currentLevelRule.maxHundreds > 1 ? "s" : ""
                  }`,
                  className:
                    "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800",
                },
              ]
            : []),
          {
            key: "tens",
            label: `${currentLevelRule.minTens} à ${currentLevelRule.maxTens} dizaine${
              currentLevelRule.maxTens > 1 ? "s" : ""
            }`,
            className:
              "inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800",
          },
          {
            key: "units",
            label: `${currentLevelRule.minUnits} à ${currentLevelRule.maxUnits} unité${
              currentLevelRule.maxUnits > 1 ? "s" : ""
            }`,
            className:
              "inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800",
          },
        ]}
        levels={allowedLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey]?.label || levelKey,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `base-ten-blocks-bouton-${levelKey}`}
        disableAllLevels={finished}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      <ActivityStatus
        id="base-ten-blocks-status-panel"
        progressBarId="base-ten-blocks-progress-bar"
        progressPercent={progressPercent}
        label="Progression des blocs"
      />

      <section
        id="base-ten-blocks-word-pool-section"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-800">Exercices à compléter</h4>
              <p className="text-sm text-slate-600">
                Regroupe ou sépare les blocs si besoin, puis renseigne les cases de numération.
              </p>
            </div>
            <div className="text-sm text-slate-600">
              {finished ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                  Vérification terminée, {correctCount} / {totalExercises} correct
                  {totalExercises > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  Complète toutes les cases avant de valider
                </span>
              )}
            </div>
          </div>
        </div>

        <div id="base-ten-blocks-word-pool" className="bg-slate-50/70 p-3 sm:p-5">
          <div id="base-ten-blocks-grid" className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {exercises.map((exercise) => {
              const correct = finished ? isExerciseCorrect(exercise) : null;
              return (
                <div
                  key={exercise.id}
                  id={`base-ten-blocks-case-${exercise.id}`}
                  className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${
                    !finished
                      ? "border-slate-200 bg-white"
                      : correct
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-rose-300 bg-rose-50"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h5
                      id={`base-ten-blocks-case-title-${exercise.id}`}
                      className="text-base font-bold text-slate-800"
                    >
                      Exercice {exercise.id}
                    </h5>
                    {finished ? (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          correct
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {correct ? "Correct" : "À corriger"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {isExerciseAnswered(exercise) ? "Prêt" : "En cours"}
                      </span>
                    )}
                  </div>

                  <BaseTenBlocksVisuals
                    visualType="blocks"
                    idPrefix="base-ten-blocks"
                    itemId={exercise.id}
                    thousands={exercise.thousands}
                    thousandRotations={exercise.thousands_rotations}
                    hundreds={exercise.hundreds}
                    hundredRotations={exercise.hundreds_rotations}
                    tens={exercise.tens}
                    tenRotations={exercise.tens_rotations}
                    units={exercise.units}
                    unitRotations={exercise.units_rotations}
                    onGroupUnitsToTens={() =>
                      queueSingleClickAction(() => handleGroupUnitsToTens(exercise.id))
                    }
                    onGroupTensToHundreds={() =>
                      queueSingleClickAction(() => handleGroupTensToHundreds(exercise.id))
                    }
                    onGroupHundredsToThousands={() =>
                      queueSingleClickAction(() =>
                        handleGroupHundredsToThousands(exercise.id)
                      )
                    }
                    onUngroupTensToUnits={(event) =>
                      handleDoubleClickAction(event, () =>
                        handleUngroupTensToUnits(exercise.id)
                      )
                    }
                    onUngroupHundredsToTens={(event) =>
                      handleDoubleClickAction(event, () =>
                        handleUngroupHundredsToTens(exercise.id)
                      )
                    }
                    onUngroupThousandsToHundreds={(event) =>
                      handleDoubleClickAction(event, () =>
                        handleUngroupThousandsToHundreds(exercise.id)
                      )
                    }
                  />

                  <div
                    id={`base-ten-blocks-input-grid-${exercise.id}`}
                    className={`grid items-end gap-1.5 sm:gap-2 ${getInputGridColsClass()}`}
                  >
                    {showThousandsInput && (
                      <>
                        <label className="text-sm font-semibold text-[#E89E45]">
                          Milliers
                          <input
                            id={`base-ten-blocks-milliers-${exercise.id}`}
                            type="text"
                            inputMode="none"
                            autoComplete="off"
                            maxLength={2}
                            value={answers[exercise.id]?.milliers || ""}
                            onFocus={() => openNumberPad(exercise.id, "milliers")}
                            onClick={() => openNumberPad(exercise.id, "milliers")}
                            onChange={(event) =>
                              updateAnswer(exercise.id, "milliers", event.target.value)
                            }
                            disabled={finished}
                            aria-label={`Milliers de l'exercice ${exercise.id}`}
                            className={`activity-number-tile-text mt-1 w-full rounded-lg border px-2 py-2 text-[#E89E45] ${
                              activeInput?.exerciseId === exercise.id &&
                              activeInput?.field === "milliers"
                                ? "border-[#E89E45] ring-2 ring-[#E89E45]/30"
                                : "border-[#E89E45]/40 hover:border-[#E89E45]"
                            } ${
                              !finished &&
                              !(
                                activeInput?.exerciseId === exercise.id &&
                                activeInput?.field === "milliers"
                              )
                                ? "animate-pulse-slow-orange motion-reduce:animate-none"
                                : ""
                            }`}
                          />
                        </label>
                        <span
                          className="self-end pb-2 text-center text-lg font-bold text-slate-400 select-none sm:text-xl"
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </>
                    )}

                    {showCentainesInput && (
                      <>
                        <label className="text-sm font-semibold text-[#179858]">
                          Centaines
                          <input
                            id={`base-ten-blocks-centaines-${exercise.id}`}
                            type="text"
                            inputMode="none"
                            autoComplete="off"
                            maxLength={2}
                            value={answers[exercise.id]?.centaines || ""}
                            onFocus={() => openNumberPad(exercise.id, "centaines")}
                            onClick={() => openNumberPad(exercise.id, "centaines")}
                            onChange={(event) =>
                              updateAnswer(exercise.id, "centaines", event.target.value)
                            }
                            disabled={finished}
                            aria-label={`Centaines de l'exercice ${exercise.id}`}
                            className={`activity-number-tile-text mt-1 w-full rounded-lg border px-2 py-2 text-[#179858] ${
                              activeInput?.exerciseId === exercise.id &&
                              activeInput?.field === "centaines"
                                ? "border-[#179858] ring-2 ring-[#179858]/30"
                                : "border-[#179858]/40 hover:border-[#179858]"
                            } ${
                              !finished &&
                              !(
                                activeInput?.exerciseId === exercise.id &&
                                activeInput?.field === "centaines"
                              )
                                ? "animate-pulse-slow-green motion-reduce:animate-none"
                                : ""
                            }`}
                          />
                        </label>
                        <span
                          className="self-end pb-2 text-center text-lg font-bold text-slate-400 select-none sm:text-xl"
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </>
                    )}

                    <label className="text-sm font-semibold text-[#E5395E]">
                      Dizaines
                      <input
                        id={`base-ten-blocks-dizaines-${exercise.id}`}
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        maxLength={2}
                        value={answers[exercise.id]?.dizaines || ""}
                        onFocus={() => openNumberPad(exercise.id, "dizaines")}
                        onClick={() => openNumberPad(exercise.id, "dizaines")}
                        onChange={(event) =>
                          updateAnswer(exercise.id, "dizaines", event.target.value)
                        }
                        disabled={finished}
                        aria-label={`Dizaines de l'exercice ${exercise.id}`}
                        className={`activity-number-tile-text mt-1 w-full rounded-lg border px-2 py-2 text-[#E5395E] ${
                          activeInput?.exerciseId === exercise.id &&
                          activeInput?.field === "dizaines"
                            ? "border-[#E5395E] ring-2 ring-[#E5395E]/30"
                            : "border-[#E5395E]/40 hover:border-[#E5395E]"
                        } ${
                          !finished &&
                          !(
                            activeInput?.exerciseId === exercise.id &&
                            activeInput?.field === "dizaines"
                          )
                            ? "animate-pulse-slow-red motion-reduce:animate-none"
                            : ""
                        }`}
                      />
                    </label>

                    <span
                      className="self-end pb-2 text-center text-lg font-bold text-slate-400 select-none sm:text-xl"
                      aria-hidden="true"
                    >
                      +
                    </span>

                    <label className="text-sm font-semibold text-[#4749EB]">
                      Unités
                      <input
                        id={`base-ten-blocks-unites-${exercise.id}`}
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        maxLength={2}
                        value={answers[exercise.id]?.unites || ""}
                        onFocus={() => openNumberPad(exercise.id, "unites")}
                        onClick={() => openNumberPad(exercise.id, "unites")}
                        onChange={(event) =>
                          updateAnswer(exercise.id, "unites", event.target.value)
                        }
                        disabled={finished}
                        aria-label={`Unités de l'exercice ${exercise.id}`}
                        className={`activity-number-tile-text mt-1 w-full rounded-lg border px-2 py-2 text-[#4749EB] ${
                          activeInput?.exerciseId === exercise.id &&
                          activeInput?.field === "unites"
                            ? "border-[#4749EB] ring-2 ring-[#4749EB]/30"
                            : "border-[#4749EB]/40 hover:border-[#4749EB]"
                        } ${
                          !finished &&
                          !(
                            activeInput?.exerciseId === exercise.id &&
                            activeInput?.field === "unites"
                          )
                            ? "animate-pulse-slow-blue motion-reduce:animate-none"
                            : ""
                        }`}
                      />
                    </label>

                    <span
                      className="self-end pb-2 text-center text-lg font-bold text-slate-400 select-none sm:text-xl"
                      aria-hidden="true"
                    >
                      =
                    </span>

                    <label className="text-sm font-semibold text-slate-700">
                      Total
                      <input
                        id={`base-ten-blocks-total-${exercise.id}`}
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        maxLength={4}
                        value={answers[exercise.id]?.total || ""}
                        onFocus={() => openNumberPad(exercise.id, "total")}
                        onClick={() => openNumberPad(exercise.id, "total")}
                        onChange={(event) =>
                          updateAnswer(exercise.id, "total", event.target.value)
                        }
                        disabled={finished}
                        aria-label={`Total de l'exercice ${exercise.id}`}
                        className={`activity-number-tile-text mt-1 w-full rounded-lg border px-2 py-2 text-slate-800 ${
                          activeInput?.exerciseId === exercise.id &&
                          activeInput?.field === "total"
                            ? "border-indigo-500 ring-2 ring-indigo-200"
                            : "border-slate-300"
                        } ${
                          !finished &&
                          !(
                            activeInput?.exerciseId === exercise.id &&
                            activeInput?.field === "total"
                          )
                            ? "animate-pulse-slow-indigo motion-reduce:animate-none"
                            : ""
                        }`}
                      />
                    </label>
                  </div>

                  {finished && !correct && (
                    <p
                      id={`base-ten-blocks-correction-${exercise.id}`}
                      className="mt-3 text-sm font-medium text-rose-700"
                    >
                      Correction :{" "}
                      {showThousandsInput ? `${exercise.thousands || 0} milliers, ` : ""}
                      {showCentainesInput ? `${exercise.hundreds} centaines, ` : ""}
                      {exercise.tens} dizaines, {exercise.units} unités et{" "}
                      {(exercise.thousands || 0) * 1000 +
                        exercise.hundreds * 100 +
                        exercise.tens * 10 +
                        exercise.units}{" "}
                      au total.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {inputType === "NumberPad" && (
        <FloatingNumberPad
          isOpen={Boolean(activeInput) && !finished}
          activeFieldLabel={
            activeInput
              ? `Exercice ${activeInput.exerciseId} — ${activeInput.label}`
              : ""
          }
          onKeyPress={handleNumberPadKeyPress}
          onBackspace={handleNumberPadBackspace}
          onClose={closeNumberPad}
          disabledKeys={["<", "=", ">"]}
        />
      )}

      {inputType === "OCR" && (
        <HandwritingOCRModal
          isOpen={Boolean(activeInput) && !finished}
          activeFieldLabel={
            activeInput
              ? `Exercice ${activeInput.exerciseId} — ${activeInput.label}`
              : ""
          }
          mode="minimal"
          maxWidth="max-w-[340px]"
          overlayType="Normal"
          position={ocrPosition}
          onRecognized={handleOCRRecognized}
          onClose={closeNumberPad}
        />
      )}

      {inputType === "MyScript" && (
        <MyScriptHandwritingModal
          isOpen={Boolean(activeInput) && !finished}
          activeFieldLabel={
            activeInput
              ? `Exercice ${activeInput.exerciseId} — ${activeInput.label}`
              : ""
          }
          mode="minimal"
          maxWidth="max-w-[448px]"
          overlayType="Normal"
          position={ocrPosition}
          onRecognized={handleOCRRecognized}
          onClose={closeNumberPad}
        />
      )}

      {finished && (
        <ActivitySummaryCard
          id="base-ten-blocks-summary"
          title="Activité terminée"
          message="Les cartes vertes sont correctes et les cartes roses montrent la correction attendue."
          score={score ?? 0}
          valueClassName="activity-number-tile-text"
          stats={[
            { key: "correct", label: "Bonnes réponses", value: correctCount },
            { key: "total", label: "Total traité", value: totalExercises },
            {
              key: "errors",
              label: "Erreurs",
              value: Math.max(0, totalExercises - correctCount),
            },
          ]}
        />
      )}

      <ActivityActionsBar
        id="base-ten-blocks-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          {
            id: "base-ten-blocks-validate-button",
            onClick: handleValidate,
            disabled: finished || !allAnswered,
            ariaLabel: "Valider",
            title: "Valider",
            icon: "✓",
            srText: "Valider",
            variant: "validate",
          },
          {
            id: "base-ten-blocks-restart-button",
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
    </div>
  );
};

export default BaseTenBlocksActivity;
