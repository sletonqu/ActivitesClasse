import React, { useState } from "react";

export const defaultMatchAdditionsActivityContent = {
  "defaultLevel": "level2",
  "levels": {
    "level1": {
      "label": "Niveau 1",
      "count": 6,
      "min": 1,
      "max": 20
    },
    "level2": {
      "label": "Niveau 2",
      "count": 5,
      "min": 10,
      "max": 99
    },
    "level3": {
      "label": "Niveau 3",
      "count": 4,
      "min": 10,
      "max": 999
    },
  },
};

const defaultChallenges = [
  { id: 1, left: 3, right: 2, result: 5 },
  { id: 2, left: 4, right: 1, result: 5 },
  { id: 3, left: 6, right: 2, result: 8 },
];

const TILE_ROTATION_MIN_DEGREES = -10;
const TILE_ROTATION_MAX_DEGREES = 10;

function shuffle(array) {
  const copy = array.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
  }
  return copy;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseIntWithFallback(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function randomRotation() {
  const rotationRange = TILE_ROTATION_MAX_DEGREES - TILE_ROTATION_MIN_DEGREES;
  return Math.round((Math.random() * rotationRange + TILE_ROTATION_MIN_DEGREES) * 10) / 10;
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};

  const fallbackCount = parsePositiveInt(fallbackRule.count, 3);
  const fallbackMin = parseIntWithFallback(fallbackRule.min, 1);
  const fallbackMax = parseIntWithFallback(fallbackRule.max, 9);

  const count = parsePositiveInt(source.count, fallbackCount);
  const min = parseIntWithFallback(source.min, fallbackMin);
  const max = parseIntWithFallback(source.max, fallbackMax);

  return {
    label: source.label || fallbackRule.label,
    count,
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

function normalizeChallenges(challenges) {
  if (!Array.isArray(challenges)) return [];

  return challenges
    .map((challenge, index) => {
      const left = Number(challenge?.left);
      const right = Number(challenge?.right);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return null;

      const explicitResult = Number(challenge?.result);
      const result = Number.isFinite(explicitResult) ? explicitResult : left + right;

      return {
        id: challenge?.id ?? index + 1,
        left,
        right,
        result,
      };
    })
    .filter(Boolean);
}

function randomIntBetween(min, max) {
  const range = max - min + 1;
  return Math.floor(Math.random() * range) + min;
}

function buildGeneratedChallenges(levelRule) {
  const challenges = [];
  for (let i = 0; i < levelRule.count; i += 1) {
    const left = randomIntBetween(levelRule.min, levelRule.max);
    const right = randomIntBetween(levelRule.min, levelRule.max);
    challenges.push({
      id: i + 1,
      left,
      right,
      result: left + right,
    });
  }
  return challenges;
}

function buildAnswerTiles(challenges) {
  return shuffle(
    challenges.map((challenge, index) => ({
      id: `${challenge.id}-${index}`,
      value: challenge.result,
      rotation: randomRotation(),
    }))
  );
}

const MatchAdditionsActivity = ({ student, content, onComplete }) => {
  const defaultLevels = defaultMatchAdditionsActivityContent.levels;
  const configuredLevels = {
    level1: normalizeLevelRule(content?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(content?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(content?.levels?.level3, defaultLevels.level3),
  };

  const allowedLevelKeys = ["level1", "level2", "level3"];
  const initialLevel = allowedLevelKeys.includes(content?.defaultLevel)
    ? content.defaultLevel
    : "level1";

  const buildChallengesForLevel = (levelKey) => {
    const byLevel = normalizeChallenges(content?.challengesByLevel?.[levelKey]);
    if (byLevel.length > 0) return byLevel;

    if (levelKey === "level1") {
      const flatChallenges = normalizeChallenges(content?.challenges);
      if (flatChallenges.length > 0) return flatChallenges;
    }

    const levelRule = configuredLevels[levelKey] || configuredLevels.level1;
    return buildGeneratedChallenges(levelRule);
  };

  const initialChallenges = buildChallengesForLevel(initialLevel);

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [challenges, setChallenges] = useState(initialChallenges);
  const [availableAnswers, setAvailableAnswers] = useState(buildAnswerTiles(initialChallenges));
  const [assignments, setAssignments] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [finished, setFinished] = useState(false);
  const restartLocked = Boolean(student) && finished;

  const resetForChallenges = (nextChallenges) => {
    setChallenges(nextChallenges);
    setAvailableAnswers(buildAnswerTiles(nextChallenges));
    setAssignments({});
    setDraggedItem(null);
    setFinished(false);
  };

  const handleDragStartFromPool = (answerTile) => {
    if (finished) return;
    setDraggedItem({ answerTile, source: "pool" });
  };

  const handleDragStartFromChallenge = (challengeId) => {
    if (finished) return;
    const answerTile = assignments[challengeId];
    if (answerTile === undefined) return;
    setDraggedItem({ answerTile, source: "challenge", challengeId });
  };

  const handleDrop = (challengeId) => {
    if (finished || !draggedItem) return;

    const { answerTile, source, challengeId: sourceChallengeId } = draggedItem;
    if (source === "challenge" && String(sourceChallengeId) === String(challengeId)) {
      setDraggedItem(null);
      return;
    }

    const nextAssignments = { ...assignments };
    const nextAvailableAnswers = availableAnswers.slice();
    const previousTargetAnswer = nextAssignments[challengeId];

    if (source === "pool") {
      const answerIndex = nextAvailableAnswers.findIndex((tile) => tile.id === answerTile.id);
      if (answerIndex !== -1) {
        nextAvailableAnswers.splice(answerIndex, 1);
      }
    } else if (source === "challenge") {
      delete nextAssignments[sourceChallengeId];
    }

    nextAssignments[challengeId] = answerTile;

    if (previousTargetAnswer !== undefined) {
      if (source === "challenge") {
        nextAssignments[sourceChallengeId] = previousTargetAnswer;
      } else {
        nextAvailableAnswers.push(previousTargetAnswer);
      }
    }

    setAssignments(nextAssignments);
    setAvailableAnswers(nextAvailableAnswers);
    setDraggedItem(null);
  };

  const handleDropToAnswerPool = () => {
    if (finished || !draggedItem) return;
    if (draggedItem.source !== "challenge") {
      setDraggedItem(null);
      return;
    }

    const nextAssignments = { ...assignments };
    delete nextAssignments[draggedItem.challengeId];

    setAssignments(nextAssignments);
    setAvailableAnswers((prev) => [...prev, draggedItem.answerTile]);
    setDraggedItem(null);
  };

  const handleValidate = () => {
    const correctCount = challenges.reduce((count, challenge) => {
      return count + (assignments[challenge.id]?.value === challenge.result ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / challenges.length) * 20);
    setFinished(true);
    if (onComplete) onComplete(score);
  };

  const handleRestart = () => {
    const nextChallenges = buildChallengesForLevel(currentLevel);
    resetForChallenges(nextChallenges);
  };

  const handleSelectLevel = (levelKey) => {
    setCurrentLevel(levelKey);
    const nextChallenges = buildChallengesForLevel(levelKey);
    resetForChallenges(nextChallenges);
  };

  const allAssigned = challenges.every((challenge) => assignments[challenge.id] !== undefined);

  return (
    <div id="match-additions-activity">
      <h3 id="match-additions-title" className="text-lg font-bold mb-4">Associe chaque addition à son bon résultat</h3>
      <p id="match-additions-instructions" className="text-sm text-slate-600 mb-6">Niveau CE1 - Fais glisser chaque vignette-réponse vers la bonne addition.</p>

      <div id="match-additions-levels" className="flex flex-wrap justify-center gap-2 mb-4">
        {allowedLevelKeys.map((levelKey) => (
          <button
            key={levelKey}
            id={`match-additions-bouton-${levelKey}`}
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

      <div id="match-additions-challenge-list" className="grid gap-3 mb-6">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            id={`match-additions-challenge-${challenge.id}`}
            className="flex items-center justify-between gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50"
          >
            <div id={`match-additions-operation-${challenge.id}`} className="text-xl font-bold text-slate-800 min-w-[120px]">
              {challenge.left} + {challenge.right}
            </div>
            <div
              id={`match-additions-drop-zone-${challenge.id}`}
              className={`min-w-[90px] min-h-[56px] rounded-xl border-2 border-dashed flex items-center justify-center text-xl font-bold ${
                finished
                  ? assignments[challenge.id]?.value === challenge.result
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-rose-400 bg-rose-50 text-rose-700"
                  : "border-sky-300 bg-white text-slate-700"
              }`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(challenge.id)}
            >
              {assignments[challenge.id] !== undefined ? (
                <div
                  id={`match-additions-assigned-tile-${challenge.id}`}
                  draggable={!finished}
                  onDragStart={() => handleDragStartFromChallenge(challenge.id)}
                  className={!finished ? "cursor-move" : ""}
                  style={{ transform: `rotate(${assignments[challenge.id].rotation}deg)` }}
                >
                  {assignments[challenge.id].value}
                </div>
              ) : (
                "?"
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        id="match-additions-answers-pool"
        className="flex flex-wrap gap-3 justify-center mb-6 min-h-[72px] p-2 rounded-lg border border-dashed border-slate-300"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDropToAnswerPool}
      >
        {availableAnswers.map((answerTile, index) => (
          <div
            key={answerTile.id}
            id={`match-additions-tuile-${index}`}
            draggable={!finished}
            onDragStart={() => handleDragStartFromPool(answerTile)}
            className="w-16 h-16 flex items-center justify-center bg-amber-200 rounded-xl shadow cursor-move text-2xl font-bold select-none hover:scale-105"
            style={{ transform: `rotate(${answerTile.rotation}deg)` }}
          >
            {answerTile.value}
          </div>
        ))}
      </div>

      <div id="match-additions-actions" className="flex justify-center gap-3">
        <button
          id="match-additions-validate-button"
          type="button"
          onClick={handleValidate}
          disabled={finished || !allAssigned}
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Valider
        </button>
        <button
          id="match-additions-restart-button"
          type="button"
          onClick={handleRestart}
          disabled={restartLocked}
          className="px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Recommencer
        </button>
      </div>

      {finished && (
        <p id="match-additions-result-message" className="mt-4 text-center text-lg font-medium text-gray-700">
          Activité terminée. Vérifie les cases vertes pour les bonnes réponses.
        </p>
      )}
    </div>
  );
};

export default MatchAdditionsActivity;
