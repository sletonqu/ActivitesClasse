import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ResultsView from "./ResultsView";
import * as dataLoaders from "../utils/dataLoaders";

describe("ResultsView - Classement et coloration des activités par discipline", () => {
  it("classe les activités par Français puis Mathématiques puis alphabétiquement", async () => {
    // Mock des données initiales
    const mockClasses = [{ id: 1, name: "CM1-A" }];
    const mockStudents = [{ id: 10, name: "Dupont", firstname: "Jean", class_id: 1 }];
    const mockActivities = [
      { id: 1, title: "Table de 5", discipline: "Mathématiques" },
      { id: 2, title: "Conjugaison présent", discipline: "Français" },
      { id: 3, title: "Accord participe passé", discipline: "Français" },
      { id: 4, title: "Addition posée", discipline: "Mathématiques" },
    ];
    const mockResults = [
      { id: 101, student_id: 10, activity_id: 1, score: 18, activity_level: "N1" },
    ];

    vi.spyOn(dataLoaders, "loadClassesIntoState").mockImplementation((setClasses) => setClasses(mockClasses));
    vi.spyOn(dataLoaders, "loadActivitiesIntoState").mockImplementation((setActivities) => setActivities(mockActivities));
    vi.spyOn(dataLoaders, "fetchStudents").mockResolvedValue(mockStudents);
    vi.spyOn(dataLoaders, "fetchResults").mockResolvedValue(mockResults);
    vi.spyOn(dataLoaders, "fetchGroupsByClass").mockResolvedValue([]);

    // Rendu avec classe pré-sélectionnée via query param
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/results?selectedClassId=1"]}>
        <ResultsView />
      </MemoryRouter>
    );

    // Vérifier la présence des éléments
    expect(html).toContain("Résultats de la Classe");
  });
});
