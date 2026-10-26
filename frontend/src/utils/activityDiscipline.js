/**
 * Utilitaires et thèmes centralisés pour les disciplines d'activités
 */

export const FIXED_DISCIPLINES = ["Français", "Mathématiques", "Outils"];

export const KNOWN_ACTIVITY_DISCIPLINES = {
  // Français
  WordClassificationActivity: "Français",
  SentenceWordClassificationActivity: "Français",
  AlphabeticalSortActivity: "Français",
  VerbEndingCompletionActivity: "Français",
  HomophonesActivity: "Français",
  VerbConjugationActivity: "Français",

  // Mathématiques
  BaseTenBlocksActivity: "Mathématiques",
  SortNumbersActivity: "Mathématiques",
  MatchAdditionsActivity: "Mathématiques",
  CountPencilsByTensActivity: "Mathématiques",
  CompareNumbersActivity: "Mathématiques",
  FractionsVisualSelectionActivity: "Mathématiques",
  ReadNumbersActivity: "Mathématiques",
  MakeChangeActivity: "Mathématiques",
  EvenOddClassificationActivity: "Mathématiques",
  NumberLineActivity: "Mathématiques",
  ColumnOperationActivity: "Mathématiques",

  // Outils
  InteractiveWhiteboardActivity: "Outils",
  ClassSoundMeterActivity: "Outils",
  CodeJuniorActivity: "Outils",
};

/**
 * Configuration centralisée des thèmes de couleurs par discipline.
 * Source unique de vérité pour :
 * - studentHeader : styles des boutons et listes déroulantes de student-header (StudentView)
 * - resultsTable  : styles des en-têtes et cellules de ResultsView
 */
export const DISCIPLINE_THEMES = {
  "Français": {
    key: "francais",
    label: "Français",
    studentHeader: {
      inactive: "bg-sky-50/30 text-sky-600 border-sky-100 hover:bg-sky-100/40",
      active: "bg-sky-500 text-white border-sky-500 shadow-sm",
      dropdown: "bg-white border-sky-200",
      item: "text-sky-600 hover:bg-sky-100/40",
      itemSelected: "bg-sky-500 text-white",
    },
    resultsTable: {
      headerBg: "bg-sky-100 border-sky-200",
      headerText: "text-sky-900 hover:text-sky-700",
      subHeaderBg: "bg-sky-50 text-sky-800 border-sky-200",
      cellBg: "bg-sky-50/30 border-sky-200",
      badge: "bg-sky-200 text-sky-800",
    },
  },
  "Mathématiques": {
    key: "mathematiques",
    label: "Mathématiques",
    studentHeader: {
      inactive: "bg-emerald-50/30 text-emerald-600 border-emerald-100 hover:bg-emerald-100/40",
      active: "bg-emerald-500 text-white border-emerald-500 shadow-sm",
      dropdown: "bg-white border-emerald-200",
      item: "text-emerald-600 hover:bg-emerald-100/40",
      itemSelected: "bg-emerald-500 text-white",
    },
    resultsTable: {
      headerBg: "bg-emerald-100 border-emerald-200",
      headerText: "text-emerald-900 hover:text-emerald-700",
      subHeaderBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      cellBg: "bg-emerald-50/30 border-emerald-200",
      badge: "bg-emerald-200 text-emerald-800",
    },
  },
  "Outils": {
    key: "outils",
    label: "Outils",
    studentHeader: {
      inactive: "bg-amber-50/30 text-amber-600 border-amber-100 hover:bg-amber-100/40",
      active: "bg-amber-500 text-white border-amber-500 shadow-sm",
      dropdown: "bg-white border-amber-200",
      item: "text-amber-600 hover:bg-amber-100/40",
      itemSelected: "bg-amber-500 text-white",
    },
    resultsTable: {
      headerBg: "bg-amber-100 border-amber-200",
      headerText: "text-amber-900 hover:text-amber-700",
      subHeaderBg: "bg-amber-50 text-amber-800 border-amber-200",
      cellBg: "bg-amber-50/30 border-amber-200",
      badge: "bg-amber-200 text-amber-800",
    },
  },
  "Autres": {
    key: "autre",
    label: "Autres",
    studentHeader: {
      inactive: "bg-violet-50/30 text-violet-600 border-violet-100 hover:bg-violet-100/40",
      active: "bg-violet-500 text-white border-violet-500 shadow-sm",
      dropdown: "bg-white border-violet-200",
      item: "text-violet-600 hover:bg-violet-100/40",
      itemSelected: "bg-violet-500 text-white",
    },
    resultsTable: {
      headerBg: "bg-violet-100 border-violet-200",
      headerText: "text-violet-900 hover:text-violet-700",
      subHeaderBg: "bg-violet-50 text-violet-800 border-violet-200",
      cellBg: "bg-violet-50/30 border-violet-200",
      badge: "bg-violet-200 text-violet-800",
    },
  },
};

/**
 * Format d'accès direct pour StudentView (student-header)
 */
export const DISCIPLINE_CONFIG = Object.fromEntries(
  Object.entries(DISCIPLINE_THEMES).map(([name, theme]) => [name, theme.studentHeader])
);

/**
 * Récupère la discipline d'une activité, avec fallback sur son fichier JS si non renseignée
 */
export const getActivityDiscipline = (activity) => {
  if (activity?.discipline && String(activity.discipline).trim()) {
    return String(activity.discipline).trim();
  }

  if (activity?.js_file) {
    const fileName = activity.js_file.split("/").pop().replace(/\.(js|jsx)$/, "");
    if (KNOWN_ACTIVITY_DISCIPLINES[fileName]) {
      return KNOWN_ACTIVITY_DISCIPLINES[fileName];
    }
  }

  return "";
};

/**
 * Catégorise la discipline de façon normalisée (francais, mathematiques, outils, autre)
 */
export const getDisciplineCategory = (discipline) => {
  if (!discipline) return "autre";
  const normalized = String(discipline)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "francais") return "francais";
  if (
    normalized === "mathematiques" ||
    normalized === "mathematique" ||
    normalized === "maths" ||
    normalized === "math"
  ) {
    return "mathematiques";
  }
  if (normalized === "outils" || normalized === "outil") {
    return "outils";
  }
  return "autre";
};

/**
 * Formate le label lisible d'une discipline
 */
export const getDisciplineLabel = (discipline) => {
  const category = getDisciplineCategory(discipline);
  if (category === "francais") return "Français";
  if (category === "mathematiques") return "Mathématiques";
  if (category === "outils") return "Outils";
  return discipline ? String(discipline).trim() : "";
};

/**
 * Détermine la priorité d'ordonnancement pour une discipline :
 * 1: Français
 * 2: Mathématiques
 * 3: Outils (comme dans student-header)
 * 4: Autres disciplines définies
 * 5: Sans discipline
 */
export const getDisciplinePriority = (discipline) => {
  const category = getDisciplineCategory(discipline);
  if (category === "francais") return 1;
  if (category === "mathematiques") return 2;
  if (category === "outils") return 3;
  if (discipline && String(discipline).trim()) return 4;
  return 5;
};

/**
 * Trie les colonnes d'activités :
 * - d'abord par discipline : Français, puis Mathématiques, puis Outils, puis autres disciplines, puis non renseignées
 * - puis par ordre alphabétique dans chacune des disciplines
 */
export const sortActivityColumns = (columns) => {
  return [...columns].sort((colA, colB) => {
    const discA = getActivityDiscipline(colA.activity);
    const discB = getActivityDiscipline(colB.activity);
    const prioA = getDisciplinePriority(discA);
    const prioB = getDisciplinePriority(discB);

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    if (prioA === 4) {
      const discComp = discA.localeCompare(discB, "fr", { sensitivity: "base" });
      if (discComp !== 0) return discComp;
    }

    const titleA = String(colA.activity?.title || "");
    const titleB = String(colB.activity?.title || "");
    return titleA.localeCompare(titleB, "fr", { sensitivity: "base" });
  });
};

/**
 * Fournit les classes Tailwind de styling pour une discipline dans le tableau de résultats
 */
export const getDisciplineStyles = (discipline) => {
  const category = getDisciplineCategory(discipline);
  if (category === "francais") {
    return {
      category,
      ...DISCIPLINE_THEMES["Français"].resultsTable,
    };
  }
  if (category === "mathematiques") {
    return {
      category,
      ...DISCIPLINE_THEMES["Mathématiques"].resultsTable,
    };
  }
  if (category === "outils") {
    return {
      category,
      ...DISCIPLINE_THEMES["Outils"].resultsTable,
    };
  }
  return {
    category,
    ...DISCIPLINE_THEMES["Autres"].resultsTable,
  };
};
