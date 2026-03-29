import React, { useState } from "react";
import SortNumbersActivity from "./SortNumbersActivity";
import MatchAdditionsActivity from "./MatchAdditionsActivity";

const componentRegistry = {
  "src/activities/SortNumbersActivity.js": SortNumbersActivity,
  "SortNumbersActivity": SortNumbersActivity,
  "SortNumbersActivity.js": SortNumbersActivity,
  "src/activities/MatchAdditionsActivity.js": MatchAdditionsActivity,
  "MatchAdditionsActivity": MatchAdditionsActivity,
  "MatchAdditionsActivity.js": MatchAdditionsActivity,
};

const resolveActivityComponent = (activityJsFile) => {
  if (!activityJsFile) return SortNumbersActivity;
  return componentRegistry[activityJsFile] || SortNumbersActivity;
};

const ActivityContainer = ({ student, content, onComplete, activityJsFile }) => {
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(null);
  const SelectedActivityComponent = resolveActivityComponent(activityJsFile);

  const handleComplete = (result) => {
    setCompleted(true);
    setScore(result);
    if (onComplete) onComplete(result);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-xl mx-auto mt-8">
      {!completed ? (
        <SelectedActivityComponent content={content} onComplete={handleComplete} />
      ) : (
        <div className="text-center">
          <p className="text-xl font-semibold text-green-600 mb-2">Activité terminée !</p>
          <p className="text-lg">Score : <span className="font-bold">{score}</span></p>
        </div>
      )}
    </div>
  );
};

export default ActivityContainer;
