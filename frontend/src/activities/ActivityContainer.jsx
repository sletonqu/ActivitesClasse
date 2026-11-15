import React, { Suspense, lazy } from "react";

const SortNumbersActivity = lazy(() => import("./SortNumbersActivity"));
const MatchAdditionsActivity = lazy(() => import("./MatchAdditionsActivity"));
const CountPencilsByTensActivity = lazy(() => import("./CountPencilsByTensActivity"));
const CompareNumbersActivity = lazy(() => import("./CompareNumbersActivity"));
const FractionsVisualSelectionActivity = lazy(() => import("./FractionsVisualSelectionActivity"));
const InteractiveWhiteboardActivity = lazy(() => import("./InteractiveWhiteboardActivity"));
const WordClassificationActivity = lazy(() => import("./WordClassificationActivity"));
const SentenceWordClassificationActivity = lazy(() => import("./SentenceWordClassificationActivity"));
const ReadNumbersActivity = lazy(() => import("./ReadNumbersActivity"));
const MakeChangeActivity = lazy(() => import("./MakeChangeActivity"));
const AlphabeticalSortActivity = lazy(() => import("./AlphabeticalSortActivity"));
const ClassSoundMeterActivity = lazy(() => import("./ClassSoundMeterActivity"));
const CodeJuniorActivity = lazy(() => import("./CodeJuniorActivity"));
const VerbEndingCompletionActivity = lazy(() => import("./VerbEndingCompletionActivity"));
const EvenOddClassificationActivity = lazy(() => import("./EvenOddClassificationActivity"));
const HomophonesActivity = lazy(() => import("./HomophonesActivity"));
const NumberLineActivity = lazy(() => import("./NumberLineActivity"));
const ColumnOperationActivity = lazy(() => import("./ColumnOperationActivity"));
const BaseTenBlocksActivity = lazy(() => import("./BaseTenBlocksActivity"));
const VerbConjugationActivity = lazy(() => import("./VerbConjugationActivity"));
const WriteFractionsActivity = lazy(() => import("./WriteFractionsActivity"));
const FindVerbAndInfinitiveActivity = lazy(() => import("./FindVerbAndInfinitiveActivity"));
const VocabularyLearningActivity = lazy(() => import("./VocabularyLearningActivity"));


const componentRegistry = {
  "src/activities/VocabularyLearningActivity.js": VocabularyLearningActivity,
  "VocabularyLearningActivity": VocabularyLearningActivity,
  "VocabularyLearningActivity.js": VocabularyLearningActivity,
  "src/activities/FindVerbAndInfinitiveActivity.js": FindVerbAndInfinitiveActivity,
  "FindVerbAndInfinitiveActivity": FindVerbAndInfinitiveActivity,
  "FindVerbAndInfinitiveActivity.js": FindVerbAndInfinitiveActivity,
  "src/activities/WriteFractionsActivity.js": WriteFractionsActivity,
  "WriteFractionsActivity": WriteFractionsActivity,
  "WriteFractionsActivity.js": WriteFractionsActivity,
  "src/activities/BaseTenBlocksActivity.js": BaseTenBlocksActivity,
  "BaseTenBlocksActivity": BaseTenBlocksActivity,
  "BaseTenBlocksActivity.js": BaseTenBlocksActivity,
  "src/activities/NumberLineActivity.js": NumberLineActivity,
  "NumberLineActivity": NumberLineActivity,
  "NumberLineActivity.js": NumberLineActivity,
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
  "src/activities/MakeChangeActivity.js": MakeChangeActivity,
  "MakeChangeActivity": MakeChangeActivity,
  "MakeChangeActivity.js": MakeChangeActivity,
  "src/activities/AlphabeticalSortActivity.js": AlphabeticalSortActivity,
  "AlphabeticalSortActivity": AlphabeticalSortActivity,
  "AlphabeticalSortActivity.js": AlphabeticalSortActivity,
  "src/activities/ClassSoundMeterActivity.js": ClassSoundMeterActivity,
  "ClassSoundMeterActivity": ClassSoundMeterActivity,
  "ClassSoundMeterActivity.js": ClassSoundMeterActivity,
  "src/activities/CodeJuniorActivity.js": CodeJuniorActivity,
  "CodeJuniorActivity": CodeJuniorActivity,
  "CodeJuniorActivity.js": CodeJuniorActivity,
  "src/activities/VerbEndingCompletionActivity.js": VerbEndingCompletionActivity,
  "VerbEndingCompletionActivity": VerbEndingCompletionActivity,
  "VerbEndingCompletionActivity.js": VerbEndingCompletionActivity,
  "src/activities/EvenOddClassificationActivity.js": EvenOddClassificationActivity,
  "EvenOddClassificationActivity": EvenOddClassificationActivity,
  "EvenOddClassificationActivity.js": EvenOddClassificationActivity,
  "src/activities/HomophonesActivity.js": HomophonesActivity,
  "HomophonesActivity": HomophonesActivity,
  "HomophonesActivity.js": HomophonesActivity,
  "src/activities/ColumnOperationActivity.js": ColumnOperationActivity,
  "ColumnOperationActivity": ColumnOperationActivity,
  "ColumnOperationActivity.js": ColumnOperationActivity,
  "src/activities/VerbConjugationActivity.js": VerbConjugationActivity,
  "VerbConjugationActivity": VerbConjugationActivity,
  "VerbConjugationActivity.js": VerbConjugationActivity,
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
        className="activity-print-zone mx-auto w-full min-w-0 max-w-full overflow-x-auto rounded-lg bg-white px-1.5 pt-1.5 pb-0 shadow-sm sm:px-2 sm:pt-2 sm:pb-0 print:max-w-[300mm] print:overflow-visible print:p-6"
      >
        <Suspense
          fallback={
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 py-12 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              <p className="text-sm font-medium">Chargement de l'activité...</p>
            </div>
          }
        >
          <SelectedActivityComponent
            key={activityProps?.activityId ? `activity-comp-${activityProps.activityId}` : undefined}
            student={student}
            content={content}
            onComplete={onComplete}
            {...activityProps}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default ActivityContainer;
