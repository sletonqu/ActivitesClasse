import React, { useState } from "react";

export const defaultCountPencilsByTensActivityContent = {
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      exerciseCount: 4,
      minCartons: 0,
      maxCartons: 0,
      minPouches: 0,
      maxPouches: 3,
      minUnits: 0,
      maxUnits: 9,
    },
    level2: {
      label: "Niveau 2",
      exerciseCount: 2,
      minCartons: 0,
      maxCartons: 2,
      minPouches: 1,
      maxPouches: 4,
      minUnits: 0,
      maxUnits: 12,
    },
    level3: {
      label: "Niveau 3",
      exerciseCount: 1,
      minCartons: 1,
      maxCartons: 4,
      minPouches: 2,
      maxPouches: 6,
      minUnits: 0,
      maxUnits: 16,
    },
  },
};

const TILE_ROTATION_MIN_DEGREES = -20;
const TILE_ROTATION_MAX_DEGREES = 20;

function randomRotation() {
  const rotationRange = TILE_ROTATION_MAX_DEGREES - TILE_ROTATION_MIN_DEGREES;
  return Math.round((Math.random() * rotationRange + TILE_ROTATION_MIN_DEGREES) * 10) / 10;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

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
      cartons_rotations: Array.from({ length: cartons }, () => randomRotation()),
      pouches,
      pouches_rotations: Array.from({ length: pouches }, () => randomRotation()),
      units,
      units_rotations: Array.from({ length: units }, () => randomRotation()),
    };
  });
}

function renderPencilUnits(count, rotations = [], onUnitClick, onUnitRightClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/Crayons_x1.png"
      alt="Crayon"
      className="h-7 w-auto object-contain inline-block cursor-pointer"
      title="Un crayon = 1 unite"
      onClick={onUnitClick}
      onContextMenu={onUnitRightClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

function renderPouches(count, rotations = [], onPouchClick, onPouchRightClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/pochette_x10_crayons.png"
      alt="Pochette de 10 crayons"
      className="w-16 h-16 object-cover cursor-pointer"
      title="Une pochette = 10 crayons"
      onClick={onPouchClick}
      onContextMenu={onPouchRightClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

function renderCartons(count, rotations = [], onCartonRightClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/cartons_x100_crayons.png"
      alt="Carton de 100 crayons"
      className="w-16 h-16 object-cover cursor-context-menu"
      title="Un carton = 100 crayons"
      onContextMenu={onCartonRightClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

const CountPencilsByTensActivity = ({ content, onComplete }) => {
  const defaultLevels = defaultCountPencilsByTensActivityContent.levels;
  const configuredLevels = {
    level1: normalizeLevelRule(content?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(content?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(content?.levels?.level3, defaultLevels.level3),
  };

  const allowedLevelKeys = ["level1", "level2", "level3"];
  const initialLevel = allowedLevelKeys.includes(content?.defaultLevel)
    ? content.defaultLevel
    : "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [exercises, setExercises] = useState(
    buildExercises(configuredLevels[initialLevel] || configuredLevels.level1)
  );
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);

  const showCentainesInput = exercises.some(
    (exercise) => exercise.cartons * 100 + exercise.pouches * 10 + exercise.units > 99
  );

  const updateAnswer = (exerciseId, field, rawValue) => {
    if (finished) return;
    const cleanValue = rawValue.replace(/[^0-9]/g, "");

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
  };

  const handleSelectLevel = (levelKey) => {
    setCurrentLevel(levelKey);
    restartForLevel(levelKey);
  };

  const handleRestart = () => {
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
          pouches_rotations: [...exercise.pouches_rotations, randomRotation()],
          units: exercise.units - 10,
          units_rotations: exercise.units_rotations.slice(0, Math.max(0, exercise.units_rotations.length - 10)),
        };
      })
    );
  };

  const handleUngroupTensToUnits = (exerciseId, event) => {
    event.preventDefault();
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
            ...Array.from({ length: 10 }, () => randomRotation()),
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
          cartons_rotations: [...exercise.cartons_rotations, randomRotation()],
          pouches: exercise.pouches - 10,
          pouches_rotations: exercise.pouches_rotations.slice(0, Math.max(0, exercise.pouches_rotations.length - 10)),
        };
      })
    );
  };

  const handleUngroupHundredsToTens = (exerciseId, event) => {
    event.preventDefault();
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
            ...Array.from({ length: 10 }, () => randomRotation()),
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
    const correctCount = exercises.reduce((count, exercise) => {
      return count + (isExerciseCorrect(exercise) ? 1 : 0);
    }, 0);

    const score = Math.round((correctCount / exercises.length) * 20);
    setFinished(true);
    if (onComplete) onComplete(score);
  };

  const allAnswered = exercises.every((exercise) => {
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
  });

  return (
    <div id="count-pencils-by-tens-activity">
      <h3 id="count-pencils-by-tens-titre" className="text-lg font-bold mb-2">
        Compte les crayons: cartons de 100, pochettes de 10 et unites
      </h3>
      <p id="count-pencils-by-tens-consigne" className="text-sm text-slate-600 mb-5">
        Chaque pochette contient 10 crayons. Chaque carton contient 10 pochettes de 10 crayons. Ecris le nombre de {showCentainesInput ? "centaines, de " : ""}dizaines, d'unites et le total de crayons pour chaque case.
      </p>

      <div id="count-pencils-by-tens-niveaux" className="flex flex-wrap justify-center gap-2 mb-4">
        {allowedLevelKeys.map((levelKey) => (
          <button
            key={levelKey}
            id={`count-pencils-by-tens-bouton-${levelKey}`}
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

      <div id="count-pencils-by-tens-grille" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exercises.map((exercise) => {
          const correct = finished ? isExerciseCorrect(exercise) : null;
          return (
            <div
              key={exercise.id}
              id={`count-pencils-by-tens-case-${exercise.id}`}
              className={`rounded-xl border p-4 ${
                !finished
                  ? "border-slate-200 bg-slate-50"
                  : correct
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-rose-400 bg-rose-50"
              }`}
            >
              <div className="mb-4 space-y-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.cartons > 0
                      ? renderCartons(
                          exercise.cartons,
                          exercise.cartons_rotations,
                          (event) => handleUngroupHundredsToTens(exercise.id, event)
                        )
                      : null}
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap gap-2">
                    {renderPouches(
                      exercise.pouches,
                      exercise.pouches_rotations,
                      () => handleGroupTensToHundreds(exercise.id),
                      (event) => handleUngroupTensToUnits(exercise.id, event)
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap gap-1 min-h-[34px]">
                    {exercise.units > 0
                      ? renderPencilUnits(
                          exercise.units,
                          exercise.units_rotations,
                          () => handleGroupUnitsToTens(exercise.id),
                          (event) => event.preventDefault()
                        )
                      : null}
                  </div>
                </div>
              </div>

              <div className={`grid gap-2 ${showCentainesInput ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}>
                {showCentainesInput && (
                  <label className="text-sm font-medium text-slate-700">
                    Centaines
                    <input
                      id={`count-pencils-by-tens-centaines-${exercise.id}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={answers[exercise.id]?.centaines || ""}
                      onChange={(event) => updateAnswer(exercise.id, "centaines", event.target.value)}
                      disabled={finished}
                      className="mt-1 w-full border border-slate-300 rounded px-2 py-1"
                    />
                  </label>
                )}

                <label className="text-sm font-medium text-slate-700">
                  Dizaines
                  <input
                    id={`count-pencils-by-tens-dizaines-${exercise.id}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={answers[exercise.id]?.dizaines || ""}
                    onChange={(event) => updateAnswer(exercise.id, "dizaines", event.target.value)}
                    disabled={finished}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Unites
                  <input
                    id={`count-pencils-by-tens-unites-${exercise.id}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={answers[exercise.id]?.unites || ""}
                    onChange={(event) => updateAnswer(exercise.id, "unites", event.target.value)}
                    disabled={finished}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Total
                  <input
                    id={`count-pencils-by-tens-total-${exercise.id}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={answers[exercise.id]?.total || ""}
                    onChange={(event) => updateAnswer(exercise.id, "total", event.target.value)}
                    disabled={finished}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
              </div>

              {finished && !correct && (
                <p className="mt-2 text-sm font-medium text-rose-700">
                  Correction: {showCentainesInput ? `${exercise.cartons} centaines, ` : ""}{exercise.pouches} dizaines, {exercise.units} unites et {exercise.cartons * 100 + exercise.pouches * 10 + exercise.units} total.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!finished && (
        <div id="count-pencils-by-tens-actions" className="flex justify-center gap-3 mt-6">
          <button
            id="count-pencils-by-tens-bouton-valider"
            type="button"
            onClick={handleValidate}
            disabled={!allAnswered}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold disabled:opacity-60"
          >
            Valider
          </button>
        <button
          id="count-pencils-by-tens-bouton-recommencer"
          type="button"
          onClick={handleRestart}
          className="px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 font-semibold"
        >
          Recommencer
        </button>
        </div>
      )}

      {finished && (
        <p id="count-pencils-by-tens-message-resultat" className="mt-4 text-center text-lg font-medium text-gray-700">
          Activite terminee. Les cases vertes sont correctes.
        </p>
      )}
    </div>
  );
};

export default CountPencilsByTensActivity;
