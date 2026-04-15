import React from "react";
import SortNumbersActivity from "./SortNumbersActivity";
import MatchAdditionsActivity from "./MatchAdditionsActivity";
import CountPencilsByTensActivity from "./CountPencilsByTensActivity";
import CompareNumbersActivity from "./CompareNumbersActivity";
import FractionsVisualSelectionActivity from "./FractionsVisualSelectionActivity";
import InteractiveWhiteboardActivity from "./InteractiveWhiteboardActivity";
import WordClassificationActivity from "./WordClassificationActivity";
import SentenceWordClassificationActivity from "./SentenceWordClassificationActivity";
import ReadNumbersActivity from "./ReadNumbersActivity";

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
  "src/activities/CompareNumbersActivity.js": CompareNumbersActivity,
  "CompareNumbersActivity": CompareNumbersActivity,
  "CompareNumbersActivity.js": CompareNumbersActivity,
  "src/activities/FractionsVisualSelectionActivity.js": FractionsVisualSelectionActivity,
  "FractionsVisualSelectionActivity": FractionsVisualSelectionActivity,
  "FractionsVisualSelectionActivity.js": FractionsVisualSelectionActivity,
  "src/activities/InteractiveWhiteboardActivity.js": InteractiveWhiteboardActivity,
  "InteractiveWhiteboardActivity": InteractiveWhiteboardActivity,
  "InteractiveWhiteboardActivity.js": InteractiveWhiteboardActivity,
  "src/activities/WordClassificationActivity.js": WordClassificationActivity,
  "WordClassificationActivity": WordClassificationActivity,
  "WordClassificationActivity.js": WordClassificationActivity,
  "src/activities/SentenceWordClassificationActivity.js": SentenceWordClassificationActivity,
  "SentenceWordClassificationActivity": SentenceWordClassificationActivity,
  "SentenceWordClassificationActivity.js": SentenceWordClassificationActivity,
  "src/activities/ReadNumbersActivity.js": ReadNumbersActivity,
  "ReadNumbersActivity": ReadNumbersActivity,
  "ReadNumbersActivity.js": ReadNumbersActivity,
};

const resolveActivityComponent = (activityJsFile) => {
  if (!activityJsFile) return SortNumbersActivity;
  return componentRegistry[activityJsFile] || SortNumbersActivity;
};

const ActivityContainer = ({ student, content, onComplete, activityJsFile, activityProps = {} }) => {
  const SelectedActivityComponent = resolveActivityComponent(activityJsFile);
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="activity-container-wrapper"
      className="mx-auto mt-0 w-full min-w-0"
    >
      <div
        id="activity-container"
        className="activity-print-zone mx-auto w-full min-w-0 max-w-full overflow-x-auto rounded-lg bg-white px-1.5 pt-1.5 pb-0 shadow sm:px-2 sm:pt-2 sm:pb-0 print:max-w-[300mm] print:overflow-visible print:p-6"
      >
        <SelectedActivityComponent
          student={student}
          content={content}
          onComplete={onComplete}
          {...activityProps}
        />
      </div>
    </div>
  );
};

export default ActivityContainer;
