import React, { useCallback, useEffect, useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import { API_URL } from "../config/api";
import { getSafeDisplayText, parseActivityContent, randomRotation } from "./activityUtils";

const WORD_TILE_ROTATION_MIN = -6;
const WORD_TILE_ROTATION_MAX = 6;
const BLANK_NATURE_PRIORITY = [
  "verbe",
  "nom commun",
  "nom",
  "adjectif qualificatif",
  "adjectif",
  "determinant",
  "pronom",
];

export const defaultFillInTheBlanksActivityContent = {
  title: "Complète la phrase",
  instruction: "Lis la phrase puis glisse ou clique les mots manquants dans les trous.",
  showWordBank: true,
  sourceLevel: "CE1",
  sourceTheme: "animaux",
  sentences: [
    {
      id: "phrase-1",
      prompt: "Complète avec les bons mots.",
      wordBank: ["petit", "chat"],
      tokens: [
        { type: "text", value: "Le" },
        {
          type: "blank",
          answer: "petit",
          placeholder: "Mot à glisser",
          nature: "adjectif qualificatif",
          category: "mot variable",
        },
        {
          type: "blank",
          answer: "chat",
          placeholder: "Mot à glisser",
          nature: "nom commun",
          category: "mot variable",
        },
        { type: "text", value: "dort" },
        { type: "punctuation", value: "." },
      ],
    },
  ],
};

function normalizeNatureKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isPunctuationEntry(item) {
  const word = String(item?.word || "").trim();
  const nature = normalizeNatureKey(item?.nature);

  return !word || nature === "ponctuation" || !/[A-Za-zÀ-ÿ0-9]/.test(word);
}

function isPunctuationValue(value) {
  return !/[A-Za-zÀ-ÿ0-9]/.test(String(value || ""));
}

function normalizeComparisonText(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeToken(token, index) {
  const source = token && typeof token === "object" ? token : { value: token };
  const rawValue = getSafeDisplayText(source.value ?? source.word ?? source.text, "");
  const rawAnswer = getSafeDisplayText(source.answer ?? source.word ?? source.value, rawValue);
  const derivedType = source.type || (source.isBlank ? "blank" : isPunctuationValue(rawValue) ? "punctuation" : "text");
  const type = String(derivedType || "text").trim().toLowerCase();

  if (type === "blank") {
    return {
      id: source.id || `blank-${index}`,
      type: "blank",
      answer: rawAnswer,
      placeholder: getSafeDisplayText(source.placeholder, "Mot à glisser"),
      nature: getSafeDisplayText(source.nature, ""),
      category: getSafeDisplayText(source.category, ""),
    };
  }

  if (type === "punctuation") {
    return {
      id: source.id || `punctuation-${index}`,
      type: "punctuation",
      value: rawValue || rawAnswer,
    };
  }

  return {
    id: source.id || `text-${index}`,
    type: "text",
    value: rawValue || rawAnswer,
  };
}

function normalizeSentence(sentence, index) {
  const source = sentence && typeof sentence === "object" ? sentence : {};
  const rawTokens = Array.isArray(source.tokens) ? source.tokens : [];
  const tokens = rawTokens
    .map((token, tokenIndex) => normalizeToken(token, `${index}-${tokenIndex}`))
    .filter((token) => (token.type === "blank" ? Boolean(token.answer) : Boolean(token.value)));

  const blanks = tokens.filter((token) => token.type === "blank");
  const wordBank = Array.isArray(source.wordBank) && source.wordBank.length > 0
    ? source.wordBank.map((word) => String(word || "").trim()).filter(Boolean)
    : blanks.map((token) => token.answer);

  return {
    id: source.id || `sentence-${index + 1}`,
    prompt: getSafeDisplayText(source.prompt, `Phrase ${index + 1}`),
    tokens,
    wordBank,
  };
}

function buildInitialAnswers(sentences) {
  return sentences.reduce((accumulator, sentence) => {
    sentence.tokens.forEach((token) => {
      if (token.type === "blank") {
        accumulator[token.id] = "";
      }
    });
    return accumulator;
  }, {});
}

function buildInitialBlankAssignments(sentences) {
  return sentences.reduce((accumulator, sentence) => {
    sentence.tokens.forEach((token) => {
      if (token.type === "blank") {
        accumulator[token.id] = "";
      }
    });
    return accumulator;
  }, {});
}

function buildWordBankTiles(sentences) {
  const tiles = [];

  sentences.forEach((sentence, sentenceIndex) => {
    sentence.wordBank.forEach((word, wordIndex) => {
      const label = String(word || "").trim();
      if (!label) {
        return;
      }

      tiles.push({
        id: `${sentence.id || `sentence-${sentenceIndex + 1}`}-word-${wordIndex}-${normalizeComparisonText(label).replace(/[^a-z0-9]+/g, "-") || "mot"}`,
        label,
        rotation: randomRotation(WORD_TILE_ROTATION_MIN, WORD_TILE_ROTATION_MAX),
      });
    });
  });

  return tiles;
}

function countBlanks(sentences) {
  return sentences.reduce(
    (total, sentence) => total + sentence.tokens.filter((token) => token.type === "blank").length,
    0
  );
}

function buildSentenceFromGeneratedEntry(entry) {
  if (!entry?.sentence || !Array.isArray(entry.words) || entry.words.length === 0) {
    return null;
  }

  const eligibleWords = entry.words.filter((item) => !isPunctuationEntry(item));
  if (eligibleWords.length === 0) {
    return null;
  }

  const targetBlankCount = Math.min(4, Math.max(1, Math.round(eligibleWords.length / 3)));
  const rankedCandidates = eligibleWords
    .map((item, index) => {
      const natureKey = normalizeNatureKey(item?.nature);
      const priorityIndex = BLANK_NATURE_PRIORITY.findIndex((candidate) => natureKey.includes(candidate));

      return {
        ...item,
        __key: String(item?.position ?? index + 1),
        __priority: priorityIndex === -1 ? BLANK_NATURE_PRIORITY.length : priorityIndex,
        __length: String(item?.word || "").trim().length,
      };
    })
    .sort(
      (first, second) =>
        first.__priority - second.__priority ||
        second.__length - first.__length ||
        Number(first.position || 0) - Number(second.position || 0)
    );

  const selectedKeys = new Set(
    rankedCandidates.slice(0, targetBlankCount).map((item) => item.__key)
  );

  const tokens = entry.words
    .map((item, index) => {
      const word = String(item?.word || "").trim();
      if (!word) {
        return null;
      }

      if (isPunctuationEntry(item)) {
        return {
          type: "punctuation",
          value: word,
        };
      }

      const tokenKey = String(item?.position ?? index + 1);
      if (selectedKeys.has(tokenKey)) {
        return {
          type: "blank",
          answer: word,
          placeholder: "Mot à glisser",
          nature: String(item?.nature || "").trim(),
          category: String(item?.category || "").trim(),
        };
      }

      return {
        type: "text",
        value: word,
      };
    })
    .filter(Boolean);

  return {
    id: entry.id ? `db-phrase-${entry.id}` : "db-phrase-1",
    prompt: "Complète la phrase avec les bons mots.",
    tokens,
    wordBank: entry.words
      .filter((item, index) => selectedKeys.has(String(item?.position ?? index + 1)))
      .filter((item) => !isPunctuationEntry(item))
      .map((item) => String(item?.word || "").trim())
      .filter(Boolean),
  };
}

const FillInTheBlanksActivity = ({ student, content, onComplete }) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);

  const normalizedContent = useMemo(() => {
    const fallback = defaultFillInTheBlanksActivityContent;
    const source = parsedContent && typeof parsedContent === "object" ? parsedContent : {};
    const rawSentences = Array.isArray(source.sentences) && source.sentences.length > 0
      ? source.sentences
      : fallback.sentences;

    const sentences = rawSentences
      .map((sentence, index) => normalizeSentence(sentence, index))
      .filter((sentence) => sentence.tokens.length > 0);

    return {
      title: getSafeDisplayText(source.title, fallback.title),
      instruction: getSafeDisplayText(source.instruction, fallback.instruction),
      showWordBank:
        typeof source.showWordBank === "boolean" ? source.showWordBank : fallback.showWordBank,
      sourceLevel: getSafeDisplayText(source.sourceLevel, fallback.sourceLevel),
      sourceTheme: getSafeDisplayText(source.sourceTheme, fallback.sourceTheme),
      useGeneratedSentencePool: Boolean(source.useGeneratedSentencePool),
      sentences: sentences.length > 0 ? sentences : fallback.sentences.map(normalizeSentence),
    };
  }, [parsedContent]);

  const [loadedPoolSentences, setLoadedPoolSentences] = useState([]);
  const [loadingPoolSentence, setLoadingPoolSentence] = useState(false);
  const [poolError, setPoolError] = useState("");

  const activeSentences = useMemo(() => {
    if (!normalizedContent.useGeneratedSentencePool) {
      return normalizedContent.sentences;
    }

    if (loadedPoolSentences.length > 0) {
      return loadedPoolSentences;
    }

    if (poolError) {
      return normalizedContent.sentences;
    }

    return [];
  }, [loadedPoolSentences, normalizedContent.sentences, normalizedContent.useGeneratedSentencePool, poolError]);

  const [typedAnswers, setTypedAnswers] = useState(() => buildInitialAnswers(activeSentences));
  const [blankAssignments, setBlankAssignments] = useState(() => buildInitialBlankAssignments(activeSentences));
  const [selectedWordId, setSelectedWordId] = useState("");
  const [draggedWordId, setDraggedWordId] = useState("");
  const [hoveredBlankId, setHoveredBlankId] = useState("");
  const [validationMap, setValidationMap] = useState({});
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);

  const loadSentenceFromDatabase = useCallback(async () => {
    if (!normalizedContent.useGeneratedSentencePool) {
      setLoadedPoolSentences([]);
      setPoolError("");
      return;
    }

    setLoadingPoolSentence(true);
    setPoolError("");

    try {
      const params = new URLSearchParams();
      if (normalizedContent.sourceLevel) {
        params.set("level", normalizedContent.sourceLevel);
      }
      if (normalizedContent.sourceTheme) {
        params.set("theme", normalizedContent.sourceTheme);
      }

      const response = await fetch(`${API_URL}/ai/generated-sentences/next?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement d'une phrase depuis la base");
      }

      const builtSentence = buildSentenceFromGeneratedEntry(data?.sentence);
      if (!builtSentence) {
        throw new Error("La phrase récupérée depuis la base est invalide.");
      }

      setLoadedPoolSentences([builtSentence]);
    } catch (err) {
      setLoadedPoolSentences([]);
      setPoolError(err.message || "Erreur inconnue");
    } finally {
      setLoadingPoolSentence(false);
    }
  }, [normalizedContent.sourceLevel, normalizedContent.sourceTheme, normalizedContent.useGeneratedSentencePool]);

  useEffect(() => {
    void loadSentenceFromDatabase();
  }, [loadSentenceFromDatabase]);

  useEffect(() => {
    setTypedAnswers(buildInitialAnswers(activeSentences));
    setBlankAssignments(buildInitialBlankAssignments(activeSentences));
    setSelectedWordId("");
    setDraggedWordId("");
    setHoveredBlankId("");
    setValidationMap({});
    setFinished(false);
    setScore(null);
  }, [activeSentences]);

  const totalBlanks = useMemo(() => countBlanks(activeSentences), [activeSentences]);
  const correctCount = useMemo(
    () => Object.values(validationMap).filter(Boolean).length,
    [validationMap]
  );
  const restartLocked = Boolean(student) && finished;

  const wordBankTiles = useMemo(
    () => buildWordBankTiles(activeSentences),
    [activeSentences]
  );

  const tileById = useMemo(
    () => new Map(wordBankTiles.map((tile) => [tile.id, tile])),
    [wordBankTiles]
  );

  const useWordBankInteraction = normalizedContent.showWordBank && wordBankTiles.length > 0;

  const answers = useMemo(() => {
    if (!useWordBankInteraction) {
      return typedAnswers;
    }

    return Object.keys(blankAssignments).reduce((accumulator, blankId) => {
      const tileId = blankAssignments[blankId];
      accumulator[blankId] = tileById.get(tileId)?.label || "";
      return accumulator;
    }, {});
  }, [blankAssignments, tileById, typedAnswers, useWordBankInteraction]);

  const usedWordIds = useMemo(
    () => new Set(Object.values(blankAssignments).filter(Boolean)),
    [blankAssignments]
  );

  const availableWordTiles = useMemo(
    () => wordBankTiles.filter((tile) => !usedWordIds.has(tile.id)),
    [wordBankTiles, usedWordIds]
  );

  const handleAnswerChange = (blankId, nextValue) => {
    if (finished || useWordBankInteraction) {
      return;
    }

    setTypedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [blankId]: nextValue,
    }));
  };

  const handleWordSelection = (wordId) => {
    if (finished || !useWordBankInteraction) {
      return;
    }

    setSelectedWordId((currentWordId) => (currentWordId === wordId ? "" : wordId));
  };

  const clearBlankAssignment = (blankId) => {
    if (finished || !useWordBankInteraction) {
      return;
    }

    setBlankAssignments((currentAssignments) => ({
      ...currentAssignments,
      [blankId]: "",
    }));
    setSelectedWordId("");
  };

  const placeWordInBlank = (blankId, wordId) => {
    if (finished || !useWordBankInteraction || !wordId || !tileById.has(wordId)) {
      return;
    }

    setBlankAssignments((currentAssignments) => {
      const nextAssignments = { ...currentAssignments };

      Object.keys(nextAssignments).forEach((currentBlankId) => {
        if (nextAssignments[currentBlankId] === wordId) {
          nextAssignments[currentBlankId] = "";
        }
      });

      nextAssignments[blankId] = wordId;
      return nextAssignments;
    });

    setSelectedWordId("");
    setDraggedWordId("");
    setHoveredBlankId("");
  };

  const handleBlankClick = (blankId) => {
    if (finished || !useWordBankInteraction) {
      return;
    }

    if (selectedWordId) {
      placeWordInBlank(blankId, selectedWordId);
      return;
    }

    if (blankAssignments[blankId]) {
      clearBlankAssignment(blankId);
    }
  };

  const handleBlankDrop = (event, blankId) => {
    if (finished || !useWordBankInteraction) {
      return;
    }

    event.preventDefault();
    const droppedWordId = event.dataTransfer.getData("text/plain") || draggedWordId || selectedWordId;
    placeWordInBlank(blankId, droppedWordId);
  };

  const handleValidate = () => {
    const nextValidationMap = {};
    let nextCorrectCount = 0;

    activeSentences.forEach((sentence) => {
      sentence.tokens.forEach((token) => {
        if (token.type !== "blank") {
          return;
        }

        const isCorrect =
          normalizeComparisonText(answers[token.id]) === normalizeComparisonText(token.answer);

        nextValidationMap[token.id] = isCorrect;
        if (isCorrect) {
          nextCorrectCount += 1;
        }
      });
    });

    const nextScore = totalBlanks === 0 ? 20 : Math.round((nextCorrectCount / totalBlanks) * 20);

    setValidationMap(nextValidationMap);
    setScore(nextScore);
    setFinished(true);

    if (typeof onComplete === "function") {
      onComplete(nextScore, {
        totalBlanks,
        correctBlanks: nextCorrectCount,
      });
    }
  };

  const handleRestart = () => {
    if (restartLocked) {
      return;
    }

    setTypedAnswers(buildInitialAnswers(activeSentences));
    setBlankAssignments(buildInitialBlankAssignments(activeSentences));
    setSelectedWordId("");
    setDraggedWordId("");
    setHoveredBlankId("");
    setValidationMap({});
    setFinished(false);
    setScore(null);

    if (normalizedContent.useGeneratedSentencePool) {
      void loadSentenceFromDatabase();
    }
  };

  return (
    <div id="fill-in-the-blanks-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="fill-in-the-blanks"
        title={normalizedContent.title}
        instruction={normalizedContent.instruction}
        badges={[
          normalizedContent.sourceLevel
            ? { key: "level", content: `Niveau : ${normalizedContent.sourceLevel}` }
            : null,
          normalizedContent.sourceTheme
            ? { key: "theme", content: `Thème : ${normalizedContent.sourceTheme}` }
            : null,
          { key: "blanks", content: `Mots à trouver : ${totalBlanks}` },
        ].filter(Boolean)}
      />

      <section
        id="fill-in-the-blanks-board"
        className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4"
      >
        {normalizedContent.useGeneratedSentencePool && (
          <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 sm:mb-4">
            {loadingPoolSentence
              ? "Chargement d'une phrase peu utilisée depuis la base..."
              : "La phrase affichée provient de la base et son compteur d'utilisation a été mis à jour."}
          </div>
        )}

        {poolError && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:mb-4">
            {poolError} {normalizedContent.sentences.length > 0 ? "Une phrase de secours est affichée." : ""}
          </div>
        )}

        {useWordBankInteraction && (
          <div
            id="fill-in-the-blanks-word-bank"
            className="mb-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 sm:mb-4 sm:p-4"
          >
            <div className="mb-2 text-sm font-semibold text-slate-700">Mots à utiliser</div>
            <div className="flex flex-wrap gap-2">
              {availableWordTiles.length > 0 ? (
                availableWordTiles.map((tile) => (
                  <button
                    key={tile.id}
                    id={`fill-in-the-blanks-word-${tile.id}`}
                    type="button"
                    draggable={!finished}
                    onClick={() => handleWordSelection(tile.id)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", tile.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedWordId(tile.id);
                      setSelectedWordId(tile.id);
                    }}
                    onDragEnd={() => {
                      setDraggedWordId("");
                      setHoveredBlankId("");
                    }}
                    disabled={finished}
                    aria-pressed={selectedWordId === tile.id}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
                      selectedWordId === tile.id || draggedWordId === tile.id
                        ? "border-violet-400 bg-violet-200 text-violet-900 ring-2 ring-violet-200"
                        : "border-violet-200 bg-violet-100 text-violet-800 hover:bg-violet-200"
                    }`}
                    style={{ transform: `rotate(${tile.rotation}deg)` }}
                  >
                    {tile.label}
                  </button>
                ))
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  Tous les mots proposés ont été placés.
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2.5 sm:space-y-3">
          {activeSentences.length === 0 && loadingPoolSentence ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              Préparation de la phrase à trous...
            </div>
          ) : activeSentences.map((sentence, sentenceIndex) => (
            <div
              key={sentence.id}
              id={`fill-in-the-blanks-sentence-${sentence.id}`}
              className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base font-bold text-slate-800">{sentence.prompt}</h4>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                  {sentence.tokens.filter((token) => token.type === "blank").length} mot(s) à compléter
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-x-2 gap-y-2 text-base leading-7 text-slate-800 sm:gap-y-3 sm:text-lg sm:leading-8">
                {sentence.tokens.map((token, tokenIndex) => {
                  if (token.type === "blank") {
                    const isCorrect = validationMap[token.id];
                    const assignedTile = tileById.get(blankAssignments[token.id]) || null;
                    const helperText = token.nature || token.category || "Mot";

                    if (useWordBankInteraction) {
                      return (
                        <span
                          key={token.id}
                          id={`fill-in-the-blanks-token-${sentenceIndex}-${tokenIndex}`}
                          className="inline-flex flex-col items-center gap-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => handleBlankClick(token.id)}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setHoveredBlankId(token.id);
                            }}
                            onDragLeave={() => {
                              setHoveredBlankId((currentBlankId) =>
                                currentBlankId === token.id ? "" : currentBlankId
                              );
                            }}
                            onDrop={(event) => handleBlankDrop(event, token.id)}
                            disabled={finished}
                            title={
                              assignedTile
                                ? `${assignedTile.label} — ${helperText}`
                                : `Nature attendue : ${helperText}`
                            }
                            aria-label={
                              assignedTile
                                ? `Mot placé : ${assignedTile.label}`
                                : `Trou à compléter : ${helperText}`
                            }
                            className={`inline-flex min-h-[42px] min-w-[110px] items-center justify-center rounded-full border px-4 py-2 text-center text-sm font-semibold shadow-sm transition sm:text-base ${
                              finished
                                ? isCorrect
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                                  : "border-rose-300 bg-rose-100 text-rose-900"
                                : assignedTile
                                  ? "border-violet-300 bg-violet-100 text-violet-900 hover:bg-violet-200"
                                  : hoveredBlankId === token.id
                                    ? "border-sky-400 bg-sky-50 text-sky-700"
                                    : "border-dashed border-slate-300 bg-white text-slate-400 hover:border-sky-300 hover:text-sky-700"
                            }`}
                          >
                            {assignedTile ? assignedTile.label : token.placeholder || "Mot"}
                          </button>

                          {finished && (
                            <span
                              className={`text-[10px] font-semibold ${
                                isCorrect ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {isCorrect ? "Bravo !" : `Réponse : ${token.answer}`}
                            </span>
                          )}
                        </span>
                      );
                    }

                    return (
                      <span
                        key={token.id}
                        id={`fill-in-the-blanks-token-${sentenceIndex}-${tokenIndex}`}
                        className="inline-flex flex-col items-center gap-1"
                      >
                        <input
                          type="text"
                          value={answers[token.id] || ""}
                          onChange={(event) => handleAnswerChange(token.id, event.target.value)}
                          disabled={finished}
                          placeholder={token.placeholder}
                          title={`Nature attendue : ${helperText}`}
                          autoComplete="off"
                          className={`max-w-full rounded-lg border px-2.5 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 sm:px-3 sm:py-2 sm:text-base ${
                            finished
                              ? isCorrect
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : "border-rose-300 bg-rose-50 text-rose-800"
                              : "border-sky-300 bg-white text-slate-800 focus:ring-sky-300"
                          }`}
                          style={{ width: `min(100%, ${Math.max(84, Math.min(160, token.answer.length * 12))}px)` }}
                        />

                        {finished && (
                          <span
                            className={`text-[10px] font-semibold ${
                              isCorrect ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {isCorrect ? "Bravo !" : `Réponse : ${token.answer}`}
                          </span>
                        )}
                      </span>
                    );
                  }

                  if (token.type === "punctuation") {
                    return (
                      <span
                        key={token.id}
                        id={`fill-in-the-blanks-token-${sentenceIndex}-${tokenIndex}`}
                        className="-ml-1 mr-1 text-lg font-bold text-slate-700 sm:text-xl"
                      >
                        {token.value}
                      </span>
                    );
                  }

                  return (
                    <span
                      key={token.id}
                      id={`fill-in-the-blanks-token-${sentenceIndex}-${tokenIndex}`}
                      className="font-medium text-slate-800"
                    >
                      {token.value}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </section>

      <div id="fill-in-the-blanks-actions" className="flex flex-wrap justify-center gap-3">
        <ActivityIconButton
          id="fill-in-the-blanks-validate-button"
          onClick={handleValidate}
          disabled={finished || totalBlanks === 0 || loadingPoolSentence}
          ariaLabel="Valider"
          title="Valider"
          icon="✓"
          srText="Valider"
          variant="validate"
        />
        <ActivityIconButton
          id="fill-in-the-blanks-restart-button"
          onClick={handleRestart}
          disabled={restartLocked}
          ariaLabel="Recommencer"
          title="Recommencer"
          icon="↻"
          srText="Recommencer"
          variant="restart"
        />
      </div>

      {finished && (
        <ActivitySummaryCard
          id="fill-in-the-blanks-summary"
          title="Activité terminée"
          message={
            correctCount === totalBlanks
              ? "Bravo ! Tous les mots manquants ont été retrouvés."
              : "Relis la phrase et observe les réponses corrigées pour progresser."
          }
          score={score}
          stats={[
            { key: "correct", label: "Bonnes réponses", value: correctCount },
            { key: "total", label: "Réponses attendues", value: totalBlanks },
            { key: "errors", label: "Erreurs", value: Math.max(0, totalBlanks - correctCount) },
          ]}
        />
      )}
    </div>
  );
};

export default FillInTheBlanksActivity;
