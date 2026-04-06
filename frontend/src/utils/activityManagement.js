import { defaultSortNumbersActivityContent } from "../activities/SortNumbersActivity";
import { defaultMatchAdditionsActivityContent } from "../activities/MatchAdditionsActivity";
import { defaultCountPencilsByTensActivityContent } from "../activities/CountPencilsByTensActivity";
import { defaultInteractiveWhiteboardActivityContent } from "../activities/InteractiveWhiteboardActivity";

export const ACTIVITY_FILES = [
  "src/activities/SortNumbersActivity.js",
  "src/activities/MatchAdditionsActivity.js",
  "src/activities/CountPencilsByTensActivity.js",
  "src/activities/InteractiveWhiteboardActivity.js",
];

const DEFAULT_ACTIVITY_CONTENT_BY_FILE = {
  "src/activities/SortNumbersActivity.js": defaultSortNumbersActivityContent,
  "src/activities/MatchAdditionsActivity.js": defaultMatchAdditionsActivityContent,
  "src/activities/CountPencilsByTensActivity.js": defaultCountPencilsByTensActivityContent,
  "src/activities/InteractiveWhiteboardActivity.js": defaultInteractiveWhiteboardActivityContent,
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
