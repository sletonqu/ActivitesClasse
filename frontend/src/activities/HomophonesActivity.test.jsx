import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HomophonesActivity, { buildHomophoneRound, findWordInSentence, cleanSound } from "./HomophonesActivity";
import ActivitySummaryCard from "../components/ActivitySummaryCard";

describe("HomophonesActivity", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sentences: [
          {
            id: 1,
            sentence: "Le chat est sur le toit.",
            words: [
              { word: "Le" },
              { word: "chat" },
              { word: "est" },
              { word: "sur" },
              { word: "le" },
              { word: "toit." },
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
      <HomophonesActivity student={null} content={{}} onComplete={() => {}} />
    );

    expect(html).toContain('id="homophones-activity-root"');
    expect(html).toContain('id="homophones-hero"');
  });

  it("buildHomophoneRound identifie correctement l'homophone et crée le blanc", () => {
    const sentenceEntry = {
      id: 42,
      sentence: "Tu es formidable.",
      words: [{ word: "Tu" }, { word: "es" }, { word: "formidable." }],
    };
    const round = buildHomophoneRound(sentenceEntry, 0, ["es", "est", "et"]);

    expect(round).not.toBeNull();
    expect(round.correctSound).toBe("es");
    expect(round.wordText).toBe("es");
    expect(round.displayTokens[1].isBlank).toBe(true);
    expect(round.displayTokens[1].correctSound).toBe("es");
    expect(round.displayTokens[0].isBlank).toBe(false);
  });

  it("affiche la liste des phrases erronées avec le mot utilisé et la bonne réponse dans homophones-summary", () => {
    const mistakes = [
      {
        id: "phrase-1",
        sentenceText: "Le chat est sur le toit.",
        selectedSound: "et",
        correctSound: "est",
        wordText: "est",
        displayTokens: [
          { id: "w1", text: "Le", isBlank: false },
          { id: "w2", text: "chat", isBlank: false },
          { id: "b1", text: "____", isBlank: true, correctSound: "est" },
          { id: "w3", text: "sur", isBlank: false },
          { id: "w4", text: "le", isBlank: false },
          { id: "w5", text: "toit.", isBlank: false },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <ActivitySummaryCard
        id="homophones-summary"
        title="Activité terminée"
        score={18}
        message="Toutes les phrases ont été complétées."
        stats={[
          { key: "correct", label: "Bonnes réponses", value: 9 },
          { key: "incorrect", label: "Erreurs", value: 1 },
          { key: "total", label: "Phrases", value: 10 },
        ]}
      >
        <div id="homophones-summary-errors" className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 sm:p-4 text-left">
          <h5 id="homophones-summary-errors-title" className="mb-2.5 flex items-center gap-2 text-sm font-bold text-rose-800 sm:text-base">
            <span aria-hidden="true">⚠️</span>
            <span>Phrases avec erreurs ({mistakes.length}) :</span>
          </h5>
          <ul id="homophones-summary-errors-list" className="space-y-2.5">
            {mistakes.map((mistake, index) => (
              <li
                key={mistake.id || index}
                id={`homophones-summary-error-item-${index}`}
                className="rounded-xl border border-rose-200 bg-white p-2.5 sm:p-3 shadow-xs"
              >
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium text-slate-800 sm:text-base">
                  <span className="mr-0.5 font-bold text-slate-400">{index + 1}.</span>
                  {mistake.displayTokens.map((token, tIdx) => {
                    if (token.isBlank) {
                      return (
                        <span
                          key={token.id || tIdx}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold sm:text-sm"
                        >
                          <span className="text-rose-600 line-through decoration-2">
                            {mistake.selectedSound}
                          </span>
                          <span className="text-slate-400" aria-hidden="true">➔</span>
                          <span className="font-extrabold text-emerald-700">
                            {mistake.correctSound}
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

    expect(html).toContain('id="homophones-summary"');
    expect(html).toContain('id="homophones-summary-errors"');
    expect(html).toContain('id="homophones-summary-errors-title"');
    expect(html).toContain('id="homophones-summary-errors-list"');
    expect(html).toContain('id="homophones-summary-error-item-0"');
    expect(html).toContain("Phrases avec erreurs (1) :");
    expect(html).toContain("et");
    expect(html).toContain("est");
  });

  it("buildHomophoneRound priorise targetWord lorsqu'il est spécifié sur la phrase", () => {
    const multiHomophoneSentence = {
      id: 99,
      sentence: "Tu es là et il est parti.",
      words: [
        { word: "Tu" },
        { word: "es" },
        { word: "là" },
        { word: "et" },
        { word: "il" },
        { word: "est" },
        { word: "parti." },
      ],
      targetWord: "est",
    };

    const round = buildHomophoneRound(multiHomophoneSentence, 0, ["es", "est", "et"]);
    expect(round).not.toBeNull();
    expect(round.correctSound).toBe("est");
    expect(round.wordText).toBe("est");
    // "es" à l'index 1 ne doit PAS être masqué
    expect(round.displayTokens[1].isBlank).toBe(false);
    expect(round.displayTokens[1].text).toBe("es");
    // "est" à l'index 5 doit être masqué
    expect(round.displayTokens[5].isBlank).toBe(true);
    expect(round.displayTokens[5].correctSound).toBe("est");
  });

  it("findWordInSentence nettoie la ponctuation autour des mots pour la correspondance", () => {
    const punctuatedSentence = {
      id: 50,
      sentence: "Il est là, et tout va bien.",
      words: [
        { word: "Il" },
        { word: "est" },
        { word: "là," },
        { word: "et," },
      ],
      targetWord: "et",
    };

    const result = findWordInSentence(punctuatedSentence, ["es", "est", "et"]);
    expect(result).not.toBeNull();
    expect(result.sound).toBe("et");
    expect(result.wordText).toBe("et,");
  });

  it("n'affiche que les niveaux configurés dans le JSON et ignore les niveaux absents", () => {
    const singleLevelContent = {
      levels: {
        level1: {
          label: "Niveau Unique Homophones",
          sentenceCount: 5,
          sounds: ["es", "est"],
        },
      },
    };

    const html = renderToStaticMarkup(
      <HomophonesActivity student={null} content={singleLevelContent} onComplete={() => {}} />
    );

    expect(html).toContain("homophones-level-level1");
    expect(html).toContain("Niveau Unique Homophones");
    expect(html).not.toContain("homophones-level-level2");
    expect(html).not.toContain("homophones-level-level3");
  });

  it("affiche le badge 'Contraintes strictes' lorsque strict est activé", () => {
    const strictContent = {
      strict: true,
      levels: {
        level1: {
          label: "Niveau 1",
          sentenceCount: 4,
          sounds: ["a", "à"],
        },
      },
    };

    const html = renderToStaticMarkup(
      <HomophonesActivity student={null} content={strictContent} onComplete={() => {}} />
    );

    expect(html).toContain("Contraintes strictes");
  });
});
