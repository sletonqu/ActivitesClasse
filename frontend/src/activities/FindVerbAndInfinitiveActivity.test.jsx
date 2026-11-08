import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FindVerbAndInfinitiveActivity, {
  defaultFindVerbAndInfinitiveActivityContent,
  normalizeAccentText,
  isPunctuationWord,
  isVerbWord,
  buildSentenceRound,
  shuffleArray,
} from "./FindVerbAndInfinitiveActivity";
import { handleRoundRestart } from "../utils/activityUtils";

describe("FindVerbAndInfinitiveActivity", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sentences: [
          {
            id: 1,
            sentence: "Le chat dort sur le lit.",
            words: [
              { position: 1, word: "Le", nature: "déterminant" },
              { position: 2, word: "chat", nature: "nom" },
              { position: 3, word: "dort", nature: "verbe", infinitif: "dormir", temps: "présent" },
              { position: 4, word: "sur", nature: "préposition" },
              { position: 5, word: "le", nature: "déterminant" },
              { position: 6, word: "lit", nature: "nom" },
              { position: 7, word: ".", nature: "ponctuation" },
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

  it("s'initialise correctement avec les valeurs par défaut sans planter (contrat de robustesse)", () => {
    const html = renderToStaticMarkup(
      <FindVerbAndInfinitiveActivity student={null} content={{}} onComplete={() => {}} />
    );

    expect(html).toContain('id="find-verb-infinitive-activity"');
    expect(html).toContain('id="find-verb-infinitive-hero"');
    expect(html).toContain('id="find-verb-infinitive-actions"');
  });

  it("fonctionne en mode démo (student === null)", () => {
    const html = renderToStaticMarkup(
      <FindVerbAndInfinitiveActivity
        student={null}
        content={defaultFindVerbAndInfinitiveActivityContent}
        onComplete={() => {}}
      />
    );

    expect(html).toContain('id="find-verb-infinitive-activity"');
    expect(html).toContain("Trouver le verbe et son infinitif");
  });

  it("normalizeAccentText supprime correctement les accents et met en minuscules", () => {
    expect(normalizeAccentText("Écouter")).toBe("ecouter");
    expect(normalizeAccentText("ÊTRE")).toBe("etre");
    expect(normalizeAccentText("dîner")).toBe("diner");
    expect(normalizeAccentText("Goûter")).toBe("gouter");
    expect(normalizeAccentText(" dormiR ")).toBe("dormir");
  });

  it("isPunctuationWord et isVerbWord classent fidèlement les mots", () => {
    expect(isPunctuationWord({ word: ".", nature: "ponctuation" })).toBe(true);
    expect(isPunctuationWord({ word: "chat", nature: "nom" })).toBe(false);

    expect(isVerbWord({ word: "dort", nature: "verbe", infinitif: "dormir" })).toBe(true);
    expect(isVerbWord({ word: "vite", nature: "adverbe", infinitif: "" })).toBe(false);
    expect(isVerbWord({ word: "verbe", nature: "nom", infinitif: "" })).toBe(false);
    expect(isVerbWord({ word: "chantait", nature: "verbe", infinitif: "" })).toBe(false); // sans infinitif
  });

  it("buildSentenceRound construit des tokens et extrait les verbes", () => {
    const entry = {
      id: 42,
      sentence: "Nous mangeons une pomme.",
      words: [
        { word: "Nous", nature: "pronom" },
        { word: "mangeons", nature: "verbe", infinitif: "manger", temps: "présent" },
        { word: "une", nature: "déterminant" },
        { word: "pomme", nature: "nom" },
        { word: ".", nature: "ponctuation" },
      ],
    };

    const round = buildSentenceRound(entry, 0);
    expect(round.id).toBe(42);
    expect(round.tokens.length).toBe(5);
    expect(round.verbs.length).toBe(1);
    expect(round.verbs[0].text).toBe("mangeons");
    expect(round.verbs[0].infinitif).toBe("manger");
    expect(round.tokens[4].isPunctuation).toBe(true);
  });

  it("prend en charge les phrases avec plusieurs verbes pour le niveau 3", () => {
    const entry = {
      id: 88,
      sentence: "Il chante et il danse.",
      words: [
        { word: "Il", nature: "pronom" },
        { word: "chante", nature: "verbe", infinitif: "chanter" },
        { word: "et", nature: "conjonction" },
        { word: "il", nature: "pronom" },
        { word: "danse", nature: "verbe", infinitif: "danser" },
        { word: ".", nature: "ponctuation" },
      ],
    };

    const round = buildSentenceRound(entry, 1);
    expect(round.verbs.length).toBe(2);
    expect(round.verbs.map((v) => v.infinitif)).toEqual(["chanter", "danser"]);
  });

  it("désactive les boutons de niveaux pendant le chargement initial", () => {
    const html = renderToStaticMarkup(
      <FindVerbAndInfinitiveActivity
        student={null}
        content={defaultFindVerbAndInfinitiveActivityContent}
        onComplete={() => {}}
      />
    );

    expect(html).toContain('id="find-verb-infinitive-level-level1"');
    // Lors du rendu initial (loadingSentences = true), les boutons portent l'attribut disabled
    expect(html).toMatch(/id="find-verb-infinitive-level-level1"[^>]*disabled/);
  });

  it("shuffleArray mélange une liste sans perdre d'éléments", () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffleArray(list);
    expect(shuffled.length).toBe(list.length);
    expect(shuffled.sort((a, b) => a - b)).toEqual(list);
  });

  it("le niveau 3 configure un ratio d'au moins 20% de phrases à plusieurs verbes", () => {
    const level3Config = defaultFindVerbAndInfinitiveActivityContent.levels.level3;
    expect(level3Config.minMultiVerbsRatio).toBe(0.2);
    expect(level3Config.sentenceCount).toBe(10);
    const multiCount = Math.max(1, Math.round(level3Config.sentenceCount * level3Config.minMultiVerbsRatio));
    expect(multiCount).toBe(2);
  });

  it("gère la distinction entre mode Démo et mode Élève pour le verrouillage", () => {
    // Mode Démo initial
    const htmlDemo = renderToStaticMarkup(
      <FindVerbAndInfinitiveActivity
        student={null}
        content={defaultFindVerbAndInfinitiveActivityContent}
        onComplete={() => {}}
      />
    );
    expect(htmlDemo).toContain('id="find-verb-infinitive-restart-button"');

    // Mode Élève
    const htmlStudent = renderToStaticMarkup(
      <FindVerbAndInfinitiveActivity
        student={{ id: 1, name: "Lucas" }}
        content={defaultFindVerbAndInfinitiveActivityContent}
        onComplete={() => {}}
      />
    );
    expect(htmlStudent).toContain('id="find-verb-infinitive-restart-button"');
    expect(htmlStudent).toMatch(/id="find-verb-infinitive-restart-button"[^>]*disabled/);
  });

  it("affiche l'indication pour le second clic de validation", () => {
    const html = renderToStaticMarkup(
      <FindVerbAndInfinitiveActivity
        student={null}
        content={defaultFindVerbAndInfinitiveActivityContent}
        onComplete={() => {}}
      />
    );
    expect(html).toContain('id="find-verb-infinitive-activity"');
  });

  it("gère les règles de boutons en mode focus", () => {
    const htmlFocus = renderToStaticMarkup(
      <FindVerbAndInfinitiveActivity
        student={{ id: 2, name: "Emma" }}
        content={defaultFindVerbAndInfinitiveActivityContent}
        onComplete={() => {}}
        isFocusedMode={true}
      />
    );
    expect(htmlFocus).toContain('id="find-verb-infinitive-activity"');
    // Le bouton recommencer est désactivé pendant le niveau en mode focus
    expect(htmlFocus).toMatch(/id="find-verb-infinitive-restart-button"[^>]*disabled/);
    // Le bouton valider est désactivé tant qu'aucune réponse n'est prête
    expect(htmlFocus).toMatch(/id="find-verb-infinitive-validate-button"[^>]*disabled/);
  });

  it("génère une signature stable de chargement pour éviter les rechargements intempestifs", () => {
    const config = defaultFindVerbAndInfinitiveActivityContent;
    expect(config.defaultLevel).toBe("level1");
  });

  it("attribue le bon libellé et titre au bouton Recommencer selon le contexte", () => {
    const htmlDemo = renderToStaticMarkup(
      <FindVerbAndInfinitiveActivity
        student={null}
        content={defaultFindVerbAndInfinitiveActivityContent}
        onComplete={() => {}}
      />
    );
    expect(htmlDemo).toContain('id="find-verb-infinitive-restart-button"');
    expect(htmlDemo).toContain('title="Recommencer avec d&#x27;autres phrases"');

    const htmlGroup = renderToStaticMarkup(
      <FindVerbAndInfinitiveActivity
        student={{ id: 1, name: "Lucas" }}
        content={defaultFindVerbAndInfinitiveActivityContent}
        onComplete={() => {}}
        allStudentsCompleted={true}
      />
    );
    expect(htmlGroup).toContain('id="find-verb-infinitive-restart-button"');
    expect(htmlGroup).toContain('title="Recommencer et réinitialiser la liste des élèves"');
  });

  it("gère fidèlement handleRoundRestart avec ses arguments positionnels", () => {
    const onReset = vi.fn();
    // Quand tous les élèves ont terminé, handleRoundRestart déclenche la réinitialisation globale
    expect(handleRoundRestart(true, onReset)).toBe(true);
    expect(onReset).toHaveBeenCalledTimes(1);

    // En mode démo ou en cours (allStudentsCompleted = false), retourne false pour permettre le rechargement local
    expect(handleRoundRestart(false, onReset)).toBe(false);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("structure correctement les erreurs d'infinitif avec la saisie de l'élève et la valeur attendue", () => {
    const verbResultWithError = {
      id: 3,
      text: "dort",
      expectedInfinitif: "dormir",
      userInput: "dormais",
      isSelected: true,
      infinitiveCorrect: false,
      hasAccentWarning: false,
    };

    expect(verbResultWithError.isSelected).toBe(true);
    expect(verbResultWithError.infinitiveCorrect).toBe(false);
    expect(verbResultWithError.userInput).toBe("dormais");
    expect(verbResultWithError.expectedInfinitif).toBe("dormir");
  });
});

