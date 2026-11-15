import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VocabularyCreatorPanel from "./VocabularyCreatorPanel";

describe("VocabularyCreatorPanel - Visibilité des boutons de création d'activité", () => {
  const dummySequences = [
    {
      id: 42,
      title: "Les animaux de la forêt",
      level: "CE1",
      theme: "Nature",
      status: "active",
      position: 1,
      words: [
        { id: 1, word: "renard", definition: "Un animal rusé" },
        { id: 2, word: "blaireau", definition: "Un animal nocturne" },
      ],
    },
  ];

  it("affiche les boutons de création d'activité globale et ciblée lorsque isAdmin est vrai", () => {
    const html = renderToStaticMarkup(
      <VocabularyCreatorPanel
        isAdmin={true}
        initialSequences={dummySequences}
        hideTitle
      />
    );

    // Bouton de création globale en haut
    expect(html).toContain('id="vocabulary-creator-create-global-activity-button"');
    // Bouton de création d'activité par séquence
    expect(html).toContain('id="vocabulary-sequence-activity-button-42"');
    // Boutons de gestion de séquence toujours présents
    expect(html).toContain('id="vocabulary-sequence-eval-button-42"');
    expect(html).toContain('id="vocabulary-sequence-edit-button-42"');
  });

  it("masque les boutons de création d'activité lorsque isAdmin est faux (vue Enseignant)", () => {
    const html = renderToStaticMarkup(
      <VocabularyCreatorPanel
        isAdmin={false}
        initialSequences={dummySequences}
        hideTitle
      />
    );

    // Les boutons de création d'activité ne doivent PAS être rendus
    expect(html).not.toContain('id="vocabulary-creator-create-global-activity-button"');
    expect(html).not.toContain('id="vocabulary-sequence-activity-button-42"');
    // En revanche, les boutons d'évaluation et de modification restent accessibles à l'enseignant
    expect(html).toContain('id="vocabulary-sequence-eval-button-42"');
    expect(html).toContain('id="vocabulary-sequence-edit-button-42"');
  });
});
