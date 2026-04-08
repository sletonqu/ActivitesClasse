import React, { useMemo, useState } from "react";

export const defaultMatchAdditionsActivityContent = {
  title: "Associe chaque addition à son bon résultat",
  instruction:
    "Fais glisser chaque vignette-réponse vers la bonne addition, puis valide pour vérifier tes réponses.",
  defaultLevel: "level2",
  levels: {
    level1: {
      label: "Niveau 1",
      count: 3,
      min: 1,
      max: 20,
    },
    level2: {
      label: "Niveau 2",
      count: 3,
      min: 10,
      max: 99,
    },
    level3: {
      label: "Niveau 3",
      count: 3,
      min: 10,
      max: 999,
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

function getSafeDisplayText(value, fallback) {
  const text = String(value || "").trim();
  if (!text || text.includes("�")) {
    return fallback;
  }
  return text;
}

function parseActivityContent(rawContent) {
  if (!rawContent) {
    return {};
  }

  if (typeof rawContent === "string") {
    try {
      return JSON.parse(rawContent);
    } catch {
      return {};
    }
  }

  return typeof rawContent === "object" ? rawContent : {};
}

function formatNumberWithThousandsSpace(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value ?? "");
  }

  return Math.trunc(numericValue)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultMatchAdditionsActivityContent.levels;
  const configuredLevels = {
    level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
  };

  const allowedLevelKeys = ["level1", "level2", "level3"];
  const initialLevel = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const buildChallengesForLevel = (levelKey) => {
    const byLevel = normalizeChallenges(parsedContent?.challengesByLevel?.[levelKey]);
    if (byLevel.length > 0) return byLevel;

    if (levelKey === "level1") {
      const flatChallenges = normalizeChallenges(parsedContent?.challenges);
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
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(null);

  const restartLocked = Boolean(student) && finished;
  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultMatchAdditionsActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultMatchAdditionsActivityContent.instruction
  );

  const resetForChallenges = (nextChallenges) => {
    setChallenges(nextChallenges);
    setAvailableAnswers(buildAnswerTiles(nextChallenges));
    setAssignments({});
    setDraggedItem(null);
    setFinished(false);
    setCorrectCount(0);
    setScore(null);
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
    const nextCorrectCount = challenges.reduce((count, challenge) => {
      return count + (assignments[challenge.id]?.value === challenge.result ? 1 : 0);
    }, 0);
    const nextScore = Math.round((nextCorrectCount / Math.max(1, challenges.length)) * 20);

    setCorrectCount(nextCorrectCount);
    setScore(nextScore);
    setFinished(true);
    setDraggedItem(null);

    if (onComplete) {
      onComplete(nextScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
      });
    }
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

  const totalChallenges = challenges.length;
  const answeredCount = challenges.filter((challenge) => assignments[challenge.id] !== undefined).length;
  const remainingCount = Math.max(0, totalChallenges - answeredCount);
  const progressPercent = totalChallenges > 0 ? Math.round((answeredCount / totalChallenges) * 100) : 0;
  const allAssigned = challenges.every((challenge) => assignments[challenge.id] !== undefined);
  const selectedTile = draggedItem?.answerTile || null;

  return (
    <div id="match-additions-activity-root" className="space-y-6">
      <section
        id="match-additions-hero"
        className="rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 p-[1px]"
      >
        <div className="rounded-2xl bg-white p-5 sm:p-6">
          <div className="w-full">
            <h3 id="match-additions-title" className="mb-2 block w-full text-2xl font-bold text-slate-800">
              {displayTitle}
            </h3>
            <p id="match-additions-instructions" className="block w-full text-sm text-slate-800 sm:text-base">
              {displayInstruction}
            </p>

            <div id="match-additions-current-settings" className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                {totalChallenges} addition{totalChallenges > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                Entre {formatNumberWithThousandsSpace(currentLevelRule.min)} et {formatNumberWithThousandsSpace(currentLevelRule.max)}
              </span>
            </div>
          </div>

          <div id="match-additions-levels" className="mt-5 flex flex-wrap justify-center gap-2">
            {allowedLevelKeys.map((levelKey) => (
              <button
                key={levelKey}
                id={`match-additions-bouton-${levelKey}`}
                type="button"
                disabled={finished}
                onClick={() => handleSelectLevel(levelKey)}
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  currentLevel === levelKey
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                } ${finished ? "disabled:opacity-60 disabled:cursor-not-allowed" : ""}`}
              >
                {configuredLevels[levelKey].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {!finished && (
        <section
          id="match-additions-status-panel"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              id="match-additions-progress-bar"
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>
      )}

      {!finished && (
        <section
          id="match-additions-word-pool-section"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-800">Résultats à placer maintenant</h4>
              </div>
              <div className="text-sm text-slate-600">
                {selectedTile ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                    Tuile sélectionnée : {formatNumberWithThousandsSpace(selectedTile.value)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    Fais glisser un résultat
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            id="match-additions-answers-pool"
            className="flex min-h-[92px] flex-wrap justify-center gap-3 bg-slate-50/70 p-4 sm:p-5"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropToAnswerPool}
          >
            {availableAnswers.length === 0 ? (
              <div className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-500">
                Toutes les tuiles ont été placées.
              </div>
            ) : (
              availableAnswers.map((answerTile, index) => (
                <button
                  key={answerTile.id}
                  id={`match-additions-tuile-${index}`}
                  type="button"
                  draggable={!finished}
                  onDragStart={() => handleDragStartFromPool(answerTile)}
                  onDragEnd={() => setDraggedItem(null)}
                  className={`min-h-[64px] min-w-[88px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm select-none transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 ${
                    finished ? "cursor-default" : "cursor-move"
                  }`}
                  style={{ transform: `rotate(${answerTile.rotation}deg)` }}
                >
                  <span className="block text-2xl font-bold text-slate-800">
                    {formatNumberWithThousandsSpace(answerTile.value)}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      <section
        id="match-additions-categories"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div id="match-additions-challenge-list" className="grid gap-3">
          {challenges.map((challenge) => {
            const assignedTile = assignments[challenge.id];
            const isCorrect = assignedTile?.value === challenge.result;

            return (
              <div
                key={challenge.id}
                id={`match-additions-challenge-${challenge.id}`}
                className="grid items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_120px]"
              >
                <div
                  id={`match-additions-operation-${challenge.id}`}
                  className="rounded-xl bg-white px-4 py-3 text-center text-2xl font-bold text-slate-800 shadow-sm"
                >
                  {formatNumberWithThousandsSpace(challenge.left)} + {formatNumberWithThousandsSpace(challenge.right)}
                </div>

                <div
                  id={`match-additions-drop-zone-${challenge.id}`}
                  className={`flex min-h-[72px] min-w-[90px] items-center justify-center rounded-2xl border-2 border-dashed px-3 py-2 text-2xl font-bold shadow-sm transition-all ${
                    finished
                      ? isCorrect
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-sky-300 bg-white text-slate-700"
                  }`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(challenge.id)}
                >
                  {assignedTile !== undefined ? (
                    <button
                      id={`match-additions-assigned-tile-${challenge.id}`}
                      type="button"
                      draggable={!finished}
                      onDragStart={() => handleDragStartFromChallenge(challenge.id)}
                      onDragEnd={() => setDraggedItem(null)}
                      className={`min-h-[56px] min-w-[88px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center shadow-sm select-none transition-all ${
                        finished ? "cursor-default" : "cursor-move hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
                      }`}
                      style={{ transform: `rotate(${assignedTile.rotation}deg)` }}
                    >
                      <span className="block text-2xl font-bold text-slate-800">
                        {formatNumberWithThousandsSpace(assignedTile.value)}
                      </span>
                    </button>
                  ) : (
                    "?"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div id="match-additions-actions" className="flex flex-wrap justify-center gap-3">
        <button
          id="match-additions-validate-button"
          type="button"
          onClick={handleValidate}
          disabled={finished || !allAssigned}
          aria-label="Valider"
          title="Valider"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-green-500 text-2xl font-bold text-white shadow-sm transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">✓</span>
          <span className="sr-only">Valider</span>
        </button>
        <button
          id="match-additions-restart-button"
          type="button"
          onClick={handleRestart}
          disabled={restartLocked}
          aria-label="Recommencer"
          title="Recommencer"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-700 text-2xl font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">↻</span>
          <span className="sr-only">Recommencer</span>
        </button>
      </div>

      {finished && (
        <section
          id="match-additions-summary"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold">Activité terminée</p>
              <p className="text-sm text-emerald-800">
                {correctCount === totalChallenges
                  ? "Bravo, toutes les additions sont bien associées !"
                  : "Observe les cases colorées pour repérer les bonnes réponses et celles à corriger."}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Score</p>
              <p className="text-3xl font-bold">{score} / 20</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Bonnes réponses</div>
              <div className="text-2xl font-bold">{correctCount}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Total traité</div>
              <div className="text-2xl font-bold">{totalChallenges}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Erreurs</div>
              <div className="text-2xl font-bold">{Math.max(0, totalChallenges - correctCount)}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default MatchAdditionsActivity;
