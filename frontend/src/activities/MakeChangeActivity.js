import React, { useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
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

  const [currentLevel, setCurrentLevel] = useState(initialLevel);

  // Valeurs dérivées du niveau actuel
  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const useCents = currentLevelRule.useCents;
  const centsStep = currentLevelRule.centsStep;

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

  const [targetAmountCents, setTargetAmountCents] = useState(() => generateTargetForLevel(initialLevel));
  const [depositedMoney, setDepositedMoney] = useState([]);
  
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [moneyIdCounter, setMoneyIdCounter] = useState(1);

  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const displayTitle = getSafeDisplayText(parsedContent?.title, defaultMakeChangeActivityContent.title);
  const displayInstruction = getSafeDisplayText(parsedContent?.instruction, defaultMakeChangeActivityContent.instruction);

  // Derive the current total amount in cents
  const currentTotalCents = depositedMoney.reduce((sum, item) => sum + (item.valueCents || (item.value * 100)), 0);

  const resetForLevel = (levelKey) => {
    setTargetAmountCents(generateTargetForLevel(levelKey));
    setDepositedMoney([]);
    setFinished(false);
    setScore(null);
    setIsSuccess(false);
  };

  const handleAddMoney = (moneyTemplate) => {
    if (finished) return;
    setDepositedMoney([
      ...depositedMoney,
      { ...moneyTemplate, id: `money-${moneyIdCounter}` }
    ]);
    setMoneyIdCounter(c => c + 1);
  };

  const handleRemoveMoney = (id) => {
    if (finished) return;
    setDepositedMoney(depositedMoney.filter(m => m.id !== id));
  };

  const handleValidate = () => {
    const success = currentTotalCents === targetAmountCents;
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
        {/* En-tête : Montant à payer */}
        <div id="make-change-target-amount" className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-sm border-2 border-indigo-200 flex flex-col items-center justify-center">
          <span className="text-slate-500 text-sm sm:text-base font-medium mb-1">Montant à préparer :</span>
          <span className="text-3xl sm:text-4xl font-extrabold text-indigo-700 bg-indigo-50 px-6 py-2 rounded-full border border-indigo-100">
            {formatCurrency(targetAmountCents)}
          </span>
        </div>

        {/* Zone de Dépôt */}
        <div id="make-change-deposit-zone" className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl sm:rounded-3xl min-h-[140px] sm:min-h-[160px] p-3 sm:p-4 relative">
          <div id="make-change-deposit-label" className="absolute top-2 left-4 text-slate-400 font-semibold tracking-wider uppercase text-xs sm:text-sm">
            Mon Dépôt
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
                    className="hover:-translate-y-1 hover:shadow-lg hover:border-red-400"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Réserve d'Argent */}
        {!finished && (
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
            isSuccess 
              ? `Tu as parfaitement préparé les ${formatCurrency(targetAmountCents)} !`
              : `Tu as déposé ${formatCurrency(currentTotalCents)} au lieu de ${formatCurrency(targetAmountCents)}.`
          }
          score={score}
          stats={[]}
        />
      )}

      {/* Actions */}
      <div id="make-change-actions" className="flex flex-wrap justify-center gap-3 pt-1 sm:pt-2">
        <ActivityIconButton
          id="make-change-validate"
          onClick={handleValidate}
          disabled={finished || depositedMoney.length === 0}
          ariaLabel="Valider"
          title="Valider"
          icon="✓"
          srText="Valider"
          variant="validate"
        />
        <ActivityIconButton
          id="make-change-restart"
          onClick={handleRestart}
          disabled={restartLocked}
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

export default MakeChangeActivity;
