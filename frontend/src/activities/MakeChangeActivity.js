import React, { useMemo, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityIconButton from "../components/ActivityIconButton";
import ActivityStatus from "../components/ActivityStatus";
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
    level1: { label: "Niveau 1", min: 1, max: 10 },
    level2: { label: "Niveau 2", min: 11, max: 40 },
    level3: { label: "Niveau 3", min: 41, max: 100 },
  },
};

const AVAILABLE_MONEY = [
  { value: 1, type: "coin", label: "1 €" },
  { value: 2, type: "coin", label: "2 €" },
  { value: 5, type: "bill", label: "5 €" },
  { value: 10, type: "bill", label: "10 €" },
  { value: 20, type: "bill", label: "20 €" },
  { value: 50, type: "bill", label: "50 €" },
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
  };
}

function getRandomTarget(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const MoneyCoin = ({ value, label, onClick, className = "" }) => {
  const is1 = value === 1;
  const is2 = value === 2;

  let styles = "rounded-full shadow-sm flex items-center justify-center font-bold font-sans cursor-pointer transition-transform hover:scale-110 active:scale-95 select-none ";
  
  if (is1) {
    styles += "w-12 h-12 text-slate-800 bg-yellow-300 border-4 border-slate-300";
  } else if (is2) {
    styles += "w-14 h-14 text-slate-800 bg-slate-200 border-4 border-yellow-400 text-xl";
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
      className={`w-20 h-12 sm:w-28 sm:h-16 rounded shadow-md border-2 flex items-center justify-center font-bold text-lg sm:text-2xl cursor-pointer transition-transform hover:scale-110 active:scale-95 select-none ${bgColors} ${className}`}
    >
      {label}
    </button>
  );
};

const MoneyElement = ({ money, onClick, className }) => {
  if (money.type === "coin") {
    return <MoneyCoin value={money.value} label={money.label} onClick={onClick} className={className} />;
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

  const generateTargetForLevel = (levelKey) => {
    const level = configuredLevels[levelKey] || configuredLevels.level1;
    return getRandomTarget(level.min, level.max);
  };

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [targetAmount, setTargetAmount] = useState(() => generateTargetForLevel(initialLevel));
  const [depositedMoney, setDepositedMoney] = useState([]);
  
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [moneyIdCounter, setMoneyIdCounter] = useState(1);

  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const currentLevelRule = configuredLevels[currentLevel] || configuredLevels.level1;
  const displayTitle = getSafeDisplayText(parsedContent?.title, defaultMakeChangeActivityContent.title);
  const displayInstruction = getSafeDisplayText(parsedContent?.instruction, defaultMakeChangeActivityContent.instruction);

  // Derive the current total amount (hidden from user visually, but needed logic)
  const currentTotal = depositedMoney.reduce((sum, item) => sum + item.value, 0);

  const resetForLevel = (levelKey) => {
    setTargetAmount(generateTargetForLevel(levelKey));
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
    const success = currentTotal === targetAmount;
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
  const sortedDeposited = [...depositedMoney].sort((a, b) => b.value - a.value);

  return (
    <div id="make-change-root" className="space-y-4 sm:space-y-6">
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

      <div className="flex flex-col gap-4">
        {/* En-tête : Montant à payer */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-indigo-200 flex flex-col items-center justify-center">
          <span className="text-slate-500 font-medium mb-1">Montant à préparer :</span>
          <span className="text-5xl font-extrabold text-indigo-700 bg-indigo-50 px-8 py-3 rounded-full border border-indigo-100">
            {targetAmount} €
          </span>
        </div>

        {/* Zone de Dépôt */}
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl min-h-[220px] p-6 relative">
          <div className="absolute top-4 left-6 text-slate-400 font-semibold tracking-wider uppercase text-sm">
            Mon Dépôt
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 pt-6 w-full h-full">
            {sortedDeposited.length === 0 ? (
              <span className="text-slate-400 italic">Vide. Ajoute des pièces ou des billets...</span>
            ) : (
              sortedDeposited.map((item, index) => (
                <div key={item.id} className="animate-in fade-in zoom-in duration-300">
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
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="text-slate-600 font-semibold text-center uppercase tracking-wide text-sm">
              Réserve (Clique pour ajouter)
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
              {AVAILABLE_MONEY.filter(m => m.value <= targetAmount || m.value <= 50).map((moneyTemplate) => (
                <MoneyElement
                  key={`reserve-${moneyTemplate.value}`}
                  money={moneyTemplate}
                  onClick={() => handleAddMoney(moneyTemplate)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3 pt-4">
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

      {/* Résumé */}
      {finished && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <ActivitySummaryCard
            id="make-change-summary"
            title={isSuccess ? "Félicitations !" : "Ce n'est pas tout à fait ça..."}
            message={
              isSuccess 
                ? `Tu as parfaitement préparé les ${targetAmount} € !`
                : `Tu as déposé ${currentTotal} € au lieu de ${targetAmount} €.`
            }
            score={score}
            stats={[]}
          />
        </div>
      )}
    </div>
  );
};

export default MakeChangeActivity;
