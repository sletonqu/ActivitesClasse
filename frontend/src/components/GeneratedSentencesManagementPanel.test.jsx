import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GeneratedSentencesManagementPanel from "./GeneratedSentencesManagementPanel";

describe("GeneratedSentencesManagementPanel", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 1,
        sentences: [
          {
            id: 1,
            sentence: "Le renard marchait dans la forêt.",
            level: "CE1",
            theme: "animaux",
            compteur: 0,
            provider: "gemini",
            model: "gemini-2.5-flash",
            created_at: "2026-10-24T12:00:00Z",
            words: [
              { word: "marchait", nature: "verbe", temps: "imparfait", infinitif: "marcher" },
            ],
          },
        ],
      }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rend le formulaire de filtres avec tous les champs requis pour les activités", () => {
    const html = renderToStaticMarkup(<GeneratedSentencesManagementPanel />);

    // Formulaire
    expect(html).toContain('id="generated-sentences-management-filters"');

    // Filtres généraux
    expect(html).toContain('id="generated-sentences-level-filter"');
    expect(html).toContain('id="generated-sentences-theme-filter"');
    expect(html).toContain('id="generated-sentences-search-filter"');
    expect(html).toContain('id="generated-sentences-sort-order"');

    // Filtres spécifiques aux requêtes d'activités
    expect(html).toContain('id="generated-sentences-tense-filter"');
    expect(html).toContain('id="generated-sentences-infinitive-filter"');
    expect(html).toContain('id="generated-sentences-endings-filter"');
    expect(html).toContain('id="generated-sentences-words-filter"');
    expect(html).toContain('id="generated-sentences-natures-filter"');

    // Boutons de filtrage
    expect(html).toContain('id="generated-sentences-apply-filters-button"');
    expect(html).toContain('id="generated-sentences-reset-filters-button"');
    expect(html).toContain("Effacer les filtres");
  });

  it("propose les options de temps verbaux courantes dans le sélecteur", () => {
    const html = renderToStaticMarkup(<GeneratedSentencesManagementPanel />);

    expect(html).toContain("Tous les temps");
    expect(html).toContain("Présent");
    expect(html).toContain("Imparfait");
    expect(html).toContain("Futur");
    expect(html).toContain("Passé composé");
  });
});
