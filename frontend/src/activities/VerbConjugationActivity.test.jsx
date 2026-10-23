import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VerbConjugationActivity, {
  defaultVerbConjugationActivityContent,
  isAnswerCorrect,
  normalizeVerbKey,
  normalizeTenseKey,
  getConjugationList,
  normalizeTarget,
  normalizeMode,
  CONJUGATION_TABLE,
} from "./VerbConjugationActivity";

describe("VerbConjugationActivity", () => {
  it("s'initialise correctement avec un content vide sans planter", () => {
    const html = renderToStaticMarkup(
      <VerbConjugationActivity student={null} content={{}} onComplete={() => {}} />
    );

    expect(html).toContain('id="verb-conjugation-activity-root"');
    expect(html).toContain('id="verb-conjugation-hero"');
    expect(html).toContain('id="verb-conjugation-board"');
    expect(html).toContain('id="verb-conjugation-section"');
    expect(html).toContain('id="verb-conjugation-pool-section"');
  });

  it("génère les 6 personnes canoniques pour être et avoir au présent, futur et imparfait", () => {
    // Présent
    expect(CONJUGATION_TABLE.être).toHaveLength(6);
    expect(CONJUGATION_TABLE.avoir).toHaveLength(6);
    expect(CONJUGATION_TABLE.être.present.map((i) => i.verb)).toEqual([
      "suis", "es", "est", "sommes", "êtes", "sont",
    ]);
    expect(CONJUGATION_TABLE.avoir.present.map((i) => i.verb)).toEqual([
      "ai", "as", "a", "avons", "avez", "ont",
    ]);

    // Futur
    expect(CONJUGATION_TABLE.être.futur.map((i) => i.verb)).toEqual([
      "serai", "seras", "sera", "serons", "serez", "seront",
    ]);
    expect(CONJUGATION_TABLE.avoir.futur.map((i) => i.verb)).toEqual([
      "aurai", "auras", "aura", "aurons", "aurez", "auront",
    ]);

    // Imparfait
    expect(CONJUGATION_TABLE.être.imparfait.map((i) => i.verb)).toEqual([
      "étais", "étais", "était", "étions", "étiez", "étaient",
    ]);
    expect(CONJUGATION_TABLE.avoir.imparfait.map((i) => i.verb)).toEqual([
      "avais", "avais", "avait", "avions", "aviez", "avaient",
    ]);

    // Helper getConjugationList
    expect(getConjugationList("être", "futur")).toHaveLength(6);
    expect(getConjugationList("avoir", "imparfait")).toHaveLength(6);
  });

  it("normalise correctement les verbes, temps, cibles et modes", () => {
    expect(normalizeVerbKey("ETRE")).toBe("être");
    expect(normalizeVerbKey("etre")).toBe("être");
    expect(normalizeVerbKey("avoir")).toBe("avoir");
    expect(normalizeVerbKey("Avoir")).toBe("avoir");
    expect(normalizeVerbKey("inconnu")).toBe("être");

    expect(normalizeTenseKey("present")).toBe("present");
    expect(normalizeTenseKey("présent")).toBe("present");
    expect(normalizeTenseKey("futur")).toBe("futur");
    expect(normalizeTenseKey("future")).toBe("futur");
    expect(normalizeTenseKey("imparfait")).toBe("imparfait");
    expect(normalizeTenseKey("imperfect")).toBe("imparfait");
    expect(normalizeTenseKey("inconnu")).toBe("present");

    expect(normalizeTarget("verb")).toBe("verb");
    expect(normalizeTarget("pronoun")).toBe("pronoun");
    expect(normalizeTarget("pronom")).toBe("pronoun");

    expect(normalizeMode("drag")).toBe("drag");
    expect(normalizeMode("input")).toBe("input");
    expect(normalizeMode("ecrire")).toBe("input");
  });

  it("isAnswerCorrect valide les réponses exactes et gère les accents", () => {
    expect(isAnswerCorrect("suis", "suis", "verb")).toBe(true);
    expect(isAnswerCorrect(" SUIS ", "suis", "verb")).toBe(true);
    // Tolérance circonflexe pour les élèves
    expect(isAnswerCorrect("etes", "êtes", "verb")).toBe(true);
    expect(isAnswerCorrect("êtes", "êtes", "verb")).toBe(true);
    expect(isAnswerCorrect("sommes", "suis", "verb")).toBe(false);

    // Cible pronom
    expect(isAnswerCorrect("tu", "tu", "pronoun")).toBe(true);
    expect(isAnswerCorrect("il", "il / elle", "pronoun")).toBe(true);
    expect(isAnswerCorrect("elle", "il / elle", "pronoun")).toBe(true);
    expect(isAnswerCorrect("ils", "ils / elles", "pronoun")).toBe(true);
    expect(isAnswerCorrect("j'", "j'", "pronoun")).toBe(true);
  });

  it("Niveau 1 : affiche les pronoms en violet et les étiquettes de verbes en rouge avec pulsation", () => {
    const html = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{ defaultLevel: "level1" }}
        onComplete={() => {}}
      />
    );

    // Pronoms en violet
    expect(html).toContain("text-purple-800");
    expect(html).toContain("bg-purple-100");

    // Étiquettes verbes en rouge dans le pool avec animation pulsation
    expect(html).toContain("text-red-600");
    expect(html).toContain("animate-pulse-slow-red");

    // Ordre canonique niveau 1
    expect(html).toContain("je");
    expect(html).toContain("tu");
    expect(html).toContain("il / elle");
    expect(html).toContain("nous");
    expect(html).toContain("vous");
    expect(html).toContain("ils / elles");

    // Emplacements vides avec "?" et pas de "[ à placer ]", pas d'émoji étiquette
    expect(html).toContain("?");
    expect(html).not.toContain("[ à placer ]");
    expect(html).not.toContain("🏷️");
  });

  it("Niveau 3 : affiche les verbes en rouge et les étiquettes pronoms en violet avec pulsation", () => {
    const html = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{ defaultLevel: "level3" }}
        onComplete={() => {}}
      />
    );

    // Verbes en rouge
    expect(html).toContain("text-red-700");
    expect(html).toContain("bg-red-100");

    // Étiquettes de pronoms en violet dans le pool avec pulsation violette
    expect(html).toContain("text-purple-700");
    expect(html).toContain("animate-pulse-slow-purple");
  });

  it("Niveau 4 : mode saisie au clavier, affiche des inputs avec pulsation et masque le pool", () => {
    const html = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{ defaultLevel: "level4" }}
        onComplete={() => {}}
      />
    );

    // Doit contenir des balises input avec pulsation
    expect(html).toContain("<input");
    expect(html).toContain("animate-pulse-slow-red");

    // Pas d'étiquettes à placer (pool absent)
    expect(html).not.toContain('id="verb-conjugation-pool-section"');
  });

  it("n'affiche plus de sélecteur de verbe dans l'UI et utilise le verbe défini par le niveau", () => {
    const htmlDefault = renderToStaticMarkup(
      <VerbConjugationActivity student={null} content={{}} onComplete={() => {}} />
    );

    // Pas de sélecteur de verbe
    expect(htmlDefault).not.toContain('id="verb-conjugation-verb-select"');
    expect(htmlDefault).not.toContain('id="verb-conjugation-verb-btn-etre"');
    expect(htmlDefault).not.toContain('id="verb-conjugation-verb-btn-avoir"');
    // Par défaut être
    expect(htmlDefault).toContain("suis");

    // Niveau configuré avec le verbe avoir
    const htmlAvoir = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{
          defaultLevel: "level1",
          levels: {
            level1: {
              label: "Niveau 1",
              verb: "avoir",
              randomOrder: false,
              target: "verb",
              mode: "drag",
            },
          },
        }}
        onComplete={() => {}}
      />
    );
    expect(htmlAvoir).toContain("avoir");
    expect(htmlAvoir).toContain("avons");
  });

  it("en mode démo (student = null), les boutons d'action sont initialisés correctement et onComplete n'est pas appelé", () => {
    const onCompleteMock = vi.fn();
    const html = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{ defaultLevel: "level1" }}
        onComplete={onCompleteMock}
      />
    );

    expect(html).toContain('id="verb-conjugation-validate-button"');
    expect(onCompleteMock).not.toHaveBeenCalled();
  });

  it("supporte le futur avec affichage du badge, sous-titre et formes correctes", () => {
    const htmlFuturEtre = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{
          tense: "futur",
          verb: "être",
          defaultLevel: "level1",
        }}
        onComplete={() => {}}
      />
    );

    expect(htmlFuturEtre).toContain("Futur");
    expect(htmlFuturEtre).toContain("Futur simple de l&#x27;indicatif");
    expect(htmlFuturEtre).toContain("serai");
    expect(htmlFuturEtre).toContain("serons");

    const htmlFuturAvoir = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{
          tense: "future",
          verb: "avoir",
          defaultLevel: "level1",
        }}
        onComplete={() => {}}
      />
    );

    expect(htmlFuturAvoir).toContain("aurai");
    expect(htmlFuturAvoir).toContain("aurons");
  });

  it("supporte l'imparfait avec affichage du badge, sous-titre et formes correctes", () => {
    const htmlImparfaitEtre = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{
          tense: "imparfait",
          verb: "être",
          defaultLevel: "level1",
        }}
        onComplete={() => {}}
      />
    );

    expect(htmlImparfaitEtre).toContain("Imparfait");
    expect(htmlImparfaitEtre).toContain("Imparfait de l&#x27;indicatif");
    expect(htmlImparfaitEtre).toContain("étais");
    expect(htmlImparfaitEtre).toContain("étions");

    const htmlImparfaitAvoir = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{
          temps: "imparfait",
          verb: "avoir",
          defaultLevel: "level1",
        }}
        onComplete={() => {}}
      />
    );

    expect(htmlImparfaitAvoir).toContain("avais");
    expect(htmlImparfaitAvoir).toContain("avions");
  });

  it("supporte la tolérance j' / je et les accents de l'imparfait dans isAnswerCorrect", () => {
    expect(isAnswerCorrect("je", "j'", "pronoun")).toBe(true);
    expect(isAnswerCorrect("j'", "je", "pronoun")).toBe(true);
    expect(isAnswerCorrect("j'", "j'", "pronoun")).toBe(true);

    // Accents pour l'imparfait
    expect(isAnswerCorrect("etais", "étais", "verb")).toBe(true);
    expect(isAnswerCorrect("etait", "était", "verb")).toBe(true);
    expect(isAnswerCorrect("etions", "étions", "verb")).toBe(true);
    expect(isAnswerCorrect("etiez", "étiez", "verb")).toBe(true);
    expect(isAnswerCorrect("etaient", "étaient", "verb")).toBe(true);
  });
});
