import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import PlacementDropZone from "../components/PlacementDropZone";
import PlacementTileButton from "../components/PlacementTileButton";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import useSlotPoolPlacement from "../hooks/useSlotPoolPlacement";
import { API_URL } from "../config/api";
import {
  getSafeDisplayText,
  handleRoundRestart,
  parseActivityContent,
} from "../utils/activityUtils";

const ETRE_CONJUGATIONS = [
  { id: "etre-present-1", person: 1, pronoun: "je", verb: "suis" },
  { id: "etre-present-2", person: 2, pronoun: "tu", verb: "es" },
  { id: "etre-present-3", person: 3, pronoun: "il / elle", verb: "est" },
  { id: "etre-present-4", person: 4, pronoun: "nous", verb: "sommes" },
  { id: "etre-present-5", person: 5, pronoun: "vous", verb: "êtes" },
  { id: "etre-present-6", person: 6, pronoun: "ils / elles", verb: "sont" },
];
ETRE_CONJUGATIONS.present = ETRE_CONJUGATIONS;
ETRE_CONJUGATIONS.futur = [
  { id: "etre-futur-1", person: 1, pronoun: "je", verb: "serai" },
  { id: "etre-futur-2", person: 2, pronoun: "tu", verb: "seras" },
  { id: "etre-futur-3", person: 3, pronoun: "il / elle", verb: "sera" },
  { id: "etre-futur-4", person: 4, pronoun: "nous", verb: "serons" },
  { id: "etre-futur-5", person: 5, pronoun: "vous", verb: "serez" },
  { id: "etre-futur-6", person: 6, pronoun: "ils / elles", verb: "seront" },
];
ETRE_CONJUGATIONS.imparfait = [
  { id: "etre-imparfait-1", person: 1, pronoun: "j'", verb: "étais" },
  { id: "etre-imparfait-2", person: 2, pronoun: "tu", verb: "étais" },
  { id: "etre-imparfait-3", person: 3, pronoun: "il / elle", verb: "était" },
  { id: "etre-imparfait-4", person: 4, pronoun: "nous", verb: "étions" },
  { id: "etre-imparfait-5", person: 5, pronoun: "vous", verb: "étiez" },
  { id: "etre-imparfait-6", person: 6, pronoun: "ils / elles", verb: "étaient" },
];

const AVOIR_CONJUGATIONS = [
  { id: "avoir-present-1", person: 1, pronoun: "j'", verb: "ai" },
  { id: "avoir-present-2", person: 2, pronoun: "tu", verb: "as" },
  { id: "avoir-present-3", person: 3, pronoun: "il / elle", verb: "a" },
  { id: "avoir-present-4", person: 4, pronoun: "nous", verb: "avons" },
  { id: "avoir-present-5", person: 5, pronoun: "vous", verb: "avez" },
  { id: "avoir-present-6", person: 6, pronoun: "ils / elles", verb: "ont" },
];
AVOIR_CONJUGATIONS.present = AVOIR_CONJUGATIONS;
AVOIR_CONJUGATIONS.futur = [
  { id: "avoir-futur-1", person: 1, pronoun: "j'", verb: "aurai" },
  { id: "avoir-futur-2", person: 2, pronoun: "tu", verb: "auras" },
  { id: "avoir-futur-3", person: 3, pronoun: "il / elle", verb: "aura" },
  { id: "avoir-futur-4", person: 4, pronoun: "nous", verb: "aurons" },
  { id: "avoir-futur-5", person: 5, pronoun: "vous", verb: "aurez" },
  { id: "avoir-futur-6", person: 6, pronoun: "ils / elles", verb: "auront" },
];
AVOIR_CONJUGATIONS.imparfait = [
  { id: "avoir-imparfait-1", person: 1, pronoun: "j'", verb: "avais" },
  { id: "avoir-imparfait-2", person: 2, pronoun: "tu", verb: "avais" },
  { id: "avoir-imparfait-3", person: 3, pronoun: "il / elle", verb: "avait" },
  { id: "avoir-imparfait-4", person: 4, pronoun: "nous", verb: "avions" },
  { id: "avoir-imparfait-5", person: 5, pronoun: "vous", verb: "aviez" },
  { id: "avoir-imparfait-6", person: 6, pronoun: "ils / elles", verb: "avaient" },
];

export const CONJUGATION_TABLE = {
  être: ETRE_CONJUGATIONS,
  avoir: AVOIR_CONJUGATIONS,
};

export const FALLBACK_FIRST_GROUP_VERBS = [
  "chanter",
  "manger",
  "tracer",
  "parler",
  "marcher",
  "danser",
  "sauter",
  "jouer",
  "aimer",
  "nager",
  "placer",
  "avancer",
  "plonger",
  "fermer",
  "couper",
  "écouter",
  "dessiner",
  "lancer",
  "changer",
  "traverser",
];

export function isPronominalVerb(rawVerb) {
  const norm = String(rawVerb || "").trim().toLowerCase();
  // Détecte les verbes précédés d'un s' / s’ ou de se (ex: s'envoler, s’amuser, se promener)
  return /^(s\s*['’ʼ`´]|se\s+)/i.test(norm);
}

export function isFirstGroupVerb(rawVerb) {
  const norm = String(rawVerb || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    norm === "verbe 1er groupe" ||
    norm === "1er groupe" ||
    norm === "premier groupe" ||
    norm === "verbe premier groupe"
  ) {
    return true;
  }

  // Les verbes pronominaux ou précédés de s' (ex: s'envoler) ou se sont ignorés pour ce mode
  if (isPronominalVerb(rawVerb)) {
    return false;
  }

  return norm.endsWith("er") && norm !== "aller";
}

export function pickRandomVerb(verbList, currentVerb = null) {
  const safeList = Array.isArray(verbList)
    ? verbList.filter((v) => !isPronominalVerb(v))
    : [];
  if (safeList.length === 0) {
    return "chanter";
  }
  if (safeList.length === 1) {
    return safeList[0];
  }
  const candidates = currentVerb ? safeList.filter((v) => v !== currentVerb) : safeList;
  const pool = candidates.length > 0 ? candidates : safeList;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

let cachedFirstGroupVerbs = null;

export function clearFirstGroupVerbsCache() {
  cachedFirstGroupVerbs = null;
}

export async function fetchFirstGroupVerbs() {
  try {
    const res = await fetch(`${API_URL}/words?nature=verbe 1er groupe&limit=200`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const verbs = data
          .map((item) => String(item.word || "").trim().toLowerCase())
          .filter((w) => w.endsWith("er") && w !== "aller" && !isPronominalVerb(w));
        if (verbs.length > 0) {
          cachedFirstGroupVerbs = verbs;
          return verbs;
        }
      }
    }
  } catch (_err) {
    // Mode hors-ligne ou erreur API : repli sur la liste locale
  }
  return FALLBACK_FIRST_GROUP_VERBS;
}

export function generateFirstGroupConjugation(verb, tense = "present") {
  const cleanVerb = String(verb || "").trim().toLowerCase();
  const baseRadical = cleanVerb.endsWith("er") ? cleanVerb.slice(0, -2) : cleanVerb;
  const isGer = cleanVerb.endsWith("ger");
  const isCer = cleanVerb.endsWith("cer");
  const startsWithVowelOrH = /^[aeiouyéèêëàâîïôùûh]/i.test(cleanVerb);
  const pronoun1 = startsWithVowelOrH ? "j'" : "je";

  const nousStem = isCer ? baseRadical.slice(0, -1) : baseRadical;
  const nousSpecialChar = isCer ? "ç" : "";
  const nousEnding = isGer ? "eons" : "ons";
  const nousVerb = isCer ? `${nousStem}çons` : `${baseRadical}${nousEnding}`;
  const nousPlaceholder = isCer ? `${nousStem}ç...` : `${baseRadical}...`;

  return [
    {
      id: `${cleanVerb}-${tense}-1`,
      person: 1,
      pronoun: pronoun1,
      verb: `${baseRadical}e`,
      placeholder: `${baseRadical}...`,
      parts: { stem: baseRadical, specialChar: "", ending: "e" },
    },
    {
      id: `${cleanVerb}-${tense}-2`,
      person: 2,
      pronoun: "tu",
      verb: `${baseRadical}es`,
      placeholder: `${baseRadical}...`,
      parts: { stem: baseRadical, specialChar: "", ending: "es" },
    },
    {
      id: `${cleanVerb}-${tense}-3`,
      person: 3,
      pronoun: "il / elle",
      verb: `${baseRadical}e`,
      placeholder: `${baseRadical}...`,
      parts: { stem: baseRadical, specialChar: "", ending: "e" },
    },
    {
      id: `${cleanVerb}-${tense}-4`,
      person: 4,
      pronoun: "nous",
      verb: nousVerb,
      placeholder: nousPlaceholder,
      parts: { stem: nousStem, specialChar: nousSpecialChar, ending: nousEnding },
    },
    {
      id: `${cleanVerb}-${tense}-5`,
      person: 5,
      pronoun: "vous",
      verb: `${baseRadical}ez`,
      placeholder: `${baseRadical}...`,
      parts: { stem: baseRadical, specialChar: "", ending: "ez" },
    },
    {
      id: `${cleanVerb}-${tense}-6`,
      person: 6,
      pronoun: "ils / elles",
      verb: `${baseRadical}ent`,
      placeholder: `${baseRadical}...`,
      parts: { stem: baseRadical, specialChar: "", ending: "ent" },
    },
  ];
}

export const ConjugatedVerbText = ({ text, parts, className = "" }) => {
  if (!parts) {
    return <span className={className}>{text}</span>;
  }

  const { stem, specialChar, ending } = parts;
  return (
    <span className={`inline-flex items-baseline justify-center tracking-normal ${className}`}>
      <span className="font-medium text-red-600/90">{stem}</span>
      {specialChar ? (
        <span
          className="font-black text-red-700 underline decoration-2 decoration-red-500 mx-[0.5px]"
          title="Cas particulier : cédille sous le c devant le o"
        >
          {specialChar}
        </span>
      ) : null}
      <span className="font-black text-red-700 ml-[0.5px]">{ending}</span>
    </span>
  );
};

export const TENSE_METAS = {
  present: {
    key: "present",
    label: "Présent",
    full: "Présent de l'indicatif",
    preposition: "au présent",
  },
  futur: {
    key: "futur",
    label: "Futur",
    full: "Futur simple de l'indicatif",
    preposition: "au futur",
  },
  imparfait: {
    key: "imparfait",
    label: "Imparfait",
    full: "Imparfait de l'indicatif",
    preposition: "à l'imparfait",
  },
};

export const defaultVerbConjugationActivityContent = {
  title: "Conjugaison : être et avoir",
  instruction: "Complète la conjugaison du verbe avec les bonnes formes.",
  verb: "être",
  tense: "present",
  randomOrder: false,
  target: "verb",
  mode: "drag",
  defaultLevel: "level1",
  levels: {
    level1: {
      label: "Niveau 1",
      verb: "être",
      tense: "present",
      randomOrder: false,
      target: "verb",
      mode: "drag",
      instruction: "Déplace les étiquettes de verbes en rouge pour compléter la conjugaison dans l'ordre.",
    },
    level2: {
      label: "Niveau 2",
      verb: "être",
      tense: "present",
      randomOrder: true,
      target: "verb",
      mode: "drag",
      instruction: "Déplace les étiquettes de verbes en rouge pour compléter la conjugaison dans le désordre.",
    },
    level3: {
      label: "Niveau 3",
      verb: "être",
      tense: "present",
      randomOrder: true,
      target: "pronoun",
      mode: "drag",
      instruction: "Déplace les étiquettes de pronoms en violet devant chaque verbe conjugué.",
    },
    level4: {
      label: "Niveau 4",
      verb: "être",
      tense: "present",
      randomOrder: false,
      target: "verb",
      mode: "input",
      instruction: "Écris au clavier le verbe conjugué qui correspond à chaque pronom.",
    },
  },
};

const ALLOWED_LEVEL_KEYS = ["level1", "level2", "level3", "level4"];

export function normalizeVerbKey(rawVerb) {
  const norm = String(rawVerb || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (norm === "avoir") return "avoir";
  if (
    norm === "verbe 1er groupe" ||
    norm === "1er groupe" ||
    norm === "premier groupe" ||
    norm === "verbe premier groupe"
  ) {
    return "verbe 1er groupe";
  }
  if (norm.endsWith("er") && norm !== "aller" && !isPronominalVerb(rawVerb)) {
    return norm;
  }
  return "être";
}

export function normalizeTenseKey(rawTense) {
  const norm = String(rawTense || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (norm === "futur" || norm === "future") {
    return "futur";
  }
  if (norm === "imparfait" || norm === "imperfect") {
    return "imparfait";
  }
  return "present";
}

export function getTenseMeta(rawTense) {
  const key = normalizeTenseKey(rawTense);
  return TENSE_METAS[key] || TENSE_METAS.present;
}

export function getConjugationList(rawVerb, rawTense, activeVerb = null) {
  const verbKey = normalizeVerbKey(rawVerb);
  const tenseKey = normalizeTenseKey(rawTense);

  if (isFirstGroupVerb(verbKey)) {
    const targetVerb = activeVerb || (verbKey === "verbe 1er groupe" ? "chanter" : verbKey);
    return generateFirstGroupConjugation(targetVerb, tenseKey);
  }

  const verbEntry = CONJUGATION_TABLE[verbKey] || CONJUGATION_TABLE.être;
  return verbEntry[tenseKey] || verbEntry.present || verbEntry;
}

export function normalizeTarget(rawTarget) {
  const norm = String(rawTarget || "").trim().toLowerCase();
  if (norm === "pronoun" || norm === "pronom" || norm === "pronoms") {
    return "pronoun";
  }
  return "verb";
}

export function normalizeMode(rawMode) {
  const norm = String(rawMode || "").trim().toLowerCase();
  if (norm === "input" || norm === "ecrire" || norm === "texte" || norm === "write") {
    return "input";
  }
  return "drag";
}

export function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function normalizeAnswerText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isAnswerCorrect(userText, expectedText, target, options = {}) {
  const normUser = normalizeAnswerText(userText);
  const normExpected = normalizeAnswerText(expectedText);

  if (!normUser) {
    return false;
  }

  if (normUser === normExpected) {
    return true;
  }

  // Tolérance sans accent pour jeunes élèves (ex: etes pour êtes, tracons pour traçons)
  const strippedUser = normUser.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const strippedExpected = normExpected.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (strippedUser === strippedExpected) {
    return true;
  }

  // Mode verbe 1er groupe : l'élève peut fournir la terminaison seule (ex: 'ons') ou le verbe complet ('chantons')
  if (target === "verb") {
    if (options.expectedEnding) {
      const normEnding = normalizeAnswerText(options.expectedEnding);
      if (normUser === normEnding) {
        return true;
      }
    }
    if (options.expectedVerb) {
      const normVerb = normalizeAnswerText(options.expectedVerb);
      const strippedVerb = normVerb.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normUser === normVerb || strippedUser === strippedVerb) {
        return true;
      }
    }
  }

  // Synonymes et formes équivalentes pour pronoms
  if (target === "pronoun") {
    // Si la forme verbale est identique entre 1ère et 3ème personne du singulier (ex: chante)
    if (options.canSwapFirstThirdSingular) {
      const isFirstOrThirdExpected =
        normExpected === "je" || normExpected === "j'" || normExpected === "il / elle";
      if (isFirstOrThirdExpected) {
        const isFirstPersonUser =
          normUser === "je" || normUser === "j'" || normUser === "j";
        const isThirdPersonUser =
          normUser === "il" ||
          normUser === "elle" ||
          normUser === "il/elle" ||
          normUser === "on" ||
          normUser === "il / elle";
        if (isFirstPersonUser || isThirdPersonUser) {
          return true;
        }
      }
    }

    if (
      normExpected === "il / elle" &&
      (normUser === "il" || normUser === "elle" || normUser === "il/elle" || normUser === "on")
    ) {
      return true;
    }
    if (
      normExpected === "ils / elles" &&
      (normUser === "ils" || normUser === "elles" || normUser === "ils/elles")
    ) {
      return true;
    }
    if (normExpected === "j'" && (normUser === "j" || normUser === "je" || normUser === "j'")) {
      return true;
    }
    if (normExpected === "je" && (normUser === "j'" || normUser === "j" || normUser === "je")) {
      return true;
    }
  }

  return false;
}

function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shuffleDistinct(array) {
  if (array.length <= 1) return [...array];
  const shuffled = shuffleArray(array);
  const isSameOrder = shuffled.every((item, idx) => item.id === array[idx].id);
  if (isSameOrder && shuffled.length > 1) {
    const temp = shuffled[0];
    shuffled[0] = shuffled[1];
    shuffled[1] = temp;
  }
  return shuffled;
}

function normalizeLevelRule(sourceRule, fallbackRule, globalConfig = {}) {
  const source = sourceRule && typeof sourceRule === "object" ? sourceRule : {};
  const fallback = fallbackRule && typeof fallbackRule === "object" ? fallbackRule : {};

  const verb = normalizeVerbKey(source.verb || globalConfig.verb || fallback.verb || "être");
  const tense = normalizeTenseKey(
    source.tense ||
      source.temps ||
      globalConfig.tense ||
      globalConfig.temps ||
      fallback.tense ||
      fallback.temps ||
      "present"
  );
  const randomOrder = normalizeBoolean(
    source.randomOrder ?? globalConfig.randomOrder ?? fallback.randomOrder,
    false
  );
  const target = normalizeTarget(source.target || globalConfig.target || fallback.target || "verb");
  const mode = normalizeMode(source.mode || globalConfig.mode || fallback.mode || "drag");

  return {
    label: getSafeDisplayText(source.label, fallback.label || "Niveau"),
    instruction: getSafeDisplayText(source.instruction, fallback.instruction || ""),
    verb,
    tense,
    randomOrder,
    target,
    mode,
  };
}

function buildInitialRound(verbKey, levelRule, activeVerb = null) {
  const canonicalList = getConjugationList(verbKey, levelRule?.tense, activeVerb);
  return levelRule.randomOrder
    ? shuffleDistinct(canonicalList)
    : [...canonicalList];
}

export function buildInitialPool(verbKey, levelRule, activeVerb = null) {
  if (levelRule.mode !== "drag") {
    return [];
  }
  const canonicalList = getConjugationList(verbKey, levelRule?.tense, activeVerb);
  const isFirstGroup = isFirstGroupVerb(verbKey);

  return shuffleArray(
    canonicalList.map((item) => {
      const isVerbTarget = levelRule.target === "verb";
      const tileText = isVerbTarget && isFirstGroup && item.parts?.ending
        ? item.parts.ending
        : isVerbTarget
          ? item.verb
          : item.pronoun;

      return {
        id: `tile-${item.id}`,
        runtimeId: `tile-${item.id}`,
        text: tileText,
        ending: item.parts?.ending || null,
        fullVerb: item.verb,
        parts: isVerbTarget && !isFirstGroup ? item.parts : null,
        correctRowId: item.id,
        target: levelRule.target,
      };
    })
  );
}

const VerbConjugationActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
}) => {
  const parsedContent = useMemo(() => parseActivityContent(content), [content]);
  const defaultLevels = defaultVerbConjugationActivityContent.levels;

  const configuredLevels = useMemo(
    () => ({
      level1: normalizeLevelRule(parsedContent?.levels?.level1, defaultLevels.level1, parsedContent),
      level2: normalizeLevelRule(parsedContent?.levels?.level2, defaultLevels.level2, parsedContent),
      level3: normalizeLevelRule(parsedContent?.levels?.level3, defaultLevels.level3, parsedContent),
      level4: normalizeLevelRule(parsedContent?.levels?.level4, defaultLevels.level4, parsedContent),
    }),
    [parsedContent, defaultLevels]
  );

  const initialLevel = ALLOWED_LEVEL_KEYS.includes(parsedContent?.defaultLevel)
    ? parsedContent.defaultLevel
    : "level1";

  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const currentRule = configuredLevels[currentLevel] || configuredLevels.level1;

  const [availableVerbs, setAvailableVerbs] = useState(
    () => cachedFirstGroupVerbs || FALLBACK_FIRST_GROUP_VERBS
  );

  const initialActiveVerb = useMemo(() => {
    if (isFirstGroupVerb(currentRule.verb)) {
      if (currentRule.verb !== "verbe 1er groupe") {
        return currentRule.verb;
      }
      return pickRandomVerb(cachedFirstGroupVerbs || FALLBACK_FIRST_GROUP_VERBS);
    }
    return currentRule.verb;
  }, [currentRule.verb]);

  const [activeVerb, setActiveVerb] = useState(initialActiveVerb);

  // Charger les verbes du 1er groupe depuis l'API backend si besoin
  useEffect(() => {
    let isMounted = true;
    if (!cachedFirstGroupVerbs) {
      fetchFirstGroupVerbs().then((verbs) => {
        if (isMounted && verbs && verbs.length > 0) {
          cachedFirstGroupVerbs = verbs;
          setAvailableVerbs(verbs);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const [rows, setRows] = useState(() =>
    buildInitialRound(currentRule.verb, currentRule, initialActiveVerb)
  );
  const [inputAnswers, setInputAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [message, setMessage] = useState("");
  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage, 3500, 4000);

  const {
    poolItems,
    assignments,
    setAssignments,
    setPoolItems,
    resetPlacement,
    clearInteraction,
    endDrag,
    startDragFromPool,
    startDragFromSlot,
    toggleSelectFromPool,
    toggleSelectFromSlot,
    dropToSlot,
    dropToPool,
    isPoolItemSelected,
    isSlotSelected,
  } = useSlotPoolPlacement({
    initialPoolItems: buildInitialPool(currentRule.verb, currentRule, initialActiveVerb),
    initialAssignments: {},
    disabled: finished,
  });

  const target = currentRule.target;
  const isInputMode = currentRule.mode === "input";
  const restartLocked = Boolean(student) && finished && !allStudentsCompleted;
  const isFirstGroup = isFirstGroupVerb(currentRule.verb);
  const displayVerbName =
    (isFirstGroup
      ? activeVerb && activeVerb !== "verbe 1er groupe"
        ? activeVerb
        : ""
      : currentRule.verb) || "";
  const formattedActiveVerb = displayVerbName
    ? displayVerbName.charAt(0).toUpperCase() + displayVerbName.slice(1)
    : "";

  // Largeur uniforme des tuiles du pool adaptée au contenu le plus long du tour
  const poolTileWidth = useMemo(() => {
    const isFirstGroupVerbTarget = isFirstGroup && target === "verb";
    if (isFirstGroupVerbTarget) {
      const poolTexts = poolItems.map((item) => item.text);
      const maxLength = poolTexts.length > 0
        ? Math.max(...poolTexts.map((t) => (t || "").length))
        : 4;
      const remWidth = Math.max(5.5, 3.8 + maxLength * 0.5);
      return `${remWidth.toFixed(2)}rem`;
    }

    const roundTexts = rows.map((r) => (target === "verb" ? r.verb : r.pronoun));
    const poolTexts = poolItems.map((item) => item.text);
    const allTexts = [...roundTexts, ...poolTexts].filter(Boolean);
    const maxLength = allTexts.length > 0
      ? Math.max(...allTexts.map((t) => (t || "").length))
      : 6;

    // Minimum ergonomique de 7rem (~112px).
    // Progression de 0.6rem par caractère au-delà de 4 caractères pour s'ajuster au mot le plus long.
    const remWidth = Math.max(7, 4.5 + maxLength * 0.6);
    return `${remWidth.toFixed(2)}rem`;
  }, [rows, target, poolItems, isFirstGroup]);

  // Initialisation ou réinitialisation d'un tour
  const initRound = useCallback(
    (verbKey, levelRule, forcedVerb = null) => {
      let verbToUse;
      if (verbKey === "verbe 1er groupe") {
        if (forcedVerb && isFirstGroupVerb(forcedVerb) && forcedVerb !== "verbe 1er groupe") {
          verbToUse = forcedVerb;
        } else if (activeVerb && isFirstGroupVerb(activeVerb) && activeVerb !== "verbe 1er groupe") {
          verbToUse = activeVerb;
        } else {
          verbToUse = pickRandomVerb(availableVerbs);
        }
      } else if (isFirstGroupVerb(verbKey)) {
        verbToUse = verbKey;
      } else {
        verbToUse = forcedVerb || verbKey;
      }

      if (activeVerb !== verbToUse) {
        setActiveVerb(verbToUse);
      }

      const canonicalList = getConjugationList(verbKey, levelRule.tense, verbToUse);
      const roundRows = levelRule.randomOrder
        ? shuffleDistinct(canonicalList)
        : [...canonicalList];

      setRows(roundRows);
      setInputAnswers({});
      setFinished(false);
      setScore(null);
      setCorrectCount(0);
      setMistakes([]);
      setMessage("");

      if (levelRule.mode === "drag") {
        const isVerbTarget = levelRule.target === "verb";
        const isFirstGroupRound = isFirstGroupVerb(verbKey);
        const pool = shuffleArray(
          canonicalList.map((item) => {
            const tileText = isVerbTarget && isFirstGroupRound && item.parts?.ending
              ? item.parts.ending
              : isVerbTarget
                ? item.verb
                : item.pronoun;

            return {
              id: `tile-${item.id}`,
              runtimeId: `tile-${item.id}`,
              text: tileText,
              ending: item.parts?.ending || null,
              fullVerb: item.verb,
              parts: isVerbTarget && !isFirstGroupRound ? item.parts : null,
              correctRowId: item.id,
              target: levelRule.target,
            };
          })
        );
        resetPlacement(pool, {});
      } else {
        resetPlacement([], {});
      }
    },
    [activeVerb, availableVerbs, resetPlacement]
  );

  const getRoundSignature = useCallback(
    (level, rule, verb) =>
      JSON.stringify({
        level,
        verb: rule.verb,
        activeVerb: isFirstGroupVerb(rule.verb) ? verb : rule.verb,
        tense: rule.tense,
        mode: rule.mode,
        target: rule.target,
        randomOrder: rule.randomOrder,
      }),
    []
  );

  const lastLoadedSignatureRef = useRef(
    getRoundSignature(currentLevel, currentRule, initialActiveVerb)
  );

  useEffect(() => {
    setCurrentLevel(initialLevel);
  }, [initialLevel]);

  // Synchronisation lors du changement réel de niveau ou de configuration du tour
  useEffect(() => {
    let nextActive = activeVerb;
    if (currentRule.verb === "verbe 1er groupe") {
      if (!activeVerb || !isFirstGroupVerb(activeVerb) || activeVerb === "verbe 1er groupe") {
        nextActive = pickRandomVerb(availableVerbs);
      }
    } else {
      nextActive = currentRule.verb;
    }

    if (activeVerb !== nextActive) {
      setActiveVerb(nextActive);
    }

    const nextSignature = getRoundSignature(currentLevel, currentRule, nextActive);

    if (lastLoadedSignatureRef.current === nextSignature) {
      return;
    }
    lastLoadedSignatureRef.current = nextSignature;
    initRound(currentRule.verb, currentRule, nextActive);
  }, [currentLevel, currentRule, activeVerb, availableVerbs, getRoundSignature, initRound]);

  const handleSelectLevel = (levelKey) => {
    if (levelKey === currentLevel) return;
    setCurrentLevel(levelKey);
  };

  const handleInputChange = (rowId, value) => {
    if (finished) return;
    setInputAnswers((prev) => ({
      ...prev,
      [rowId]: value,
    }));
  };

  const handleDropToSlot = (rowId) => {
    if (finished || isInputMode) return;
    dropToSlot(rowId);
  };

  const handleSlotClick = (rowId) => {
    if (finished || isInputMode) return;
    dropToSlot(rowId);
    if (!assignments[rowId]) return;
    toggleSelectFromSlot(rowId);
  };

  const handleRemoveFromSlot = (event, rowId) => {
    event.stopPropagation();
    if (finished || isInputMode) return;
    const item = assignments[rowId];
    if (!item) return;

    const nextAssignments = { ...assignments };
    delete nextAssignments[rowId];
    setAssignments(nextAssignments);
    setPoolItems((prev) => [...prev, item]);
    clearInteraction();
  };

  const handleDropToPool = () => {
    if (finished || isInputMode) return;
    dropToPool();
  };

  const handlePoolClick = () => {
    if (finished || isInputMode) return;
    dropToPool();
  };

  // Progression
  const totalSlots = rows.length;
  const answeredCount = isInputMode
    ? rows.filter((r) => Boolean((inputAnswers[r.id] || "").trim())).length
    : Object.keys(assignments).length;
  const progressPercent = totalSlots > 0 ? Math.round((answeredCount / totalSlots) * 100) : 0;
  const allAnswered = answeredCount === totalSlots && totalSlots > 0;

  // Validation
  const handleValidate = () => {
    if (finished) return;

    if (!allAnswered) {
      setMessage("Remplis toutes les cases avant de valider !");
      return;
    }

    let correct = 0;
    const roundMistakes = [];

    rows.forEach((row) => {
      let isCorrect = false;
      let userAnswer = "";
      const expectedAnswer = target === "verb" ? row.verb : row.pronoun;

      const canSwapFirstThird =
        isFirstGroup &&
        currentRule.tense === "present" &&
        (row.pronoun === "je" || row.pronoun === "j'" || row.pronoun === "il / elle");

      const isFirstGroupVerbTarget = isFirstGroup && target === "verb";
      const options = {
        canSwapFirstThirdSingular: canSwapFirstThird,
        expectedEnding: isFirstGroupVerbTarget ? row.parts?.ending : null,
        expectedVerb: isFirstGroupVerbTarget ? row.verb : null,
      };

      if (isInputMode) {
        userAnswer = (inputAnswers[row.id] || "").trim();
        isCorrect = isAnswerCorrect(userAnswer, expectedAnswer, target, options);
      } else {
        const assigned = assignments[row.id];
        userAnswer = assigned ? assigned.text : "";
        isCorrect = isAnswerCorrect(userAnswer, expectedAnswer, target, options);
      }

      if (isCorrect) {
        correct++;
      } else {
        roundMistakes.push({
          id: row.id,
          pronoun: row.pronoun,
          verb: row.verb,
          target,
          parts: row.parts,
          userAnswer:
            isFirstGroupVerbTarget && userAnswer
              ? `${row.parts?.stem || ""}${row.parts?.specialChar || ""}${userAnswer}`
              : userAnswer || "(vide)",
          expectedAnswer: row.verb,
        });
      }
    });

    const finalScore = Math.round((correct / Math.max(1, totalSlots)) * 20);
    setCorrectCount(correct);
    setScore(finalScore);
    setMistakes(roundMistakes);
    setFinished(true);
    clearInteraction();

    if (correct === totalSlots) {
      setMessage("Bravo ! Toutes les conjugaisons sont exactes !");
    } else {
      setMessage(`Tu as obtenu ${correct} sur ${totalSlots} bonnes réponses.`);
    }

    if (student && typeof onComplete === "function") {
      onComplete(finalScore, {
        levelKey: currentLevel,
        levelLabel: currentRule.label,
        verb: isFirstGroup ? activeVerb : currentRule.verb,
        tense: currentRule.tense,
      });
    }
  };

  const handleRestart = () => {
    if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
      return;
    }
    if (isFirstGroupVerb(currentRule.verb) && currentRule.verb === "verbe 1er groupe") {
      const nextVerb = pickRandomVerb(availableVerbs, activeVerb);
      setActiveVerb(nextVerb);
      lastLoadedSignatureRef.current = getRoundSignature(currentLevel, currentRule, nextVerb);
      initRound(currentRule.verb, currentRule, nextVerb);
    } else {
      initRound(currentRule.verb, currentRule, activeVerb);
    }
  };

  const tenseMeta = getTenseMeta(currentRule.tense);
  const displayTitle = getSafeDisplayText(
    parsedContent?.title,
    isFirstGroup
      ? `Conjugaison ${tenseMeta.preposition} : verbes du 1er groupe`
      : `Conjugaison ${tenseMeta.preposition} : être et avoir`
  );
  const displayInstruction = getSafeDisplayText(
    currentRule.instruction || parsedContent?.instruction,
    defaultVerbConjugationActivityContent.instruction
  );

  return (
    <div id="verb-conjugation-activity-root" className="space-y-3 sm:space-y-4">
      <ActivityHero
        idPrefix="verb-conjugation"
        activityContent={parsedContent}
        title={displayTitle}
        instruction={displayInstruction}
        showInstruction={!student}
        showBadges={!student}
        badges={[
          {
            key: "badge-verb",
            label: isFirstGroup ? `Verbe ${displayVerbName} (1er gr.)` : `Verbe ${displayVerbName}`,
            className: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800",
          },
          {
            key: "badge-tense",
            label: tenseMeta.label,
            className: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-sky-100 text-sky-800",
          },
        ]}
        badgesId="verb-conjugation-badges"
        levels={ALLOWED_LEVEL_KEYS.map((key) => ({
          key,
          label: configuredLevels[key].label,
        }))}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        getLevelButtonId={(k) => `verb-conjugation-level-${k}`}
        instructionClassName="block w-full text-sm text-slate-800 sm:text-base"
      />

      {!finished && (
        <ActivityStatus
          id="verb-conjugation-status-panel"
          progressBarId="verb-conjugation-progress-bar"
          progressPercent={progressPercent}
          label="Progression de la conjugaison"
        />
      )}

      {/* Section principale de conjugaison */}
      {!finished && (
        <section
          id="verb-conjugation-section"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div
            id="verb-conjugation-header"
            className="border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-2.5"
          >
            <div
              id="verb-conjugation-header-content"
              className="w-full"
            >
              <div
                id="verb-conjugation-title-group"
                className="flex flex-col gap-0.5 w-full"
              >
                <div
                  id="verb-conjugation-title-row"
                  className="relative flex items-center justify-between"
                >
                  <h4
                    id="verb-conjugation-title"
                    className="text-base sm:text-lg font-bold text-slate-800"
                  >
                    {isFirstGroup ? "Verbe du 1er Groupe" : "Verbe"}
                  </h4>

                  <div
                    id="verb-conjugation-active-verb"
                    className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none"
                  >
                    <span className="text-base sm:text-lg font-black capitalize text-slate-800 tracking-wide">
                      {formattedActiveVerb}
                    </span>
                  </div>
                </div>

                <p
                  id="verb-conjugation-tense-subtitle"
                  className="text-xs sm:text-sm text-slate-500 text-left"
                >
                  {tenseMeta.full}
                </p>
              </div>
            </div>
          </div>

          <div id="verb-conjugation-body" className="p-3 sm:p-4">
            <div
              id="verb-conjugation-board"
              className={`grid grid-cols-1 items-start gap-4 ${isInputMode ? "max-w-xl mx-auto" : "md:grid-cols-12"
                }`}
            >
              {/* Partie Gauche : Liste des conjugaisons à compléter */}
              <div
                id="verb-conjugation-rows-panel"
                className={isInputMode ? "w-full" : "md:col-span-7"}
              >
                <div id="verb-conjugation-rows" className="space-y-2.5 sm:space-y-3">
                  {rows.map((row, index) => {
                    const assigned = assignments[row.id];
                    const isSlotActive = isSlotSelected(row.id);
                    const expectedAnswer = target === "verb" ? row.verb : row.pronoun;
                    const givenAnswer = isInputMode
                      ? (inputAnswers[row.id] || "").trim()
                      : assigned?.text || "";
                    const canSwapFirstThird =
                      isFirstGroup &&
                      currentRule.tense === "present" &&
                      (row.pronoun === "je" || row.pronoun === "j'" || row.pronoun === "il / elle");
                    const isFirstGroupVerbTarget = isFirstGroup && target === "verb";
                    const isRowCorrect =
                      finished &&
                      isAnswerCorrect(givenAnswer, expectedAnswer, target, {
                        canSwapFirstThirdSingular: canSwapFirstThird,
                        expectedEnding: isFirstGroupVerbTarget ? row.parts?.ending : null,
                        expectedVerb: isFirstGroupVerbTarget ? row.verb : null,
                      });

                    return (
                      <div
                        key={row.id}
                        id={`verb-conjugation-row-${index}`}
                        className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap"
                      >
                        {/* CAS 1 : C'est le verbe qu'on complète (Niveaux 1, 2, 4) */}
                        {target === "verb" ? (
                          <>
                            {/* Pronom en VIOLET */}
                            <div
                              id={`verb-conjugation-pronoun-${index}`}
                              className="w-28 sm:w-36 py-2 px-3 sm:px-4 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 font-bold text-base sm:text-lg text-center flex items-center justify-center select-none shadow-xs"
                            >
                              {row.pronoun}
                            </div>

                            {/* Case à remplir pour le Verbe en ROUGE */}
                            {isInputMode ? (
                              <div
                                id={`verb-conjugation-input-container-${index}`}
                                className="relative"
                              >
                                <input
                                  id={`verb-conjugation-input-${index}`}
                                  type="text"
                                  disabled={finished}
                                  value={inputAnswers[row.id] || ""}
                                  onChange={(e) => handleInputChange(row.id, e.target.value)}
                                  placeholder={row.placeholder || "..."}
                                  className={`w-36 sm:w-44 h-11 sm:h-12 rounded-xl text-center font-extrabold text-base sm:text-lg transition-all outline-none ${finished
                                    ? isRowCorrect
                                      ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-bold"
                                      : "bg-rose-50 border-2 border-rose-400 text-rose-700 line-through"
                                    : `border-2 border-red-300 bg-white text-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-200 shadow-xs ${!inputAnswers[row.id]
                                      ? "animate-pulse-slow-red motion-reduce:animate-none"
                                      : ""
                                    }`
                                    }`}
                                />
                              </div>
                            ) : (
                              <PlacementDropZone
                                id={`verb-conjugation-slot-${index}`}
                                onDrop={() => handleDropToSlot(row.id)}
                                onClick={() => handleSlotClick(row.id)}
                                className={`w-36 sm:w-44 h-11 sm:h-12 rounded-xl flex items-center justify-center transition-all ${isSlotActive ? "ring-4 ring-red-400 ring-offset-2" : ""
                                  } ${finished
                                    ? isRowCorrect
                                      ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-bold"
                                      : "bg-rose-50 border-2 border-rose-400 text-rose-700"
                                    : assigned
                                      ? "bg-red-50 border-2 border-red-400 text-red-600 font-extrabold shadow-xs"
                                      : "border-2 border-dashed border-red-300 bg-red-50/20 hover:bg-red-50/40 text-red-400 cursor-pointer"
                                  }`}
                              >
                                {assigned ? (
                                  <div
                                    id={`verb-conjugation-slot-assigned-${index}`}
                                    className="flex items-center justify-between w-full px-3"
                                  >
                                    <div
                                      id={`verb-conjugation-slot-text-${index}`}
                                      className="flex-1 text-center text-base sm:text-lg text-red-600"
                                    >
                                      {isFirstGroup ? (
                                        <ConjugatedVerbText
                                          text={`${row.parts?.stem || ""}${row.parts?.specialChar || ""}${assigned.text}`}
                                          parts={{
                                            stem: row.parts?.stem,
                                            specialChar: row.parts?.specialChar,
                                            ending: assigned.text,
                                          }}
                                        />
                                      ) : (
                                        <span className="font-extrabold">{assigned.text}</span>
                                      )}
                                    </div>
                                    {!finished && (
                                      <button
                                        id={`verb-conjugation-slot-remove-${index}`}
                                        type="button"
                                        onClick={(e) => handleRemoveFromSlot(e, row.id)}
                                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full ml-1"
                                        title="Retirer"
                                        aria-label="Retirer l'étiquette"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span
                                    id={`verb-conjugation-placeholder-${index}`}
                                    className="text-base sm:text-lg font-semibold text-red-400/80 tracking-wide select-none"
                                  >
                                    {row.placeholder || "?"}
                                  </span>
                                )}
                              </PlacementDropZone>
                            )}
                          </>
                        ) : (
                          /* CAS 2 : C'est le pronom qu'on complète (Niveau 3) */
                          <>
                            {/* Case à remplir pour le Pronom en VIOLET */}
                            {isInputMode ? (
                              <div
                                id={`verb-conjugation-input-container-${index}`}
                                className="relative"
                              >
                                <input
                                  id={`verb-conjugation-input-${index}`}
                                  type="text"
                                  disabled={finished}
                                  value={inputAnswers[row.id] || ""}
                                  onChange={(e) => handleInputChange(row.id, e.target.value)}
                                  placeholder="..."
                                  className={`w-36 sm:w-44 h-11 sm:h-12 rounded-xl text-center font-extrabold text-base sm:text-lg transition-all outline-none ${finished
                                    ? isRowCorrect
                                      ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-bold"
                                      : "bg-rose-50 border-2 border-rose-400 text-rose-700 line-through"
                                    : `border-2 border-purple-300 bg-white text-purple-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 shadow-xs ${!inputAnswers[row.id]
                                      ? "animate-pulse-slow-purple motion-reduce:animate-none"
                                      : ""
                                    }`
                                    }`}
                                />
                              </div>
                            ) : (
                              <PlacementDropZone
                                id={`verb-conjugation-slot-${index}`}
                                onDrop={() => handleDropToSlot(row.id)}
                                onClick={() => handleSlotClick(row.id)}
                                className={`w-36 sm:w-44 h-11 sm:h-12 rounded-xl flex items-center justify-center transition-all ${isSlotActive ? "ring-4 ring-purple-400 ring-offset-2" : ""
                                  } ${finished
                                    ? isRowCorrect
                                      ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-bold"
                                      : "bg-rose-50 border-2 border-rose-400 text-rose-700"
                                    : assigned
                                      ? "bg-purple-50 border-2 border-purple-400 text-purple-700 font-extrabold shadow-xs"
                                      : "border-2 border-dashed border-purple-300 bg-purple-50/20 hover:bg-purple-50/40 text-purple-400 cursor-pointer"
                                  }`}
                              >
                                {assigned ? (
                                  <div
                                    id={`verb-conjugation-slot-assigned-${index}`}
                                    className="flex items-center justify-between w-full px-3"
                                  >
                                    <span
                                      id={`verb-conjugation-slot-text-${index}`}
                                      className="flex-1 text-center font-extrabold text-base sm:text-lg text-purple-700"
                                    >
                                      {assigned.text}
                                    </span>
                                    {!finished && (
                                      <button
                                        id={`verb-conjugation-slot-remove-${index}`}
                                        type="button"
                                        onClick={(e) => handleRemoveFromSlot(e, row.id)}
                                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full ml-1"
                                        title="Retirer"
                                        aria-label="Retirer l'étiquette"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span
                                    id={`verb-conjugation-placeholder-${index}`}
                                    className="text-lg font-bold text-purple-400 select-none"
                                  >
                                    ?
                                  </span>
                                )}
                              </PlacementDropZone>
                            )}

                            {/* Verbe en ROUGE */}
                            <div
                              id={`verb-conjugation-verb-${index}`}
                              className="w-28 sm:w-36 py-2 px-3 sm:px-4 rounded-xl bg-red-100 text-red-700 border border-red-200 font-extrabold text-base sm:text-lg text-center flex items-center justify-center select-none shadow-xs"
                            >
                              <ConjugatedVerbText text={row.verb} parts={row.parts} />
                            </div>
                          </>
                        )}

                        {/* Feedback en fin de tour */}
                        {finished && (
                          <div
                            id={`verb-conjugation-feedback-${index}`}
                            className="ml-2 flex items-center gap-1.5 text-sm font-bold"
                          >
                            {isRowCorrect ? (
                              <span
                                id={`verb-conjugation-feedback-correct-${index}`}
                                className="text-emerald-600 text-xl"
                                title="Correct"
                              >
                                ✓
                              </span>
                            ) : (
                              <div
                                id={`verb-conjugation-feedback-incorrect-${index}`}
                                className="flex items-center gap-1 text-xs sm:text-sm font-bold"
                              >
                                <span
                                  id={`verb-conjugation-feedback-cross-${index}`}
                                  className="text-rose-600 text-lg"
                                  title="Incorrect"
                                >
                                  ✗
                                </span>
                                <span
                                  id={`verb-conjugation-feedback-correction-${index}`}
                                  className="text-emerald-700 font-black"
                                >
                                  ➔{" "}
                                  {target === "verb" ? (
                                    <ConjugatedVerbText text={expectedAnswer} parts={row.parts} />
                                  ) : (
                                    expectedAnswer
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Partie Droite : Pool d'étiquettes à placer avec séparateur vertical */}
              {!isInputMode && (
                <section
                  id="verb-conjugation-pool-section"
                  className="md:col-span-5 md:border-l md:border-slate-200 md:pl-4 sm:md:pl-6"
                >
                  <div
                    id="verb-conjugation-pool-header"
                    className="border-b border-slate-100 pb-2 mb-3"
                  >
                    <h5
                      id="verb-conjugation-pool-title"
                      className="text-base font-bold text-slate-800"
                    >
                      étiquettes à placer
                    </h5>
                    <p id="verb-conjugation-pool-subtitle" className="text-xs text-slate-500">
                      {target === "verb"
                        ? isFirstGroup
                          ? "Terminaisons en rouge à placer :"
                          : "Verbes conjugués en rouge à placer :"
                        : "Pronoms en violet à placer :"}
                    </p>
                  </div>

                  <PlacementDropZone
                    id="verb-conjugation-pool-dropzone"
                    onDrop={handleDropToPool}
                    onClick={handlePoolClick}
                    className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3 min-h-[190px] flex items-center justify-center"
                  >
                    {poolItems.length > 0 ? (
                      <div
                        id="verb-conjugation-pool-tiles-grid"
                        className="grid grid-cols-2 gap-2.5 w-fit max-w-full mx-auto justify-center"
                        style={{
                          gridTemplateColumns: `repeat(2, minmax(0, ${poolTileWidth}))`,
                        }}
                      >
                        {poolItems.map((item) => {
                          const isSelected = isPoolItemSelected(item);
                          return (
                            <PlacementTileButton
                              key={item.id}
                              id={`verb-conjugation-pool-tile-${item.id}`}
                              draggable={!finished}
                              onDragStart={() => startDragFromPool(item)}
                              onDragEnd={endDrag}
                              onClick={() => toggleSelectFromPool(item)}
                              isSelected={isSelected}
                              style={{ width: poolTileWidth, maxWidth: "100%" }}
                              className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-base sm:text-lg text-center shadow-xs transition-transform active:scale-95 cursor-grab active:cursor-grabbing ${target === "verb"
                                ? "bg-red-50/80 text-red-600 border-2 border-red-300 hover:border-red-400 hover:bg-red-100 animate-pulse-slow-red motion-reduce:animate-none"
                                : "bg-purple-50/80 text-purple-700 border-2 border-purple-300 hover:border-purple-400 hover:bg-purple-100 animate-pulse-slow-purple motion-reduce:animate-none"
                                }`}
                              selectedClassName={
                                target === "verb"
                                  ? "ring-4 ring-red-400 ring-offset-2 scale-105"
                                  : "ring-4 ring-purple-400 ring-offset-2 scale-105"
                              }
                            >
                              {target === "verb" ? (
                                isFirstGroup ? (
                                  <span>{item.text}</span>
                                ) : (
                                  <ConjugatedVerbText text={item.text} parts={item.parts} />
                                )
                              ) : (
                                item.text
                              )}
                            </PlacementTileButton>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        id="verb-conjugation-pool-empty-message"
                        className="text-center p-3 text-emerald-700 font-bold text-sm"
                      >
                        ✨ Toutes les étiquettes ont été placées ! Clique sur Valider.
                      </div>
                    )}
                  </PlacementDropZone>
                </section>
              )}
            </div>
          </div>
        </section>
      )}

      {showMessage && (
        <div
          id="verb-conjugation-message"
          className={`rounded-2xl border px-3 py-3 sm:px-4 sm:py-4 text-center font-semibold transition-opacity duration-500 ${finished && correctCount === totalSlots
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : finished
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-sky-200 bg-sky-50 text-sky-800"
            } ${fadeMessage ? "opacity-0" : "opacity-100"}`}
        >
          {message}
        </div>
      )}

      {/* Résumé de fin d'activité */}
      {finished && (
        <ActivitySummaryCard
          id="verb-conjugation-summary"
          title="Activité terminée"
          score={score}
          message={`Toutes les conjugaisons du verbe ${displayVerbName} ont été complétées.`}
          stats={[
            { key: "correct", label: "Bonnes réponses", value: correctCount },
            { key: "incorrect", label: "Erreurs", value: totalSlots - correctCount },
            { key: "total", label: "Total", value: totalSlots },
          ]}
        >
          {mistakes.length > 0 && (
            <div
              id="verb-conjugation-summary-errors"
              className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 sm:p-4 text-left"
            >
              <h5
                id="verb-conjugation-summary-errors-title"
                className="mb-2.5 flex items-center gap-2 text-sm font-bold text-rose-800 sm:text-base"
              >
                <span aria-hidden="true">⚠️</span>
                <span>Corrections à retenir ({mistakes.length}) :</span>
              </h5>
              <ul id="verb-conjugation-summary-errors-list" className="space-y-2.5">
                {mistakes.map((mistake, idx) => (
                  <li
                    key={mistake.id || idx}
                    id={`verb-conjugation-summary-error-item-${idx}`}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-white p-2.5 sm:p-3 shadow-xs text-sm sm:text-base"
                  >
                    <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                      {mistake.pronoun}
                    </span>
                    <span className="text-rose-600 line-through font-semibold">
                      {mistake.userAnswer}
                    </span>
                    <span className="text-slate-400" aria-hidden="true">
                      ➔
                    </span>
                    <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {mistake.target === "verb" ? (
                        <ConjugatedVerbText text={mistake.expectedAnswer} parts={mistake.parts} />
                      ) : (
                        mistake.expectedAnswer
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ActivitySummaryCard>
      )}

      {/* Barre d'actions */}
      <ActivityActionsBar
        id="verb-conjugation-actions"
        className="flex flex-wrap justify-center gap-3"
        actions={[
          !finished
            ? {
              id: "verb-conjugation-validate-button",
              onClick: handleValidate,
              disabled: finished,
              ariaLabel: "Valider mes réponses",
              title: "Valider mes réponses",
              icon: "✓",
              srText: "Valider",
              variant: "validate",
            }
            : null,
          {
            id: "verb-conjugation-restart-button",
            onClick: handleRestart,
            disabled: restartLocked,
            ariaLabel: "Recommencer la conjugaison",
            title: "Recommencer",
            icon: "↻",
            srText: "Recommencer",
            variant: allStudentsCompleted ? "warning" : "restart",
          },
        ].filter(Boolean)}
      />
    </div>
  );
};

export default VerbConjugationActivity;
