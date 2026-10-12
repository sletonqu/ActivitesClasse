import { describe, expect, it } from "vitest";
import {
  getRulerGeometry,
  getRulerEdgeSnapPoint,
  RULER_CM_PX,
  RULER_MM_PX,
  RULER_DEFAULT_WIDTH,
} from "./whiteboardRulerSnap";

describe("whiteboardRulerSnap", () => {
  it("respecte la calibration métrique du canevas (1 mm = 5 px, 1 cm = 50 px)", () => {
    expect(RULER_MM_PX).toBe(5);
    expect(RULER_CM_PX).toBe(50);
    expect(RULER_CM_PX).toBe(RULER_MM_PX * 10);
    expect(RULER_DEFAULT_WIDTH).toBe(15 * RULER_CM_PX);
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
