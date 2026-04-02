import React from "react";
import SortNumbersActivity from "./SortNumbersActivity";
import MatchAdditionsActivity from "./MatchAdditionsActivity";
import CountPencilsByTensActivity from "./CountPencilsByTensActivity";
import InteractiveWhiteboardActivity from "./InteractiveWhiteboardActivity";

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
  "src/activities/InteractiveWhiteboardActivity.js": InteractiveWhiteboardActivity,
  "InteractiveWhiteboardActivity": InteractiveWhiteboardActivity,
  "InteractiveWhiteboardActivity.js": InteractiveWhiteboardActivity,
};

const resolveActivityComponent = (activityJsFile) => {
  if (!activityJsFile) return SortNumbersActivity;
  return componentRegistry[activityJsFile] || SortNumbersActivity;
};

const ActivityContainer = ({ student, content, onComplete, activityJsFile }) => {
  const SelectedActivityComponent = resolveActivityComponent(activityJsFile);
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="activity-container-wrapper" className="w-full mx-auto mt-8">
      <div id="activity-print-action-bar" className="flex justify-end mb-3 print:hidden">
        <button
          id="activity-print-button"
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 rounded bg-slate-700 text-white font-semibold hover:bg-slate-800 inline-flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M6 9V3h12v6" />
            <path d="M6 18h12v3H6z" />
            <path d="M6 14H4a2 2 0 0 1-2-2v-2a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a2 2 0 0 1-2 2h-2" />
            <path d="M17 12h.01" />
          </svg>
          Imprimer en PDF
        </button>
      </div>

      <div
        id="activity-container"
        className="bg-white rounded-lg shadow p-6 w-full max-w-[300mm] mx-auto activity-print-zone"
      >
        <SelectedActivityComponent student={student} content={content} onComplete={onComplete} />
      </div>
    </div>
  );
};

export default ActivityContainer;
