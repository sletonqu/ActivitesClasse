import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import { API_URL } from "../config/api";
import {
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
  parsePositiveInt,
  randomRotation,
} from "./activityUtils";

// ─── Configuration par défaut ────────────────────────────────────────────────

export const defaultAlphabeticalSortActivityContent = {
  title: "Classe les mots dans l'ordre alphabétique",
  instruction:
    "Fais glisser chaque étiquette dans la bonne case numérotée pour ranger les mots de A à Z.",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      description: "Première lettre différente",
      wordCount: 4,
    },
    level2: {
      label: "Niveau 2",
      description: "Même première lettre",
      wordCount: 5,
    },
    level3: {
      label: "Niveau 3",
      description: "Mêmes deux premières lettres",
      wordCount: 5,
    },
    level4: {
      label: "Niveau 4",
      description: "Mélange des niveaux",
      wordCount: 6,
    },
  },
};

const ALLOWED_LEVEL_KEYS = ["level1", "level2", "level3", "level4"];
const WORD_POOL_SIZE = 400; // Taille du pool chargé depuis l'API

const TILE_ROTATION_MIN = -8;
const TILE_ROTATION_MAX = 8;

// ─── Fonctions utilitaires de normalisation ───────────────────────────────────

function normalizeWord(word) {
  return String(word || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getAlphabeticalOrder(words) {
  return [...words].sort((a, b) =>
    normalizeWord(a).localeCompare(normalizeWord(b), "fr")
  );
}

function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ─── Stratégies de sélection par niveau ──────────────────────────────────────

/**
 * Niveau 1 : toutes les premières lettres sont différentes.
 * On prend un mot par lettre initiale, en choisissant count lettres au hasard.
 */
function selectLevel1Words(pool, count) {
  const byFirstLetter = {};
  for (const word of pool) {
    const norm = normalizeWord(word);
    if (!norm) continue;
    const letter = norm[0];
    if (!byFirstLetter[letter]) byFirstLetter[letter] = [];
    byFirstLetter[letter].push(word);
  }

  const letters = shuffleArray(Object.keys(byFirstLetter));
  if (letters.length < count) return null;

  return letters.slice(0, count).map((letter) => pickRandom(byFirstLetter[letter]));
}

/**
 * Niveau 2 : tous les mots partagent la même première lettre,
 * mais ont des deuxièmes lettres différentes.
 */
function selectLevel2Words(pool, count) {
  const byFirstLetter = {};
  for (const word of pool) {
    const norm = normalizeWord(word);
    if (norm.length < 2) continue;
    const letter = norm[0];
    if (!byFirstLetter[letter]) byFirstLetter[letter] = [];
    byFirstLetter[letter].push(word);
  }

  const letters = shuffleArray(Object.keys(byFirstLetter));
  for (const letter of letters) {
    const bySecondLetter = {};
    for (const word of byFirstLetter[letter]) {
      const norm = normalizeWord(word);
      if (norm.length < 2) continue;
      const second = norm[1];
      if (!bySecondLetter[second]) bySecondLetter[second] = [];
      bySecondLetter[second].push(word);
    }

    const seconds = shuffleArray(Object.keys(bySecondLetter));
    if (seconds.length >= count) {
      return seconds.slice(0, count).map((s) => pickRandom(bySecondLetter[s]));
    }
  }
  return null;
}

/**
 * Niveau 3 : tous les mots partagent les deux mêmes premières lettres,
 * mais ont des troisièmes lettres différentes.
 */
function selectLevel3Words(pool, count) {
  const byPrefix = {};
  for (const word of pool) {
    const norm = normalizeWord(word);
    if (norm.length < 3) continue;
    const prefix = norm.slice(0, 2);
    if (!byPrefix[prefix]) byPrefix[prefix] = [];
    byPrefix[prefix].push(word);
  }

  const prefixes = shuffleArray(Object.keys(byPrefix));
  for (const prefix of prefixes) {
    const byThirdLetter = {};
    for (const word of byPrefix[prefix]) {
      const norm = normalizeWord(word);
      if (norm.length < 3) continue;
      const third = norm[2];
      if (!byThirdLetter[third]) byThirdLetter[third] = [];
      byThirdLetter[third].push(word);
    }

    const thirds = shuffleArray(Object.keys(byThirdLetter));
    if (thirds.length >= count) {
      return thirds.slice(0, count).map((t) => pickRandom(byThirdLetter[t]));
    }
  }
  return null;
}

/**
 * Niveau 4 : mélange des niveaux 1, 2 et 3.
 * On construit un groupe L3 (2 mots), un groupe L2 (2 mots différents),
 * et on complète avec des mots à premières lettres distinctes (L1).
 */
function selectLevel4Words(pool, count) {
  const usedWords = new Set();
  const result = [];

  const l3Count = Math.max(2, Math.floor(count / 3));
  const l2Count = Math.max(2, Math.floor(count / 3));
  const l1Count = count - l3Count - l2Count;

  // Groupe niveau 3
  const l3Group = selectLevel3Words(pool, l3Count);
  if (l3Group) {
    l3Group.forEach((w) => { usedWords.add(w); result.push(w); });
  }

  // Groupe niveau 2 (sur un pool sans les mots déjà pris)
  const poolAfterL3 = pool.filter((w) => !usedWords.has(w));
  const l2Group = selectLevel2Words(poolAfterL3, l2Count);
  if (l2Group) {
    l2Group.forEach((w) => { usedWords.add(w); result.push(w); });
  }

  // Compléter avec des mots niveau 1 (premières lettres non utilisées)
  const usedFirstLetters = new Set(result.map((w) => normalizeWord(w)[0]));
  const remaining = shuffleArray(pool.filter((w) => !usedWords.has(w)));
  let l1Added = 0;
  for (const word of remaining) {
    if (l1Added >= l1Count) break;
    const firstLetter = normalizeWord(word)[0];
    if (!usedFirstLetters.has(firstLetter)) {
      result.push(word);
      usedFirstLetters.add(firstLetter);
      usedWords.add(word);
      l1Added++;
    }
  }

  // Fallback : compléter avec n'importe quel mot restant si pas assez
  if (result.length < count) {
    for (const word of remaining) {
      if (result.length >= count) break;
      if (!usedWords.has(word)) {
        result.push(word);
        usedWords.add(word);
      }
    }
  }

  return result.length >= count ? result.slice(0, count) : null;
}

function selectWordsByLevel(levelKey, pool, count) {
  switch (levelKey) {
    case "level1": return selectLevel1Words(pool, count);
    case "level2": return selectLevel2Words(pool, count);
    case "level3": return selectLevel3Words(pool, count);
    case "level4": return selectLevel4Words(pool, count);
    default: return selectLevel1Words(pool, count);
  }
}

// ─── Normalisation de la config ───────────────────────────────────────────────

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};
  return {
    label: source.label || fallbackRule.label,
    description: source.description || fallbackRule.description,
    wordCount: parsePositiveInt(source.wordCount, fallbackRule.wordCount),
  };
}

function buildTilesFromWords(words) {
  return shuffleArray(words).map((word, index) => ({
    id: `tile-${index}-${word}`,
    word,
    rotation: randomRotation(TILE_ROTATION_MIN, TILE_ROTATION_MAX),
  }));
}

// ─── Composant principal ──────────────────────────────────────────────────────

const AlphabeticalSortActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultAlphabeticalSortActivityContent.levels;

  const configuredLevels = useMemo(
    () => ({
      level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
      level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
      level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
      level4: normalizeLevelRule(parsedContent?.levels?.level4, defaultLevels.level4),
    }),
    [parsedContent]
  );

  const initialLevel = ALLOWED_LEVEL_KEYS.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  // ── État principal ─────────────────────────────────────────────────────────
  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [loadingWords, setLoadingWords] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [correctOrder, setCorrectOrder] = useState([]);
  const [poolTiles, setPoolTiles] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);

  const requestIdRef = useRef(0);

  // ── Dérivés ────────────────────────────────────────────────────────────────
  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const totalSlots = correctOrder.length;
  const answeredCount = Object.keys(assignments).filter(
    (k) => assignments[k] !== undefined
  ).length;
  const progressPercent =
    totalSlots > 0 ? Math.round((answeredCount / totalSlots) * 100) : 0;
  const allAssigned = answeredCount === totalSlots && totalSlots > 0;
  const selectedTile = draggedItem?.tile || null;

  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultAlphabeticalSortActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultAlphabeticalSortActivityContent.instruction
  );

  // ── Chargement et sélection des mots ─────────────────────────────────────
  const loadWordsForLevel = useCallback(
    async (levelKey) => {
      const levelRule = configuredLevels[levelKey] || configuredLevels.level1;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setLoadingWords(true);
      setLoadingError("");
      setCorrectOrder([]);
      setPoolTiles([]);
      setAssignments({});
      setDraggedItem(null);
      setFinished(false);
      setScore(null);
      setCorrectCount(0);

      try {
        // On charge un grand pool sans filtre de niveau
        const params = new URLSearchParams({ limit: String(WORD_POOL_SIZE) });
        const response = await fetch(`${API_URL}/words/random?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erreur lors du chargement des mots");
        }

        if (requestId !== requestIdRef.current) return;

        const rawWords = Array.isArray(data?.words) ? data.words : [];
        if (rawWords.length === 0) {
          throw new Error("Aucun mot disponible dans la base de données.");
        }

        const allWordStrings = rawWords.map((w) => String(w.word || "")).filter(Boolean);

        // Sélection côté client selon les règles du niveau
        const selectedWords = selectWordsByLevel(levelKey, allWordStrings, levelRule.wordCount);

        if (!selectedWords || selectedWords.length < 2) {
          throw new Error(
            "Pas assez de mots correspondant aux critères de ce niveau. Essaie de ré-importer des mots dans la base."
          );
        }

        const sortedWords = getAlphabeticalOrder(selectedWords);
        const tiles = buildTilesFromWords(selectedWords);

        setCorrectOrder(sortedWords);
        setPoolTiles(tiles);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setLoadingError(err.message || "Erreur inconnue lors du chargement des mots.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingWords(false);
        }
      }
    },
    [configuredLevels]
  );

  useEffect(() => {
    setCurrentLevel(initialLevel);
    loadWordsForLevel(initialLevel);
  }, [initialLevel, loadWordsForLevel]);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragStartFromPool = (tile) => {
    if (finished) return;
    setDraggedItem({ tile, source: "pool" });
  };

  const handleDragStartFromSlot = (slotIndex) => {
    if (finished) return;
    const tile = assignments[slotIndex];
    if (!tile) return;
    setDraggedItem({ tile, source: "slot", slotIndex });
  };

  const handleDropToSlot = (slotIndex) => {
    if (finished || !draggedItem) return;
    const { tile, source, slotIndex: srcSlot } = draggedItem;

    if (source === "slot" && srcSlot === slotIndex) {
      setDraggedItem(null);
      return;
    }

    const nextAssignments = { ...assignments };
    let nextPool = [...poolTiles];
    const prevTileInSlot = nextAssignments[slotIndex];

    if (source === "pool") {
      nextPool = nextPool.filter((t) => t.id !== tile.id);
    } else {
      delete nextAssignments[srcSlot];
    }

    if (prevTileInSlot !== undefined) {
      if (source === "slot") {
        nextAssignments[srcSlot] = prevTileInSlot;
      } else {
        nextPool = [...nextPool, prevTileInSlot];
      }
    }

    nextAssignments[slotIndex] = tile;
    setAssignments(nextAssignments);
    setPoolTiles(nextPool);
    setDraggedItem(null);
  };

  const handleDropToPool = () => {
    if (finished || !draggedItem || draggedItem.source !== "slot") {
      setDraggedItem(null);
      return;
    }
    const { tile, slotIndex } = draggedItem;
    const nextAssignments = { ...assignments };
    delete nextAssignments[slotIndex];
    setAssignments(nextAssignments);
    setPoolTiles((prev) => [...prev, tile]);
    setDraggedItem(null);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const handleValidate = () => {
    let correct = 0;
    for (let i = 0; i < totalSlots; i++) {
      if (assignments[i]?.word === correctOrder[i]) correct++;
    }
    const nextScore = Math.round((correct / Math.max(1, totalSlots)) * 20);
    setCorrectCount(correct);
    setScore(nextScore);
    setFinished(true);
    setDraggedItem(null);

    if (onComplete) {
      onComplete(nextScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
      });
    }
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) return;
    loadWordsForLevel(currentLevel);
  };

  const handleSelectLevel = (levelKey) => {
    if (loadingWords || finished) return;
    setCurrentLevel(levelKey);
    loadWordsForLevel(levelKey);
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div id="alphabetical-sort-root" className="space-y-2">
      {/* En-tête */}
      <ActivityHero
        idPrefix="alphabetical-sort"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "count",
            label: `${totalSlots} mot${totalSlots > 1 ? "s" : ""}`,
            className:
              "inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800",
          },
          {
            key: "hint",
            label: configuredLevels[currentLevel]?.description || "",
            className:
              "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800",
          },
        ]}
        levels={ALLOWED_LEVEL_KEYS.map((key) => ({
          key,
          label: configuredLevels[key].label,
          disabled: loadingWords || finished,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(key) => `alphabetical-sort-level-${key}`}
        disableAllLevels={finished}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {/* Barre de progression */}
      {!finished && !loadingWords && !loadingError && (
        <ActivityStatus
          id="alphabetical-sort-status-panel"
          progressBarId="alphabetical-sort-progress-bar"
          progressPercent={progressPercent}
          label="Progression du classement"
        />
      )}

      {/* Chargement */}
      {loadingWords && (
        <div
          id="alphabetical-sort-loading"
          className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-800 sm:p-4"
        >
          Chargement des mots…
        </div>
      )}

      {/* Erreur */}
      {!loadingWords && loadingError && (
        <div
          id="alphabetical-sort-error"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700 sm:p-4"
        >
          {loadingError}
        </div>
      )}

      {/* Contenu principal */}
      {!loadingWords && !loadingError && (
        <>
          {/* Réserve de tuiles */}
          {!finished && (
            <section
              id="alphabetical-sort-pool-section"
              className="-mt-1 rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 px-2.5 py-2 sm:px-3 sm:py-2.5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-bold text-slate-800 sm:text-lg">
                    Mots à classer
                  </h4>
                  <div className="text-xs text-slate-600 sm:text-sm">
                    {selectedTile ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                        Mot sélectionné&nbsp;: {selectedTile.word}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        Fais glisser une étiquette
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                id="alphabetical-sort-pool"
                className="flex min-h-[60px] flex-wrap justify-center gap-2 bg-slate-50/70 p-2 sm:gap-2.5 sm:p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropToPool}
              >
                {poolTiles.length === 0 ? (
                  <div className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-500">
                    Tous les mots ont été placés.
                  </div>
                ) : (
                  poolTiles.map((tile, index) => (
                    <button
                      key={tile.id}
                      id={`alphabetical-sort-tile-pool-${index}`}
                      type="button"
                      draggable={!finished}
                      onDragStart={() => handleDragStartFromPool(tile)}
                      onDragEnd={() => setDraggedItem(null)}
                      className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 disabled:cursor-default sm:min-h-[44px] sm:rounded-xl sm:px-4 sm:py-1.5"
                      style={{ transform: `rotate(${tile.rotation}deg)` }}
                    >
                      <span className="block text-base font-bold text-slate-800 sm:text-xl">
                        {tile.word}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Zone de classement */}
          <section
            id="alphabetical-sort-slots"
            className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm sm:p-2"
          >
            <div id="alphabetical-sort-drop-zone" className="flex flex-col gap-0.5">
              {Array.from({ length: totalSlots }, (_, slotIndex) => {
                const assigned = assignments[slotIndex];
                const isCorrect =
                  finished && assigned?.word === correctOrder[slotIndex];
                const isWrong =
                  finished && assigned !== undefined && !isCorrect;

                return (
                  <div
                    key={`slot-${slotIndex}`}
                    id={`alphabetical-sort-slot-${slotIndex}`}
                    className={`flex items-center gap-2 rounded-lg border border-dashed px-2 py-1.5 transition-all ${finished
                      ? isCorrect
                        ? "border-emerald-400 bg-emerald-50"
                        : isWrong
                        ? "border-rose-400 bg-rose-50"
                        : "border-slate-200 bg-slate-50"
                      : "border-sky-300 bg-white hover:border-sky-400"
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropToSlot(slotIndex)}
                  >
                    <div className="mx-auto flex w-fit max-w-full items-center justify-center gap-2">
                      {/* Numéro de rang */}
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${finished
                          ? isCorrect
                            ? "bg-emerald-200 text-emerald-800"
                            : isWrong
                            ? "bg-rose-200 text-rose-800"
                            : "bg-slate-200 text-slate-600"
                          : "bg-violet-100 text-violet-800"
                        }`}
                      >
                        {slotIndex + 1}
                      </span>

                      {/* Tuile ou zone vide */}
                      <div className="flex min-h-[30px] items-center justify-center">
                        {assigned !== undefined ? (
                          <button
                            id={`alphabetical-sort-slot-tile-${slotIndex}`}
                            type="button"
                            draggable={!finished}
                            onDragStart={() => handleDragStartFromSlot(slotIndex)}
                            onDragEnd={() => setDraggedItem(null)}
                            className={`rounded-lg border px-2.5 py-0.5 text-center font-bold shadow-sm transition-all ${!finished
                              ? "cursor-move border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50"
                              : "cursor-default border-transparent bg-transparent"
                            }`}
                            style={{
                              transform: !finished
                                ? `rotate(${assigned.rotation}deg)`
                                : "none",
                            }}
                          >
                            <span
                              className={`text-sm font-bold sm:text-base ${finished
                                ? isCorrect
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                                : "text-slate-800"
                              }`}
                            >
                              {assigned.word}
                            </span>
                          </button>
                        ) : (
                          <span className="text-center text-xs italic text-slate-400">
                            Place un mot ici…
                          </span>
                        )}
                      </div>
                    </div>

                    {(finished || isWrong) && (
                      <div className="ml-auto flex shrink-0 items-center gap-1.5">
                        {/* Icône résultat */}
                        {finished && (
                          <span className="text-sm">
                            {isCorrect ? "✅" : isWrong ? "❌" : "—"}
                          </span>
                        )}

                        {/* Correction affiché en cas d'erreur */}
                        {finished && isWrong && (
                          <span className="rounded-full bg-rose-100 px-1.5 py-0 text-xs font-semibold text-rose-700">
                            → {correctOrder[slotIndex]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Résumé final */}
      {finished && (
        <ActivitySummaryCard
          id="alphabetical-sort-summary"
          title="Activité terminée"
          message={
            correctCount === totalSlots
              ? "Bravo, tous les mots sont dans le bon ordre alphabétique !"
              : "Regarde les cases colorées pour voir où ça pêche. Recommence pour t'améliorer !"
          }
          score={score}
          stats={[
            { key: "correct", label: "Bonnes positions", value: correctCount },
            { key: "total", label: "Total traité", value: totalSlots },
            {
              key: "errors",
              label: "Erreurs",
              value: Math.max(0, totalSlots - correctCount),
            },
          ]}
        />
      )}

      {/* Boutons d'action */}
      <div id="alphabetical-sort-actions" className="flex flex-wrap justify-center gap-2">
        <ActivityIconButton
          id="alphabetical-sort-validate"
          onClick={handleValidate}
          disabled={finished || !allAssigned || loadingWords}
          ariaLabel="Valider"
          title="Valider"
          icon="✓"
          srText="Valider"
          variant="validate"
        />
        <ActivityIconButton
          id="alphabetical-sort-restart"
          onClick={handleRestart}
          disabled={loadingWords || restartLocked}
          ariaLabel="Recommencer"
          title="Recommencer"
          icon="↻"
          srText="Recommencer"
          variant={allStudentsCompleted ? "warning" : "restart"}
        />
      </div>
    </div>
  );
};

export default AlphabeticalSortActivity;
