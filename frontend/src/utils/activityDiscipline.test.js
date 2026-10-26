import { describe, expect, it } from "vitest";
import {
  DISCIPLINE_CONFIG,
  DISCIPLINE_THEMES,
  FIXED_DISCIPLINES,
  getActivityDiscipline,
  getDisciplineCategory,
  getDisciplineLabel,
  getDisciplinePriority,
  getDisciplineStyles,
  sortActivityColumns,
} from "./activityDiscipline";

describe("activityDiscipline utils", () => {
  describe("DISCIPLINE_THEMES et DISCIPLINE_CONFIG", () => {
    it("expose les disciplines fixes attendues", () => {
      expect(FIXED_DISCIPLINES).toEqual(["Français", "Mathématiques", "Outils"]);
    });

    it("fournit une configuration pour chaque discipline fixe ainsi que Autres", () => {
      expect(DISCIPLINE_CONFIG["Français"]).toBeDefined();
      expect(DISCIPLINE_CONFIG["Mathématiques"]).toBeDefined();
      expect(DISCIPLINE_CONFIG["Outils"]).toBeDefined();
      expect(DISCIPLINE_CONFIG["Autres"]).toBeDefined();

      expect(DISCIPLINE_CONFIG["Français"].active).toContain("bg-sky-500");
      expect(DISCIPLINE_CONFIG["Mathématiques"].active).toContain("bg-emerald-500");
      expect(DISCIPLINE_CONFIG["Outils"].active).toContain("bg-amber-500");
      expect(DISCIPLINE_CONFIG["Autres"].active).toContain("bg-violet-500");
    });

    it("définit les thèmes resultsTable cohérents", () => {
      expect(DISCIPLINE_THEMES["Français"].resultsTable.headerBg).toContain("bg-sky-100");
      expect(DISCIPLINE_THEMES["Mathématiques"].resultsTable.headerBg).toContain("bg-emerald-100");
      expect(DISCIPLINE_THEMES["Outils"].resultsTable.headerBg).toContain("bg-amber-100");
    });
  });
  describe("getDisciplineCategory", () => {
    it("détecte correctement le français avec ou sans accents et en minuscules", () => {
      expect(getDisciplineCategory("Français")).toBe("francais");
      expect(getDisciplineCategory("francais")).toBe("francais");
      expect(getDisciplineCategory("FRANÇAIS")).toBe("francais");
    });

    it("détecte correctement les mathématiques avec ou sans accents", () => {
      expect(getDisciplineCategory("Mathématiques")).toBe("mathematiques");
      expect(getDisciplineCategory("mathematiques")).toBe("mathematiques");
      expect(getDisciplineCategory("Maths")).toBe("mathematiques");
      expect(getDisciplineCategory("math")).toBe("mathematiques");
    });

    it("classe en autre pour une discipline personnalisée ou vide", () => {
      expect(getDisciplineCategory("Sciences")).toBe("autre");
      expect(getDisciplineCategory("")).toBe("autre");
      expect(getDisciplineCategory(null)).toBe("autre");
    });

    it("détecte correctement la discipline Outils", () => {
      expect(getDisciplineCategory("Outils")).toBe("outils");
      expect(getDisciplineCategory("outils")).toBe("outils");
      expect(getDisciplineCategory("outil")).toBe("outils");
    });
  });

  describe("getActivityDiscipline", () => {
    it("renvoie la discipline explicite de l'activité si elle existe", () => {
      const activity = { id: 1, discipline: "Français", js_file: "SortNumbersActivity.js" };
      expect(getActivityDiscipline(activity)).toBe("Français");
    });

    it("utilise le fallback sur js_file si discipline n'est pas renseignée", () => {
      const mathActivity = { id: 1, js_file: "src/activities/SortNumbersActivity.js" };
      expect(getActivityDiscipline(mathActivity)).toBe("Mathématiques");

      const frenchActivity = { id: 2, js_file: "src/activities/VerbConjugationActivity.js" };
      expect(getActivityDiscipline(frenchActivity)).toBe("Français");

      const toolsActivity = { id: 3, js_file: "src/activities/InteractiveWhiteboardActivity.js" };
      expect(getActivityDiscipline(toolsActivity)).toBe("Outils");
    });

    it("renvoie chaîne vide si ni discipline ni js_file connu", () => {
      expect(getActivityDiscipline({ id: 4 })).toBe("");
    });
  });

  describe("getDisciplinePriority", () => {
    it("attribue 1 pour Français, 2 pour Mathématiques, 3 pour Outils, 4 pour Autre discipline, 5 pour Non renseigné", () => {
      expect(getDisciplinePriority("Français")).toBe(1);
      expect(getDisciplinePriority("Mathématiques")).toBe(2);
      expect(getDisciplinePriority("Outils")).toBe(3);
      expect(getDisciplinePriority("Sciences")).toBe(4);
      expect(getDisciplinePriority("")).toBe(5);
      expect(getDisciplinePriority(null)).toBe(5);
    });
  });

  describe("sortActivityColumns", () => {
    it("trie par Français en premier, puis Mathématiques, puis Outils, puis alphabétiquement dans chaque discipline", () => {
      const columns = [
        { activity: { id: 1, title: "Table d'addition", discipline: "Mathématiques" } },
        { activity: { id: 2, title: "Conjugaison des verbes", discipline: "Français" } },
        { activity: { id: 3, title: "Accord adjectif", discipline: "Français" } },
        { activity: { id: 4, title: "Calcul mental", discipline: "Mathématiques" } },
        { activity: { id: 5, title: "Chronomètre", discipline: "Outils" } },
      ];

      const sorted = sortActivityColumns(columns);

      expect(sorted.map((c) => c.activity.title)).toEqual([
        "Accord adjectif", // Français (alphabétique 1)
        "Conjugaison des verbes", // Français (alphabétique 2)
        "Calcul mental", // Mathématiques (alphabétique 1)
        "Table d'addition", // Mathématiques (alphabétique 2)
        "Chronomètre", // Outils
      ]);
    });

    it("gère les activités sans discipline explicite grâce au fallback js_file", () => {
      const columns = [
        { activity: { id: 1, title: "Fractions", js_file: "src/activities/FractionsVisualSelectionActivity.js" } },
        { activity: { id: 2, title: "Tableau blanc", js_file: "src/activities/InteractiveWhiteboardActivity.js" } },
        { activity: { id: 3, title: "Homophones", js_file: "src/activities/HomophonesActivity.js" } },
      ];

      const sorted = sortActivityColumns(columns);

      expect(sorted[0].activity.title).toBe("Homophones"); // Français
      expect(sorted[1].activity.title).toBe("Fractions"); // Mathématiques
      expect(sorted[2].activity.title).toBe("Tableau blanc"); // Outils
    });
  });

  describe("getDisciplineStyles", () => {
    it("renvoie des classes bleues (sky/blue) pour Français", () => {
      const styles = getDisciplineStyles("Français");
      expect(styles.headerBg).toMatch(/bg-(sky|blue)-100/);
      expect(styles.subHeaderBg).toMatch(/bg-(sky|blue)-50/);
      expect(styles.cellBg).toMatch(/bg-(sky|blue)-50/);
    });

    it("renvoie des classes vertes (emerald/green) pour Mathématiques", () => {
      const styles = getDisciplineStyles("Mathématiques");
      expect(styles.headerBg).toMatch(/bg-(emerald|green)-100/);
      expect(styles.subHeaderBg).toMatch(/bg-(emerald|green)-50/);
      expect(styles.cellBg).toMatch(/bg-(emerald|green)-50/);
    });

    it("renvoie des classes orange/ambre pour Outils comme dans student-header", () => {
      const styles = getDisciplineStyles("Outils");
      expect(styles.headerBg).toContain("bg-amber-100");
      expect(styles.subHeaderBg).toContain("bg-amber-50");
      expect(styles.cellBg).toContain("bg-amber-50");
      expect(styles.badge).toContain("bg-amber-200");
      expect(styles.badge).toContain("text-amber-800");
    });

    it("renvoie des classes pour Autres", () => {
      const styles = getDisciplineStyles("Sciences");
      expect(styles.headerBg).toMatch(/bg-(violet|slate)-100/);
      expect(styles.subHeaderBg).toMatch(/bg-(violet|slate)-50/);
    });
  });

  describe("getDisciplineLabel", () => {
    it("renvoie les labels canoniques pour Français et Mathématiques", () => {
      expect(getDisciplineLabel("francais")).toBe("Français");
      expect(getDisciplineLabel("maths")).toBe("Mathématiques");
      expect(getDisciplineLabel("Outils")).toBe("Outils");
      expect(getDisciplineLabel("")).toBe("");
      expect(getDisciplineLabel(null)).toBe("");
    });
  });

  describe("sortActivityColumns avec accents et majuscules", () => {
    it("respecte l'ordre alphabétique français avec accents", () => {
      const columns = [
        { activity: { id: 1, title: "Écriture de nombres", discipline: "Mathématiques" } },
        { activity: { id: 2, title: "Calcul", discipline: "Mathématiques" } },
        { activity: { id: 3, title: "addition", discipline: "Mathématiques" } },
      ];

      const sorted = sortActivityColumns(columns);
      expect(sorted.map((c) => c.activity.title)).toEqual([
        "addition",
        "Calcul",
        "Écriture de nombres",
      ]);
    });
  });
});
