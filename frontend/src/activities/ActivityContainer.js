import React from "react";
import SortNumbersActivity from "./SortNumbersActivity";
import MatchAdditionsActivity from "./MatchAdditionsActivity";
import CountPencilsByTensActivity from "./CountPencilsByTensActivity";

const componentRegistry = {
  "src/activities/SortNumbersActivity.js": SortNumbersActivity,
  "SortNumbersActivity": SortNumbersActivity,
  "SortNumbersActivity.js": SortNumbersActivity,
  "src/activities/MatchAdditionsActivity.js": MatchAdditionsActivity,
  "MatchAdditionsActivity": MatchAdditionsActivity,
  "MatchAdditionsActivity.js": MatchAdditionsActivity,
  "src/activities/CountPencilsByTensActivity.js": CountPencilsByTensActivity,
  "CountPencilsByTensActivity": CountPencilsByTensActivity,
  "CountPencilsByTensActivity.js": CountPencilsByTensActivity,
};

const resolveActivityComponent = (activityJsFile) => {
  if (!activityJsFile) return SortNumbersActivity;
  return componentRegistry[activityJsFile] || SortNumbersActivity;
};

const ActivityContainer = ({ student, content, onComplete, activityJsFile }) => {
  const SelectedActivityComponent = resolveActivityComponent(activityJsFile);

  return (
    <div className="bg-white rounded-lg shadow p-6 w-full max-w-none mx-auto mt-8">
      <SelectedActivityComponent content={content} onComplete={onComplete} />
    </div>
  );
};

export default ActivityContainer;
