import { describe, expect, it } from "vitest";
import {
  getRulerGeometry,
  getRulerEdgeSnapPoint,
  RULER_CM_PX,
  RULER_MM_PX,
  RULER_DEFAULT_WIDTH,
  RULER_DEFAULT_OPACITY,
  RULER_OPACITY_PRESETS,
  DEFAULT_RULER_STATE,
  getNextRulerOpacity,
  getNextRulerAngleResetState,
  RULER_HEIGHT,
} from "./whiteboardRulerSnap";

describe("whiteboardRulerSnap", () => {
  it("fournit un état initial par défaut DEFAULT_RULER_STATE cohérent et centré au-dessus de la barre d'outils", () => {
    expect(DEFAULT_RULER_STATE).toEqual({
      x: 370,
      y: 420,
      width: 500,
      angle: 0,
      opacity: 0.8,
    });
  });
  it("respecte la calibration métrique du canevas (1 mm = 5 px, 1 cm = 50 px)", () => {
    expect(RULER_MM_PX).toBe(5);
    expect(RULER_CM_PX).toBe(50);
    expect(RULER_CM_PX).toBe(RULER_MM_PX * 10);
    expect(RULER_DEFAULT_WIDTH).toBe(10 * RULER_CM_PX);
  });

  it("gère correctement le cycle des niveaux d'opacité de la règle", () => {
    expect(RULER_DEFAULT_OPACITY).toBe(0.8);
    expect(RULER_OPACITY_PRESETS).toEqual([0.8, 0.5, 0.25, 1.0]);

    // Cycle : 0.8 -> 0.5 -> 0.25 -> 1.0 -> 0.8
    expect(getNextRulerOpacity(0.8)).toBe(0.5);
    expect(getNextRulerOpacity(0.5)).toBe(0.25);
    expect(getNextRulerOpacity(0.25)).toBe(1.0);
    expect(getNextRulerOpacity(1.0)).toBe(0.8);

    // Valeur inconnue ou nulle : repart de la valeur par défaut
    expect(getNextRulerOpacity(undefined)).toBe(0.5);
  });

  it("gère la bascule d'angle : réalignement à 0° (origine 0 cm) puis bascule à 90° (depuis le milieu)", () => {
    const width = 750;
    const height = RULER_HEIGHT; // 80

    // 1. Règle inclinée à 35° : le clic réaligne à 0° avec le point 0 cm comme origine (x et y conservés)
    const tiltedRuler = { x: 100, y: 150, width, angle: 35 };
    const resetTo0 = getNextRulerAngleResetState(tiltedRuler);
    expect(resetTo0).toEqual({
      x: 100,
      y: 150,
      angle: 0,
      width,
    });

    // 2. Règle à 0° : le deuxième clic la place verticalement à 90° depuis le milieu de la règle
    // Le centre géométrique à 0° est (100 + 375, 150 + 40) = (475, 190)
    const horizontalRuler = { x: 100, y: 150, width, angle: 0 };
    const to90 = getNextRulerAngleResetState(horizontalRuler);
    expect(to90.angle).toBe(90);
    expect(to90.width).toBe(width);

    // Vérifions que le centre géométrique de la règle à 90° est strictement identique à celui à 0° :
    // À 90°, local (W/2, H/2) est à : X = x90 - H/2, Y = y90 + W/2
    const centerAt0X = horizontalRuler.x + width / 2;
    const centerAt0Y = horizontalRuler.y + height / 2;
    const centerAt90X = to90.x - height / 2;
    const centerAt90Y = to90.y + width / 2;
    expect(centerAt90X).toBe(centerAt0X);
    expect(centerAt90Y).toBe(centerAt0Y);

    // 3. Règle à 90° : un nouveau clic la replace à 0° symétriquement depuis le milieu
    const backTo0 = getNextRulerAngleResetState(to90);
    expect(backTo0).toEqual({
      x: 100,
      y: 150,
      angle: 0,
      width,
    });
  });
  it("calcule correctement la géométrie d'une règle horizontale à 0°", () => {
    const ruler = { x: 100, y: 150, width: 350, angle: 0 };
    const geom = getRulerGeometry(ruler);

    expect(geom.start).toEqual({ x: 100, y: 150 });
    expect(geom.end).toEqual({ x: 450, y: 150 });
    expect(geom.cos).toBeCloseTo(1);
    expect(geom.sin).toBeCloseTo(0);
  });

  it("calcule correctement la géométrie d'une règle orientée à 90°", () => {
    const ruler = { x: 200, y: 100, width: 350, angle: 90 };
    const geom = getRulerGeometry(ruler);

    expect(geom.start).toEqual({ x: 200, y: 100 });
    expect(geom.end.x).toBeCloseTo(200);
    expect(geom.end.y).toBeCloseTo(450);
  });

  it("aimante un point proche du bord supérieur à 0°", () => {
    const ruler = { x: 100, y: 200, width: 350, angle: 0, active: true };
    const cursor = { x: 250, y: 215 }; // 15px sous le bord supérieur
    const snap = getRulerEdgeSnapPoint(cursor, ruler, 30);

    expect(snap).not.toBeNull();
    expect(snap.isSnapped).toBe(true);
    expect(snap.x).toBeCloseTo(250);
    expect(snap.y).toBeCloseTo(200); // Replaqué exactement sur le bord supérieur
    expect(snap.distAlong).toBeCloseTo(150);
  });

  it("clampe le tracé aux extrémités de la règle", () => {
    const ruler = { x: 100, y: 200, width: 350, angle: 0, active: true };
    // Curseur légèrement avant l'origine (x = 95)
    const snapBefore = getRulerEdgeSnapPoint({ x: 95, y: 205 }, ruler, 30);
    expect(snapBefore).not.toBeNull();
    expect(snapBefore.x).toBe(100); // Clamped to start

    // Curseur légèrement après la fin (x = 460)
    const snapAfter = getRulerEdgeSnapPoint({ x: 460, y: 198 }, ruler, 30);
    expect(snapAfter).not.toBeNull();
    expect(snapAfter.x).toBe(450); // Clamped to end (100 + 350)
  });

  it("rejette les points situés trop loin de la règle", () => {
    const ruler = { x: 100, y: 200, width: 350, angle: 0, active: true };
    const farCursor = { x: 250, y: 260 }; // 60px du bord (seuil = 30px)
    const snap = getRulerEdgeSnapPoint(farCursor, ruler, 30);

    expect(snap).toBeNull();
  });

  it("ignore l'aimantation si la règle est inactive", () => {
    const ruler = { x: 100, y: 200, width: 350, angle: 0, active: false };
    const cursor = { x: 200, y: 205 };
    const snap = getRulerEdgeSnapPoint(cursor, ruler, 30);

    expect(snap).toBeNull();
  });

  it("aimante correctement le long d'une règle inclinée à 45°", () => {
    const ruler = { x: 0, y: 0, width: 350, angle: 45, active: true };
    // À 45°, un point sur la ligne à distAlong = 100 est (100*cos45, 100*sin45) ~ (70.71, 70.71)
    const cursor = { x: 75, y: 70 };
    const snap = getRulerEdgeSnapPoint(cursor, ruler, 30);

    expect(snap).not.toBeNull();
    expect(snap.isSnapped).toBe(true);
    expect(snap.x).toBeCloseTo(snap.y, 1);
  });
});
