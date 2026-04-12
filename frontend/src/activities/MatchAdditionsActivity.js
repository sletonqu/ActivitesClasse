import React, { useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import {
  formatNumberWithThousandsSpace,
  getSafeDisplayText,
  parseActivityContent,
  parseIntWithFallback,
  parsePositiveInt,
  randomRotation,
} from "./activityUtils";

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
      max: 599,
    },
  },
};

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
      rotation: randomRotation(TILE_ROTATION_MIN_DEGREES, TILE_ROTATION_MAX_DEGREES),
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
  const progressPercent = totalChallenges > 0 ? Math.round((answeredCount / totalChallenges) * 100) : 0;
  const allAssigned = challenges.every((challenge) => assignments[challenge.id] !== undefined);
  const selectedTile = draggedItem?.answerTile || null;

  return (
    <div id="match-additions-activity-root" className="space-y-2.5 sm:space-y-3">
      <ActivityHero
        idPrefix="match-additions"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "count",
            label: `${totalChallenges} addition${totalChallenges > 1 ? "s" : ""}`,
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
        getLevelButtonId={(levelKey) => `match-additions-bouton-${levelKey}`}
        disableAllLevels={finished}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="match-additions-status-panel"
          progressBarId="match-additions-progress-bar"
          progressPercent={progressPercent}
          label="Progression des additions"
        />
      )}

      <div
        id="match-additions-main-layout"
        className={`grid items-start gap-2.5 sm:gap-3 ${
          !finished ? "lg:grid-cols-[minmax(0,1fr)_200px]" : "grid-cols-1"
        }`}
      >
        <section
          id="match-additions-categories"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4"
        >
          <div id="match-additions-challenge-list" className="grid gap-2.5 sm:gap-3">
            {challenges.map((challenge) => {
              const assignedTile = assignments[challenge.id];
              const isCorrect = assignedTile?.value === challenge.result;

              return (
                <div
                  key={challenge.id}
                  id={`match-additions-challenge-${challenge.id}`}
                  className="grid items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:gap-3 sm:rounded-2xl sm:p-4 md:grid-cols-[minmax(0,1fr)_96px] lg:grid-cols-[minmax(0,1fr)_120px]"
                >
                  <div
                    id={`match-additions-operation-${challenge.id}`}
                    className="rounded-xl bg-white px-2.5 py-1.5 text-center text-lg font-bold text-slate-800 shadow-sm sm:px-4 sm:py-3 sm:text-2xl"
                  >
                    {formatNumberWithThousandsSpace(challenge.left)} + {formatNumberWithThousandsSpace(challenge.right)}
                  </div>

                  <div
                    id={`match-additions-drop-zone-${challenge.id}`}
                    className={`flex min-h-[54px] min-w-[64px] items-center justify-center rounded-xl border-2 border-dashed px-2 py-1 text-lg font-bold shadow-sm transition-all sm:min-h-[72px] sm:min-w-[90px] sm:rounded-2xl sm:px-3 sm:py-2 sm:text-2xl ${
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
                        className={`min-h-[44px] min-w-[64px] rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-center shadow-sm select-none transition-all sm:min-h-[56px] sm:min-w-[88px] sm:rounded-2xl sm:px-4 sm:py-2 ${
                          finished ? "cursor-default" : "cursor-move hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
                        }`}
                        style={{ transform: `rotate(${assignedTile.rotation}deg)` }}
                      >
                        <span className="block text-xl font-bold text-slate-800 sm:text-2xl">
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

        {!finished && (
          <section
            id="match-additions-word-pool-section"
            className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-2.5 py-2 sm:px-3 sm:py-2.5">
              <div className="flex flex-col gap-1 sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-800 sm:text-lg">Résultats à placer maintenant</h4>
                </div>
                <div className="text-xs text-slate-600 sm:text-sm">
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
              className="flex min-h-[72px] flex-wrap justify-center gap-1.5 bg-slate-50/70 p-2.5 sm:min-h-[92px] sm:gap-3 sm:p-5"
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
                    className={`min-h-[50px] min-w-[64px] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center shadow-sm select-none transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 sm:min-h-[64px] sm:min-w-[88px] sm:rounded-2xl sm:px-4 sm:py-3 ${
                      finished ? "cursor-default" : "cursor-move"
                    }`}
                    style={{ transform: `rotate(${answerTile.rotation}deg)` }}
                  >
                    <span className="block text-xl font-bold text-slate-800 sm:text-2xl">
                      {formatNumberWithThousandsSpace(answerTile.value)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        )}
      </div>

      <div id="match-additions-actions" className="flex flex-wrap justify-center gap-2">
        <ActivityIconButton
          id="match-additions-validate-button"
          onClick={handleValidate}
          disabled={finished || !allAssigned}
          ariaLabel="Valider"
          title="Valider"
          icon="✓"
          srText="Valider"
          variant="validate"
        />
        <ActivityIconButton
          id="match-additions-restart-button"
          onClick={handleRestart}
          disabled={restartLocked}
          ariaLabel="Recommencer"
          title="Recommencer"
          icon="↻"
          srText="Recommencer"
          variant="restart"
        />
      </div>

      {finished && (
        <ActivitySummaryCard
          id="match-additions-summary"
          title="Activité terminée"
          message={
            correctCount === totalChallenges
              ? "Bravo, toutes les additions sont bien associées !"
              : "Observe les cases colorées pour repérer les bonnes réponses et celles à corriger."
          }
          score={score}
          stats={[
            { key: "correct", label: "Bonnes réponses", value: correctCount },
            { key: "total", label: "Total traité", value: totalChallenges },
            { key: "errors", label: "Erreurs", value: Math.max(0, totalChallenges - correctCount) },
          ]}
        />
      )}
    </div>
  );
};

export default MatchAdditionsActivity;
