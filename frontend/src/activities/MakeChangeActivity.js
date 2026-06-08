import React, { useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import FloatingNumberPad from "../components/FloatingNumberPad";
import {
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
  parseIntWithFallback,
} from "./activityUtils";

export const defaultMakeChangeActivityContent = {
  title: "Le Jeu de la Monnaie",
  instruction:
    "Utilise les pièces et les billets pour préparer la somme exacte demandée. Touche une pièce ou un billet pour l'ajouter, et touche-le à nouveau dans la zone de dépôt pour le retirer.",
  mode: "deposer",
  defaultLevel: "level1",
  levels: {
    level1: { label: "Niveau 1", min: 1, max: 10, useCents: false, centsStep: 1 },
    level2: { label: "Niveau 2", min: 11, max: 40, useCents: true, centsStep: 5 },
    level3: { label: "Niveau 3", min: 41, max: 100, useCents: true, centsStep: 1 },
  },
};

const AVAILABLE_MONEY = [
  // Billets
  { value: 50, type: "bill", label: "50 €", valueCents: 5000 },
  { value: 20, type: "bill", label: "20 €", valueCents: 2000 },
  { value: 10, type: "bill", label: "10 €", valueCents: 1000 },
  { value: 5, type: "bill", label: "5 €", valueCents: 500 },
  // Pièces Euros
  { value: 2, type: "coin", label: "2 €", valueCents: 200 },
  { value: 1, type: "coin", label: "1 €", valueCents: 100 },
  // Pièces Centimes
  { value: 0.5, type: "coin", label: "50c", valueCents: 50, isCent: true },
  { value: 0.2, type: "coin", label: "20c", valueCents: 20, isCent: true },
  { value: 0.1, type: "coin", label: "10c", valueCents: 10, isCent: true },
  { value: 0.05, type: "coin", label: "5c", valueCents: 5, isCent: true },
  { value: 0.02, type: "coin", label: "2c", valueCents: 2, isCent: true },
  { value: 0.01, type: "coin", label: "1c", valueCents: 1, isCent: true },
];

function normalizeLevelRule(rule, fallbackRule) {
  const source = rule && typeof rule === "object" ? rule : {};
  const fallbackMin = parseIntWithFallback(fallbackRule.min, 1);
  const fallbackMax = parseIntWithFallback(fallbackRule.max, 10);

  const min = parseIntWithFallback(source.min, fallbackMin);
  const max = parseIntWithFallback(source.max, fallbackMax);

  return {
    label: source.label || fallbackRule.label,
    min: Math.min(min, max),
    max: Math.max(min, max),
    useCents: source.useCents !== undefined ? Boolean(source.useCents) : fallbackRule.useCents,
    centsStep: parseIntWithFallback(source.centsStep, fallbackRule.centsStep || 1),
  };
}

const MoneyCoin = ({ value, label, isCent, onClick, className = "" }) => {
  const is1 = value === 1 && !isCent;
  const is2 = value === 2 && !isCent;

  let styles = "rounded-full shadow-sm flex items-center justify-center font-bold font-sans cursor-pointer transition-transform hover:scale-110 active:scale-95 select-none ";
  
  if (is1) {
    styles += "w-10 h-10 sm:w-12 sm:h-12 text-slate-800 bg-yellow-300 border-[3px] border-slate-300";
  } else if (is2) {
    styles += "w-12 h-12 sm:w-14 sm:h-14 text-slate-800 bg-slate-200 border-[3px] border-yellow-400 text-lg sm:text-xl";
  } else if (isCent) {
    // Styles pour les centimes
    const isCopper = value <= 0.051; // 1c, 2c, 5c (use 0.051 to avoid precision issues)
    if (isCopper) {
      styles += "text-white bg-amber-700 border-2 border-amber-900 ";
      if (value === 0.01) styles += "w-7 h-7 sm:w-8 sm:h-8 text-[10px]";
      else if (value === 0.02) styles += "w-8 h-8 sm:w-9 sm:h-9 text-xs";
      else styles += "w-9 h-9 sm:w-10 sm:h-10 text-xs";
    } else {
      // 10c, 20c, 50c
      styles += "text-amber-900 bg-yellow-500 border-2 border-yellow-600 ";
      if (value === 0.1) styles += "w-8 h-8 sm:w-9 sm:h-9 text-xs";
      else if (value === 0.2) styles += "w-9 h-9 sm:w-10 sm:h-10 text-sm";
      else styles += "w-10 h-10 sm:w-11 sm:h-11 text-sm";
    }
  }

  return (
    <button type="button" onClick={onClick} className={`${styles} ${className}`}>
      {label}
    </button>
  );
};

const MoneyBill = ({ value, label, onClick, className = "" }) => {
  let bgColors = "bg-green-100 border-green-300 text-green-800"; // fallback
  if (value === 5) bgColors = "bg-emerald-100 border-emerald-400 text-emerald-800";
  if (value === 10) bgColors = "bg-rose-100 border-rose-400 text-rose-800";
  if (value === 20) bgColors = "bg-sky-100 border-sky-400 text-sky-800";
  if (value === 50) bgColors = "bg-amber-100 border-amber-400 text-amber-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-[4.5rem] h-10 sm:w-24 sm:h-14 rounded shadow-md border-2 flex items-center justify-center font-bold text-base sm:text-xl cursor-pointer transition-transform hover:scale-110 active:scale-95 select-none ${bgColors} ${className}`}
    >
      {label}
    </button>
  );
};

const MoneyElement = ({ money, onClick, className }) => {
  if (money.type === "coin") {
    return <MoneyCoin value={money.value} label={money.label} isCent={money.isCent} onClick={onClick} className={className} />;
  }
  return <MoneyBill value={money.value} label={money.label} onClick={onClick} className={className} />;
};

const MODE_DEPOSER = "deposer"; // Mode par défaut : l'élève doit déposer les pièces et billets pour atteindre le montant cible.
const MODE_CALCULER = "calculer"; // Mode alternatif : des pièces et billets sont déjà déposés, et l'élève doit calculer la somme totale en les observant, puis saisir le montant calculé.
const MAX_INTEGER_DIGITS = 6; 
const MAX_DECIMAL_DIGITS = 2; // On autorise jusqu'à 9999,99 € pour laisser de la marge par rapport au maximum généré par les règles de niveau (100 €), tout en évitant des saisies trop longues qui seraient peu réalistes pour l'activité.
const EURO_CANDIDATE_WINDOW = 4; // Lors de la génération des montants à calculer, on propose d'abord les pièces les plus proches du montant restant à atteindre, puis on élargit progressivement la fenêtre de sélection pour inclure des pièces plus petites (et plus grandes).
const CENT_CANDIDATE_WINDOW = 1; // Pour les centimes, on propose d'abord la pièce exacte avant de proposer des pièces plus petites
const MAX_GENERATION_ITERATIONS = 200; // Garde-fou pour éviter une boucle infinie pendant la génération de monnaie.

function normalizeActivityMode(mode) {
  const normalized = String(mode || "").trim().toLowerCase();
  if (["calculer", "calculate", "calculator", "inverted"].includes(normalized)) {
    return MODE_CALCULER;
  }
  return MODE_DEPOSER;
}

function parseCurrencyInputToCents(rawValue, allowCents) {
  const normalized = String(rawValue || "")
    .replace(/\s+/g, "")
    .replace("€", "")
    .replace(",", ".")
    .trim();

  if (!normalized) {
    return null;
  }

  if (allowCents) {
    if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
      return null;
    }

    const asNumber = Number(normalized);
    if (!Number.isFinite(asNumber)) {
      return null;
    }

    return Math.round(asNumber * 100);
  }

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const euros = Number(normalized);
  if (!Number.isFinite(euros)) {
    return null;
  }

  return euros * 100;
}

function sanitizeAmountInput(value, allowCents) {
  const raw = String(value || "");
  if (allowCents) {
    const onlyAllowedChars = raw.replace(/[^\d,]/g, "");
    const [head, ...tail] = onlyAllowedChars.split(",");
    const integerPart = head.slice(0, MAX_INTEGER_DIGITS);
    const decimalPart = tail.join("").slice(0, MAX_DECIMAL_DIGITS);

    if (tail.length > 0) {
      return `${integerPart},${decimalPart}`;
    }

    return integerPart;
  }

  return raw.replace(/\D/g, "").slice(0, MAX_INTEGER_DIGITS);
}


const MakeChangeActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultMakeChangeActivityContent.levels;

  const configuredLevels = {
    level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1),
    level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2),
    level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3),
  };

  const allowedLevelKeys = ["level1", "level2", "level3"];
  const initialLevel = allowedLevelKeys.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";
  const activityMode = normalizeActivityMode(parsedContent?.mode || defaultMakeChangeActivityContent.mode);
  const isCalculateMode = activityMode === MODE_CALCULER;

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [typedAmount, setTypedAmount] = useState("");
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false);
  const moneyIdCounterRef = useRef(1);

  // Valeurs dérivées du niveau actuel
  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const useCents = currentLevelRule.useCents;

  const formatCurrency = (amountInCents) => {
    const euros = Math.floor(amountInCents / 100);
    const cents = amountInCents % 100;
    if (cents === 0 && !useCents) return `${euros} €`;
    return `${euros},${cents.toString().padStart(2, "0")} €`;
  };

  const generateTargetForLevel = (levelKey) => {
    const level = configuredLevels[levelKey] || configuredLevels.level1;
    const minCents = level.min * 100;
    const maxCents = level.max * 100;
    const levelUseCents = level.useCents;
    const levelCentsStep = level.centsStep;

    if (!levelUseCents) {
      return (Math.floor(Math.random() * (level.max - level.min + 1)) + level.min) * 100;
    }

    // Calculer le nombre de paliers possibles
    const range = maxCents - minCents;
    const steps = Math.floor(range / levelCentsStep);
    const randomStep = Math.floor(Math.random() * (steps + 1));
    return minCents + randomStep * levelCentsStep;
  };

  const generateMoneyToCalculate = (targetCents, levelKey) => {
    const level = configuredLevels[levelKey] || configuredLevels.level1;
    const generated = [];

    const appendFromPool = (initialAmount, pool, candidateWindow = 4) => {
      let remaining = initialAmount;
      const sortedPool = [...pool].sort((a, b) => b.valueCents - a.valueCents);
      let guard = 0;

      while (remaining > 0 && guard < MAX_GENERATION_ITERATIONS) {
        const valid = sortedPool.filter((money) => money.valueCents <= remaining);
        if (valid.length === 0) {
          break;
        }

        const candidateSlice = valid.slice(0, Math.min(candidateWindow, valid.length));
        const selected = candidateSlice[Math.floor(Math.random() * candidateSlice.length)];
        generated.push({ ...selected, id: `preset-${levelKey}-${generated.length + 1}` });
        remaining -= selected.valueCents;
        guard += 1;
      }

      if (remaining > 0) {
        sortedPool.forEach((money) => {
          while (remaining >= money.valueCents) {
            generated.push({ ...money, id: `preset-${levelKey}-${generated.length + 1}` });
            remaining -= money.valueCents;
          }
        });
      }
    };

    // En mode calcul, on sépare explicitement euros et centimes : la somme des
    // pièces de centimes affichées reste donc toujours dans [0, 99].
    const eurosPartCents = Math.floor(targetCents / 100) * 100;
    const centsPart = targetCents % 100;

    const euroPool = AVAILABLE_MONEY.filter((money) => !money.isCent);
    appendFromPool(eurosPartCents, euroPool, EURO_CANDIDATE_WINDOW);

    if (level.useCents && centsPart > 0) {
      const centPool = AVAILABLE_MONEY.filter((money) => money.isCent);
      appendFromPool(centsPart, centPool, CENT_CANDIDATE_WINDOW);
    }

    return generated;
  };

  const createRoundData = (levelKey) => {
    const nextTarget = generateTargetForLevel(levelKey);
    const nextDeposited = isCalculateMode ? generateMoneyToCalculate(nextTarget, levelKey) : [];
    return {
      targetAmountCents: nextTarget,
      depositedMoney: nextDeposited,
    };
  };

  const [roundData, setRoundData] = useState(() => createRoundData(initialLevel));
  
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const displayTitle = getSafeDisplayText(parsedContent?.title, defaultMakeChangeActivityContent.title);
  const defaultInstruction = isCalculateMode
    ? "Observe les pièces et les billets déjà déposés, puis calcule la somme exacte et saisis-la."
    : defaultMakeChangeActivityContent.instruction;
  const displayInstruction = getSafeDisplayText(parsedContent?.instruction, defaultInstruction);

  const targetAmountCents = roundData.targetAmountCents;
  const depositedMoney = roundData.depositedMoney;

  // Derive the current total amount in cents
  const currentTotalCents = depositedMoney.reduce((sum, item) => sum + (item.valueCents || (item.value * 100)), 0);

  const resetForLevel = (levelKey) => {
    setRoundData(createRoundData(levelKey));
    setFinished(false);
    setScore(null);
    setIsSuccess(false);
    setTypedAmount("");
    setIsNumberPadOpen(false);
  };

  const handleAddMoney = (moneyTemplate) => {
    if (finished || isCalculateMode) return;

    const nextId = `money-${moneyIdCounterRef.current}`;
    moneyIdCounterRef.current += 1;

    setRoundData((currentRound) => ({
      ...currentRound,
      depositedMoney: [...currentRound.depositedMoney, { ...moneyTemplate, id: nextId }],
    }));
  };

  const handleRemoveMoney = (id) => {
    if (finished || isCalculateMode) return;

    setRoundData((currentRound) => ({
      ...currentRound,
      depositedMoney: currentRound.depositedMoney.filter((money) => money.id !== id),
    }));
  };

  const handleNumberPadKeyPress = (keyValue) => {
    if (!isCalculateMode || finished) {
      return;
    }

    if (keyValue === "=") {
      handleValidate();
      return;
    }

    if (keyValue === "<" || keyValue === ">") {
      return;
    }

    if (keyValue === ",") {
      if (!useCents || typedAmount.includes(",")) {
        return;
      }

      setTypedAmount((currentValue) => (currentValue ? `${currentValue},` : "0,"));
      return;
    }

    if (!/^\d$/.test(keyValue)) {
      return;
    }

    setTypedAmount((currentValue) => sanitizeAmountInput(`${currentValue}${keyValue}`, useCents));
  };

  const handleNumberPadBackspace = () => {
    if (!isCalculateMode || finished) {
      return;
    }

    setTypedAmount((currentValue) => currentValue.slice(0, -1));
  };

  const handleValidate = () => {
    const enteredAmountCents = parseCurrencyInputToCents(typedAmount, useCents);
    const expectedAmountCents = isCalculateMode ? currentTotalCents : targetAmountCents;
    const success = isCalculateMode
      ? enteredAmountCents !== null && enteredAmountCents === expectedAmountCents
      : currentTotalCents === targetAmountCents;

    setIsSuccess(success);
    const nextScore = success ? 20 : 0;

    setScore(nextScore);
    setFinished(true);

    if (onComplete) {
      onComplete(nextScore, {
        levelKey: currentLevel,
        levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
      });
    }
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }
    resetForLevel(currentLevel);
  };

  const handleSelectLevel = (levelKey) => {
    if (finished) return;
    setCurrentLevel(levelKey);
    resetForLevel(levelKey);
  };

  // On trie l'affichage par valeur décroissante pour faire plus réaliste et ordonné
  const sortedDeposited = [...depositedMoney].sort((a, b) => (b.valueCents || 0) - (a.valueCents || 0));

  return (
    <div id="make-change-root" className="space-y-2 sm:space-y-3">
      <ActivityHero
        idPrefix="make-change"
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[]}
        levels={allowedLevelKeys.map((levelKey) => ({
          key: levelKey,
          label: configuredLevels[levelKey].label,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        disableAllLevels={finished}
      />

      <div id="make-change-content" className="flex flex-col gap-4">
        {/* En-tête */}
        {!isCalculateMode && (
          <div id="make-change-target-amount" className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-sm border-2 border-indigo-200 flex flex-col items-center justify-center">
            <span className="text-slate-500 text-sm sm:text-base font-medium mb-1">Montant à préparer :</span>
            <span className="activity-number-tile-text text-3xl sm:text-4xl font-extrabold text-indigo-700 bg-indigo-50 px-6 py-2 rounded-full border border-indigo-100">
              {formatCurrency(targetAmountCents)}
            </span>
          </div>
        )}

        {/* Zone de Dépôt */}
        <div id="make-change-deposit-zone" className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl sm:rounded-3xl min-h-[140px] sm:min-h-[160px] p-3 sm:p-4 relative">
          <div id="make-change-deposit-label" className="absolute top-2 left-4 text-slate-400 font-semibold tracking-wider uppercase text-xs sm:text-sm">
            {isCalculateMode ? "Somme à calculer" : "Mon dépôt"}
          </div>
          
          <div id="make-change-deposit-items" className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4 sm:pt-6 w-full h-full min-h-[100px] sm:min-h-[120px]">
            {sortedDeposited.length === 0 ? (
              <span id="make-change-deposit-empty" className="text-slate-400 italic">Vide. Ajoute des pièces ou des billets...</span>
            ) : (
              sortedDeposited.map((item, index) => (
                <div id={`make-change-deposit-item-${index}`} key={item.id} className="animate-in fade-in zoom-in duration-300">
                  <MoneyElement
                    money={item}
                    onClick={() => handleRemoveMoney(item.id)}
                    className={isCalculateMode ? "" : "hover:-translate-y-1 hover:shadow-lg hover:border-red-400"}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {isCalculateMode && (
          <div id="make-change-calculate-input-zone" className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border-2 border-indigo-200 flex flex-col gap-3 items-center justify-center">
            <span className="text-slate-500 text-sm sm:text-base font-medium">Calcule la somme déposée :</span>
            <div id="make-change-calculate-input-wrapper" className="w-full max-w-xs">
              <label htmlFor="make-change-calculate-input" className="sr-only">Somme calculée</label>
              <input
                id="make-change-calculate-input"
                type="text"
                inputMode="none"
                autoComplete="off"
                value={typedAmount}
                onFocus={() => setIsNumberPadOpen(true)}
                onClick={() => setIsNumberPadOpen(true)}
                onChange={(event) => setTypedAmount(sanitizeAmountInput(event.target.value, useCents))}
                disabled={finished}
                placeholder={useCents ? "Exemple : 12,35" : "Exemple : 12"}
                aria-label="Saisir la somme calculée"
                className="activity-number-tile-text w-full rounded-xl border border-slate-300 px-3 py-3 text-center text-2xl font-extrabold text-indigo-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <p id="make-change-calculate-input-help" className="mt-2 text-center text-xs text-slate-500">
                Touche la case pour ouvrir le pavé numérique.
              </p>
            </div>
          </div>
        )}

        {/* Réserve d'Argent */}
        {!finished && !isCalculateMode && (
          <div id="make-change-reserve-zone" className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-slate-200 shadow-sm flex flex-col gap-2 sm:gap-3">
            <div id="make-change-reserve-label" className="text-slate-600 font-semibold text-center uppercase tracking-wide text-xs sm:text-sm">
              Réserve (Clique pour ajouter)
            </div>
            <div id="make-change-reserve-items" className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
              {AVAILABLE_MONEY.filter(m => {
                if (m.isCent && !useCents) return false;
                // On limite la réserve à ce qui est utile (optionnel, mais garde l'UI propre)
                return m.valueCents <= targetAmountCents || m.valueCents <= 5000;
              }).map((moneyTemplate) => (
                <MoneyElement
                  key={`reserve-${moneyTemplate.label}`}
                  money={moneyTemplate}
                  onClick={() => handleAddMoney(moneyTemplate)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Résumé */}
      {finished && (
        <ActivitySummaryCard
          id="make-change-summary"
          className="animate-in slide-in-from-bottom-4 duration-500"
          title={isSuccess ? "Félicitations !" : "Ce n'est pas tout à fait ça..."}
          message={
            isCalculateMode
              ? (
                isSuccess
                  ? `Bravo, tu as trouvé la bonne somme : ${formatCurrency(currentTotalCents)} !`
                  : `Ce n'est pas la bonne somme. Les billets et pièces affichés valent ${formatCurrency(currentTotalCents)}.`
              )
              : (
                isSuccess
                  ? `Tu as parfaitement préparé les ${formatCurrency(targetAmountCents)} !`
                  : `Tu as déposé ${formatCurrency(currentTotalCents)} au lieu de ${formatCurrency(targetAmountCents)}.`
              )
          }
          score={score}
          valueClassName="activity-number-tile-text"
          stats={[]}
        />
      )}

      {/* Actions */}
      <ActivityActionsBar
        id="make-change-actions"
        className="flex flex-wrap justify-center gap-3 pt-1 sm:pt-2"
        actions={[
          {
            id: "make-change-validate",
            onClick: handleValidate,
            disabled: finished || (isCalculateMode ? typedAmount.trim().length === 0 : depositedMoney.length === 0),
            ariaLabel: "Valider",
            title: "Valider",
            icon: "✓",
            srText: "Valider",
            variant: "validate",
          },
          {
            id: "make-change-restart",
            onClick: handleRestart,
            disabled: restartLocked || !finished,
            ariaLabel: "Recommencer",
            title: "Recommencer",
            icon: "↻",
            srText: "Recommencer",
            variant: allStudentsCompleted ? "warning" : "restart",
          },
        ]}
      />

      {isCalculateMode && (
        <FloatingNumberPad
          isOpen={isNumberPadOpen && !finished}
          activeFieldLabel="Somme calculée"
          onKeyPress={handleNumberPadKeyPress}
          onBackspace={handleNumberPadBackspace}
          onClose={() => setIsNumberPadOpen(false)}
          showCommaKey={useCents}
          disabledKeys={useCents ? ["<", ">"] : ["<", ">", ","]}
        />
      )}
    </div>
  );
};

export default MakeChangeActivity;
