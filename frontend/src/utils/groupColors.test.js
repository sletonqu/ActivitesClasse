import { describe, expect, it } from "vitest";
import {
  DEFAULT_GROUP_COLOR,
  PRESET_GROUP_COLORS,
  getDarkenedColor,
  getGroupBadgeStyle,
  getGroupRowBg,
  hexToRgb,
  hexToRgba,
} from "./groupColors";

describe("groupColors utility", () => {
  it("définit la couleur grise par défaut #6b7280", () => {
    expect(DEFAULT_GROUP_COLOR).toBe("#6b7280");
  });

  it("fournit une liste de presets contenant du gris", () => {
    expect(PRESET_GROUP_COLORS.length).toBeGreaterThan(5);
    expect(PRESET_GROUP_COLORS.some((p) => p.value === "#6b7280")).toBe(true);
  });

  it("convertit correctement un hex valide en rgb et rgba", () => {
    expect(hexToRgb("#3b82f6")).toEqual({ r: 59, g: 130, b: 246 });
    expect(hexToRgba("#3b82f6", 0.5)).toBe("rgba(59, 130, 246, 0.5)");
  });

  it("gère les formats courts à 3 caractères", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("utilise la couleur par défaut pour un hex invalide ou manquant", () => {
    expect(hexToRgb(null)).toEqual({ r: 107, g: 114, b: 128 });
    expect(hexToRgb("invalid")).toEqual({ r: 107, g: 114, b: 128 });
  });

  it("calcule une couleur atténuée opaque pour le fond de ligne", () => {
    const rowBg = getGroupRowBg("#3b82f6", 0.1);
    expect(rowBg).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  it("calcule les styles de badge avec fond, bordure et couleur de texte", () => {
    const badgeStyle = getGroupBadgeStyle("#3b82f6");
    expect(badgeStyle).toHaveProperty("backgroundColor");
    expect(badgeStyle).toHaveProperty("borderColor");
    expect(badgeStyle).toHaveProperty("color");
    expect(badgeStyle.backgroundColor).toContain("rgba(59, 130, 246, 0.12)");
  });

  it("calcule une couleur assombrie lisible", () => {
    const dark = getDarkenedColor("#3b82f6", 0.5);
    expect(dark).toBe("rgb(29, 65, 123)");
  });
});

