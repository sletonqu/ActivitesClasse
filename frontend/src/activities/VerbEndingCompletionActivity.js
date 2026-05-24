import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import ActivityActionsBar from "../components/ActivityActionsBar";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import { parseActivityContent, getSafeDisplayText, parsePositiveInt, handleRoundRestart } from "./activityUtils";
import { API_URL } from "../config/api";

const ALLOWED_LEVEL_KEYS = ["level1", "level2", "level3"];

export const defaultVerbEndingCompletionActivityContent = {
  title: "Verbes finissant par 'er'",
  instruction: "Sélectionne la terminaison correcte pour compléter le verbe dans la phrase.",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      sentenceCount: 4,
      endings: ["es", "ent"],
    },
    level2: {
      label: "Niveau 2",
      sentenceCount: 6,
      endings: ["e", "es", "ent"],
    },
    level3: {
      label: "Niveau 3",
      sentenceCount: 8,
      endings: ["e", "es", "ez", "ent"],
    },
  },
};

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};
  const sentenceCount = Math.max(1, parsePositiveInt(source.sentenceCount, fallbackRule.sentenceCount));
  const fallbackEndings = Array.isArray(fallbackRule.endings)
    ? fallbackRule.endings.map((ending) => String(ending || "").toLowerCase()).filter(Boolean)
    : [];
  const endings = Array.isArray(source.endings)
    ? source.endings.map((ending) => String(ending || "").toLowerCase()).filter(Boolean)
    : fallbackEndings;

  return {
    label: getSafeDisplayText(source.label, fallbackRule.label),
    sentenceCount,
    endings: endings.length > 0 ? endings : fallbackEndings,
  };
}

function findVerbWithEnding(sentence, endings) {
  const words = Array.isArray(sentence?.words) ? sentence.words : [];
  
  for (const word of words) {
    const wordStr = String(word?.word || "").toLowerCase();
    const nature = String(word?.nature || "").toLowerCase();
    
    // Vérifier que c'est un verbe ET pas un adverbe
    const isVerb = (nature.includes("verbe")) && !nature.includes("adverbe");
    
    if (isVerb) {
      for (const ending of endings) {
        if (wordStr.endsWith(ending)) {
          return {
            word,
            wordText: String(word?.word || ""),
            ending,
            baseForm: wordStr.substring(0, wordStr.length - ending.length),
          };
        }
      }
    }
  }
  
  return null;
}

function buildVerbRound(sentenceEntry, index, endings) {
  const verbInfo = findVerbWithEnding(sentenceEntry, endings);
  
  if (!verbInfo) {
    return null;
  }

  const words = Array.isArray(sentenceEntry?.words) ? sentenceEntry.words : [];
  const displayTokens = words.map((word, wordIndex) => {
    const wordStr = String(word?.word || "");
    if (wordStr === verbInfo.wordText) {
      return {
        id: `${sentenceEntry?.id || `phrase-${index + 1}`}-verb-${wordIndex}`,
        text: verbInfo.baseForm + "....",
        isVerb: true,
        originalWord: verbInfo.wordText,
        correctEnding: verbInfo.ending,
      };
    }
    
    return {
      id: `${sentenceEntry?.id || `phrase-${index + 1}`}-word-${wordIndex}`,
      text: wordStr,
      isVerb: false,
      originalWord: wordStr,
      correctEnding: null,
    };
  });

  return {
    id: sentenceEntry?.id || `phrase-${index + 1}`,
    sentenceText: getSafeDisplayText(sentenceEntry?.sentence, displayTokens.map((token) => token.text).join(" ")),
    displayTokens,
    correctEnding: verbInfo.ending,
    baseForm: verbInfo.baseForm,
    wordText: verbInfo.wordText,
  };
}

const VerbEndingCompletionActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultVerbEndingCompletionActivityContent.levels;

  const configuredLevels = useMemo(
    () => ({
      level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
      level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
      level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
    }),
    [parsedContent]
  );

  const initialLevel = ALLOWED_LEVEL_KEYS.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [loadingSentences, setLoadingSentences] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [sentenceRounds, setSentenceRounds] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [selectedEnding, setSelectedEnding] = useState(null);
  const [roundFinished, setRoundFinished] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [message, setMessage] = useState("");
  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage, 3500, 4000);
  const requestIdRef = useRef(0);
  const lastAutoLoadSignatureRef = useRef("");

  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const currentEndings = currentLevelRule.endings;
  const currentLoadSignature = useMemo(
    () => JSON.stringify({
      level: currentLevel,
      sentenceCount: currentLevelRule.sentenceCount,
      endings: currentEndings,
    }),
    [currentLevel, currentLevelRule.sentenceCount, currentEndings]
  );
  const currentSentence = sentenceRounds[currentSentenceIndex] || null;
  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const restartTitle = restartLocked
    ? "En attente que tous les élèves terminent..."
    : allStudentsCompleted && student
      ? "Recommencer et réinitialiser la liste des élèves"
      : "Recommencer avec d'autres phrases";
  const progressPercent = sentenceRounds.length > 0
    ? Math.round(((currentSentenceIndex + (roundFinished ? 1 : 0)) / sentenceRounds.length) * 100)
    : 0;
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultVerbEndingCompletionActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultVerbEndingCompletionActivityContent.instruction
  );

  const resetWithSentences = useCallback((sentences, levelEndings) => {
    const preparedSentences = sentences
      .map((sentence, index) => buildVerbRound(sentence, index, levelEndings))
      .filter(Boolean);

    if (preparedSentences.length === 0) {
      throw new Error("Aucune phrase ne contient de verbes avec les terminaisons demandées.");
    }

    setSentenceRounds(preparedSentences);
    setCurrentSentenceIndex(0);
    setProcessedCount(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setSelectedEnding(null);
    setRoundFinished(false);
    setIsCorrect(null);
    setFinished(false);
    setScore(null);
    setMessage("");
  }, []);

  const loadSentencesForLevel = useCallback(async (levelKey) => {
    const levelRule = configuredLevels[levelKey] || configuredLevels.level1;
    const levelEndings = levelRule.endings;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoadingSentences(true);
    setLoadingError("");
    setFinished(false);
    setScore(null);

    try {
      const params = new URLSearchParams({
        count: String(levelRule.sentenceCount),
        endings: levelEndings.join(","),
      });

      const response = await fetch(`${API_URL}/ai/verbs-by-ending?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement des phrases");
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextSentences = Array.isArray(data?.sentences) ? data.sentences : [];
      if (nextSentences.length === 0) {
        throw new Error("Aucune phrase n'est disponible pour ces terminaisons.");
      }

      resetWithSentences(nextSentences, levelEndings);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSentenceRounds([]);
      setCurrentSentenceIndex(0);
      setProcessedCount(0);
      setCorrectCount(0);
      setIncorrectCount(0);
      setSelectedEnding(null);
      setRoundFinished(false);
      setIsCorrect(null);
      setFinished(false);
      setScore(null);
      setLoadingError(err.message || "Erreur inconnue");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingSentences(false);
      }
    }
  }, [configuredLevels, resetWithSentences]);

  useEffect(() => {
    setCurrentLevel(initialLevel);
  }, [initialLevel]);

  useEffect(() => {
    if (lastAutoLoadSignatureRef.current === currentLoadSignature) {
      return;
    }

    lastAutoLoadSignatureRef.current = currentLoadSignature;
    loadSentencesForLevel(currentLevel);
  }, [currentLevel, currentLoadSignature, loadSentencesForLevel]);

  const finishActivity = (nextCorrectCount, nextProcessedCount) => {
    const finalScore = Math.round((nextCorrectCount / Math.max(1, nextProcessedCount)) * 20);
    setFinished(true);
    setScore(finalScore);

    if (onComplete) {
      onComplete(finalScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
      });
    }
  };

  const handleEndingClick = (ending) => {
    if (loadingSentences || finished || roundFinished) {
      return;
    }

    // Premier clic: prévisualiser la terminaison choisie dans la phrase.
    if (selectedEnding !== ending) {
      setSelectedEnding(ending);
      return;
    }

    const correct = ending === currentSentence.correctEnding;
    const nextCorrectCount = correctCount + (correct ? 1 : 0);
    const nextIncorrectCount = incorrectCount + (correct ? 0 : 1);
    const nextProcessedCount = processedCount + 1;

    setIsCorrect(correct);
    setSelectedEnding(ending);
    setRoundFinished(true);

    if (correct) {
      setCorrectCount(nextCorrectCount);
      setMessage("Bravo ! Bonne réponse.");
    } else {
      setIncorrectCount(nextIncorrectCount);
      setMessage(`Erreur. La bonne réponse était : ${currentSentence.correctEnding}`);
    }

    setProcessedCount(nextProcessedCount);
  };

  const handleNext = () => {
    if (!roundFinished) {
      return;
    }

    const nextIndex = currentSentenceIndex + 1;
    if (nextIndex < sentenceRounds.length) {
      setCurrentSentenceIndex(nextIndex);
      setSelectedEnding(null);
      setRoundFinished(false);
      setIsCorrect(null);
      setMessage("");
      return;
    }

    finishActivity(correctCount, processedCount);
  };

  const handleSelectLevel = (levelKey) => {
    if (loadingSentences) {
      return;
    }

    setCurrentLevel(levelKey);
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }

    loadSentencesForLevel(currentLevel);
  };

  return (
    <div id="verb-ending-completion-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="verb-ending-completion"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={currentEndings.map((ending) => ({
          key: `badge-${ending}`,
          label: ending,
          className: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800",
        }))}
        badgesId="verb-ending-completion-endings"
        levels={ALLOWED_LEVEL_KEYS.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
          disabled: loadingSentences,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `verb-ending-completion-level-${levelKey}`}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="verb-ending-completion-status-panel"
          progressBarId="verb-ending-completion-progress-bar"
          progressPercent={progressPercent}
          label="Progression de la completion des verbes"
        />
      )}

      {loadingSentences ? (
        <div id="verb-ending-completion-loading" className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-800 sm:p-4">
          Chargement des phrases à compléter...
        </div>
      ) : loadingError ? (
        <div id="verb-ending-completion-error" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700 sm:p-4">
          {loadingError}
        </div>
      ) : (
        <>
          {!finished && currentSentence && (
            <section id="verb-ending-section" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">Phrase à compléter</h4>
                    <p className="text-sm text-slate-500">
                      Phrase {currentSentenceIndex + 1} sur {sentenceRounds.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4">
                <div id="verb-ending-sentence" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 sm:px-4">
                  <div id="verb-ending-sentence-display" className="flex flex-wrap items-center justify-center gap-2 text-base sm:text-lg">
                    {currentSentence.displayTokens.map((token) => {
                      if (token.isVerb) {
                        const displayText = selectedEnding && !roundFinished
                          ? currentSentence.baseForm + selectedEnding
                          : roundFinished && isCorrect !== null
                            ? currentSentence.wordText
                            : token.text;
                        
                        return (
                          <span
                            key={token.id}
                            className={`rounded-xl border px-2.5 py-1.5 font-semibold ${
                              roundFinished
                                ? isCorrect
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                                  : "border-rose-300 bg-rose-100 text-rose-900"
                                : "border-slate-200 bg-white text-slate-800"
                            }`}
                          >
                            {displayText}
                          </span>
                        );
                      }

                      return (
                        <span key={token.id} className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                          {token.text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {!finished && currentSentence && (
            <section id="verb-endings-tiles" className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 sm:p-4">
              <h4 className="text-lg font-bold text-slate-800 mb-3">Choisis la bonne terminaison</h4>
              <p id="verb-ending-tile-instruction" className="mb-3 text-sm text-slate-600">
                Clique une première fois pour essayer, puis clique une deuxième fois sur la même terminaison pour valider ta réponse.
              </p>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                {currentEndings.map((ending) => (
                  <button
                    key={ending}
                    id={`verb-ending-tile-${ending}`}
                    type="button"
                    onClick={() => handleEndingClick(ending)}
                    disabled={loadingSentences || finished || roundFinished}
                    className={`rounded-2xl border-2 px-4 py-3 sm:px-6 sm:py-4 font-bold text-lg transition-all ${
                      roundFinished
                        ? ending === currentSentence.correctEnding
                          ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                          : ending === selectedEnding
                            ? "border-rose-400 bg-rose-100 text-rose-900"
                            : "border-slate-200 bg-white text-slate-800"
                        : selectedEnding === ending
                          ? "border-blue-400 bg-blue-100 text-blue-900 shadow-sm"
                          : "border-slate-300 bg-white text-slate-800 hover:border-blue-300"
                    } ${roundFinished ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {ending}
                  </button>
                ))}
              </div>
            </section>
          )}

          {showMessage && (
            <div
              id="verb-ending-message"
              className={`rounded-2xl border px-3 py-3 sm:px-4 sm:py-4 text-center font-semibold transition-opacity duration-500 ${
                isCorrect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              } ${fadeMessage ? "opacity-0" : "opacity-100"}`}
            >
              {message}
            </div>
          )}
        </>
      )}

      {finished && (
        <ActivitySummaryCard
          id="verb-ending-completion-summary"
          title="Activité terminée"
          score={score}
          message="Toutes les phrases ont été complétées."
          stats={[
            { key: "correct", label: "Bonnes réponses", value: correctCount },
            { key: "incorrect", label: "Erreurs", value: incorrectCount },
            { key: "total", label: "Phrases", value: sentenceRounds.length },
          ]}
        />
      )}

      <ActivityActionsBar
        id="verb-ending-completion-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          !finished && roundFinished
            ? {
                id: "verb-ending-completion-next-button",
                onClick: handleNext,
                disabled: false,
                ariaLabel: "Aller à la phrase suivante",
                title: "Aller à la phrase suivante",
                icon: "➥",
                srText: "Suivant",
                variant: "validate",
              }
            : null,
          {
            id: "verb-ending-completion-restart-button",
            onClick: handleRestart,
            disabled: loadingSentences || restartLocked || !finished,
            ariaLabel: restartTitle,
            title: restartTitle,
            icon: "↻",
            srText: "Recommencer",
            variant: allStudentsCompleted ? "warning" : "restart",
          },
        ].filter(Boolean)}
      />
    </div>
  );
};

export default VerbEndingCompletionActivity;
