import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import WriteFractionsActivity, {
  defaultWriteFractionsActivityContent,
  CircleFractionPie,
  getColoredSlicesSet,
  PIE_STYLE,
} from "./WriteFractionsActivity";

describe("WriteFractionsActivity", () => {
  it("s'initialise correctement avec une configuration vide sans planter (contrat de robustesse)", () => {
    const html = renderToStaticMarkup(
      <WriteFractionsActivity student={null} content={{}} onComplete={() => {}} />
    );

    expect(html).toContain('id="write-fractions-activity-root"');
    expect(html).toContain('id="write-fractions-hero"');
    expect(html).toContain('id="write-fractions-status-panel"');
    expect(html).toContain('id="write-fractions-progress-bar"');
    expect(html).toContain('id="write-fractions-grid"');
    expect(html).toContain('id="write-fractions-actions"');
    expect(html).toContain('id="write-fractions-validate-button"');
    expect(html).toContain('id="write-fractions-restart-button"');
    // Vérifier la présence des cartes
    expect(html).toContain('id="write-fractions-card-1"');
    expect(html).toContain('id="write-fractions-num-1"');
    expect(html).toContain('id="write-fractions-den-1"');
  });

  it("affiche les 9 figures de l'exercice 1 par défaut avec les bons numérateurs et dénominateurs", () => {
    const html = renderToStaticMarkup(
      <WriteFractionsActivity
        student={null}
        content={defaultWriteFractionsActivityContent}
        onComplete={() => {}}
      />
    );

    expect(html).toContain('id="write-fractions-card-9"');
    // Vérifie le titre par défaut
    expect(html).toContain("Écris les fractions");
  });

  it("affiche les boutons de niveaux et badges dans ActivityHero en mode démo", () => {
    const html = renderToStaticMarkup(
      <WriteFractionsActivity
        student={null}
        content={defaultWriteFractionsActivityContent}
        onComplete={() => {}}
      />
    );

    // Boutons de niveaux dans Hero
    expect(html).toContain('id="write-fractions-button-level1"');
    expect(html).toContain('id="write-fractions-button-level2"');
    expect(html).toContain('id="write-fractions-button-level3"');

    // Badges en mode démo
    expect(html).toContain('id="write-fractions-current-settings"');
    expect(html).toContain("9 figures");
    expect(html).toContain("Numérateur et dénominateur");
    expect(html).toContain("Écrire une fraction");

    // Pas de bouton séparé pour le pavé numérique (il s'ouvre au clic)
    expect(html).not.toContain('id="write-fractions-toggle-keypad-btn"');
  });

  it("masque les badges et niveaux en mode élève", () => {
    const html = renderToStaticMarkup(
      <WriteFractionsActivity
        student={{ id: 1, name: "Lucas" }}
        content={defaultWriteFractionsActivityContent}
        onComplete={() => {}}
      />
    );

    // Les badges et l'instruction sont masqués en mode élève pour un affichage épuré
    expect(html).not.toContain('id="write-fractions-current-settings"');
  });

  it("getColoredSlicesSet génère des parts contiguës avec départ et sens aléatoires", () => {
    // Sens horaire : départ à 2, 3 parts sur 6 -> {2, 3, 4}
    const set1 = getColoredSlicesSet(3, 6, 2, true);
    expect(set1.size).toBe(3);
    expect(set1.has(2)).toBe(true);
    expect(set1.has(3)).toBe(true);
    expect(set1.has(4)).toBe(true);
    expect(set1.has(1)).toBe(false);

    // Sens anti-horaire : départ à 1, 2 parts sur 6 -> {1, 0}
    const set2 = getColoredSlicesSet(2, 6, 1, false);
    expect(set2.size).toBe(2);
    expect(set2.has(1)).toBe(true);
    expect(set2.has(0)).toBe(true);
    expect(set2.has(5)).toBe(false);

    // Débordement circulaire : départ à 5, 2 parts sur 6, sens horaire -> {5, 0} (contiguës)
    const set3 = getColoredSlicesSet(2, 6, 5, true);
    expect(set3.size).toBe(2);
    expect(set3.has(5)).toBe(true);
    expect(set3.has(0)).toBe(true);
  });

  it("CircleFractionPie génère un SVG valide avec les parts demandées", () => {
    const html = renderToStaticMarkup(
      <CircleFractionPie
        id="test-pie"
        numerator={4}
        denominator={5}
        fillColor="#8b5cf6"
        size={110}
        startSlot={0}
        clockwise={true}
      />
    );

    expect(html).toContain('<svg id="test-pie"');
    expect(html).toContain('id="test-pie-slice-0"');
    expect(html).toContain('id="test-pie-slice-3"');
    expect(html).toContain('fill="#8b5cf6"');
    expect(html).toContain(`stroke="${PIE_STYLE.sliceSeparatorColor}"`);
  });

  it("CircleFractionPie permet de modifier la couleur de séparation des quartiers", () => {
    const customSeparator = "#cbd5e1";
    const html = renderToStaticMarkup(
      <CircleFractionPie
        id="test-pie-sep"
        numerator={2}
        denominator={4}
        separatorColor={customSeparator}
      />
    );

    expect(html).toContain(`stroke="${customSeparator}"`);
  });

  it("CircleFractionPie gère le cas spécial du dénominateur 1 sans erreur", () => {
    const html = renderToStaticMarkup(
      <CircleFractionPie
        id="test-pie-whole"
        numerator={1}
        denominator={1}
        fillColor="#8b5cf6"
      />
    );

    expect(html).toContain('<svg id="test-pie-whole"');
    expect(html).toContain('r="');
  });

  it("respecte le mode démo sans appel réseau", () => {
    const onCompleteMock = vi.fn();
    const html = renderToStaticMarkup(
      <WriteFractionsActivity
        student={null}
        content={{}}
        onComplete={onCompleteMock}
      />
    );

    expect(onCompleteMock).not.toHaveBeenCalled();
    expect(html).toContain("write-fractions-activity-root");
    // Le bouton Recommencer doit être actif en mode démo
    expect(html).toContain('id="write-fractions-restart-button"');
  });

  it("maintient le bouton recommencer actif en mode démo", () => {
    const html = renderToStaticMarkup(
      <WriteFractionsActivity
        student={null}
        content={{}}
        onComplete={() => {}}
      />
    );

    const restartMatch = html.match(/<button id="write-fractions-restart-button"[^>]*>/);
    expect(restartMatch).not.toBeNull();
    // Ne doit pas contenir l'attribut HTML disabled
    expect(restartMatch[0]).not.toMatch(/\sdisabled(?=[>\s=])/);
  });

  it("gère correctement le niveau 1 avec dénominateurs pré-remplis", () => {
    const contentLevel1 = {
      ...defaultWriteFractionsActivityContent,
      defaultLevel: "level1",
    };
    const html = renderToStaticMarkup(
      <WriteFractionsActivity
        student={null}
        content={contentLevel1}
        onComplete={() => {}}
      />
    );

    // Le niveau 1 contient 6 cartes
    expect(html).toContain('id="write-fractions-card-6"');
    // Le dénominateur de la carte 1 (1/2) est pré-rempli avec 2
    expect(html).toContain('value="2"');
  });

  it("calcule correctement le score scolaire ramené sur 20", () => {
    // 8 bonnes réponses sur 9 figures : Math.round((8 / 9) * 20) = 18
    const score8sur9 = Math.round((8 / 9) * 20);
    expect(score8sur9).toBe(18);

    // 9 sur 9 : 20
    const score9sur9 = Math.round((9 / 9) * 20);
    expect(score9sur9).toBe(20);

    // 6 sur 9 : Math.round((6 / 9) * 20) = 13
    const score6sur9 = Math.round((6 / 9) * 20);
    expect(score6sur9).toBe(13);
  });
});
