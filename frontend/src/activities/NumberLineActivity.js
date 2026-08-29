import React, { useEffect, useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import FloatingNumberPad from "../components/FloatingNumberPad";
import {
  formatNumberWithThousandsSpace,
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
  parseIntWithFallback,
} from "./activityUtils";

export const defaultNumberLineActivityContent = {
  title: "Droite graduée",
  instruction: "Complète les nombres manquants placés en dessous de la droite graduée.",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Pas de 1 (10 à 100)",
      min: 10,
      max: 100,
      step: 1,
      ticksCount: 20,
      readonlyCount: 3,
      inputsCount: 5,
    },
    level2: {
      label: "Pas de 2 (10 à 100)",
      min: 10,
      max: 100,
      step: 2,
      ticksCount: 20,
      readonlyCount: 3,
      inputsCount: 5,
    },
    level3: {
      label: "Pas de 5 (10 à 100)",
      min: 10,
      max: 100,
      step: 5,
      ticksCount: 20,
      readonlyCount: 3,
      inputsCount: 5,
    },
    level4: {
      label: "Pas de 10 (10 à 200)",
      min: 10,
      max: 200,
      step: 10,
      ticksCount: 20,
      readonlyCount: 3,
      inputsCount: 5,
    },
  },
};

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};
  const min = parseIntWithFallback(source.min, fallbackRule.min);
  const max = parseIntWithFallback(source.max, fallbackRule.max);
  const step = parseIntWithFallback(source.step, fallbackRule.step);
  const ticksCount = parseIntWithFallback(source.ticksCount, fallbackRule.ticksCount);
  const readonlyCount = parseIntWithFallback(source.readonlyCount, fallbackRule.readonlyCount);
  const inputsCount = parseIntWithFallback(source.inputsCount, fallbackRule.inputsCount);

  return {
    label: source.label || fallbackRule.label,
    min,
    max,
    step: step > 0 ? step : 1,
    ticksCount: ticksCount > 1 ? ticksCount : 20,
    readonlyCount: readonlyCount >= 0 ? readonlyCount : 3,
    inputsCount: inputsCount > 0 ? inputsCount : 5,
  };
}

function buildRoundForLevel(levelRule) {
  const min = levelRule.min;
  const max = levelRule.max;
  const step = levelRule.step;
  const ticksCount = levelRule.ticksCount;
  const readonlyCount = levelRule.readonlyCount;
  const inputsCount = levelRule.inputsCount;

  // Relation: V_{N-1} = V_0 + (N - 1) * step
  const span = (ticksCount - 1) * step;
  const minMultiple = Math.ceil(min / step) * step;
  const maxLimit = max - span;
  const maxMultiple = Math.floor(maxLimit / step) * step;

  // Validation validation
  if (readonlyCount + inputsCount > ticksCount || minMultiple > maxMultiple) {
    return {
      error: "Impossible de générer la droite graduée avec les contraintes actuelles. Veuillez vérifier les paramètres min, max, le pas et le nombre de graduations.",
    };
  }

  // Tirage de startValue
  const range = (maxMultiple - minMultiple) / step;
  const randomIndex = Math.floor(Math.random() * (range + 1));
  const startValue = minMultiple + randomIndex * step;

  // Génération des graduations
  const ticks = [];
  for (let i = 0; i < ticksCount; i++) {
    ticks.push(startValue + i * step);
  }

  // Choix des index disjoints pour readonly et inputs
  const allIndices = Array.from({ length: ticksCount }, (_, i) => i);
  for (let i = allIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
  }

  const readonlyIndices = allIndices.slice(0, readonlyCount).sort((a, b) => a - b);
  const inputsIndices = allIndices.slice(readonlyCount, readonlyCount + inputsCount).sort((a, b) => a - b);

  return {
    startValue,
    ticks,
    readonlyIndices,
    inputsIndices,
    step,
    ticksCount,
  };
}

const NumberLineActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultNumberLineActivityContent.levels;
  const allowedLevelKeys = ["level1", "level2", "level3", "level4"];

  const configuredLevels = useMemo(() => {
    return {
      level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
      level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
      level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
      level4: normalizeLevelRule(parsedContent?.levels?.level4, defaultLevels.level4),
    };
  }, [parsedContent, defaultLevels]);

  const initialLevel = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);

  // Storing roundData as useState ensures it is stable during rendering cycles
  const [roundData, setRoundData] = useState(() => {
    const initialLevelRule = configuredLevels[initialLevel] || configuredLevels.level1;
    return buildRoundForLevel(initialLevelRule);
  });

  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;

  const [answers, setAnswers] = useState({});
  const [activeInputIndex, setActiveInputIndex] = useState(null);
  const [finished, setFinished] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(null);

  // Re-generate round data only when level configuration or active level changes
  useEffect(() => {
    const rule = configuredLevels[currentLevel] || configuredLevels.level1;
    setRoundData(buildRoundForLevel(rule));
    setAnswers({});
    setFinished(false);
    setIsCorrect(null);
    setScore(null);
    setActiveInputIndex(null);
  }, [configuredLevels, currentLevel]);

  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultNumberLineActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultNumberLineActivityContent.instruction
  );

  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;

  const inputsIndices = roundData.inputsIndices || [];
  const readonlyIndices = roundData.readonlyIndices || [];
  const ticksCount = roundData.ticksCount || 20;

  const allCompleted = inputsIndices.length > 0 && inputsIndices.every(
    (index) => answers[index] !== undefined && answers[index] !== ""
  );

  const progressPercent = inputsIndices.length > 0
    ? Math.round(
      (inputsIndices.filter((index) => answers[index] !== undefined && answers[index] !== "").length /
        inputsIndices.length) *
      100
    )
    : 0;

  const handleSelectLevel = (levelKey) => {
    if (finished) return;
    setCurrentLevel(levelKey);
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }
    const rule = configuredLevels[currentLevel] || configuredLevels.level1;
    setRoundData(buildRoundForLevel(rule));
    setAnswers({});
    setFinished(false);
    setIsCorrect(null);
    setScore(null);
    setActiveInputIndex(null);
  };

  const openNumberPad = (index) => {
    if (finished) return;
    setActiveInputIndex(index);
  };

  const handleNumberPadKeyPress = (keyValue) => {
    if (activeInputIndex === null || finished) return;
    const currentValue = String(answers[activeInputIndex] || "");
    if (currentValue.length >= 6) return; // Limite à 6 chiffres

    setAnswers((prev) => ({
      ...prev,
      [activeInputIndex]: `${currentValue}${keyValue}`,
    }));
  };

  const handleNumberPadBackspace = () => {
    if (activeInputIndex === null || finished) return;
    const currentValue = String(answers[activeInputIndex] || "");

    setAnswers((prev) => ({
      ...prev,
      [activeInputIndex]: currentValue.slice(0, -1),
    }));
  };

  const handleValidate = () => {
    if (!allCompleted || finished) return;

    // Fermer le pavé numérique avant de vérifier les résultats
    setActiveInputIndex(null);

    let correctCount = 0;
    inputsIndices.forEach((index) => {
      const expected = String(roundData.ticks[index]);
      const actual = String(answers[index] || "").trim();
      if (actual === expected) {
        correctCount += 1;
      }
    });

    const nextIsCorrect = correctCount === inputsIndices.length;
    const nextScore = Math.round((correctCount / inputsIndices.length) * 20);

    setFinished(true);
    setIsCorrect(nextIsCorrect);
    setScore(nextScore);

    if (onComplete) {
      onComplete(nextScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
        answers,
        correctCount,
        totalInputs: inputsIndices.length,
      });
    }
  };

  const actions = [];
  if (allCompleted && !finished) {
    actions.push({
      id: "number-line-validate-button",
      onClick: handleValidate,
      ariaLabel: "Valider",
      title: "Valider",
      icon: "✓",
      srText: "Valider",
      variant: "validate",
    });
  }

  actions.push({
    id: "number-line-restart-button",
    onClick: handleRestart,
    disabled: restartLocked || !finished,
    ariaLabel: "Recommencer",
    title: "Recommencer",
    icon: "↻",
    srText: "Recommencer",
    variant: allStudentsCompleted ? "warning" : "restart",
  });

  return (
    <div id="number-line-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="number-line"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "ticks",
            label: `${ticksCount} graduations`,
            className: "inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800",
          },
          {
            key: "step",
            label: `Pas de ${currentLevelRule.step}`,
            className: "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800",
          },
          {
            key: "inputs",
            label: `${inputsIndices.length} repères à trouver`,
            className: "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800",
          },
        ]}
        levels={allowedLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `number-line-bouton-${levelKey}`}
        disableAllLevels={finished}
      />

      {!finished && (
        <ActivityStatus
          id="number-line-status-panel"
          progressBarId="number-line-progress-bar"
          progressPercent={progressPercent}
          label="Progression de la droite graduée"
        />
      )}

      <section
        id="number-line-board-section"
        className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:p-2"
      >
        <div className="border-b border-slate-100 pb-1 mb-1">
          <h4 className="text-lg font-bold text-slate-800">Droite Graduée</h4>
        </div>

        {roundData.error ? (
          <div className="flex min-h-[200px] items-center justify-center p-4 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50 text-center">
            <p className="text-base font-semibold text-rose-800">{roundData.error}</p>
          </div>
        ) : (
          <div id="number-line-scroll-container" className="w-full overflow-x-auto rounded-xl bg-slate-50/50 p-1 sm:p-1 select-none scrollbar-thin">
            <div id="number-line-canvas" className="relative w-full min-w-[850px] h-60 my-2">
              {/* Le trait de la droite graduée */}
              <div className="absolute left-10 right-10 top-24 h-1.5 bg-slate-900 rounded-full shadow-sm" />

              {/* Les graduations et repères */}
              {roundData.ticks.map((val, i) => {
                const leftPercent = (i / (ticksCount - 1)) * 100;
                const isReadonly = readonlyIndices.includes(i);
                const isInput = inputsIndices.includes(i);
                const isMarked = isReadonly || isInput;

                return (
                  <div
                    key={i}
                    id={`number-line-tick-${i}`}
                    className="absolute top-24 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    style={{ left: `calc(40px + ${leftPercent}% - ${leftPercent * 0.8}px)` }}
                  >
                    {/* Trait de graduation */}
                    <div
                      className={`rounded-full transition-all duration-300 ${isMarked
                        ? "w-[3px] h-6 bg-slate-900 shadow-sm"
                        : "w-[2px] h-4 bg-slate-400"
                        }`}
                    />

                    {/* Repère déjà placé (au-dessus) */}
                    {isReadonly && (
                      <div id={`number-line-readonly-label-${i}`} className="absolute bottom-6 flex flex-col items-center animate-fade-in">
                        <span id={`number-line-readonly-value-${i}`} className="text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg shadow-sm whitespace-nowrap">
                          {formatNumberWithThousandsSpace(val)}
                        </span>
                        <div id={`number-line-readonly-dot-${i}`} className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1" />
                      </div>
                    )}

                    {/* Repère à compléter (en dessous) */}
                    {isInput && (
                      <div id={`number-line-input-group-${i}`} className="absolute top-6 flex flex-col items-center">
                        <div id={`number-line-input-dot-${i}`} className="w-1.5 h-1.5 bg-indigo-500 rounded-full mb-1" />
                        <button
                          id={`number-line-input-slot-${i}`}
                          type="button"
                          disabled={finished}
                          onClick={() => openNumberPad(i)}
                          className={`w-14 h-10 flex items-center justify-center border-2 rounded-xl text-lg font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${activeInputIndex === i
                            ? "border-indigo-600 ring-4 ring-indigo-100 bg-indigo-50 text-indigo-700 font-extrabold scale-105"
                            : finished
                              ? answers[i] === String(val)
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 cursor-default"
                                : "border-rose-500 bg-rose-50 text-rose-700 cursor-default"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                            }`}
                        >
                          {answers[i] !== undefined && answers[i] !== ""
                            ? formatNumberWithThousandsSpace(answers[i])
                            : "?"}
                        </button>

                        {/* Correction en dessous si incorrect et validé */}
                        {finished && answers[i] !== String(val) && (
                          <span id={`number-line-correction-${i}`} className="mt-1.5 text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap animate-fade-in">
                            {formatNumberWithThousandsSpace(val)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {finished && (
        <ActivitySummaryCard
          id="number-line-summary"
          title="Activité terminée"
          message={
            isCorrect
              ? "Bravo ! Tous les repères ont été bien complétés."
              : "Certains repères ne sont pas corrects. Observe la correction ci-dessus."
          }
          score={score}
          tone={isCorrect ? "success" : "error"}
          valueClassName="activity-number-tile-text"
          footerClassName="activity-number-tile-text"
          footer={
            <>
              Tu as complété correctement{" "}
              <span className="font-extrabold">{score / 4}</span> repère(s) sur{" "}
              <span className="font-semibold">{inputsIndices.length}</span>.
            </>
          }
        />
      )}

      <ActivityActionsBar
        id="number-line-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={actions}
      />

      <FloatingNumberPad
        isOpen={activeInputIndex !== null && !finished}
        activeFieldLabel="Saisis la valeur du repère"
        onKeyPress={handleNumberPadKeyPress}
        onBackspace={handleNumberPadBackspace}
        onClose={() => setActiveInputIndex(null)}
        disabledKeys={["<", ">", "=", ","]}
      />
    </div>
  );
};

export default NumberLineActivity;
