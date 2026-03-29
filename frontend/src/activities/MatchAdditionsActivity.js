import React, { useMemo, useState } from "react";

const defaultChallenges = [
  { id: 1, left: 3, right: 2, result: 5 },
  { id: 2, left: 4, right: 1, result: 5 },
  { id: 3, left: 6, right: 2, result: 8 },
];

function shuffle(array) {
  const copy = array.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
  }
  return copy;
}

const MatchAdditionsActivity = ({ content, onComplete }) => {
  const challenges = content?.challenges?.length ? content.challenges : defaultChallenges;
  const initialAnswers = useMemo(() => shuffle(challenges.map((challenge) => challenge.result)), [challenges]);
  const [availableAnswers, setAvailableAnswers] = useState(initialAnswers);
  const [assignments, setAssignments] = useState({});
  const [draggedAnswer, setDraggedAnswer] = useState(null);
  const [finished, setFinished] = useState(false);

  const handleDragStart = (answer) => {
    if (finished) return;
    setDraggedAnswer(answer);
  };

  const handleDrop = (challengeId) => {
    if (finished || draggedAnswer === null) return;

    setAssignments((prev) => {
      const nextAssignments = { ...prev };
      const previousAnswer = nextAssignments[challengeId];

      if (previousAnswer !== undefined) {
        setAvailableAnswers((prevAnswers) => [...prevAnswers, previousAnswer]);
      }

      nextAssignments[challengeId] = draggedAnswer;
      return nextAssignments;
    });

    setAvailableAnswers((prevAnswers) => {
      const answerIndex = prevAnswers.indexOf(draggedAnswer);
      if (answerIndex === -1) return prevAnswers;
      const nextAnswers = prevAnswers.slice();
      nextAnswers.splice(answerIndex, 1);
      return nextAnswers;
    });

    setDraggedAnswer(null);
  };

  const handleValidate = () => {
    const correctCount = challenges.reduce((count, challenge) => {
      return count + (assignments[challenge.id] === challenge.result ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / challenges.length) * 20);
    setFinished(true);
    if (onComplete) onComplete(score);
  };

  const allAssigned = challenges.every((challenge) => assignments[challenge.id] !== undefined);

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Associe chaque addition à son bon résultat</h3>
      <p className="text-sm text-slate-600 mb-6">Niveau CE1 - Fais glisser chaque vignette-réponse vers la bonne addition.</p>

      <div className="grid gap-3 mb-6">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className="flex items-center justify-between gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50"
          >
            <div className="text-xl font-bold text-slate-800 min-w-[120px]">
              {challenge.left} + {challenge.right}
            </div>
            <div
              className={`min-w-[90px] min-h-[56px] rounded-xl border-2 border-dashed flex items-center justify-center text-xl font-bold ${
                finished
                  ? assignments[challenge.id] === challenge.result
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-rose-400 bg-rose-50 text-rose-700"
                  : "border-sky-300 bg-white text-slate-700"
              }`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(challenge.id)}
            >
              {assignments[challenge.id] !== undefined ? assignments[challenge.id] : "?"}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {availableAnswers.map((answer, index) => (
          <div
            key={`${answer}-${index}`}
            draggable={!finished}
            onDragStart={() => handleDragStart(answer)}
            className="w-16 h-16 flex items-center justify-center bg-amber-200 rounded-xl shadow cursor-move text-2xl font-bold select-none transition-transform hover:scale-105"
          >
            {answer}
          </div>
        ))}
      </div>

      {!finished && (
        <button
          type="button"
          onClick={handleValidate}
          disabled={!allAssigned}
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold disabled:opacity-60"
        >
          Valider
        </button>
      )}

      {finished && (
        <p className="mt-4 text-center text-lg font-medium text-gray-700">
          Activité terminée. Vérifie les cases vertes pour les bonnes réponses.
        </p>
      )}
    </div>
  );
};

export default MatchAdditionsActivity;
