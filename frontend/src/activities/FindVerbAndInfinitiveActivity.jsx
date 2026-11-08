import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import ActivityActionsBar from "../components/ActivityActionsBar";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import {
  parseActivityContent,
  getSafeDisplayText,
  parsePositiveInt,
  handleRoundRestart,
} from "../utils/activityUtils";
import { API_URL } from "../config/api";

const ALLOWED_LEVEL_KEYS = ["level1", "level2", "level3"];

export const defaultFindVerbAndInfinitiveActivityContent = {
  title: "Trouver le verbe et son infinitif",
  instruction: "Trouve le ou les verbes dans chaque phrase et écris leur infinitif.",
  sentenceCount: 10,
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      sentenceCount: 10,
      verbCount: "single",
      askInfinitive: false,
      instruction: "Clique sur le verbe dans chaque phrase pour le sélectionner, puis valide.",
    },
    level2: {
      label: "Niveau 2",
      sentenceCount: 10,
      verbCount: "single",
      askInfinitive: true,
      instruction: "Clique sur le verbe et écris son infinitif dans la case sous le mot, puis valide.",
    },
    level3: {
      label: "Niveau 3",
      sentenceCount: 10,
      verbCount: "multiple",
      minMultiVerbsRatio: 0.2,
      askInfinitive: true,
      instruction: "Trouve le ou les verbes de chaque phrase et écris leur infinitif dans chaque case, puis valide.",
    },
  },
};

export function normalizeAccentText(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isPunctuationWord(wordObj) {
  const word = String(wordObj?.word || "").trim();
  const nature = String(wordObj?.nature || "").toLowerCase();
  return nature === "ponctuation" || !word || !/[A-Za-zÀ-ÿ0-9]/.test(word);
}

export function isVerbWord(wordObj) {
  const nature = String(wordObj?.nature || "").toLowerCase();
  const isVerb = (nature === "verbe" || /\bverbe\b/.test(nature)) && !nature.includes("adverbe");
  return isVerb && Boolean(wordObj?.infinitif);
}

export function buildSentenceRound(sentenceEntry, index) {
  const rawWords = Array.isArray(sentenceEntry?.words) ? sentenceEntry.words : [];
  const sentenceId = sentenceEntry?.id || `phrase-${index + 1}`;

  const tokens = rawWords.map((wordObj, wIdx) => {
    const isPunct = isPunctuationWord(wordObj);
    const isVerb = !isPunct && isVerbWord(wordObj);
    const tokenId = `${sentenceId}-token-${wIdx}`;
    return {
      id: tokenId,
      index: wIdx,
      text: String(wordObj?.word || "").trim(),
      isPunctuation: isPunct,
      isVerb,
      infinitif: isVerb ? String(wordObj?.infinitif || "").trim().toLowerCase() : "",
      temps: String(wordObj?.temps || "").trim(),
    };
  });

  const verbs = tokens.filter((t) => t.isVerb);

  return {
    id: sentenceId,
    sentenceText: getSafeDisplayText(
      sentenceEntry?.sentence,
      tokens.map((t) => t.text).join(" ")
    ),
    tokens,
    verbs,
  };
}

export function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};
  const sentenceCount = Math.max(
    1,
    parsePositiveInt(source.sentenceCount, fallbackRule.sentenceCount)
  );
  const verbCount =
    source.verbCount === "multiple" || fallbackRule.verbCount === "multiple"
      ? "multiple"
      : "single";
  const minMultiVerbsRatio =
    typeof source.minMultiVerbsRatio === "number"
      ? source.minMultiVerbsRatio
      : typeof fallbackRule.minMultiVerbsRatio === "number"
        ? fallbackRule.minMultiVerbsRatio
        : 0.2;
  const askInfinitive =
    typeof source.askInfinitive === "boolean"
      ? source.askInfinitive
      : Boolean(fallbackRule.askInfinitive);

  return {
    label: getSafeDisplayText(source.label, fallbackRule.label),
    sentenceCount,
    verbCount,
    minMultiVerbsRatio,
    askInfinitive,
    instruction: getSafeDisplayText(source.instruction, fallbackRule.instruction),
  };
}

const FindVerbAndInfinitiveActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
  isFocusedMode = false,
}) => {
  const parsedContent = useMemo(
    () => parseActivityContent(content, defaultFindVerbAndInfinitiveActivityContent),
    [content]
  );
  const defaultLevels = defaultFindVerbAndInfinitiveActivityContent.levels;

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

  const initialLevel = configuredLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : configuredLevelKeys[0] || "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const currentLevelRule =
    configuredLevels[currentLevel] || configuredLevels[configuredLevelKeys[0]] || defaultLevels.level1;

  const [loadingSentences, setLoadingSentences] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [sentenceRounds, setSentenceRounds] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  // Round interactive states
  const [selectedTokenIds, setSelectedTokenIds] = useState([]);
  const [infinitiveInputs, setInfinitiveInputs] = useState({});
  const [roundFinished, setRoundFinished] = useState(false);
  const [roundValidation, setRoundValidation] = useState(null);

  // Global activity stats
  const [processedCount, setProcessedCount] = useState(0);
  const [cumulatedEarnedPoints, setCumulatedEarnedPoints] = useState(0);
  const [cumulatedMaxPoints, setCumulatedMaxPoints] = useState(0);
  const [verbsFoundCount, setVerbsFoundCount] = useState(0);
  const [totalVerbsCount, setTotalVerbsCount] = useState(0);
  const [infinitivesFoundCount, setInfinitivesFoundCount] = useState(0);
  const [totalInfinitivesExpected, setTotalInfinitivesExpected] = useState(0);

  const [mistakes, setMistakes] = useState([]);
  const [accentNotices, setAccentNotices] = useState([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);

  const [message, setMessage] = useState("");
  const [isSuccessMessage, setIsSuccessMessage] = useState(true);
  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(
    message,
    setMessage,
    3500,
    4000
  );

  const requestIdRef = useRef(0);
  const lastAutoLoadSignatureRef = useRef("");

  const currentSentence = sentenceRounds[currentSentenceIndex] || null;

  const isDemoMode = !student;
  const isFocusMode = Boolean(isFocusedMode);
  const isGroupStudentMode = Boolean(student) && !isFocusMode;

  const progressPercent =
    sentenceRounds.length > 0
      ? Math.round(
          ((currentSentenceIndex + (roundFinished ? 1 : 0)) / sentenceRounds.length) * 100
        )
      : 0;

  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultFindVerbAndInfinitiveActivityContent.title
  );

  const displayInstruction = getSafeDisplayText(
    currentLevelRule.instruction,
    defaultFindVerbAndInfinitiveActivityContent.instruction
  );

  const isLevelStarted =
    currentSentenceIndex > 0 ||
    processedCount > 0 ||
    roundFinished ||
    selectedTokenIds.length > 0 ||
    Object.values(infinitiveInputs).some(
      (val) => typeof val === "string" && val.trim().length > 0
    );

  const isLevelLocked = isDemoMode
    ? false
    : isGroupStudentMode
      ? isLevelStarted || finished
      : !finished && isLevelStarted;

  let isRestartDisabled = false;
  if (loadingSentences) {
    isRestartDisabled = true;
  } else if (isDemoMode) {
    isRestartDisabled = false;
  } else if (isGroupStudentMode) {
    isRestartDisabled = !allStudentsCompleted;
  } else if (isFocusMode) {
    isRestartDisabled = !finished;
  }

  const restartTitle = isGroupStudentMode && finished && !allStudentsCompleted
    ? "En attente que tous les élèves terminent..."
    : allStudentsCompleted && student
      ? "Recommencer et réinitialiser la liste des élèves"
      : "Recommencer avec d'autres phrases";

  const isAnswerReady =
    !roundFinished &&
    !finished &&
    selectedTokenIds.length > 0 &&
    (!currentLevelRule.askInfinitive ||
      selectedTokenIds.every(
        (tokenId) => Boolean(infinitiveInputs[tokenId] && infinitiveInputs[tokenId].trim())
      ));

  const resetActivityState = useCallback(() => {
    setCurrentSentenceIndex(0);
    setSelectedTokenIds([]);
    setInfinitiveInputs({});
    setRoundFinished(false);
    setRoundValidation(null);
    setProcessedCount(0);
    setCumulatedEarnedPoints(0);
    setCumulatedMaxPoints(0);
    setVerbsFoundCount(0);
    setTotalVerbsCount(0);
    setInfinitivesFoundCount(0);
    setTotalInfinitivesExpected(0);
    setMistakes([]);
    setAccentNotices([]);
    setFinished(false);
    setScore(null);
    setMessage("");
  }, []);

  const loadSentencesForLevel = useCallback(
    async (levelKey) => {
      const levelRule = configuredLevels[levelKey] || configuredLevels.level1;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setLoadingSentences(true);
      setLoadingError("");
      resetActivityState();

      try {
        const count = levelRule.sentenceCount || 10;
        let rawSentences = [];

        if (levelRule.verbCount === "single") {
          const params = new URLSearchParams({
            count: String(count),
            requiredNatures: "verbe",
            minVerbs: "1",
            maxVerbs: "1",
          });

          const response = await fetch(`${API_URL}/ai/generated-sentences/practice?${params.toString()}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Erreur lors du chargement des phrases");
          }

          rawSentences = Array.isArray(data?.sentences) ? data.sentences : [];
        } else {
          // Niveau 3 : phrases avec plusieurs verbes autorisées mais pas obligatoires (au moins 20%, ex: 2 sur 10)
          const ratio =
            typeof levelRule.minMultiVerbsRatio === "number"
              ? levelRule.minMultiVerbsRatio
              : 0.2;
          const multiCount = Math.max(1, Math.round(count * ratio));
          const singleCount = Math.max(0, count - multiCount);

          const multiParams = new URLSearchParams({
            count: String(multiCount),
            requiredNatures: "verbe",
            minVerbs: "2",
          });

          const singleParams = new URLSearchParams({
            count: String(singleCount),
            requiredNatures: "verbe",
            minVerbs: "1",
            maxVerbs: "1",
          });

          const [multiRes, singleRes] = await Promise.all([
            fetch(`${API_URL}/ai/generated-sentences/practice?${multiParams.toString()}`),
            singleCount > 0
              ? fetch(`${API_URL}/ai/generated-sentences/practice?${singleParams.toString()}`)
              : Promise.resolve({ ok: true, json: async () => ({ sentences: [] }) }),
          ]);

          const multiData = await multiRes.json();
          const singleData = await singleRes.json();

          if (!multiRes.ok) {
            throw new Error(multiData.error || "Erreur lors du chargement des phrases à verbes multiples");
          }
          if (!singleRes.ok) {
            throw new Error(singleData.error || "Erreur lors du chargement des phrases à verbe unique");
          }

          const multiSentences = Array.isArray(multiData?.sentences) ? multiData.sentences : [];
          const singleSentences = Array.isArray(singleData?.sentences) ? singleData.sentences : [];

          if (multiSentences.length < multiCount) {
            throw new Error(
              `Pas assez de phrases avec plusieurs verbes disponibles en base (${multiSentences.length}/${multiCount}).`
            );
          }

          rawSentences = shuffleArray([...multiSentences, ...singleSentences]);
        }

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (rawSentences.length === 0) {
          throw new Error("Aucune phrase n'est disponible pour ces critères.");
        }

        const preparedRounds = rawSentences
          .map((s, idx) => buildSentenceRound(s, idx))
          .filter((round) => round.verbs.length > 0);

        if (preparedRounds.length === 0) {
          throw new Error("Aucune phrase valide avec verbes et infinitifs trouvée.");
        }

        setSentenceRounds(preparedRounds);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setSentenceRounds([]);
        setLoadingError(err.message || "Impossible de charger les phrases depuis la base.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingSentences(false);
        }
      }
    },
    [configuredLevels, resetActivityState]
  );

  const currentLoadSignature = useMemo(
    () =>
      JSON.stringify({
        level: currentLevel,
        sentenceCount: currentLevelRule.sentenceCount,
        verbCount: currentLevelRule.verbCount,
        minMultiVerbsRatio: currentLevelRule.minMultiVerbsRatio,
        askInfinitive: currentLevelRule.askInfinitive,
      }),
    [
      currentLevel,
      currentLevelRule.sentenceCount,
      currentLevelRule.verbCount,
      currentLevelRule.minMultiVerbsRatio,
      currentLevelRule.askInfinitive,
    ]
  );

  useEffect(() => {
    if (finished || isLevelStarted) {
      return;
    }
    setCurrentLevel(initialLevel);
  }, [initialLevel, finished, isLevelStarted]);

  useEffect(() => {
    if (finished) {
      return;
    }

    if (lastAutoLoadSignatureRef.current === currentLoadSignature) {
      return;
    }

    lastAutoLoadSignatureRef.current = currentLoadSignature;
    loadSentencesForLevel(currentLevel);
  }, [currentLevel, currentLoadSignature, loadSentencesForLevel, finished]);

  const handleSelectLevel = (levelKey) => {
    if (loadingSentences || isLevelLocked) {
      return;
    }

    if (levelKey === currentLevel) {
      if (isDemoMode || (isFocusMode && finished)) {
        loadSentencesForLevel(levelKey);
      }
      return;
    }

    setCurrentLevel(levelKey);
  };

  const handleTokenClick = (token) => {
    if (roundFinished || finished || token.isPunctuation) {
      return;
    }

    const tokenId = token.id;
    if (selectedTokenIds.includes(tokenId)) {
      if (isAnswerReady) {
        handleValidateSentence();
      }
      return;
    }

    if (currentLevelRule.verbCount === "single") {
      setSelectedTokenIds([tokenId]);
    } else {
      setSelectedTokenIds((prev) => [...prev, tokenId]);
    }
  };

  const handleInputChange = (tokenId, value) => {
    if (roundFinished || finished) {
      return;
    }
    setInfinitiveInputs((prev) => ({
      ...prev,
      [tokenId]: value,
    }));
  };

  const handleValidateSentence = () => {
    if (!currentSentence || roundFinished || finished || !isAnswerReady) {
      return;
    }

    const targetVerbs = currentSentence.verbs;
    const askInfinitive = currentLevelRule.askInfinitive;

    let roundVerbsFound = 0;
    let roundInfinitivesFound = 0;
    let roundEarnedPoints = 0;
    const roundMaxPoints = targetVerbs.length * (askInfinitive ? 2 : 1);

    const verbResults = [];
    const localAccentNotices = [];

    // Analyse de chaque verbe attendu
    targetVerbs.forEach((verbToken) => {
      const isSelected = selectedTokenIds.includes(verbToken.id);
      let infinitiveCorrect = false;
      let hasAccentWarning = false;
      const userInput = (infinitiveInputs[verbToken.id] || "").trim();
      const cleanExpected = verbToken.infinitif;

      if (isSelected) {
        roundVerbsFound += 1;
        roundEarnedPoints += 1;

        if (askInfinitive) {
          const cleanUser = userInput.toLowerCase();
          const isExact = cleanUser === cleanExpected;
          const isAccentMatch =
            !isExact && normalizeAccentText(cleanUser) === normalizeAccentText(cleanExpected);

          if (isExact) {
            infinitiveCorrect = true;
            roundInfinitivesFound += 1;
            roundEarnedPoints += 1;
          } else if (isAccentMatch) {
            infinitiveCorrect = true;
            hasAccentWarning = true;
            roundInfinitivesFound += 1;
            roundEarnedPoints += 1;
            localAccentNotices.push({
              word: verbToken.text,
              input: userInput,
              expected: verbToken.infinitif,
            });
          }
        }
      }

      verbResults.push({
        id: verbToken.id,
        text: verbToken.text,
        expectedInfinitif: verbToken.infinitif,
        userInput,
        isSelected,
        infinitiveCorrect,
        hasAccentWarning,
      });
    });

    // Mots sélectionnés qui ne sont PAS des verbes (distracteurs / fausses sélections)
    const distractors = currentSentence.tokens
      .filter((token) => selectedTokenIds.includes(token.id) && !token.isVerb)
      .map((token) => ({
        id: token.id,
        text: token.text,
      }));

    const isSentencePerfect =
      roundVerbsFound === targetVerbs.length &&
      distractors.length === 0 &&
      (!askInfinitive || roundInfinitivesFound === targetVerbs.length);

    const validationDetails = {
      isSentencePerfect,
      verbResults,
      distractors,
      earnedPoints: roundEarnedPoints,
      maxPoints: roundMaxPoints,
      verbsFound: roundVerbsFound,
      totalVerbs: targetVerbs.length,
      infinitivesFound: roundInfinitivesFound,
      totalInfinitives: askInfinitive ? targetVerbs.length : 0,
      accentNotices: localAccentNotices,
    };

    setRoundValidation(validationDetails);
    setRoundFinished(true);

    // Mettre à jour les totaux cumulés
    setCumulatedEarnedPoints((prev) => prev + roundEarnedPoints);
    setCumulatedMaxPoints((prev) => prev + roundMaxPoints);
    setVerbsFoundCount((prev) => prev + roundVerbsFound);
    setTotalVerbsCount((prev) => prev + targetVerbs.length);
    if (askInfinitive) {
      setInfinitivesFoundCount((prev) => prev + roundInfinitivesFound);
      setTotalInfinitivesExpected((prev) => prev + targetVerbs.length);
    }

    if (localAccentNotices.length > 0) {
      setAccentNotices((prev) => [
        ...prev,
        {
          sentenceText: currentSentence.sentenceText,
          notices: localAccentNotices,
        },
      ]);
    }

    if (!isSentencePerfect) {
      setMistakes((prev) => [
        ...prev,
        {
          sentenceId: currentSentence.id,
          sentenceText: currentSentence.sentenceText,
          verbResults,
          distractors,
        },
      ]);
    }

    // Message de retour
    if (isSentencePerfect) {
      setIsSuccessMessage(true);
      if (localAccentNotices.length > 0) {
        const warningStr = localAccentNotices
          .map((n) => `« ${n.input} » ➔ « ${n.expected} »`)
          .join(", ");
        setMessage(`Excellent ! Attention toutefois aux accents : ${warningStr}.`);
      } else {
        setMessage("Bravo ! Tout est correct pour cette phrase !");
      }
    } else {
      setIsSuccessMessage(false);
      const parts = [];
      if (distractors.length > 0) {
        parts.push("mot non-verbe sélectionné");
      }
      if (roundVerbsFound < targetVerbs.length) {
        parts.push("verbe non trouvé");
      }
      if (askInfinitive && roundInfinitivesFound < roundVerbsFound) {
        parts.push("infinitif incorrect");
      }
      setMessage(`Attention : ${parts.join(", ")}. Observe la correction.`);
    }
  };

  const handleNextSentence = () => {
    if (currentSentenceIndex + 1 < sentenceRounds.length) {
      setCurrentSentenceIndex((prev) => prev + 1);
      setSelectedTokenIds([]);
      setInfinitiveInputs({});
      setRoundFinished(false);
      setRoundValidation(null);
      setProcessedCount((prev) => prev + 1);
      setMessage("");
    } else {
      // Fin de l'activité
      const nextProcessedCount = sentenceRounds.length;
      setProcessedCount(nextProcessedCount);

      const totalEarned = cumulatedEarnedPoints;
      const totalMax = cumulatedMaxPoints > 0 ? cumulatedMaxPoints : 1;
      const calculatedScore = Math.round((totalEarned / totalMax) * 20);

      setFinished(true);
      setScore(calculatedScore);

      if (student && onComplete) {
        onComplete(calculatedScore, {
          levelKey: currentLevel,
          levelLabel: currentLevelRule.label,
          score: calculatedScore,
          earnedPoints: totalEarned,
          maxPoints: totalMax,
        });
      }
    }
  };

  const handleRestart = () => {
    if (isRestartDisabled) {
      return;
    }
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }
    loadSentencesForLevel(currentLevel);
  };

  return (
    <div
      id="find-verb-infinitive-activity"
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-2 sm:gap-6 sm:p-4"
    >
      <ActivityHero
        idPrefix="find-verb-infinitive"
        title={displayTitle}
        instruction={displayInstruction}
        badges={[
          {
            key: "badge-nature",
            label: "Grammaire : Verbes",
            className:
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800",
          },
          ...(currentLevelRule.askInfinitive
            ? [
                {
                  key: "badge-infinitive",
                  label: "Infinitif du verbe",
                  className:
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800",
                },
              ]
            : []),
          {
            key: "badge-sentences",
            label: `${sentenceRounds.length || currentLevelRule.sentenceCount} phrases`,
            className:
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-800",
          },
        ]}
        badgesId="find-verb-infinitive-badges"
        levels={configuredLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
          disabled: loadingSentences || isLevelLocked,
        }))}
        disableAllLevels={loadingSentences || isLevelLocked}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(levelKey) => `find-verb-infinitive-level-${levelKey}`}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="find-verb-infinitive-status-panel"
          progressBarId="find-verb-infinitive-progress-bar"
          progressPercent={progressPercent}
          label="Progression dans les phrases"
        />
      )}

      {loadingSentences ? (
        <div
          id="find-verb-infinitive-loading"
          className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-center font-medium text-sky-800 sm:p-6"
        >
          Chargement des phrases depuis la base...
        </div>
      ) : loadingError ? (
        <div
          id="find-verb-infinitive-error"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center font-medium text-rose-700 sm:p-6"
        >
          {loadingError}
        </div>
      ) : (
        <>
          {!finished && currentSentence && (
            <section
              id="find-verb-infinitive-sentence-section"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6"
            >
              <div className="mb-4 flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">Phrase à analyser</h4>
                  <p className="text-sm text-slate-500">
                    Phrase {currentSentenceIndex + 1} sur {sentenceRounds.length}
                  </p>
                </div>
                {!roundFinished ? (
                  <div className="text-xs font-semibold text-slate-600 sm:text-sm">
                    {selectedTokenIds.length === 0
                      ? currentLevelRule.verbCount === "single"
                        ? "Clique sur le verbe pour le sélectionner"
                        : "Clique sur le ou les verbes de la phrase"
                      : isAnswerReady
                        ? "Clique à nouveau sur le verbe sélectionné ou sur « Valider » pour vérifier"
                        : "Saisis l'infinitif dans la case sous le mot pour pouvoir valider"}
                  </div>
                ) : (
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold sm:text-sm ${
                      roundValidation?.isSentencePerfect
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    <span>
                      {roundValidation?.isSentencePerfect ? "✓ Réussie" : "⚠️ Corrigée"}
                    </span>
                    <span>
                      ({roundValidation?.earnedPoints} / {roundValidation?.maxPoints} pt
                      {roundValidation?.maxPoints > 1 ? "s" : ""})
                    </span>
                  </div>
                )}
              </div>

              {/* Contenu interactif des tokens de la phrase */}
              <div
                id="find-verb-infinitive-sentence-container"
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-6"
              >
                <div
                  id="find-verb-infinitive-tokens"
                  className="flex flex-wrap items-start justify-center gap-x-2 gap-y-4 text-base sm:text-lg"
                >
                  {currentSentence.tokens.map((token) => {
                    if (token.isPunctuation) {
                      return (
                        <span
                          key={token.id}
                          className="self-center px-1 text-slate-700 select-none font-medium"
                        >
                          {token.text}
                        </span>
                      );
                    }

                    const isSelected = selectedTokenIds.includes(token.id);

                    // États après validation
                    const verbDetail = roundValidation?.verbResults.find(
                      (v) => v.id === token.id
                    );
                    const isDistractor = roundValidation?.distractors.some(
                      (d) => d.id === token.id
                    );
                    const isMissedVerb = token.isVerb && !isSelected;

                    let tokenStyle =
                      "border-slate-300 bg-white text-slate-800 hover:border-indigo-300";
                    if (isSelected && !roundFinished) {
                      tokenStyle =
                        "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs ring-2 ring-indigo-200";
                    } else if (roundFinished) {
                      if (verbDetail?.isSelected) {
                        tokenStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200";
                      } else if (isDistractor) {
                        tokenStyle = "border-rose-400 bg-rose-50 text-rose-800 line-through ring-2 ring-rose-200";
                      } else if (isMissedVerb) {
                        tokenStyle = "border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-200";
                      } else {
                        tokenStyle = "border-slate-200 bg-white text-slate-600 opacity-80";
                      }
                    }

                    return (
                      <div
                        key={token.id}
                        id={`find-verb-item-${token.id}`}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <button
                          type="button"
                          id={`find-verb-token-${token.id}`}
                          onClick={() => handleTokenClick(token)}
                          disabled={roundFinished || finished}
                          title={
                            roundFinished
                              ? token.text
                              : isSelected
                                ? "Clique à nouveau pour valider la réponse"
                                : "Clique pour sélectionner"
                          }
                          aria-label={
                            isSelected && !roundFinished
                              ? `${token.text} sélectionné, clique à nouveau pour valider`
                              : token.text
                          }
                          className={`rounded-xl border-2 px-3 py-1.5 font-bold transition-all select-none ${tokenStyle} ${
                            roundFinished ? "cursor-default" : "cursor-pointer"
                          }`}
                        >
                          {token.text}
                        </button>

                        {/* Champ ou résultat pour l'infinitif */}
                        {currentLevelRule.askInfinitive && isSelected && !roundFinished && (
                          <div className="w-full min-w-[100px] max-w-[140px] animate-fade-in">
                            <input
                              type="text"
                              id={`find-verb-input-${token.id}`}
                              placeholder="Infinitif..."
                              value={infinitiveInputs[token.id] || ""}
                              onChange={(e) => handleInputChange(token.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleValidateSentence();
                                }
                              }}
                              autoCapitalize="none"
                              autoCorrect="off"
                              spellCheck="false"
                              className="w-full rounded-lg border-2 border-indigo-300 bg-white px-2 py-1 text-center text-xs font-semibold text-slate-800 shadow-2xs focus:border-indigo-600 focus:outline-hidden"
                            />
                          </div>
                        )}

                        {/* Rendu des corrections sous le mot après validation */}
                        {roundFinished && (
                          <div className="flex flex-col items-center gap-1 text-xs">
                            {verbDetail?.isSelected && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                                ✓ Verbe trouvé
                              </span>
                            )}

                            {isDistractor && (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800">
                                ✗ Pas un verbe
                              </span>
                            )}

                            {isMissedVerb && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
                                ⚠️ Verbe oublié
                              </span>
                            )}

                            {currentLevelRule.askInfinitive && token.isVerb && (
                              <div className="mt-0.5 text-center">
                                {verbDetail?.isSelected ? (
                                  verbDetail.infinitiveCorrect ? (
                                    <div className="flex flex-col items-center">
                                      <span className="font-extrabold text-emerald-700">
                                        Infinitif : {verbDetail.expectedInfinitif} ✓
                                      </span>
                                      {verbDetail.hasAccentWarning && (
                                        <span className="text-[10px] font-semibold text-blue-700">
                                          (Attention à l&apos;accent !)
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center text-rose-700 font-semibold">
                                      <span className="line-through opacity-75">
                                        {verbDetail.userInput || "aucun"}
                                      </span>
                                      <span className="font-bold text-emerald-700">
                                        ➔ {verbDetail.expectedInfinitif}
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  <span className="font-semibold text-amber-800">
                                    Infinitif : {token.infinitif}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Feedback temporaire ou message */}
          {showMessage && (
            <div
              id="find-verb-infinitive-message"
              className={`rounded-2xl border px-4 py-3 text-center font-semibold transition-opacity duration-500 ${
                isSuccessMessage
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              } ${fadeMessage ? "opacity-0" : "opacity-100"}`}
            >
              {message}
            </div>
          )}
        </>
      )}

      {/* Résumé de fin d'activité */}
      {finished && (
        <ActivitySummaryCard
          id="find-verb-infinitive-summary"
          title="Activité terminée !"
          score={score}
          message={`Bravo, tu as analysé les ${processedCount} phrases.`}
          stats={[
            {
              key: "verbs",
              label: "Verbes identifiés",
              value: `${verbsFoundCount} / ${totalVerbsCount}`,
            },
            ...(currentLevelRule.askInfinitive
              ? [
                  {
                    key: "infinitives",
                    label: "Infinitifs trouvés",
                    value: `${infinitivesFoundCount} / ${totalInfinitivesExpected}`,
                  },
                ]
              : []),
            {
              key: "phrases",
              label: "Phrases parfaites",
              value: `${processedCount - mistakes.length} / ${processedCount}`,
            },
          ]}
        >
          {accentNotices.length > 0 && (
            <div
              id="find-verb-infinitive-accent-recap"
              className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-left sm:p-4"
            >
              <h5 className="mb-2 font-bold text-blue-900 flex items-center gap-1.5">
                <span>💡</span>
                <span>Rappel sur les accents (bonnes réponses tolérées) :</span>
              </h5>
              <ul className="space-y-1.5 text-xs sm:text-sm text-blue-950">
                {accentNotices.map((notice, nIdx) => (
                  <li key={nIdx}>
                    <span className="font-medium italic">« {notice.sentenceText} »</span> :{" "}
                    {notice.notices.map((item, iIdx) => (
                      <span key={iIdx} className="font-semibold">
                        tu as écrit <span className="line-through">{item.input}</span> ➔
                        l&apos;orthographe exacte est{" "}
                        <span className="font-bold underline">{item.expected}</span>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mistakes.length > 0 && (
            <div
              id="find-verb-infinitive-summary-errors"
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-left sm:p-4"
            >
              <h5 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-rose-800 sm:text-base">
                <span aria-hidden="true">⚠️</span>
                <span>Phrases avec erreurs ({mistakes.length}) :</span>
              </h5>
              <ul id="find-verb-summary-errors-list" className="space-y-2.5">
                {mistakes.map((mistake, index) => (
                  <li
                    key={mistake.sentenceId || index}
                    id={`find-verb-summary-error-item-${index}`}
                    className="rounded-xl border border-rose-200 bg-white p-3 shadow-2xs"
                  >
                    <p className="font-bold text-slate-800 text-sm sm:text-base mb-1">
                      {index + 1}. {mistake.sentenceText}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                      {mistake.verbResults
                        .filter((v) => !v.isSelected || !v.infinitiveCorrect)
                        .map((v, vIdx) => (
                          <span
                            key={vIdx}
                            className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-amber-950"
                          >
                            {!v.isSelected ? (
                              <span>
                                Verbe manqué : <strong>{v.text}</strong>
                                {v.expectedInfinitif ? (
                                  <span className="text-amber-800 font-normal">
                                    {" "}
                                    (infinitif : <em>{v.expectedInfinitif}</em>)
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span>
                                Infinitif pour <strong>{v.text}</strong> :{" "}
                                {v.userInput ? (
                                  <span className="line-through text-rose-600 decoration-rose-500 font-semibold">
                                    « {v.userInput} »
                                  </span>
                                ) : (
                                  <span className="italic text-rose-600">(non renseigné)</span>
                                )}{" "}
                                <span aria-hidden="true" className="text-slate-400 font-bold">
                                  ➔
                                </span>{" "}
                                attendu «{" "}
                                <strong className="text-emerald-700 font-bold">
                                  {v.expectedInfinitif}
                                </strong>{" "}
                                »
                              </span>
                            )}
                          </span>
                        ))}
                      {mistake.distractors.map((d, dIdx) => (
                        <span
                          key={dIdx}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-rose-900"
                        >
                          « {d.text} » n&apos;est pas un verbe
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ActivitySummaryCard>
      )}

      {/* Barre d'actions TOUJOURS en dernier tout en bas */}
      <ActivityActionsBar
        id="find-verb-infinitive-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          !finished && !roundFinished
            ? {
                id: "find-verb-infinitive-validate-button",
                onClick: handleValidateSentence,
                disabled: loadingSentences || !isAnswerReady,
                ariaLabel: "Valider la réponse pour cette phrase",
                title: isAnswerReady
                  ? "Valider la réponse"
                  : selectedTokenIds.length === 0
                    ? "Sélectionne au moins un verbe"
                    : "Complète l'infinitif pour chaque verbe sélectionné",
                icon: "✓",
                srText: "Valider",
                variant: "validate",
              }
            : null,
          !finished && roundFinished
            ? {
                id: "find-verb-infinitive-next-button",
                onClick: handleNextSentence,
                disabled: false,
                ariaLabel: "Passer à la phrase suivante",
                title: "Passer à la phrase suivante",
                icon: "➥",
                srText: "Suivant",
                variant: "validate",
              }
            : null,
          {
            id: "find-verb-infinitive-restart-button",
            onClick: handleRestart,
            disabled: isRestartDisabled,
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

export default FindVerbAndInfinitiveActivity;
