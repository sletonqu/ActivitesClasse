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
} from "./activityUtils";

export const defaultCountPencilsByTensActivityContent = {
  "title": "Compte les crayons par dizaines et centaines",
  "instruction": "Observe les crayons, regroupe-les si besoin, puis écris le nombre de centaines, dizaines, unités et le total.",
  "defaultLevel": "level1",
  "inputType": "NumberPad", // "NumberPad" or "OCR" or "MyScript"
  "levels": {
    "level1": {
      "label": "Niveau 1",
      "exerciseCount": 2,
      "minCartons": 0,
      "maxCartons": 0,
      "minPouches": 1,
      "maxPouches": 9,
      "minUnits": 0,
      "maxUnits": 9
    },
    "level2": {
      "label": "Niveau 2",
      "exerciseCount": 2,
      "minCartons": 1,
      "maxCartons": 2,
      "minPouches": 1,
      "maxPouches": 9,
      "minUnits": 0,
      "maxUnits": 9
    },
    "level3": {
      "label": "Niveau 3",
      "exerciseCount": 2,
      "minCartons": 1,
      "maxCartons": 4,
      "minPouches": 0,
      "maxPouches": 16,
      "minUnits": 0,
      "maxUnits": 16
    },
  },
};

const TILE_ROTATION_MIN_DEGREES = -20;
const TILE_ROTATION_MAX_DEGREES = 20;
const CLICK_DELAY_MS = 220;
const FIELD_LABELS = {
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
  const minCartons = parseIntWithBounds(source.minCartons, fallbackRule.minCartons, 0, 20);
  const maxCartons = parseIntWithBounds(source.maxCartons, fallbackRule.maxCartons, 0, 20);
  const minPouches = parseIntWithBounds(source.minPouches, fallbackRule.minPouches, 0, 30);
  const maxPouches = parseIntWithBounds(source.maxPouches, fallbackRule.maxPouches, 0, 30);
  const minUnits = parseIntWithBounds(source.minUnits, fallbackRule.minUnits, 0, 99);
  const maxUnits = parseIntWithBounds(source.maxUnits, fallbackRule.maxUnits, 0, 99);

  return {
    label: source.label || fallbackRule.label,
    exerciseCount,
    minCartons: Math.min(minCartons, maxCartons),
    maxCartons: Math.max(minCartons, maxCartons),
    minPouches: Math.min(minPouches, maxPouches),
    maxPouches: Math.max(minPouches, maxPouches),
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
    const cartons = randomIntBetween(levelRule.minCartons, levelRule.maxCartons);
    const pouches = randomIntBetween(levelRule.minPouches, levelRule.maxPouches);
    const units = randomIntBetween(levelRule.minUnits, levelRule.maxUnits);

    return {
      id: index + 1,
      cartons,
      cartons_rotations: Array.from({ length: cartons }, () => randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)),
      pouches,
      pouches_rotations: Array.from({ length: pouches }, () => randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)),
      units,
      units_rotations: Array.from({ length: units }, () => randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)),
    };
  });
}

const CountPencilsByTensActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultCountPencilsByTensActivityContent.levels;
  const configuredLevels = {
    level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
  };

  const allowedLevelKeys = ["level1", "level2", "level3"];
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
  const inputType = parsedContent?.inputType || defaultCountPencilsByTensActivityContent.inputType;
  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const clickTimeoutRef = useRef(null);

  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultCountPencilsByTensActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultCountPencilsByTensActivityContent.instruction
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
    if (activeInput && inputType === "OCR") {
      const inputId = `count-pencils-by-tens-${activeInput.field}-${activeInput.exerciseId}`;
      const inputEl = document.getElementById(inputId);
      if (inputEl) {
        const rect = inputEl.getBoundingClientRect();
        // Calculate position to avoid covering the input
        // We place it above if possible, otherwise below
        const modalHeight = 350;
        const top = rect.top > modalHeight + 20
          ? rect.top - modalHeight - 10
          : rect.bottom + 10;

        setOcrPosition({
          top: Math.max(10, Math.min(window.innerHeight - modalHeight, top)),
          left: Math.max(10, Math.min(window.innerWidth - 350, rect.left)),
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

  const showCentainesInput = exercises.some(
    (exercise) => exercise.cartons * 100 + exercise.pouches * 10 + exercise.units > 99
  );

  const isExerciseAnswered = (exercise) => {
    const centaines = answers[exercise.id]?.centaines;
    const dizaines = answers[exercise.id]?.dizaines;
    const unites = answers[exercise.id]?.unites;
    const total = answers[exercise.id]?.total;

    return (
      (!showCentainesInput || (centaines !== undefined && centaines !== "")) &&
      dizaines !== undefined && dizaines !== "" &&
      unites !== undefined && unites !== "" &&
      total !== undefined && total !== ""
    );
  };

  const updateAnswer = (exerciseId, field, rawValue) => {
    if (finished) return;

    const maxLength = field === "total" ? 3 : 2;
    const cleanValue = String(rawValue || "")
      .replace(/[^0-9]/g, "")
      .slice(0, maxLength);

    setAnswers((prev) => ({
      ...prev,
      [exerciseId]: {
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
          pouches: exercise.pouches + 1,
          pouches_rotations: [...exercise.pouches_rotations, randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)],
          units: exercise.units - 10,
          units_rotations: exercise.units_rotations.slice(0, Math.max(0, exercise.units_rotations.length - 10)),
        };
      })
    );
  };

  const handleUngroupTensToUnits = (exerciseId) => {
    if (finished) return;

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId || exercise.pouches < 1) {
          return exercise;
        }

        return {
          ...exercise,
          pouches: exercise.pouches - 1,
          pouches_rotations: exercise.pouches_rotations.slice(0, Math.max(0, exercise.pouches_rotations.length - 1)),
          units: exercise.units + 10,
          units_rotations: [
            ...exercise.units_rotations,
            ...Array.from({ length: 10 }, () => randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)),
          ],
        };
      })
    );
  };

  const handleGroupTensToHundreds = (exerciseId) => {
    if (finished) return;

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId || exercise.pouches < 10) {
          return exercise;
        }

        return {
          ...exercise,
          cartons: exercise.cartons + 1,
          cartons_rotations: [...exercise.cartons_rotations, randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)],
          pouches: exercise.pouches - 10,
          pouches_rotations: exercise.pouches_rotations.slice(0, Math.max(0, exercise.pouches_rotations.length - 10)),
        };
      })
    );
  };

  const handleUngroupHundredsToTens = (exerciseId) => {
    if (finished) return;

    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId || exercise.cartons < 1) {
          return exercise;
        }

        return {
          ...exercise,
          cartons: exercise.cartons - 1,
          cartons_rotations: exercise.cartons_rotations.slice(0, Math.max(0, exercise.cartons_rotations.length - 1)),
          pouches: exercise.pouches + 10,
          pouches_rotations: [
            ...exercise.pouches_rotations,
            ...Array.from({ length: 10 }, () => randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES)),
          ],
        };
      })
    );
  };

  const isExerciseCorrect = (exercise) => {
    const givenCentaines = Number(answers[exercise.id]?.centaines);
    const givenDizaines = Number(answers[exercise.id]?.dizaines);
    const givenUnites = Number(answers[exercise.id]?.unites);
    const givenTotal = Number(answers[exercise.id]?.total);
    const expectedTotal = exercise.cartons * 100 + exercise.pouches * 10 + exercise.units;

    if (!Number.isFinite(givenDizaines) || !Number.isFinite(givenUnites) || !Number.isFinite(givenTotal)) return false;
    if (showCentainesInput && !Number.isFinite(givenCentaines)) return false;

    return (
      (!showCentainesInput || givenCentaines === exercise.cartons) &&
      givenDizaines === exercise.pouches &&
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
  const remainingCount = Math.max(0, totalExercises - answeredCount);
  const progressPercent = totalExercises > 0 ? Math.round((answeredCount / totalExercises) * 100) : 0;
  const allAnswered = totalExercises > 0 && answeredCount === totalExercises;

  return (
    <div id="count-pencils-by-tens-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="count-pencils-by-tens"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "count",
            label: `${totalExercises} exercice${totalExercises > 1 ? "s" : ""}`,
            className: "inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800",
          },
          {
            key: "tens",
            label: `${currentLevelRule.minPouches} à ${currentLevelRule.maxPouches} dizaine${currentLevelRule.maxPouches > 1 ? "s" : ""}`,
            className: "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800",
          },
          {
            key: "units",
            label: `${currentLevelRule.minUnits} à ${currentLevelRule.maxUnits} unité${currentLevelRule.maxUnits > 1 ? "s" : ""}`,
            className: "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800",
          },
          ...(currentLevelRule.minCartons > 0 || currentLevelRule.maxCartons > 0
            ? [{
              key: "hundreds",
              label: `${currentLevelRule.minCartons} à ${currentLevelRule.maxCartons} centaine${currentLevelRule.maxCartons > 1 ? "s" : ""}`,
              className: "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800",
            }]
            : []),
        ]}
        levels={allowedLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `count-pencils-by-tens-bouton-${levelKey}`}
        disableAllLevels={finished}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      <ActivityStatus
        id="count-pencils-by-tens-status-panel"
        progressBarId="count-pencils-by-tens-progress-bar"
        progressPercent={progressPercent}
        label="Progression des crayons"
      />

      <section
        id="count-pencils-by-tens-word-pool-section"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-800">Exercices à compléter</h4>
              <p className="text-sm text-slate-600">
                Regroupe ou sépare les crayons si besoin, puis renseigne les cases de numération.
              </p>
            </div>
            <div className="text-sm text-slate-600">
              {finished ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                  Vérification terminée, {correctCount} / {totalExercises} correct{totalExercises > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  Complète toutes les cases avant de valider
                </span>
              )}
            </div>
          </div>
        </div>

        <div id="count-pencils-by-tens-word-pool" className="bg-slate-50/70 p-3 sm:p-5">
          <div id="count-pencils-by-tens-grid" className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {exercises.map((exercise) => {
              const correct = finished ? isExerciseCorrect(exercise) : null;
              return (
                <div
                  key={exercise.id}
                  id={`count-pencils-by-tens-case-${exercise.id}`}
                  className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${!finished
                    ? "border-slate-200 bg-white"
                    : correct
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-rose-300 bg-rose-50"
                    }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h5
                      id={`count-pencils-by-tens-case-title-${exercise.id}`}
                      className="text-base font-bold text-slate-800"
                    >
                      Exercice {exercise.id}
                    </h5>
                    {finished ? (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${correct
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
                    idPrefix="count-pencils-by-tens"
                    itemId={exercise.id}
                    cartons={exercise.cartons}
                    cartonRotations={exercise.cartons_rotations}
                    pouches={exercise.pouches}
                    pouchRotations={exercise.pouches_rotations}
                    units={exercise.units}
                    unitRotations={exercise.units_rotations}
                    onGroupUnitsToTens={() => queueSingleClickAction(() => handleGroupUnitsToTens(exercise.id))}
                    onGroupTensToHundreds={() => queueSingleClickAction(() => handleGroupTensToHundreds(exercise.id))}
                    onUngroupTensToUnits={(event) => handleDoubleClickAction(event, () => handleUngroupTensToUnits(exercise.id))}
                    onUngroupHundredsToTens={(event) => handleDoubleClickAction(event, () => handleUngroupHundredsToTens(exercise.id))}
                  />

                  <div
                    id={`count-pencils-by-tens-input-grid-${exercise.id}`}
                    className={`grid gap-2 ${showCentainesInput ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}
                  >
                    {showCentainesInput && (
                      <label className="text-sm font-medium text-slate-700">
                        Centaines
                        <input
                          id={`count-pencils-by-tens-centaines-${exercise.id}`}
                          type="text"
                          inputMode="none"
                          autoComplete="off"
                          maxLength={2}
                          value={answers[exercise.id]?.centaines || ""}
                          onFocus={() => openNumberPad(exercise.id, "centaines")}
                          onClick={() => openNumberPad(exercise.id, "centaines")}
                          onChange={(event) => updateAnswer(exercise.id, "centaines", event.target.value)}
                          disabled={finished}
                          placeholder="Touchez ici"
                          aria-label={`Centaines de l'exercice ${exercise.id}`}
                          className={`mt-1 w-full rounded-lg border px-2 py-2 ${activeInput?.exerciseId === exercise.id && activeInput?.field === "centaines"
                            ? "border-indigo-500 ring-2 ring-indigo-200"
                            : "border-slate-300"
                            }`}
                        />
                      </label>
                    )}

                    <label className="text-sm font-medium text-slate-700">
                      Dizaines
                      <input
                        id={`count-pencils-by-tens-dizaines-${exercise.id}`}
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        maxLength={2}
                        value={answers[exercise.id]?.dizaines || ""}
                        onFocus={() => openNumberPad(exercise.id, "dizaines")}
                        onClick={() => openNumberPad(exercise.id, "dizaines")}
                        onChange={(event) => updateAnswer(exercise.id, "dizaines", event.target.value)}
                        disabled={finished}
                        placeholder="Touchez ici"
                        aria-label={`Dizaines de l'exercice ${exercise.id}`}
                        className={`mt-1 w-full rounded-lg border px-2 py-2 ${activeInput?.exerciseId === exercise.id && activeInput?.field === "dizaines"
                          ? "border-indigo-500 ring-2 ring-indigo-200"
                          : "border-slate-300"
                          }`}
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Unités
                      <input
                        id={`count-pencils-by-tens-unites-${exercise.id}`}
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        maxLength={2}
                        value={answers[exercise.id]?.unites || ""}
                        onFocus={() => openNumberPad(exercise.id, "unites")}
                        onClick={() => openNumberPad(exercise.id, "unites")}
                        onChange={(event) => updateAnswer(exercise.id, "unites", event.target.value)}
                        disabled={finished}
                        placeholder="Touchez ici"
                        aria-label={`Unités de l'exercice ${exercise.id}`}
                        className={`mt-1 w-full rounded-lg border px-2 py-2 ${activeInput?.exerciseId === exercise.id && activeInput?.field === "unites"
                          ? "border-indigo-500 ring-2 ring-indigo-200"
                          : "border-slate-300"
                          }`}
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Total
                      <input
                        id={`count-pencils-by-tens-total-${exercise.id}`}
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        maxLength={3}
                        value={answers[exercise.id]?.total || ""}
                        onFocus={() => openNumberPad(exercise.id, "total")}
                        onClick={() => openNumberPad(exercise.id, "total")}
                        onChange={(event) => updateAnswer(exercise.id, "total", event.target.value)}
                        disabled={finished}
                        placeholder="Touchez ici"
                        aria-label={`Total de l'exercice ${exercise.id}`}
                        className={`mt-1 w-full rounded-lg border px-2 py-2 ${activeInput?.exerciseId === exercise.id && activeInput?.field === "total"
                          ? "border-indigo-500 ring-2 ring-indigo-200"
                          : "border-slate-300"
                          }`}
                      />
                    </label>
                  </div>

                  {finished && !correct && (
                    <p
                      id={`count-pencils-by-tens-correction-${exercise.id}`}
                      className="mt-3 text-sm font-medium text-rose-700"
                    >
                      Correction : {showCentainesInput ? `${exercise.cartons} centaines, ` : ""}
                      {exercise.pouches} dizaines, {exercise.units} unités et {exercise.cartons * 100 + exercise.pouches * 10 + exercise.units} au total.
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
          maxWidth="max-w-[340px]"
          overlayType="Normal"
          position={ocrPosition}
          onRecognized={handleOCRRecognized}
          onClose={closeNumberPad}
        />
      )}

      {finished && (
        <ActivitySummaryCard
          id="count-pencils-by-tens-summary"
          title="Activité terminée"
          message="Les cartes vertes sont correctes et les cartes roses montrent la correction attendue."
          score={score ?? 0}
          stats={[
            { key: "correct", label: "Bonnes réponses", value: correctCount },
            { key: "total", label: "Total traité", value: totalExercises },
            { key: "errors", label: "Erreurs", value: Math.max(0, totalExercises - correctCount) },
          ]}
        />
      )}

      <ActivityActionsBar
        id="count-pencils-by-tens-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          {
            id: "count-pencils-by-tens-validate-button",
            onClick: handleValidate,
            disabled: finished || !allAnswered,
            ariaLabel: "Valider",
            title: "Valider",
            icon: "✓",
            srText: "Valider",
            variant: "validate",
          },
          {
            id: "count-pencils-by-tens-restart-button",
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

export default CountPencilsByTensActivity;
