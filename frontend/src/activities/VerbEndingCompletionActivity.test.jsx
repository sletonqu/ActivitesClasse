import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VerbEndingCompletionActivity, { buildVerbRound } from "./VerbEndingCompletionActivity";
import ActivitySummaryCard from "../components/ActivitySummaryCard";

describe("VerbEndingCompletionActivity", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sentences: [
          {
            id: 1,
            sentence: "Les oiseaux chantent dans le jardin.",
            words: [
              { word: "Les", nature: "déterminant" },
              { word: "oiseaux", nature: "nom" },
              { word: "chantent", nature: "verbe" },
              { word: "dans", nature: "préposition" },
              { word: "le", nature: "déterminant" },
              { word: "jardin.", nature: "nom" },
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

  it("s'initialise correctement avec les valeurs par défaut sans planter", () => {
    const html = renderToStaticMarkup(
      <VerbEndingCompletionActivity student={null} content={{}} onComplete={() => {}} />
    );

    expect(html).toContain('id="verb-ending-completion-activity-root"');
    expect(html).toContain('id="verb-ending-completion-hero"');
  });

  it("buildVerbRound identifie correctement le verbe et crée le blanc de terminaison", () => {
    const sentenceEntry = {
      id: 10,
      sentence: "Tu chantes bien.",
      words: [
        { word: "Tu", nature: "pronom" },
        { word: "chantes", nature: "verbe" },
        { word: "bien.", nature: "adverbe" },
      ],
    };
    const round = buildVerbRound(sentenceEntry, 0, ["es", "ent"]);

    expect(round).not.toBeNull();
    expect(round.correctEnding).toBe("es");
    expect(round.baseForm).toBe("chant");
    expect(round.wordText).toBe("chantes");
    expect(round.displayTokens[1].isVerb).toBe(true);
    expect(round.displayTokens[1].correctEnding).toBe("es");
    expect(round.displayTokens[0].isVerb).toBe(false);
  });

  it("affiche la liste des phrases erronées dans verb-ending-completion-summary", () => {
    const mistakes = [
      {
        id: "phrase-1",
        sentenceText: "Les oiseaux chantent dans le jardin.",
        selectedEnding: "es",
        correctEnding: "ent",
        baseForm: "chant",
        wordText: "chantent",
        displayTokens: [
          { id: "w1", text: "Les", isVerb: false },
          { id: "w2", text: "oiseaux", isVerb: false },
          { id: "v1", text: "chant....", isVerb: true, correctEnding: "ent" },
          { id: "w3", text: "dans", isVerb: false },
          { id: "w4", text: "le", isVerb: false },
          { id: "w5", text: "jardin.", isVerb: false },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <ActivitySummaryCard
        id="verb-ending-completion-summary"
        title="Activité terminée"
        score={15}
        message="Toutes les phrases ont été complétées."
        stats={[
          { key: "correct", label: "Bonnes réponses", value: 3 },
          { key: "incorrect", label: "Erreurs", value: 1 },
          { key: "total", label: "Phrases", value: 4 },
        ]}
      >
        <div id="verb-ending-summary-errors" className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 sm:p-4 text-left">
          <h5 id="verb-ending-summary-errors-title" className="mb-2.5 flex items-center gap-2 text-sm font-bold text-rose-800 sm:text-base">
            <span aria-hidden="true">⚠️</span>
            <span>Phrases avec erreurs ({mistakes.length}) :</span>
          </h5>
          <ul id="verb-ending-summary-errors-list" className="space-y-2.5">
            {mistakes.map((mistake, index) => (
              <li
                key={mistake.id || index}
                id={`verb-ending-summary-error-item-${index}`}
                className="rounded-xl border border-rose-200 bg-white p-2.5 sm:p-3 shadow-xs"
              >
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium text-slate-800 sm:text-base">
                  <span className="mr-0.5 font-bold text-slate-400">{index + 1}.</span>
                  {mistake.displayTokens.map((token, tIdx) => {
                    if (token.isVerb) {
                      return (
                        <span
                          key={token.id || tIdx}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold sm:text-sm"
                        >
                          <span className="text-rose-600 line-through decoration-2">
                            {mistake.baseForm}{mistake.selectedEnding}
                          </span>
                          <span className="text-slate-400" aria-hidden="true">➔</span>
                          <span className="font-extrabold text-emerald-700">
                            {mistake.wordText}
                          </span>
                        </span>
                      );
                    }
                    return (
                      <span key={token.id || tIdx} className="text-slate-800">
                        {token.text}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </ActivitySummaryCard>
    );

    expect(html).toContain('id="verb-ending-completion-summary"');
    expect(html).toContain('id="verb-ending-summary-errors"');
    expect(html).toContain('id="verb-ending-summary-errors-title"');
    expect(html).toContain('id="verb-ending-summary-errors-list"');
    expect(html).toContain('id="verb-ending-summary-error-item-0"');
    expect(html).toContain("chantes");
    expect(html).toContain("chantent");
    expect(html).toContain("Phrases avec erreurs (1) :");
  });

  it("filtre selon la terminaison de l'infinitif (infinitiveEnding) quand l'infinitif est présent", () => {
    const sentenceWithErAndIr = {
      id: 20,
      sentence: "Nous mangeons pendant qu'il court.",
      words: [
        { word: "Nous", nature: "pronom" },
        { word: "mangeons", nature: "verbe", infinitif: "manger" },
        { word: "pendant", nature: "préposition" },
        { word: "qu'", nature: "conjonction" },
        { word: "il", nature: "pronom" },
        { word: "court", nature: "verbe", infinitif: "courir" },
        { word: ".", nature: "ponctuation" },
      ],
    };

    // Cherche les verbes en 'er' avec terminaisons 'e', 'ons'
    const roundEr = buildVerbRound(sentenceWithErAndIr, 0, ["e", "ons"], "er");
    expect(roundEr).not.toBeNull();
    expect(roundEr.wordText).toBe("mangeons");
    expect(roundEr.correctEnding).toBe("ons");
    expect(roundEr.baseForm).toBe("mange");

    // Cherche les verbes en 'ir' avec terminaisons 't'
    const roundIr = buildVerbRound(sentenceWithErAndIr, 0, ["t"], "ir");
    expect(roundIr).not.toBeNull();
    expect(roundIr.wordText).toBe("court");
    expect(roundIr.correctEnding).toBe("t");
    expect(roundIr.baseForm).toBe("cour");

    // Si on cherche un verbe en 'er' avec seulement terminaison 't' (qui correspond à courir, pas manger) => doit retourner null
    const roundMismatch = buildVerbRound(sentenceWithErAndIr, 0, ["t"], "er");
    expect(roundMismatch).toBeNull();
  });

  it("affiche le badge d'infinitif et les terminaisons de verbes conjugués dans le hero", () => {
    const content = {
      infinitiveEnding: "ir",
      levels: {
        level1: {
          label: "Niveau 1",
          sentenceCount: 4,
          conjugatedEndings: ["is", "it"],
        },
      },
    };

    const html = renderToStaticMarkup(
      <VerbEndingCompletionActivity student={null} content={content} onComplete={() => {}} />
    );

    expect(html).toContain("Infinitif en -ir");
    expect(html).toContain(">is</span>");
    expect(html).toContain(">it</span>");
  });

  it("ignore l'ancien paramètre endings et utilise uniquement conjugatedEndings", () => {
    const content = {
      infinitiveEnding: "er",
      levels: {
        level1: {
          label: "Niveau 1",
          sentenceCount: 4,
          endings: ["xyz", "abc"],
        },
      },
    };

    const html = renderToStaticMarkup(
      <VerbEndingCompletionActivity student={null} content={content} onComplete={() => {}} />
    );

    expect(html).not.toContain(">xyz</span>");
    expect(html).not.toContain(">abc</span>");
    expect(html).toContain(">es</span>");
    expect(html).toContain(">ent</span>");
  });
});
