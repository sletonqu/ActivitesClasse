import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VocabularyLearningActivity, {
  defaultVocabularyLearningActivityContent,
  DEFAULT_VOCABULARY_WORDS,
  shuffleChoices,
  normalizeWordEntry,
  getStepsForWord,
  calculateVocabularyProgressPercent,
} from "./VocabularyLearningActivity";
import VocabularyEvaluationView, {
  buildVocabularyEvaluationUrl,
  decodeEvaluationPayload,
  encodeEvaluationPayload,
  pickRandomEvaluationSentences,
} from "../components/VocabularyEvaluationView";
import VocabularyEvaluationPage from "../views/VocabularyEvaluationPage";
import { MemoryRouter } from "react-router-dom";
import VocabularyProgressBadge, {
  buildVocabularyFocusedUrl,
  getWordStageBadgeInfo,
} from "../components/VocabularyProgressBadge";
import {
  buildGeminiImagePromptText,
  buildGeminiWebUrl,
} from "../components/VocabularyImagePreview";
import { handleRoundRestart } from "../utils/activityUtils";

describe("VocabularyLearningActivity", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        words: DEFAULT_VOCABULARY_WORDS.CE1,
        upToDate: false,
      }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("s'initialise correctement avec une configuration vide {} (contrat de robustesse)", () => {
    const html = renderToStaticMarkup(
      <VocabularyLearningActivity student={null} content={{}} onComplete={() => {}} />
    );

    expect(html).toContain('id="vocabulary-learning-activity"');
    expect(html).toContain('id="vocabulary-learning-hero"');
    expect(html).toContain('id="vocabulary-learning-status"');
    expect(html).toContain('id="vocabulary-discovery-card"');
    expect(html).toContain('id="vocabulary-learning-actions"');
  });

  it("expose une configuration par défaut à 10 mots, 6 révisions max et 6 phrases d'évaluation", () => {
    expect(defaultVocabularyLearningActivityContent.wordCount).toBe(10);
    expect(defaultVocabularyLearningActivityContent.maxRevisionsPerSession).toBe(6);
    expect(defaultVocabularyLearningActivityContent.evaluationSentenceCount).toBe(6);
    expect(defaultVocabularyLearningActivityContent.levels.level1.label).toBe("CE1");
    expect(defaultVocabularyLearningActivityContent.levels.level2.label).toBe("CE2");
  });

  it("active les boutons de niveaux et Recommencer en Mode Démo (student === null)", () => {
    const html = renderToStaticMarkup(
      <VocabularyLearningActivity
        student={null}
        content={defaultVocabularyLearningActivityContent}
        onComplete={() => {}}
      />
    );

    expect(html).toContain('id="vocabulary-learning-restart-button"');
    expect(html).not.toMatch(/id="vocabulary-learning-restart-button"[^>]*\sdisabled(?:=|[\s>])/);
    expect(html).toContain('id="vocabulary-learning-level-level1"');
    expect(html).toContain('id="vocabulary-learning-level-level2"');
    expect(html).not.toMatch(/id="vocabulary-learning-level-level1"[^>]*\sdisabled(?:=|[\s>])/);
  });

  it("n'affiche que le niveau configuré lorsqu'un seul niveau est défini dans le JSON de l'activité", () => {
    const singleLevelSequenceConfig = {
      title: "Vocabulaire CE1 - Les animaux",
      level: "CE1",
      defaultLevel: "level1",
      wordCount: 10,
      maxRevisionsPerSession: 6,
      sequenceId: 4,
    };

    const htmlCe1 = renderToStaticMarkup(
      <VocabularyLearningActivity
        student={null}
        content={singleLevelSequenceConfig}
        onComplete={() => {}}
      />
    );

    expect(htmlCe1).toContain('id="vocabulary-learning-level-level1"');
    expect(htmlCe1).not.toContain('id="vocabulary-learning-level-level2"');

    const singleLevelsObjectConfig = {
      title: "Vocabulaire CE2 - L'espace",
      defaultLevel: "level2",
      levels: {
        level2: {
          label: "CE2",
          schoolLevel: "CE2",
          wordCount: 10,
          maxRevisionsPerSession: 6,
        },
      },
    };

    const htmlCe2 = renderToStaticMarkup(
      <VocabularyLearningActivity
        student={null}
        content={singleLevelsObjectConfig}
        onComplete={() => {}}
      />
    );

    expect(htmlCe2).toContain('id="vocabulary-learning-level-level2"');
    expect(htmlCe2).not.toContain('id="vocabulary-learning-level-level1"');
  });

  it("verrouille le bouton Recommencer en Mode Élève Groupe tant que tous les élèves n'ont pas terminé", () => {
    const htmlGroupInProgress = renderToStaticMarkup(
      <VocabularyLearningActivity
        student={{ id: 1, firstname: "Léo", name: "Martin" }}
        content={defaultVocabularyLearningActivityContent}
        onComplete={() => {}}
        allStudentsCompleted={false}
        isFocusedMode={false}
      />
    );

    expect(htmlGroupInProgress).toMatch(/id="vocabulary-learning-restart-button"[^>]*\sdisabled(?:=|[\s>])/);

    const htmlGroupAllDone = renderToStaticMarkup(
      <VocabularyLearningActivity
        student={{ id: 1, firstname: "Léo", name: "Martin" }}
        content={defaultVocabularyLearningActivityContent}
        onComplete={() => {}}
        allStudentsCompleted={true}
        isFocusedMode={false}
      />
    );

    expect(htmlGroupAllDone).not.toMatch(/id="vocabulary-learning-restart-button"[^>]*\sdisabled(?:=|[\s>])/);
    expect(htmlGroupAllDone).toContain(
      'title="Recommencer et réinitialiser la liste des élèves"'
    );
  });

  it("verrouille le bouton Recommencer pendant l'activité en Mode Focus", () => {
    const htmlFocus = renderToStaticMarkup(
      <VocabularyLearningActivity
        student={{ id: 2, firstname: "Emma", name: "Bernard" }}
        content={defaultVocabularyLearningActivityContent}
        onComplete={() => {}}
        isFocusedMode={true}
      />
    );

    expect(htmlFocus).toMatch(/id="vocabulary-learning-restart-button"[^>]*\sdisabled(?:=|[\s>])/);
  });

  it("distingue les étapes de la phase Découverte et de la phase Révision", () => {
    const discoveryWord = normalizeWordEntry({
      id: 10,
      word: "rusé",
      phase: "discovery",
    });
    expect(getStepsForWord(discoveryWord)).toEqual([
      "discovery_card",
      "sentence1",
      "sentence2",
    ]);

    const revisionWord = normalizeWordEntry({
      id: 11,
      word: "courageux",
      phase: "revision",
    });
    expect(getStepsForWord(revisionWord)).toEqual([
      "definition_qcm",
      "sentence1",
      "sentence2",
    ]);
  });

  it("affiche directement le QCM de définition sans le mot lorsque le 1er mot est en phase Révision", () => {
    const customRevisionConfig = {
      ...defaultVocabularyLearningActivityContent,
      words: [
        {
          id: 99,
          word: "persévérant",
          nature: "adjectif qualificatif",
          definition: "Qui continue ses efforts sans abandonner.",
          sentence1_cloze: "Cet élève _____ progresse chaque jour.",
          sentence2_cloze: "Un sportif _____ ne baisse jamais les bras.",
          distractors: ["découragé", "imprudent"],
          phase: "revision",
          stage: "reviewing",
          consecutive_successes: 2,
        },
      ],
    };

    const html = renderToStaticMarkup(
      <VocabularyLearningActivity
        student={null}
        content={customRevisionConfig}
        onComplete={() => {}}
      />
    );

    expect(html).toContain('id="vocabulary-definition-qcm-step"');
    expect(html).toContain('id="vocabulary-qcm-choices"');
    expect(html).toContain("⭐⭐ (2/3)");
  });

  it("shuffleChoices retourne toujours exactement 3 choix contenant le mot cible et 2 intrus distincts", () => {
    const choices = shuffleChoices("agile", ["lourd", "maladroit"], ["rapide", "lent"]);
    expect(choices).toHaveLength(3);
    expect(choices).toContain("agile");
    expect(choices).toContain("lourd");
    expect(choices).toContain("maladroit");
  });

  it("calcule et transmet correctement progressPercent à ActivityStatus", () => {
    expect(calculateVocabularyProgressPercent(0, 30, false)).toBe(0);
    expect(calculateVocabularyProgressPercent(15, 30, false)).toBe(50);
    expect(calculateVocabularyProgressPercent(30, 30, false)).toBe(100);
    expect(calculateVocabularyProgressPercent(5, 30, true)).toBe(100);

    const html = renderToStaticMarkup(
      <VocabularyLearningActivity student={null} content={{}} onComplete={() => {}} />
    );
    expect(html).toContain('id="vocabulary-learning-progress-bar"');
    expect(html).toContain('id="vocabulary-word-counter"');
  });

  it("respecte la signature positionnelle de handleRoundRestart", () => {
    const onReset = vi.fn();
    expect(handleRoundRestart(true, onReset)).toBe(true);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(handleRoundRestart(false, onReset)).toBe(false);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe("VocabularyEvaluationView & VocabularyProgressBadge", () => {
  it("pickRandomEvaluationSentences tire 6 phrases à trous sur 10 mots (1 phrase max par mot tiré, laissant 4 mots intrus en en-tête)", () => {
    const words = DEFAULT_VOCABULARY_WORDS.CE1.slice(0, 10);
    const picked = pickRandomEvaluationSentences(words, 6);

    expect(picked).toHaveLength(6);
    const uniqueWords = new Set(picked.map((p) => p.word));
    expect(uniqueWords.size).toBe(6);
    picked.forEach((item) => {
      expect(item.cloze).toContain("_____");
    });
  });

  it("affiche la vue Évaluation avec la banque des 10 mots en en-tête et les 6 phrases à trous", () => {
    const sequence = {
      id: 5,
      title: "Séquence CE1 - Les qualités",
      level: "CE1",
      theme: "Les qualités",
      words: DEFAULT_VOCABULARY_WORDS.CE1.slice(0, 10),
    };

    const html = renderToStaticMarkup(
      <VocabularyEvaluationView
        sequence={sequence}
        defaultSentenceCount={6}
        onClose={() => {}}
      />
    );

    expect(html).toContain('id="vocabulary-evaluation-view"');
    expect(html).toContain('id="vocabulary-evaluation-open-url-button"');
    expect(html).toContain('id="vocabulary-evaluation-copy-url-button"');
    expect(html).toContain('id="vocabulary-evaluation-print-button"');
    expect(html).toContain('id="vocabulary-evaluation-word-bank"');
    expect(html).toContain('id="vocabulary-evaluation-sentences-list"');
    expect(html).toContain('id="vocabulary-evaluation-sentence-1"');
    expect(html).toContain('id="vocabulary-evaluation-sentence-6"');
  });

  it("ouvre la page autonome VocabularyEvaluationPage via l'URL d'évaluation avec Titre, Consigne, Liste des mots et les 6 phrases à trous", () => {
    const words = DEFAULT_VOCABULARY_WORDS.CE1.slice(0, 10);
    const headerWords = words.map((w) => w.word).sort((a, b) => a.localeCompare(b, "fr"));
    const selectedPrompts = pickRandomEvaluationSentences(words, 6);

    const evalUrl = buildVocabularyEvaluationUrl({
      sequenceId: 7,
      title: "Les émotions et qualités",
      level: "CE1",
      headerWords,
      selectedPrompts,
      sentenceCount: 6,
    });

    expect(evalUrl).toContain("/vocabulary-evaluation?");
    expect(evalUrl).toContain("sequenceId=7");
    expect(evalUrl).toContain("data=");

    const encodedParam = new URLSearchParams(evalUrl.split("?")[1]).get("data");
    const decoded = decodeEvaluationPayload(encodedParam);
    expect(decoded.title).toBe("Les émotions et qualités");
    expect(decoded.headerWords).toHaveLength(10);
    expect(decoded.selectedPrompts).toHaveLength(6);

    const pageHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={[evalUrl.replace(/^https?:\/\/[^/]+/, "")]}>
        <VocabularyEvaluationPage />
      </MemoryRouter>
    );

    expect(pageHtml).toContain('id="vocabulary-evaluation-page"');
    expect(pageHtml).toContain('id="vocabulary-evaluation-page-title"');
    expect(pageHtml).toContain("Évaluation de vocabulaire : Les émotions et qualités");
    expect(pageHtml).toContain('id="vocabulary-evaluation-page-instructions"');
    expect(pageHtml).toContain('id="vocabulary-evaluation-word-bank"');
    expect(pageHtml).toContain('id="vocabulary-evaluation-sentences-list"');
    expect(pageHtml).toContain('id="vocabulary-evaluation-sentence-1"');
    expect(pageHtml).toContain('id="vocabulary-evaluation-sentence-6"');
  });

  it("génère une URL Mode Focus valide et les badges de maîtrise (🆕, 🔁, ⭐, ⭐⭐, 👑)", () => {
    const url = buildVocabularyFocusedUrl({
      classId: 2,
      groupId: 4,
      activityId: 9,
      studentId: 15,
    });
    expect(url).toContain("classId=2");
    expect(url).toContain("groupId=4");
    expect(url).toContain("activityId=9");
    expect(url).toContain("studentId=15");

    expect(getWordStageBadgeInfo("learning", 0).shortLabel).toContain("🆕");
    expect(getWordStageBadgeInfo("reviewing", 0).shortLabel).toContain("🔁");
    expect(getWordStageBadgeInfo("reviewing", 1).shortLabel).toContain("⭐ (1/3)");
    expect(getWordStageBadgeInfo("reviewing", 2).shortLabel).toContain("⭐⭐ (2/3)");
    expect(getWordStageBadgeInfo("mastered", 3).shortLabel).toContain("👑");

    const studentBadgeHtml = renderToStaticMarkup(
      <VocabularyProgressBadge
        variant="student"
        dueTodayCount={4}
        learningCount={3}
        masteredCount={2}
        classId={2}
        groupId={4}
        activityId={9}
        studentId={15}
      />
    );
    expect(studentBadgeHtml).toContain("4 mot(s) à réviser aujourd&#x27;hui");
    expect(studentBadgeHtml).toContain("Mode Focus");
  });

  it("génère le prompt et l'URL Gemini Web pré-remplie pour la création d'illustration", () => {
    const promptText = buildGeminiImagePromptText("rusé", "Un renard malicieux dans la forêt");
    expect(promptText).toContain("sans aucun texte");
    expect(promptText).toContain("Un renard malicieux dans la forêt");

    const geminiUrl = buildGeminiWebUrl("rusé", "Un renard malicieux dans la forêt");
    expect(geminiUrl).toContain("https://gemini.google.com/app?");
    expect(geminiUrl).toContain("prompt=");
    expect(geminiUrl).toContain("q=");
  });
});
