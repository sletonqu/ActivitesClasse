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
  isFirstGroupVerb,
  isGenericFirstGroupVerb,
  isPronominalVerb,
  pickRandomVerb,
  clearFirstGroupVerbsCache,
  generateFirstGroupConjugation,
  ConjugatedVerbText,
  FALLBACK_FIRST_GROUP_VERBS,
  fetchFirstGroupVerbs,
  buildInitialPool,
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
    expect(html).toContain('id="verb-conjugation-header"');
    expect(html).toContain('id="verb-conjugation-header-content"');
    expect(html).toContain('id="verb-conjugation-title-group"');
    expect(html).toContain('id="verb-conjugation-title-row"');
    expect(html).toContain('id="verb-conjugation-title"');
    expect(html).toContain('id="verb-conjugation-active-verb"');
    expect(html).toContain('id="verb-conjugation-tense-subtitle"');
    expect(html).toContain('id="verb-conjugation-body"');
    expect(html).toContain('id="verb-conjugation-rows-panel"');
    expect(html).toContain('id="verb-conjugation-rows"');
    expect(html).toContain('id="verb-conjugation-row-0"');
    expect(html).toContain('id="verb-conjugation-pronoun-0"');
    expect(html).toContain('id="verb-conjugation-slot-0"');
    expect(html).toContain('id="verb-conjugation-placeholder-0"');
    expect(html).toContain('id="verb-conjugation-pool-section"');
    expect(html).toContain('id="verb-conjugation-pool-header"');
    expect(html).toContain('id="verb-conjugation-pool-title"');
    expect(html).toContain('id="verb-conjugation-pool-subtitle"');
    expect(html).toContain('id="verb-conjugation-pool-dropzone"');
    expect(html).toContain('id="verb-conjugation-pool-tiles-grid"');
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

    // Verbes en rouge avec ID
    expect(html).toContain('id="verb-conjugation-verb-0"');
    expect(html).toContain('id="verb-conjugation-slot-0"');
    expect(html).toContain('id="verb-conjugation-placeholder-0"');
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

    // Doit contenir des balises input avec IDs et pulsation
    expect(html).toContain('id="verb-conjugation-input-container-0"');
    expect(html).toContain('id="verb-conjugation-input-0"');
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

  it("identifie correctement les verbes du 1er groupe avec isFirstGroupVerb et normalizeVerbKey", () => {
    expect(isFirstGroupVerb("verbe 1er groupe")).toBe(true);
    expect(isFirstGroupVerb("verbe du 1er groupe")).toBe(true);
    expect(isFirstGroupVerb("verbes du 1er groupe")).toBe(true);
    expect(isFirstGroupVerb("verbe premier groupe")).toBe(true);
    expect(isFirstGroupVerb("verbe du premier groupe")).toBe(true);
    expect(isFirstGroupVerb("1er groupe")).toBe(true);
    expect(isFirstGroupVerb("premier groupe")).toBe(true);
    expect(isFirstGroupVerb("chanter")).toBe(true);
    expect(isFirstGroupVerb("manger")).toBe(true);
    expect(isFirstGroupVerb("tracer")).toBe(true);
    expect(isFirstGroupVerb("être")).toBe(false);
    expect(isFirstGroupVerb("avoir")).toBe(false);
    expect(isFirstGroupVerb("aller")).toBe(false); // aller est du 3ème groupe

    // Test de isGenericFirstGroupVerb avec diverses variantes et formats
    expect(isGenericFirstGroupVerb("verbe du 1er groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("verbes du 1er groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("verbe 1er groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("verbes 1er groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("1er groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("premier groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("verbe premier groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("verbe du premier groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("verbes du premier groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("1er gr")).toBe(true);
    expect(isGenericFirstGroupVerb("1er gr.")).toBe(true);
    expect(isGenericFirstGroupVerb("groupe 1")).toBe(true);
    expect(isGenericFirstGroupVerb("verbe-du-1er-groupe")).toBe(true);
    expect(isGenericFirstGroupVerb("1er")).toBe(true);
    expect(isGenericFirstGroupVerb("premier")).toBe(true);
    expect(isGenericFirstGroupVerb("être")).toBe(false);
    expect(isGenericFirstGroupVerb("avoir")).toBe(false);
    expect(isGenericFirstGroupVerb("aller")).toBe(false);
    expect(isGenericFirstGroupVerb("chanter")).toBe(false);
    expect(isGenericFirstGroupVerb("")).toBe(false);
    expect(isGenericFirstGroupVerb(null)).toBe(false);

    // Exclusion des verbes précédés d'un s' (comme s'envoler) ou de se
    expect(isFirstGroupVerb("s'envoler")).toBe(false);
    expect(isFirstGroupVerb("s’envoler")).toBe(false);
    expect(isFirstGroupVerb("s'amuser")).toBe(false);
    expect(isFirstGroupVerb("se promener")).toBe(false);
    expect(isFirstGroupVerb("se laver")).toBe(false);

    expect(normalizeVerbKey("verbe 1er groupe")).toBe("verbe 1er groupe");
    expect(normalizeVerbKey("verbe du 1er groupe")).toBe("verbe 1er groupe");
    expect(normalizeVerbKey("verbes du 1er groupe")).toBe("verbe 1er groupe");
    expect(normalizeVerbKey("verbe premier groupe")).toBe("verbe 1er groupe");
    expect(normalizeVerbKey("verbe du premier groupe")).toBe("verbe 1er groupe");
    expect(normalizeVerbKey("1er groupe")).toBe("verbe 1er groupe");
    expect(normalizeVerbKey("premier groupe")).toBe("verbe 1er groupe");
    expect(normalizeVerbKey("chanter")).toBe("chanter");
    expect(normalizeVerbKey("manger")).toBe("manger");
    expect(normalizeVerbKey("s'envoler")).toBe("être");
    expect(normalizeVerbKey("se promener")).toBe("être");
  });

  it("génère la conjugaison d'un verbe régulier du 1er groupe au présent (ex: chanter)", () => {
    const list = generateFirstGroupConjugation("chanter", "present");
    expect(list).toHaveLength(6);

    expect(list[0]).toEqual({
      id: "chanter-present-1",
      person: 1,
      pronoun: "je",
      verb: "chante",
      placeholder: "chant...",
      parts: { stem: "chant", specialChar: "", ending: "e" },
    });
    expect(list[1]).toEqual({
      id: "chanter-present-2",
      person: 2,
      pronoun: "tu",
      verb: "chantes",
      placeholder: "chant...",
      parts: { stem: "chant", specialChar: "", ending: "es" },
    });
    expect(list[2]).toEqual({
      id: "chanter-present-3",
      person: 3,
      pronoun: "il / elle",
      verb: "chante",
      placeholder: "chant...",
      parts: { stem: "chant", specialChar: "", ending: "e" },
    });
    expect(list[3]).toEqual({
      id: "chanter-present-4",
      person: 4,
      pronoun: "nous",
      verb: "chantons",
      placeholder: "chant...",
      parts: { stem: "chant", specialChar: "", ending: "ons" },
    });
    expect(list[4]).toEqual({
      id: "chanter-present-5",
      person: 5,
      pronoun: "vous",
      verb: "chantez",
      placeholder: "chant...",
      parts: { stem: "chant", specialChar: "", ending: "ez" },
    });
    expect(list[5]).toEqual({
      id: "chanter-present-6",
      person: 6,
      pronoun: "ils / elles",
      verb: "chantent",
      placeholder: "chant...",
      parts: { stem: "chant", specialChar: "", ending: "ent" },
    });
  });

  it("gère le cas particulier des verbes en -ger au présent (ex: manger avec eons pour nous)", () => {
    const list = generateFirstGroupConjugation("manger", "present");
    expect(list).toHaveLength(6);

    expect(list[0].verb).toBe("mange");
    expect(list[0].parts).toEqual({ stem: "mang", specialChar: "", ending: "e" });

    // Avec nous, la terminaison prend un e (mang + eons)
    expect(list[3].pronoun).toBe("nous");
    expect(list[3].verb).toBe("mangeons");
    expect(list[3].placeholder).toBe("mang...");
    expect(list[3].parts).toEqual({ stem: "mang", specialChar: "", ending: "eons" });

    expect(list[4].verb).toBe("mangez");
    expect(list[5].verb).toBe("mangent");
  });

  it("gère le cas particulier des verbes en -cer au présent (ex: tracer avec çons pour nous)", () => {
    const list = generateFirstGroupConjugation("tracer", "present");
    expect(list).toHaveLength(6);

    expect(list[0].verb).toBe("trace");
    expect(list[0].parts).toEqual({ stem: "trac", specialChar: "", ending: "e" });

    // Avec nous, le c devient ç et la terminaison est ons (tra + ç + ons)
    expect(list[3].pronoun).toBe("nous");
    expect(list[3].verb).toBe("traçons");
    expect(list[3].placeholder).toBe("traç...");
    expect(list[3].parts).toEqual({ stem: "tra", specialChar: "ç", ending: "ons" });

    expect(list[4].verb).toBe("tracez");
    expect(list[5].verb).toBe("tracent");
  });

  it("gère l'élision du pronom j' pour les verbes commençant par une voyelle ou h muet (ex: aimer)", () => {
    const list = generateFirstGroupConjugation("aimer", "present");
    expect(list[0].pronoun).toBe("j'");
    expect(list[0].verb).toBe("aime");
    expect(list[0].placeholder).toBe("aim...");
  });

  it("ConjugatedVerbText affiche le radical et met la terminaison et le ç en gras", () => {
    // Cas régulier : chanter
    const htmlChante = renderToStaticMarkup(
      <ConjugatedVerbText
        text="chante"
        parts={{ stem: "chant", specialChar: "", ending: "e" }}
      />
    );
    expect(htmlChante).toContain("font-medium");
    expect(htmlChante).toContain("chant");
    expect(htmlChante).toContain("font-black");
    expect(htmlChante).toContain("e");

    // Cas -cer avec nous : traçons
    const htmlTracons = renderToStaticMarkup(
      <ConjugatedVerbText
        text="traçons"
        parts={{ stem: "tra", specialChar: "ç", ending: "ons" }}
      />
    );
    expect(htmlTracons).toContain("tra");
    expect(htmlTracons).toContain("ç");
    expect(htmlTracons).toContain("ons");
    expect(htmlTracons).toContain("underline");
  });

  it("génère dans le pool uniquement les terminaisons pour le 1er groupe, et le verbe complet pour être et avoir", () => {
    // Mode verbe 1er groupe régulier : chanter
    const poolChanter = buildInitialPool(
      "verbe 1er groupe",
      { target: "verb", mode: "drag", tense: "present" },
      "chanter"
    );
    const poolChanterTexts = poolChanter.map((t) => t.text).sort();
    // Les étiquettes ne doivent contenir UNIQUEMENT que les terminaisons
    expect(poolChanterTexts).toEqual(["e", "e", "ent", "es", "ez", "ons"]);
    expect(poolChanterTexts).not.toContain("chante");
    expect(poolChanterTexts).not.toContain("chantons");

    // Mode verbe 1er groupe particulier : manger (-ger)
    const poolManger = buildInitialPool(
      "verbe 1er groupe",
      { target: "verb", mode: "drag", tense: "present" },
      "manger"
    );
    const poolMangerTexts = poolManger.map((t) => t.text).sort();
    expect(poolMangerTexts).toEqual(["e", "e", "ent", "eons", "es", "ez"]);

    // Mode être : doit conserver les verbes complets
    const poolEtre = buildInitialPool("être", { target: "verb", mode: "drag", tense: "present" });
    const poolEtreTexts = poolEtre.map((t) => t.text).sort();
    expect(poolEtreTexts).toEqual(["es", "est", "sont", "suis", "sommes", "êtes"].sort());

    // Mode avoir : doit conserver les verbes complets
    const poolAvoir = buildInitialPool("avoir", { target: "verb", mode: "drag", tense: "present" });
    const poolAvoirTexts = poolAvoir.map((t) => t.text).sort();
    expect(poolAvoirTexts).toEqual(["a", "ai", "as", "avons", "avez", "ont"].sort());
  });

  it("rend l'activité avec verb='verbe 1er groupe' au présent avec placeholder et badge adaptés", () => {
    const html = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{
          verb: "verbe 1er groupe",
          tense: "present",
          defaultLevel: "level1",
        }}
        onComplete={() => {}}
      />
    );

    expect(html).toContain('id="verb-conjugation-activity-root"');
    expect(html).toContain("(1er gr.)");
    expect(html).toContain("Verbe du 1er Groupe");
    expect(html).toContain('id="verb-conjugation-active-verb"');
    expect(html).toContain("Présent de l&#x27;indicatif");
    // La zone de dépôt affiche le placeholder (avec pointillés)
    expect(html).toContain("...");
    // Le pool affiche le sous-titre spécifique aux terminaisons
    expect(html).toContain("Terminaisons en rouge à placer :");
  });

  it("tolère indifféremment [je] ou [il / elle] sur les deux lignes ayant la même forme verbale au Niveau 3", () => {
    const optionsSwap = { canSwapFirstThirdSingular: true };

    // Si la ligne attend "je" (forme verbe: chante)
    expect(isAnswerCorrect("je", "je", "pronoun", optionsSwap)).toBe(true);
    expect(isAnswerCorrect("il / elle", "je", "pronoun", optionsSwap)).toBe(true);
    expect(isAnswerCorrect("il", "je", "pronoun", optionsSwap)).toBe(true);
    expect(isAnswerCorrect("elle", "je", "pronoun", optionsSwap)).toBe(true);
    expect(isAnswerCorrect("tu", "je", "pronoun", optionsSwap)).toBe(false);

    // Si la ligne attend "il / elle" (forme verbe: chante)
    expect(isAnswerCorrect("il / elle", "il / elle", "pronoun", optionsSwap)).toBe(true);
    expect(isAnswerCorrect("je", "il / elle", "pronoun", optionsSwap)).toBe(true);
    expect(isAnswerCorrect("j'", "il / elle", "pronoun", optionsSwap)).toBe(true);
    expect(isAnswerCorrect("vous", "il / elle", "pronoun", optionsSwap)).toBe(false);
  });

  it("valide correctement quand l'élève dépose la terminaison seule (ex: ons) ou le verbe complet", () => {
    // Cas où l'élève a placé la terminaison seule
    expect(
      isAnswerCorrect("ons", "chantons", "verb", {
        expectedEnding: "ons",
        expectedVerb: "chantons",
      })
    ).toBe(true);

    expect(
      isAnswerCorrect("eons", "mangeons", "verb", {
        expectedEnding: "eons",
        expectedVerb: "mangeons",
      })
    ).toBe(true);

    expect(
      isAnswerCorrect("ez", "chantons", "verb", {
        expectedEnding: "ons",
        expectedVerb: "chantons",
      })
    ).toBe(false);
  });

  it("tolère l'absence de cédille (tracons au lieu de traçons) pour jeunes élèves", () => {
    expect(isAnswerCorrect("tracons", "traçons", "verb")).toBe(true);
    expect(isAnswerCorrect("traçons", "traçons", "verb")).toBe(true);
  });

  it("isPronominalVerb détecte les verbes précédés d'un s' ou de se et préserve les verbes réguliers commençant par se-", () => {
    expect(isPronominalVerb("s'envoler")).toBe(true);
    expect(isPronominalVerb("s’envoler")).toBe(true);
    expect(isPronominalVerb("S'ENVOLER")).toBe(true);
    expect(isPronominalVerb("s'amuser")).toBe(true);
    expect(isPronominalVerb("s'échapper")).toBe(true);
    expect(isPronominalVerb("s ' envoler")).toBe(true);
    expect(isPronominalVerb("se laver")).toBe(true);
    expect(isPronominalVerb("se promener")).toBe(true);

    // Les verbes réguliers dont la racine commence par "se" sans espace ni apostrophe ne sont pas pronominaux
    expect(isPronominalVerb("semer")).toBe(false);
    expect(isPronominalVerb("serrer")).toBe(false);
    expect(isPronominalVerb("secouer")).toBe(false);
    expect(isPronominalVerb("sembler")).toBe(false);
    expect(isPronominalVerb("chanter")).toBe(false);
    expect(isPronominalVerb("sauter")).toBe(false);
    expect(isPronominalVerb("")).toBe(false);
    expect(isPronominalVerb(null)).toBe(false);
  });

  it("pickRandomVerb ignore les verbes précédés de s' ou se", () => {
    const listWithPronominal = ["s'envoler", "se promener", "chanter"];
    // Seul "chanter" doit être sélectionné
    expect(pickRandomVerb(listWithPronominal)).toBe("chanter");
  });

  it("fetchFirstGroupVerbs filtre les verbes précédés d'un s' (comme s'envoler) ou de se depuis l'API", async () => {
    clearFirstGroupVerbsCache();
    const originalFetch = global.fetch;
    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { word: "s'envoler", nature: "verbe 1er groupe" },
          { word: "s’amuser", nature: "verbe 1er groupe" },
          { word: "chanter", nature: "verbe 1er groupe" },
          { word: "se promener", nature: "verbe 1er groupe" },
          { word: "danser", nature: "verbe 1er groupe" },
          { word: "aller", nature: "verbe 1er groupe" },
        ],
      });

      const verbs = await fetchFirstGroupVerbs();
      expect(verbs).toEqual(["chanter", "danser"]);
      expect(verbs).not.toContain("s'envoler");
      expect(verbs).not.toContain("s’amuser");
      expect(verbs).not.toContain("se promener");
      expect(verbs).not.toContain("aller");
    } finally {
      global.fetch = originalFetch;
      clearFirstGroupVerbsCache();
    }
  });

  it("initialise l'activité avec les paramètres appropriés selon que le verbe est être ou verbe du 1er groupe", () => {
    const htmlEtre = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{ verb: "être", tense: "present" }}
        onComplete={() => {}}
      />
    );
    expect(htmlEtre).toContain('id="verb-conjugation-active-verb"');
    expect(htmlEtre).toContain(">Être<");
    expect(htmlEtre).not.toContain("Verbe du 1er groupe");

    const html1erGroupe = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{ verb: "verbe 1er groupe", tense: "present" }}
        onComplete={() => {}}
      />
    );
    expect(html1erGroupe).toContain("Verbe du 1er Groupe");
    expect(html1erGroupe).not.toContain(">Être<");
    expect(html1erGroupe).not.toContain(">Avoir<");
  });

  it("génère correctement la conjugaison d'un verbe du 1er groupe à l'imparfait (cas général, -ger, -cer, voyelle)", () => {
    // Cas régulier : chanter
    const chanterImparfait = generateFirstGroupConjugation("chanter", "imparfait");
    expect(chanterImparfait).toHaveLength(6);
    expect(chanterImparfait.map((r) => r.verb)).toEqual([
      "chantais", "chantais", "chantait", "chantions", "chantiez", "chantaient",
    ]);
    expect(chanterImparfait.map((r) => r.parts.ending)).toEqual([
      "ais", "ais", "ait", "ions", "iez", "aient",
    ]);
    expect(chanterImparfait[0].placeholder).toBe("chant...");

    // Cas en -ger : manger (e muet devant a, mais pas devant i)
    const mangerImparfait = generateFirstGroupConjugation("manger", "imparfait");
    expect(mangerImparfait.map((r) => r.verb)).toEqual([
      "mangeais", "mangeais", "mangeait", "mangions", "mangiez", "mangeaient",
    ]);
    expect(mangerImparfait.map((r) => r.parts.ending)).toEqual([
      "eais", "eais", "eait", "ions", "iez", "eaient",
    ]);
    expect(mangerImparfait[3].parts.ending).toBe("ions");
    expect(mangerImparfait[4].parts.ending).toBe("iez");

    // Cas en -cer : tracer (cédille sous le c devant a, mais pas devant i)
    const tracerImparfait = generateFirstGroupConjugation("tracer", "imparfait");
    expect(tracerImparfait.map((r) => r.verb)).toEqual([
      "traçais", "traçais", "traçait", "tracions", "traciez", "traçaient",
    ]);
    expect(tracerImparfait[0].parts.specialChar).toBe("ç");
    expect(tracerImparfait[0].parts.stem).toBe("tra");
    expect(tracerImparfait[0].placeholder).toBe("traç...");
    expect(tracerImparfait[3].parts.specialChar).toBe("");
    expect(tracerImparfait[3].parts.stem).toBe("trac");
    expect(tracerImparfait[3].placeholder).toBe("trac...");

    // Élision avec voyelle : aimer
    const aimerImparfait = generateFirstGroupConjugation("aimer", "imparfait");
    expect(aimerImparfait[0].pronoun).toBe("j'");
    expect(aimerImparfait[0].verb).toBe("aimais");
  });

  it("génère correctement la conjugaison d'un verbe du 1er groupe au futur (radical infinitif complet)", () => {
    // Cas régulier : chanter
    const chanterFutur = generateFirstGroupConjugation("chanter", "futur");
    expect(chanterFutur).toHaveLength(6);
    expect(chanterFutur.map((r) => r.verb)).toEqual([
      "chanterai", "chanteras", "chantera", "chanterons", "chanterez", "chanteront",
    ]);
    expect(chanterFutur.map((r) => r.parts.ending)).toEqual([
      "ai", "as", "a", "ons", "ez", "ont",
    ]);
    expect(chanterFutur.map((r) => r.parts.stem)).toEqual([
      "chanter", "chanter", "chanter", "chanter", "chanter", "chanter",
    ]);
    expect(chanterFutur[0].placeholder).toBe("chanter...");

    // Cas en -ger et -cer au futur : infinitif complet conservé
    const mangerFutur = generateFirstGroupConjugation("manger", "futur");
    expect(mangerFutur.map((r) => r.verb)).toEqual([
      "mangerai", "mangeras", "mangera", "mangerons", "mangerez", "mangeront",
    ]);
    expect(mangerFutur[0].placeholder).toBe("manger...");

    const tracerFutur = generateFirstGroupConjugation("tracer", "futur");
    expect(tracerFutur.map((r) => r.verb)).toEqual([
      "tracerai", "traceras", "tracera", "tracerons", "tracerez", "traceront",
    ]);
    expect(tracerFutur[0].placeholder).toBe("tracer...");

    // Élision avec voyelle : aimer
    const aimerFutur = generateFirstGroupConjugation("aimer", "futur");
    expect(aimerFutur[0].pronoun).toBe("j'");
    expect(aimerFutur[0].verb).toBe("aimerai");
  });

  it("génère le pool d'étiquettes approprié pour verbe du 1er groupe à l'imparfait et au futur", () => {
    // Imparfait
    const poolImparfait = buildInitialPool(
      "verbe 1er groupe",
      { mode: "drag", target: "verb", tense: "imparfait" },
      "chanter"
    );
    expect(poolImparfait).toHaveLength(6);
    const imparfaitTexts = poolImparfait.map((t) => t.text).sort();
    expect(imparfaitTexts).toEqual(["aient", "ais", "ais", "ait", "iez", "ions"].sort());

    // Futur
    const poolFutur = buildInitialPool(
      "verbe 1er groupe",
      { mode: "drag", target: "verb", tense: "futur" },
      "chanter"
    );
    expect(poolFutur).toHaveLength(6);
    const futurTexts = poolFutur.map((t) => t.text).sort();
    expect(futurTexts).toEqual(["a", "ai", "as", "ez", "ons", "ont"].sort());
  });

  it("gère les tolérances de validation à l'imparfait et au futur pour verbes du 1er groupe", () => {
    // Saisie terminaison seule vs verbe entier au futur
    expect(
      isAnswerCorrect("ai", "chanterai", "verb", { expectedEnding: "ai", expectedVerb: "chanterai" })
    ).toBe(true);
    expect(
      isAnswerCorrect("chanterai", "chanterai", "verb", { expectedEnding: "ai", expectedVerb: "chanterai" })
    ).toBe(true);

    // Saisie terminaison seule vs verbe entier à l'imparfait (avec cédille ou sans accent)
    expect(
      isAnswerCorrect("ais", "traçais", "verb", { expectedEnding: "ais", expectedVerb: "traçais" })
    ).toBe(true);
    expect(
      isAnswerCorrect("tracais", "traçais", "verb", { expectedEnding: "ais", expectedVerb: "traçais" })
    ).toBe(true);

    // Swap des pronoms je / tu à l'imparfait quand les formes sont homophones (chantais / chantais)
    expect(
      isAnswerCorrect("tu", "je", "pronoun", { canSwapFirstSecondSingular: true })
    ).toBe(true);
    expect(
      isAnswerCorrect("je", "tu", "pronoun", { canSwapFirstSecondSingular: true })
    ).toBe(true);
    expect(
      isAnswerCorrect("j'", "tu", "pronoun", { canSwapFirstSecondSingular: true })
    ).toBe(true);
  });

  it("affiche correctement les sous-titres et badges pour les verbes du 1er groupe à l'imparfait et au futur", () => {
    const htmlImparfait = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{ verb: "verbe 1er groupe", tense: "imparfait" }}
        onComplete={() => {}}
      />
    );
    expect(htmlImparfait).toContain("Imparfait de l&#x27;indicatif");
    expect(htmlImparfait).toContain("Verbe du 1er Groupe");

    const htmlFutur = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={{ verb: "verbe 1er groupe", tense: "futur" }}
        onComplete={() => {}}
      />
    );
    expect(htmlFutur).toContain("Futur simple de l&#x27;indicatif");
    expect(htmlFutur).toContain("Verbe du 1er Groupe");
  });

  it("gère les paramètres de l'utilisateur avec 'verbe du 1er groupe' au présent sans basculer sur être", () => {
    const userContent = {
      title: "Conjuguer les verbes du 1er groupe au présent",
      instruction: "Complète la conjugaison du verbe avec les bonnes formes.",
      verb: "verbe du 1er groupe",
      tense: "present",
      randomOrder: false,
      target: "verb",
    };

    const html = renderToStaticMarkup(
      <VerbConjugationActivity
        student={null}
        content={userContent}
        onComplete={() => {}}
      />
    );

    // Ne doit absolument pas proposer le verbe être
    expect(html).not.toContain(">Être<");
    expect(html).not.toContain("suis");
    expect(html).not.toContain("sommes");
    expect(html).not.toContain("êtes");
    expect(html).not.toContain("Conjugaison : être et avoir");

    // Doit proposer un verbe du 1er groupe
    expect(html).toContain("Verbe du 1er Groupe");
    expect(html).toContain("Conjuguer les verbes du 1er groupe au présent");
    expect(html).toContain("Complète la conjugaison du verbe avec les bonnes formes.");
    expect(html).toContain("Présent de l&#x27;indicatif");
    expect(html).toContain("(1er gr.)");
    expect(html).toContain("Terminaisons en rouge à placer :");
  });
});



