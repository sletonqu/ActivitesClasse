import React, { useState } from "react";

export const defaultCountPencilsByTensActivityContent = {
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      exerciseCount: 4,
      minPouches: 1,
      maxPouches: 3,
      minUnits: 0,
      maxUnits: 5,
    },
    level2: {
      label: "Niveau 2",
      exerciseCount: 4,
      minPouches: 1,
      maxPouches: 4,
      minUnits: 0,
      maxUnits: 9,
    },
    level3: {
      label: "Niveau 3",
      exerciseCount: 6,
      minPouches: 2,
      maxPouches: 6,
      minUnits: 0,
      maxUnits: 9,
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
  const minPouches = parseIntWithBounds(source.minPouches, fallbackRule.minPouches, 0, 30);
  const maxPouches = parseIntWithBounds(source.maxPouches, fallbackRule.maxPouches, 0, 30);
  const minUnits = parseIntWithBounds(source.minUnits, fallbackRule.minUnits, 0, 9);
  const maxUnits = parseIntWithBounds(source.maxUnits, fallbackRule.maxUnits, 0, 9);

  return {
    label: source.label || fallbackRule.label,
    exerciseCount,
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
    const pouches = randomIntBetween(levelRule.minPouches, levelRule.maxPouches);
    const units = randomIntBetween(levelRule.minUnits, levelRule.maxUnits);

    return {
      id: index + 1,
      pouches,
      pouches_rotations: Array.from({ length: pouches }, () => randomRotation()),
      units,
      units_rotations: Array.from({ length: units }, () => randomRotation()),
    };
  });
}

function renderPencilUnits(count, rotations = []) {
  return Array.from({ length: count }, (_, index) => (
    <span
      key={index}
      className="text-2xl leading-none inline-block"
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    >
      ✏️
    </span>
  ));
}

function renderPouches(count, rotations = []) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/pochette_x10_crayons.png"
      alt="Pochette de 10 crayons"
      className="w-16 h-16 object-cover"
      title="Une pochette = 10 crayons"
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

  const updateAnswer = (exerciseId, field, rawValue) => {
    if (finished) return;
    const cleanValue = rawValue.replace(/[^0-9]/g, "");

    setAnswers((prev) => ({
      ...prev,
      [exerciseId]: {
        dizaines: prev[exerciseId]?.dizaines || "",
        unites: prev[exerciseId]?.unites || "",
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

  const isExerciseCorrect = (exercise) => {
    const givenDizaines = Number(answers[exercise.id]?.dizaines);
    const givenUnites = Number(answers[exercise.id]?.unites);

    if (!Number.isFinite(givenDizaines) || !Number.isFinite(givenUnites)) return false;
    return givenDizaines === exercise.pouches && givenUnites === exercise.units;
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
    const dizaines = answers[exercise.id]?.dizaines;
    const unites = answers[exercise.id]?.unites;
    return dizaines !== undefined && dizaines !== "" && unites !== undefined && unites !== "";
  });

  return (
    <div id="count-pencils-by-tens-activity">
      <h3 id="count-pencils-by-tens-titre" className="text-lg font-bold mb-2">
        Compte les crayons: pochettes de 10 et unites
      </h3>
      <p id="count-pencils-by-tens-consigne" className="text-sm text-slate-600 mb-5">
        Chaque pochette contient 10 crayons. Ecris le nombre de dizaines et d'unites pour chaque case.
      </p>

      <div id="count-pencils-by-tens-niveaux" className="flex flex-wrap justify-center gap-2 mb-4">
        {allowedLevelKeys.map((levelKey) => (
          <button
            key={levelKey}
            id={`count-pencils-by-tens-bouton-${levelKey}`}
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
                  <div className="flex flex-wrap gap-2">{renderPouches(exercise.pouches, exercise.pouches_rotations)}</div>
                </div>
                <div>
                  <div className="flex flex-wrap gap-1 min-h-[34px]">
                    {exercise.units > 0 ? renderPencilUnits(exercise.units, exercise.units_rotations) : <span className="text-slate-400">Aucun</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                    maxLength={1}
                    value={answers[exercise.id]?.unites || ""}
                    onChange={(event) => updateAnswer(exercise.id, "unites", event.target.value)}
                    disabled={finished}
                    className="mt-1 w-full border border-slate-300 rounded px-2 py-1"
                  />
                </label>
              </div>

              {finished && !correct && (
                <p className="mt-2 text-sm font-medium text-rose-700">
                  Correction: {exercise.pouches} dizaines et {exercise.units} unites.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div id="count-pencils-by-tens-actions" className="flex justify-center gap-3 mt-6">
        {!finished && (
          <button
            id="count-pencils-by-tens-bouton-valider"
            type="button"
            onClick={handleValidate}
            disabled={!allAnswered}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold disabled:opacity-60"
          >
            Valider
          </button>
        )}
        <button
          id="count-pencils-by-tens-bouton-recommencer"
          type="button"
          onClick={handleRestart}
          className="px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 font-semibold"
        >
          Recommencer
        </button>
      </div>

      {finished && (
        <p id="count-pencils-by-tens-message-resultat" className="mt-4 text-center text-lg font-medium text-gray-700">
          Activite terminee. Les cases vertes sont correctes.
        </p>
      )}
    </div>
  );
};

export default CountPencilsByTensActivity;
