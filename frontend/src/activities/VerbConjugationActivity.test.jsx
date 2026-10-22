import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VerbConjugationActivity, {
  defaultVerbConjugationActivityContent,
  isAnswerCorrect,
  normalizeVerbKey,
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

  it("génère les 6 personnes canoniques pour être et avoir", () => {
    expect(CONJUGATION_TABLE.être).toHaveLength(6);
    expect(CONJUGATION_TABLE.avoir).toHaveLength(6);

    const etreVerbs = CONJUGATION_TABLE.être.map((item) => item.verb);
    expect(etreVerbs).toEqual(["suis", "es", "est", "sommes", "êtes", "sont"]);

    const avoirVerbs = CONJUGATION_TABLE.avoir.map((item) => item.verb);
    expect(avoirVerbs).toEqual(["ai", "as", "a", "avons", "avez", "ont"]);
  });

  it("normalise correctement les verbes, cibles et modes", () => {
    expect(normalizeVerbKey("ETRE")).toBe("être");
    expect(normalizeVerbKey("etre")).toBe("être");
    expect(normalizeVerbKey("avoir")).toBe("avoir");
    expect(normalizeVerbKey("Avoir")).toBe("avoir");
    expect(normalizeVerbKey("inconnu")).toBe("être");

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
});
