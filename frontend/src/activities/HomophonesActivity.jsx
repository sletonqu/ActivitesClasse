import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import ActivityActionsBar from "../components/ActivityActionsBar";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import { parseActivityContent, getSafeDisplayText, parsePositiveInt, handleRoundRestart } from "../utils/activityUtils";
import { API_URL } from "../config/api";

const ALLOWED_LEVEL_KEYS = ["level1", "level2", "level3"];

export const defaultHomophonesActivityContent = {
  title: "Homophones",
  instruction: "Sélectionne le mot correct pour compléter la phrase.",
  strict: false,
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "es / est / et",
      sentenceCount: 10,
      sounds: ["es", "est", "et"],
    },
    level2: {
      label: "à / a / as",
      sentenceCount: 10,
      sounds: ["à", "a", "as"],
    },
    level3: {
      label: "on / ont",
      sentenceCount: 10,
      sounds: ["on", "ont"],
    },
  },
};

export function cleanSound(str) {
  return String(str || "").toLowerCase().replace(/^[.,!?;:«»"']+|[.,!?;:«»"']+$/g, "").trim();
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const clean = value.trim().toLowerCase();
    if (clean === "true" || clean === "1" || clean === "oui" || clean === "yes") {
      return true;
    }
    if (clean === "false" || clean === "0" || clean === "non" || clean === "no") {
      return false;
    }
  }
  return fallback;
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};
  const sentenceCount = Math.max(1, parsePositiveInt(source.sentenceCount, fallbackRule.sentenceCount));
  const fallbackSounds = Array.isArray(fallbackRule.sounds)
    ? fallbackRule.sounds.map((sound) => cleanSound(sound)).filter(Boolean)
    : [];
  const sounds = Array.isArray(source.sounds)
    ? source.sounds.map((sound) => cleanSound(sound)).filter(Boolean)
    : fallbackSounds;

  return {
    label: getSafeDisplayText(source.label, fallbackRule.label),
    sentenceCount,
    sounds: sounds.length > 0 ? sounds : fallbackSounds,
    strict: source.strict !== undefined ? normalizeBoolean(source.strict) : undefined,
  };
}

export function findWordInSentence(sentence, sounds) {
  const words = Array.isArray(sentence?.words) ? sentence.words : [];
  const normalizedSounds = (sounds || []).map((s) => cleanSound(s)).filter(Boolean);
  const targetSound = cleanSound(sentence?.targetWord || sentence?.targetSound || sentence?.matchedWord);

  // 1. Si un homophone précis a été assigné par le backend à cette phrase et est autorisé pour ce niveau, le chercher en priorité
  if (targetSound && normalizedSounds.includes(targetSound)) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordStr = cleanSound(word?.word);
      if (wordStr === targetSound) {
        return {
          word,
          wordIndex: i,
          wordText: String(word?.word || ""),
          sound: targetSound,
        };
      }
    }
  }

  // 2. Sinon, chercher avec les homophones autorisés du niveau
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordStr = cleanSound(word?.word);
    if (normalizedSounds.includes(wordStr)) {
      return {
        word,
        wordIndex: i,
        wordText: String(word?.word || ""),
        sound: wordStr,
      };
    }
  }

  // 3. Fallback si words n'est pas fourni mais sentence texte existe
  if (words.length === 0 && sentence?.sentence) {
    const rawWords = String(sentence.sentence).split(/\s+/);
    if (targetSound && normalizedSounds.includes(targetSound)) {
      const idx = rawWords.findIndex((w) => cleanSound(w) === targetSound);
      if (idx !== -1) {
        return {
          word: { word: rawWords[idx] },
          wordIndex: idx,
          wordText: rawWords[idx],
          sound: targetSound,
        };
      }
    }
    for (let i = 0; i < rawWords.length; i++) {
      const wStr = cleanSound(rawWords[i]);
      if (normalizedSounds.includes(wStr)) {
        return {
          word: { word: rawWords[i] },
          wordIndex: i,
          wordText: rawWords[i],
          sound: wStr,
        };
      }
    }
  }

  return null;
}

export function buildHomophoneRound(sentenceEntry, index, sounds) {
  const wordInfo = findWordInSentence(sentenceEntry, sounds);
  
  if (!wordInfo) {
    return null;
  }

  const words = Array.isArray(sentenceEntry?.words) && sentenceEntry.words.length > 0
    ? sentenceEntry.words
    : String(sentenceEntry?.sentence || "")
        .split(/\s+/)
        .filter(Boolean)
        .map((w, idx) => ({ position: idx + 1, word: w }));

  const targetIndex = wordInfo.wordIndex;
  let replaced = false;

  const displayTokens = words.map((word, wordIndex) => {
    const wordStr = String(word?.word || "");
    const isTarget = targetIndex !== undefined
      ? wordIndex === targetIndex
      : (!replaced && cleanSound(wordStr) === wordInfo.sound);

    if (isTarget && !replaced) {
      replaced = true;
      return {
        id: `${sentenceEntry?.id || `phrase-${index + 1}`}-blank-${wordIndex}`,
        text: "____",
        isBlank: true,
        originalWord: wordStr,
        correctSound: wordInfo.sound,
      };
    }
    
    return {
      id: `${sentenceEntry?.id || `phrase-${index + 1}`}-word-${wordIndex}`,
      text: wordStr,
      isBlank: false,
      originalWord: wordStr,
      correctSound: null,
    };
  });

  return {
    id: sentenceEntry?.id || `phrase-${index + 1}`,
    sentenceText: getSafeDisplayText(sentenceEntry?.sentence, displayTokens.map((token) => token.text).join(" ")),
    displayTokens,
    correctSound: wordInfo.sound,
    wordText: wordInfo.wordText,
  };
}

const HomophonesActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultHomophonesActivityContent.levels;

  const configuredLevelKeys = useMemo(() => {
    const parsedLevels = parsedContent?.levels;
    if (!parsedLevels || typeof parsedLevels !== "object") {
      return ALLOWED_LEVEL_KEYS;
    }
    const keys = ALLOWED_LEVEL_KEYS.filter((levelKey) => {
      const levelRule = parsedLevels[levelKey];
      return levelRule && typeof levelRule === "object";
    });
    return keys.length > 0 ? keys : ALLOWED_LEVEL_KEYS;
  }, [parsedContent]);

  const configuredLevels = useMemo(
    () => ({
      level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
      level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
      level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
    }),
    [parsedContent, defaultLevels]
  );

  const configuredStrict = useMemo(
    () => normalizeBoolean(
      parsedContent?.strict ?? parsedContent?.strictConstraints ?? parsedContent?.strictMode,
      defaultHomophonesActivityContent.strict
    ),
    [parsedContent]
  );

  const initialLevel = configuredLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : configuredLevelKeys[0] || "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [loadingSentences, setLoadingSentences] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [sentenceRounds, setSentenceRounds] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [selectedSound, setSelectedSound] = useState(null);
  const [roundFinished, setRoundFinished] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [message, setMessage] = useState("");
  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage, 3500, 4000);
  const requestIdRef = useRef(0);
  const lastAutoLoadSignatureRef = useRef("");

  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels[configuredLevelKeys[0]] || defaultLevels.level1;
  const isCurrentLevelStrict = Boolean(
    currentLevelRule?.strict ?? currentLevelRule?.strictConstraints ?? currentLevelRule?.strictMode ?? configuredStrict
  );
  const currentSounds = currentLevelRule.sounds;
  const currentLoadSignature = useMemo(
    () => JSON.stringify({
      level: currentLevel,
      sentenceCount: currentLevelRule.sentenceCount,
      sounds: currentSounds,
      strict: isCurrentLevelStrict,
    }),
    [currentLevel, currentLevelRule.sentenceCount, currentSounds, isCurrentLevelStrict]
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
    defaultHomophonesActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultHomophonesActivityContent.instruction
  );

  const resetWithSentences = useCallback((sentences, levelSounds, isStrict = false, requestedSentenceCount = 0) => {
    const preparedSentences = sentences
      .map((sentence, index) => buildHomophoneRound(sentence, index, levelSounds))
      .filter(Boolean);

    if (preparedSentences.length === 0) {
      throw new Error("Aucune phrase ne contient les homophones demandés.");
    }

    if (isStrict) {
      const coveredSounds = new Set(preparedSentences.map((p) => cleanSound(p.correctSound)));
      const missingSounds = levelSounds.filter((s) => !coveredSounds.has(cleanSound(s)));
      const strictErrors = [];

      if (missingSounds.length > 0) {
        strictErrors.push(
          `aucune phrase trouvée pour le ou les homophones : ${missingSounds.join(", ")}`
        );
      }

      if (requestedSentenceCount > 0 && preparedSentences.length < requestedSentenceCount) {
        strictErrors.push(
          `${requestedSentenceCount} phrase${requestedSentenceCount > 1 ? "s" : ""} demandée${requestedSentenceCount > 1 ? "s" : ""}, mais seulement ${preparedSentences.length} disponible${preparedSentences.length > 1 ? "s" : ""}`
        );
      }

      if (strictErrors.length > 0) {
        throw new Error(`Mode strict : ${strictErrors.join(" ; ")}.`);
      }
    }

    setSentenceRounds(preparedSentences);
    setCurrentSentenceIndex(0);
    setProcessedCount(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setMistakes([]);
    setSelectedSound(null);
    setRoundFinished(false);
    setIsCorrect(null);
    setFinished(false);
    setScore(null);
    setMessage("");
  }, []);

  const loadSentencesForLevel = useCallback(async (levelKey) => {
    const levelRule = configuredLevels[levelKey] || configuredLevels.level1;
    const levelSounds = levelRule.sounds;
    const isStrict = Boolean(
      levelRule?.strict ?? levelRule?.strictConstraints ?? levelRule?.strictMode ?? configuredStrict
    );
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoadingSentences(true);
    setLoadingError("");
    setFinished(false);
    setScore(null);
    setMistakes([]);

    try {
      const params = new URLSearchParams({
        count: String(levelRule.sentenceCount),
        words: levelSounds.join(","),
      });
      if (isStrict) {
        params.set("strict", "true");
      }

      const response = await fetch(`${API_URL}/ai/sentences-by-word?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement des phrases");
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextSentences = Array.isArray(data?.sentences) ? data.sentences : [];
      if (nextSentences.length === 0) {
        throw new Error("Aucune phrase n'est disponible pour ces homophones.");
      }

      resetWithSentences(nextSentences, levelSounds, isStrict, levelRule.sentenceCount);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSentenceRounds([]);
      setCurrentSentenceIndex(0);
      setProcessedCount(0);
      setCorrectCount(0);
      setIncorrectCount(0);
      setMistakes([]);
      setSelectedSound(null);
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
  }, [configuredLevels, configuredStrict, resetWithSentences]);

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

  const handleSoundClick = (sound) => {
    if (loadingSentences || finished || roundFinished) {
      return;
    }

    // First click: select and preview the sound in the blank
    if (selectedSound !== sound) {
      setSelectedSound(sound);
      return;
    }

    // Second click: validate the answer
    const correct = sound === currentSentence.correctSound;
    const nextCorrectCount = correctCount + (correct ? 1 : 0);
    const nextIncorrectCount = incorrectCount + (correct ? 0 : 1);
    const nextProcessedCount = processedCount + 1;

    setIsCorrect(correct);
    setSelectedSound(sound);
    setRoundFinished(true);

    if (correct) {
      setCorrectCount(nextCorrectCount);
      setMessage("Bravo ! Bonne réponse.");
    } else {
      setIncorrectCount(nextIncorrectCount);
      setMessage(`Erreur. La bonne réponse était : ${currentSentence.correctSound}`);
      setMistakes((prev) => [
        ...prev,
        {
          id: currentSentence.id,
          sentenceText: currentSentence.sentenceText,
          selectedSound: sound,
          correctSound: currentSentence.correctSound,
          wordText: currentSentence.wordText,
          displayTokens: currentSentence.displayTokens,
        },
      ]);
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
      setSelectedSound(null);
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
    <div id="homophones-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="homophones"
        activityContent={parsedContent}
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          ...(isCurrentLevelStrict ? [{
            key: "badge-strict",
            label: "Contraintes strictes",
            className: "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300",
          }] : []),
          ...currentSounds.map((sound) => ({
            key: `badge-${sound}`,
            label: sound,
            className: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800",
          })),
        ]}
        badgesId="homophones-sounds"
        levels={configuredLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
          disabled: loadingSentences,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `homophones-level-${levelKey}`}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="homophones-status-panel"
          progressBarId="homophones-progress-bar"
          progressPercent={progressPercent}
          label="Progression du remplissage des phrases"
        />
      )}

      {loadingSentences ? (
        <div id="homophones-loading" className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-800 sm:p-4">
          Chargement des phrases à compléter...
        </div>
      ) : loadingError ? (
        <div id="homophones-error" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700 sm:p-4">
          {loadingError}
        </div>
      ) : (
        <>
          {!finished && currentSentence && (
            <section id="homophones-sentence-section" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                <div id="homophones-sentence" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 sm:px-4">
                  <div id="homophones-sentence-display" className="flex flex-wrap items-center justify-center gap-2 text-base sm:text-lg">
                    {currentSentence.displayTokens.map((token) => {
                      if (token.isBlank) {
                        const displayText = selectedSound && !roundFinished
                          ? selectedSound
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
            <section id="homophones-sounds-section" className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 sm:p-4">
              <h4 className="text-lg font-bold text-slate-800 mb-3">Choisis le bon homophone</h4>
              <p id="homophones-sound-tile-instruction" className="mb-3 text-sm text-slate-600">
                Clique une première fois pour essayer, puis clique une deuxième fois sur le même mot pour valider ta réponse.
              </p>
              <div
                id="homophones-sound-tiles"
                className="flex flex-wrap justify-center gap-3 sm:gap-4"
              >
                {currentSounds.map((sound) => (
                  <button
                    key={sound}
                    id={`homophones-sound-tile-${sound}`}
                    type="button"
                    onClick={() => handleSoundClick(sound)}
                    disabled={loadingSentences || finished || roundFinished}
                    className={`rounded-2xl border-2 px-4 py-3 sm:px-6 sm:py-4 font-bold text-lg transition-all ${
                      roundFinished
                        ? sound === currentSentence.correctSound
                          ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                          : sound === selectedSound
                            ? "border-rose-400 bg-rose-100 text-rose-900"
                            : "border-slate-200 bg-white text-slate-800"
                        : selectedSound === sound
                          ? "border-blue-400 bg-blue-100 text-blue-900 shadow-sm"
                          : "border-slate-300 bg-white text-slate-800 hover:border-blue-300"
                    } ${roundFinished ? "cursor-default" : "cursor-pointer"} ${
                      !selectedSound && !roundFinished && !loadingSentences && !finished
                        ? "animate-pulse-slow motion-reduce:animate-none"
                        : ""
                    }`}
                  >
                    {sound}
                  </button>
                ))}
              </div>
            </section>
          )}

          {showMessage && (
            <div
              id="homophones-message"
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
          id="homophones-summary"
          title="Activité terminée"
          score={score}
          message="Toutes les phrases ont été complétées."
          stats={[
            { key: "correct", label: "Bonnes réponses", value: correctCount },
            { key: "incorrect", label: "Erreurs", value: incorrectCount },
            { key: "total", label: "Phrases", value: sentenceRounds.length },
          ]}
        >
          {mistakes.length > 0 && (
            <div
              id="homophones-summary-errors"
              className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 sm:p-4 text-left"
            >
              <h5
                id="homophones-summary-errors-title"
                className="mb-2.5 flex items-center gap-2 text-sm font-bold text-rose-800 sm:text-base"
              >
                <span aria-hidden="true">⚠️</span>
                <span>Phrases avec erreurs ({mistakes.length}) :</span>
              </h5>
              <ul id="homophones-summary-errors-list" className="space-y-2.5">
                {mistakes.map((mistake, index) => (
                  <li
                    key={mistake.id || index}
                    id={`homophones-summary-error-item-${index}`}
                    className="rounded-xl border border-rose-200 bg-white p-2.5 sm:p-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium text-slate-800 sm:text-base">
                      <span className="mr-0.5 font-bold text-slate-400">
                        {index + 1}.
                      </span>
                      {Array.isArray(mistake.displayTokens) && mistake.displayTokens.length > 0 ? (
                        mistake.displayTokens.map((token, tIdx) => {
                          if (token.isBlank) {
                            return (
                              <span
                                key={token.id || tIdx}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold sm:text-sm"
                              >
                                <span className="text-rose-600 line-through decoration-2">
                                  {mistake.selectedSound}
                                </span>
                                <span className="text-slate-400" aria-hidden="true">
                                  ➔
                                </span>
                                <span className="font-extrabold text-emerald-700">
                                  {mistake.correctSound}
                                </span>
                              </span>
                            );
                          }
                          return (
                            <span key={token.id || tIdx} className="text-slate-800">
                              {token.text}
                            </span>
                          );
                        })
                      ) : (
                        <span>{mistake.sentenceText}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ActivitySummaryCard>
      )}

      <ActivityActionsBar
        id="homophones-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          !finished && roundFinished
            ? {
                id: "homophones-next-button",
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
            id: "homophones-restart-button",
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

export default HomophonesActivity;
