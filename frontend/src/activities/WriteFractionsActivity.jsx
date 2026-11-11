import React, { useState, useMemo, useCallback } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import FloatingNumberPad from "../components/FloatingNumberPad";
import {
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
} from "../utils/activityUtils";

// --- Couleurs vives et variées inspirées des fiches pédagogiques ---
const FRACTION_COLORS = [
  "#8b5cf6", // Violet
  "#f97316", // Orange
  "#ec4899", // Rose
  "#22c55e", // Vert
  "#0ea5e9", // Bleu ciel
  "#d946ef", // Fuchsia
  "#ef4444", // Rouge
  "#eab308", // Jaune
  "#b45309", // Marron
  "#14b8a6", // Sarcelle
  "#6366f1", // Indigo
];

// --- Paramètres graphiques du disque fractionné (modifiables ici) ---
export const PIE_STYLE = {
  sliceSeparatorColor: "#334155", // Trait sombre et net très lisible sur les parts blanches et colorées
  sliceSeparatorWidth: 1.75,      // Épaisseur de séparation des quartiers
  uncoloredFill: "#ffffff",       // Fond blanc pour les parts non coloriées
  outlineColor: "#334155",        // Couleur du contour extérieur
  outlineWidth: 2,                 // Épaisseur du contour extérieur
};

// --- Configuration par défaut calquée sur la fiche d'exercice 1 ---
export const defaultWriteFractionsActivityContent = {
  title: "Écris les fractions",
  instruction:
    "Écris la fraction qui correspond à chaque dessin (le nombre de parts coloriées en haut, le nombre total de parts en bas).",
  skill: "Écrire une fraction et identifier le numérateur et le dénominateur",
  defaultLevel: "level2",
  levels: {
    level1: {
      label: "Niveau 1",
      skill: "Identifier le numérateur d'une fraction",
      cardCount: 6,
      prefillDenominator: true,
      fractions: [
        { numerator: 1, denominator: 2, color: "#0ea5e9" },
        { numerator: 2, denominator: 3, color: "#8b5cf6" },
        { numerator: 3, denominator: 4, color: "#22c55e" },
        { numerator: 2, denominator: 5, color: "#f97316" },
        { numerator: 4, denominator: 6, color: "#ec4899" },
        { numerator: 1, denominator: 4, color: "#ef4444" },
      ],
    },
    level2: {
      label: "Niveau 2",
      skill: "Écrire une fraction (numérateur et dénominateur)",
      cardCount: 9,
      prefillDenominator: false,
      fractions: [
        { numerator: 4, denominator: 5, color: "#8b5cf6" }, // Violet (comme l'exemple 1)
        { numerator: 3, denominator: 6, color: "#f97316" }, // Orange
        { numerator: 2, denominator: 6, color: "#ec4899" }, // Rose
        { numerator: 3, denominator: 6, color: "#22c55e" }, // Vert
        { numerator: 2, denominator: 3, color: "#0ea5e9" }, // Bleu ciel
        { numerator: 6, denominator: 10, color: "#be185d" }, // Fuchsia foncé
        { numerator: 2, denominator: 4, color: "#ef4444" }, // Rouge
        { numerator: 2, denominator: 8, color: "#eab308" }, // Jaune
        { numerator: 1, denominator: 6, color: "#b45309" }, // Marron
      ],
    },
    level3: {
      label: "Niveau 3",
      skill: "Identifier et écrire des fractions variées",
      cardCount: 9,
      prefillDenominator: false,
      minDenominator: 3,
      maxDenominator: 12,
      fractions: [],
    },
  },
};

// Fonctions trigonométriques pour le tracé des secteurs circulaires
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeSectorPath(centerX, centerY, radius, startAngle, endAngle) {
  const startPoint = polarToCartesian(centerX, centerY, radius, endAngle);
  const endPoint = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${centerX} ${centerY}`,
    `L ${startPoint.x} ${startPoint.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endPoint.x} ${endPoint.y}`,
    "Z",
  ].join(" ");
}

/**
 * Calcule l'ensemble des indices de parts à colorier.
 * Les parts restent contiguës, mais avec un point de départ et un sens (horaire ou anti-horaire) aléatoires.
 */
export function getColoredSlicesSet(
  numerator,
  denominator,
  startSlot = 0,
  clockwise = true
) {
  const safeDenominator = Math.max(1, Math.trunc(denominator || 2));
  const safeNumerator = Math.min(
    safeDenominator,
    Math.max(0, Math.trunc(numerator || 0))
  );

  const colored = new Set();
  for (let s = 0; s < safeNumerator; s += 1) {
    const idx = clockwise
      ? (startSlot + s) % safeDenominator
      : (startSlot - s + safeDenominator) % safeDenominator;
    colored.add(idx);
  }
  return colored;
}

/**
 * Composant de dessin vectoriel pour le disque de fraction.
 * Affiche des quartiers contigus mais avec orientation et sens aléatoires.
 */
export function CircleFractionPie({
  id,
  numerator,
  denominator,
  fillColor = "#8b5cf6",
  separatorColor = PIE_STYLE.sliceSeparatorColor,
  separatorWidth = PIE_STYLE.sliceSeparatorWidth,
  uncoloredFill = PIE_STYLE.uncoloredFill,
  outlineColor = PIE_STYLE.outlineColor,
  outlineWidth = PIE_STYLE.outlineWidth,
  size = 110,
  startSlot = 0,
  clockwise = true,
}) {
  const safeDenominator = Math.max(1, Math.trunc(denominator || 2));
  const safeNumerator = Math.min(
    safeDenominator,
    Math.max(0, Math.trunc(numerator || 0))
  );
  const stepAngle = 360 / safeDenominator;
  const radius = (size / 2) * 0.82;
  const center = size / 2;

  const coloredSet = useMemo(
    () =>
      getColoredSlicesSet(
        safeNumerator,
        safeDenominator,
        startSlot,
        clockwise
      ),
    [safeNumerator, safeDenominator, startSlot, clockwise]
  );

  // Cas spécial : si dénominateur vaut 1
  if (safeDenominator === 1) {
    return (
      <svg
        id={id}
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: size, height: size }}
        className="shrink-0 drop-shadow-xs select-none"
        aria-label={`Disque entier fractionné en 1 part, ${safeNumerator} part colorée`}
        role="img"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={safeNumerator >= 1 ? fillColor : uncoloredFill}
          stroke={outlineColor}
          strokeWidth={outlineWidth}
        />
      </svg>
    );
  }

  return (
    <svg
      id={id}
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size }}
      className="shrink-0 drop-shadow-xs select-none"
      aria-label={`Disque fractionné en ${safeDenominator} parts, dont ${safeNumerator} coloriée${safeNumerator > 1 ? "s" : ""}`}
      role="img"
    >
      {/* Tracé de chaque part */}
      {Array.from({ length: safeDenominator }, (_, index) => {
        const startAngle = index * stepAngle;
        const endAngle = startAngle + stepAngle;
        const isColored = coloredSet.has(index);

        return (
          <path
            key={`${id}-slice-${index}`}
            id={`${id}-slice-${index}`}
            d={describeSectorPath(center, center, radius, startAngle, endAngle)}
            fill={isColored ? fillColor : uncoloredFill}
            stroke={separatorColor}
            strokeWidth={separatorWidth}
          />
        );
      })}

      {/* Contour extérieur propre */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={outlineColor}
        strokeWidth={outlineWidth}
      />
    </svg>
  );
}

/**
 * Générateur de fractions aléatoires pour le niveau expert ou les répétitions
 */
function generateRandomFractions(count, minDen = 3, maxDen = 10) {
  const result = [];
  for (let i = 0; i < count; i += 1) {
    const denominator =
      Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
    const numerator = Math.floor(Math.random() * (denominator - 1)) + 1;
    const color = FRACTION_COLORS[i % FRACTION_COLORS.length];
    result.push({ numerator, denominator, color });
  }
  return result;
}

/**
 * Initialisation d'une grille de cartes avec quartier contigu aléatoire (sens et départ)
 */
function buildCardsForLevel(levelConfig) {
  const cardCount = levelConfig?.cardCount || 9;
  let pool = [];

  if (Array.isArray(levelConfig?.fractions) && levelConfig.fractions.length > 0) {
    pool = levelConfig.fractions.slice(0, cardCount);
  } else {
    const minDen = levelConfig?.minDenominator || 2;
    const maxDen = levelConfig?.maxDenominator || 10;
    pool = generateRandomFractions(cardCount, minDen, maxDen);
  }

  return pool.map((fraction, index) => {
    const denominator = fraction.denominator;
    const startSlot = Math.floor(Math.random() * denominator);
    const clockwise = Math.random() >= 0.5;

    return {
      id: `card-${index + 1}`,
      numerator: fraction.numerator,
      denominator,
      color: fraction.color || FRACTION_COLORS[index % FRACTION_COLORS.length],
      startSlot,
      clockwise,
      userNumerator: "",
      userDenominator: levelConfig?.prefillDenominator
        ? String(fraction.denominator)
        : "",
      prefilledDenominator: Boolean(levelConfig?.prefillDenominator),
    };
  });
}

const WriteFractionsActivity = ({
  student = null,
  content = {},
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(
    () => parseActivityContent(content, defaultWriteFractionsActivityContent),
    [content]
  );

  const defaultLevels = defaultWriteFractionsActivityContent.levels;
  const allowedLevelKeys = useMemo(() => {
    if (parsedContent?.levels && typeof parsedContent.levels === "object") {
      const keys = Object.keys(parsedContent.levels);
      if (keys.length > 0) return keys;
    }
    return Object.keys(defaultLevels);
  }, [parsedContent, defaultLevels]);

  const initialLevelKey = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : allowedLevelKeys[0] || "level2";

  const [currentLevelKey, setCurrentLevelKey] = useState(initialLevelKey);
  const activeLevelConfig = useMemo(() => {
    return (
      parsedContent?.levels?.[currentLevelKey] ||
      defaultLevels[currentLevelKey] ||
      defaultLevels.level2
    );
  }, [parsedContent, currentLevelKey, defaultLevels]);

  const [cards, setCards] = useState(() =>
    buildCardsForLevel(activeLevelConfig)
  );
  const [submitted, setSubmitted] = useState(false);
  const [activeInput, setActiveInput] = useState(null); // { cardId, field: "num" | "den" }

  // Mettre à jour les cartes si le niveau change
  const handleLevelChange = useCallback(
    (newLevelKey) => {
      setCurrentLevelKey(newLevelKey);
      const newConfig =
        parsedContent?.levels?.[newLevelKey] ||
        defaultLevels[newLevelKey] ||
        defaultLevels.level2;
      setCards(buildCardsForLevel(newConfig));
      setSubmitted(false);
      setActiveInput(null);
    },
    [parsedContent, defaultLevels]
  );

  // Modification d'une saisie dans une carte
  const handleInputChange = useCallback(
    (cardId, field, rawValue) => {
      if (submitted) return;
      // Ne garder que les chiffres (max 2 chiffres)
      const sanitized = rawValue.replace(/\D/g, "").slice(0, 2);
      setCards((prev) =>
        prev.map((c) => {
          if (c.id === cardId) {
            return {
              ...c,
              [field === "num" ? "userNumerator" : "userDenominator"]: sanitized,
            };
          }
          return c;
        })
      );
    },
    [submitted]
  );

  // Gestion du FloatingNumberPad (chiffres uniquement)
  const handleNumberPadKey = useCallback(
    (keyValue) => {
      if (!activeInput || submitted) return;

      const targetCard = cards.find((c) => c.id === activeInput.cardId);
      if (!targetCard) return;

      const currentVal =
        activeInput.field === "num"
          ? targetCard.userNumerator
          : targetCard.userDenominator;

      if (currentVal.length < 2) {
        const nextVal = currentVal + keyValue;
        handleInputChange(activeInput.cardId, activeInput.field, nextVal);
      }
    },
    [activeInput, cards, handleInputChange, submitted]
  );

  const handleNumberPadBackspace = useCallback(() => {
    if (!activeInput || submitted) return;
    const targetCard = cards.find((c) => c.id === activeInput.cardId);
    if (!targetCard) return;

    const currentVal =
      activeInput.field === "num"
        ? targetCard.userNumerator
        : targetCard.userDenominator;

    handleInputChange(
      activeInput.cardId,
      activeInput.field,
      currentVal.slice(0, -1)
    );
  }, [activeInput, cards, handleInputChange, submitted]);

  // Validation des réponses
  const results = useMemo(() => {
    let correctCount = 0;
    const cardResults = cards.map((card) => {
      const numOk = parseInt(card.userNumerator, 10) === card.numerator;
      const denOk = parseInt(card.userDenominator, 10) === card.denominator;
      const isCardCorrect = numOk && denOk;
      if (isCardCorrect) correctCount += 1;
      return {
        cardId: card.id,
        isCardCorrect,
        numOk,
        denOk,
      };
    });

    const total = cards.length;
    const score20 =
      total > 0 ? Math.round((correctCount / total) * 20) : 0;

    return {
      cardResults,
      correctCount,
      total,
      score: score20,
      isPerfect: correctCount === total,
    };
  }, [cards]);

  // Soumission
  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    setActiveInput(null);

    // Si on est en mode élève, sauvegarder les résultats
    if (student && typeof onComplete === "function") {
      onComplete({
        success: results.isPerfect,
        score: results.score,
        details: {
          correctCount: results.correctCount,
          total: results.total,
          scoreMax: 20,
          levelKey: currentLevelKey,
          levelLabel: activeLevelConfig.label,
        },
        levelKey: currentLevelKey,
        levelLabel: activeLevelConfig.label,
      });
    }
  }, [student, onComplete, results, currentLevelKey, activeLevelConfig]);

  // Recommencer l'exercice
  const handleRestart = useCallback(() => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }
    setCards(buildCardsForLevel(activeLevelConfig));
    setSubmitted(false);
    setActiveInput(null);
  }, [allStudentsCompleted, onResetStudentRound, activeLevelConfig]);

  const allFilled = useMemo(() => {
    return cards.every(
      (c) => c.userNumerator.trim() !== "" && c.userDenominator.trim() !== ""
    );
  }, [cards]);

  const { totalFieldsToFill, filledFieldsCount } = useMemo(() => {
    let total = 0;
    let filled = 0;

    cards.forEach((card) => {
      total += 1;
      if (card.userNumerator.trim() !== "") {
        filled += 1;
      }

      if (!card.prefilledDenominator) {
        total += 1;
        if (card.userDenominator.trim() !== "") {
          filled += 1;
        }
      }
    });

    return { totalFieldsToFill: total, filledFieldsCount: filled };
  }, [cards]);

  const progressPercent =
    totalFieldsToFill > 0
      ? Math.round((filledFieldsCount / totalFieldsToFill) * 100)
      : 0;

  const restartLocked = Boolean(student) && submitted && !allStudentsCompleted;

  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    defaultWriteFractionsActivityContent.title
  );
  const displayInstruction = getSafeDisplayText(
    parsedContent?.instruction,
    defaultWriteFractionsActivityContent.instruction
  );

  return (
    <div
      id="write-fractions-activity-root"
      className="mx-auto flex w-full max-w-5xl flex-col gap-2 p-1.5 sm:gap-2.5 sm:p-2.5"
    >
      {/* 1. Titre, consigne, badges et niveaux intégrés dans ActivityHero */}
      <ActivityHero
        idPrefix="write-fractions"
        activityContent={parsedContent}
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "figures-count",
            label: `${cards.length} figures`,
            className:
              "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800",
          },
          {
            key: "mode",
            label: activeLevelConfig.prefillDenominator
              ? "Dénominateur donné"
              : "Numérateur et dénominateur",
            className:
              "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800",
          },
        ]}
        levels={allowedLevelKeys.map((lvlKey) => ({
          key: lvlKey,
          label:
            (parsedContent?.levels?.[lvlKey] || defaultLevels[lvlKey])?.label ||
            lvlKey,
        }))}
        currentLevel={currentLevelKey}
        onSelectLevel={handleLevelChange}
        getLevelButtonId={(lvlKey) => `write-fractions-button-${lvlKey}`}
        disableAllLevels={submitted}
      />

      {/* 2. Barre de progression */}
      {!submitted && (
        <div className="-mb-1.5 sm:-mb-2">
          <ActivityStatus
            id="write-fractions-status-panel"
            progressBarId="write-fractions-progress-bar"
            progressPercent={progressPercent}
            label="Progression de l'exercice"
          />
        </div>
      )}

      {/* 3. Grille de cartes (façon exercice 1 de la fiche) */}
      <div
        id="write-fractions-grid"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5"
      >
        {cards.map((card, index) => {
          const cardResult = results.cardResults[index];
          const isNumActive =
            activeInput?.cardId === card.id && activeInput?.field === "num";
          const isDenActive =
            activeInput?.cardId === card.id && activeInput?.field === "den";

          let cardBorderClass = "border-slate-200 bg-white shadow-xs";
          if (submitted) {
            if (cardResult?.isCardCorrect) {
              cardBorderClass =
                "border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-400/30";
            } else {
              cardBorderClass =
                "border-rose-400 bg-rose-50/40 ring-2 ring-rose-400/30";
            }
          }

          return (
            <div
              key={card.id}
              id={`write-fractions-card-${index + 1}`}
              className={`flex items-center justify-between rounded-2xl border-2 p-2.5 sm:p-3 transition-all hover:border-slate-300 ${cardBorderClass}`}
            >
              {/* Dessin du disque fractionné avec parts contiguës aléatoires (taille d'origine 105) */}
              <div
                id={`write-fractions-visual-${index + 1}`}
                className="flex items-center justify-center p-1"
              >
                <CircleFractionPie
                  id={`write-fractions-pie-${index + 1}`}
                  numerator={card.numerator}
                  denominator={card.denominator}
                  fillColor={card.color}
                  size={105}
                  startSlot={card.startSlot}
                  clockwise={card.clockwise}
                />
              </div>

              {/* Petite main ou flèche qui pointe */}
              <div className="flex items-center justify-center text-2xl text-slate-400 select-none px-1">
                👉
              </div>

              {/* Zone d'écriture de la fraction (taille d'origine) */}
              <div
                id={`write-fractions-inputs-${index + 1}`}
                className="flex flex-col items-center justify-center gap-1.5"
              >
                {/* Case Numérateur */}
                <input
                  id={`write-fractions-num-${index + 1}`}
                  type="text"
                  inputMode="none"
                  autoComplete="off"
                  maxLength={2}
                  value={card.userNumerator}
                  disabled={submitted}
                  placeholder="?"
                  onFocus={() => {
                    setActiveInput({ cardId: card.id, field: "num" });
                  }}
                  onClick={() => {
                    setActiveInput({ cardId: card.id, field: "num" });
                  }}
                  onChange={(e) =>
                    handleInputChange(card.id, "num", e.target.value)
                  }
                  className={`h-12 w-12 rounded-xl border-2 text-center text-xl font-bold transition-all focus:outline-hidden ${submitted
                    ? cardResult?.numOk
                      ? "border-emerald-500 bg-emerald-100 text-emerald-900"
                      : "border-rose-500 bg-rose-100 text-rose-900"
                    : isNumActive
                      ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-200"
                      : "border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400 focus:border-indigo-500 focus:bg-white"
                    }`}
                  aria-label={`Numérateur pour le dessin ${index + 1}`}
                />

                {/* Barre de fraction */}
                <div
                  className="h-[3px] w-12 rounded-full bg-slate-700"
                  aria-hidden="true"
                />

                {/* Case Dénominateur */}
                <input
                  id={`write-fractions-den-${index + 1}`}
                  type="text"
                  inputMode="none"
                  autoComplete="off"
                  maxLength={2}
                  value={card.userDenominator}
                  disabled={submitted || card.prefilledDenominator}
                  placeholder="?"
                  onFocus={() => {
                    if (!card.prefilledDenominator) {
                      setActiveInput({ cardId: card.id, field: "den" });
                    }
                  }}
                  onClick={() => {
                    if (!card.prefilledDenominator) {
                      setActiveInput({ cardId: card.id, field: "den" });
                    }
                  }}
                  onChange={(e) =>
                    handleInputChange(card.id, "den", e.target.value)
                  }
                  className={`h-12 w-12 rounded-xl border-2 text-center text-xl font-bold transition-all focus:outline-hidden ${card.prefilledDenominator
                    ? "border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
                    : submitted
                      ? cardResult?.denOk
                        ? "border-emerald-500 bg-emerald-100 text-emerald-900"
                        : "border-rose-500 bg-rose-100 text-rose-900"
                      : isDenActive
                        ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-200"
                        : "border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400 focus:border-indigo-500 focus:bg-white"
                    }`}
                  aria-label={`Dénominateur pour le dessin ${index + 1}`}
                />

                {/* Correction discrète en cas d'erreur */}
                {submitted && !cardResult?.isCardCorrect && (
                  <span className="mt-1 text-xs font-bold text-rose-600">
                    Sol : {card.numerator}/{card.denominator}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Carte résumé final (affichée quand soumis) */}
      {submitted && (
        <ActivitySummaryCard
          id="write-fractions-summary"
          title={results.isPerfect ? "Exercice réussi !" : "Exercice terminé"}
          score={results.score}
          scoreMax={20}
          message={
            results.isPerfect
              ? "Félicitations ! Tu as su identifier le numérateur et le dénominateur de chaque figure."
              : "Prends le temps d'observer les figures non validées pour bien compter les parts !"
          }
          stats={[
            {
              key: "correct",
              label: "Fractions justes",
              value: `${results.correctCount} / ${results.total}`,
            },
            {
              key: "errors",
              label: "Erreurs",
              value: results.total - results.correctCount,
            },
            {
              key: "total",
              label: "Total figures",
              value: results.total,
            },
          ]}
        />
      )}

      {/* 5. Barre d'actions (toujours en bas) */}
      <ActivityActionsBar
        id="write-fractions-actions"
        className="flex flex-wrap justify-center gap-2 pt-1"
        actions={[
          {
            id: "write-fractions-validate-button",
            onClick: handleSubmit,
            disabled: submitted || !allFilled,
            ariaLabel: "Valider",
            title: "Valider",
            icon: "✓",
            srText: "Valider",
            variant: "validate",
          },
          {
            id: "write-fractions-restart-button",
            onClick: handleRestart,
            disabled: restartLocked || (Boolean(student) && !submitted),
            ariaLabel: "Recommencer",
            title: "Recommencer",
            icon: "↻",
            srText: "Recommencer",
            variant: allStudentsCompleted ? "warning" : "restart",
          },
        ]}
      />

      {/* Pavé numérique tactile flottant : s'ouvre au clic sur une case */}
      <FloatingNumberPad
        isOpen={!submitted && activeInput !== null}
        activeFieldLabel={
          activeInput?.field === "num" ? "Numérateur" : "Dénominateur"
        }
        onKeyPress={handleNumberPadKey}
        onBackspace={handleNumberPadBackspace}
        onClose={() => setActiveInput(null)}
        disabledKeys={["<", "=", ">"]}
      />
    </div>
  );
};

export default WriteFractionsActivity;
