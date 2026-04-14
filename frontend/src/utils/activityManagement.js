import { defaultSortNumbersActivityContent } from "../activities/SortNumbersActivity";
import { defaultMatchAdditionsActivityContent } from "../activities/MatchAdditionsActivity";
import { defaultCountPencilsByTensActivityContent } from "../activities/CountPencilsByTensActivity";
import { defaultCompareNumbersActivityContent } from "../activities/CompareNumbersActivity";
import { defaultFractionsVisualSelectionActivityContent } from "../activities/FractionsVisualSelectionActivity";
import { defaultInteractiveWhiteboardActivityContent } from "../activities/InteractiveWhiteboardActivity";
import { defaultWordClassificationActivityContent } from "../activities/WordClassificationActivity";
import { defaultSentenceWordClassificationActivityContent } from "../activities/SentenceWordClassificationActivity";
import { defaultReadNumbersActivityContent } from "../activities/ReadNumbersActivity";

export const ACTIVITY_FILES = [
  "src/activities/SortNumbersActivity.js",
  "src/activities/MatchAdditionsActivity.js",
  "src/activities/CountPencilsByTensActivity.js",
  "src/activities/CompareNumbersActivity.js",
  "src/activities/FractionsVisualSelectionActivity.js",
  "src/activities/InteractiveWhiteboardActivity.js",
  "src/activities/WordClassificationActivity.js",
  "src/activities/SentenceWordClassificationActivity.js",
  "src/activities/ReadNumbersActivity.js",
];

const DEFAULT_ACTIVITY_CONTENT_BY_FILE = {
  "src/activities/SortNumbersActivity.js": defaultSortNumbersActivityContent,
  "src/activities/MatchAdditionsActivity.js": defaultMatchAdditionsActivityContent,
  "src/activities/CountPencilsByTensActivity.js": defaultCountPencilsByTensActivityContent,
  "src/activities/CompareNumbersActivity.js": defaultCompareNumbersActivityContent,
  "src/activities/FractionsVisualSelectionActivity.js": defaultFractionsVisualSelectionActivityContent,
  "src/activities/InteractiveWhiteboardActivity.js": defaultInteractiveWhiteboardActivityContent,
  "src/activities/WordClassificationActivity.js": defaultWordClassificationActivityContent,
  "src/activities/SentenceWordClassificationActivity.js": defaultSentenceWordClassificationActivityContent,
  "src/activities/FillInTheBlanksActivity.js": defaultSentenceWordClassificationActivityContent,
  "src/activities/ReadNumbersActivity.js": defaultReadNumbersActivityContent,
};

export function getDefaultActivityContentText(jsFile) {
  const defaultContent = DEFAULT_ACTIVITY_CONTENT_BY_FILE[jsFile];
  return JSON.stringify(defaultContent || {}, null, 2);
}

export function normalizeActivityContentForEditor(content) {
  if (content === null || content === undefined || content === "") {
    return "{}";
  }

  if (typeof content === "string") {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }

  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return "{}";
  }
}
