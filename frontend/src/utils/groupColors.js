/**
 * Utilitaires pour la gestion des couleurs associées aux groupes d'élèves.
 */

export const DEFAULT_GROUP_COLOR = "#6b7280";

export const PRESET_GROUP_COLORS = [
  { name: "Gris (défaut)", value: "#6b7280" },
  { name: "Bleu", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#a855f7" },
  { name: "Rose", value: "#ec4899" },
  { name: "Rouge", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Ambre", value: "#f59e0b" },
  { name: "Lime", value: "#84cc16" },
  { name: "Vert", value: "#10b981" },
  { name: "Sarcelle", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
];

/**
 * Normalise un code hexadécimal et renvoie ses composantes RGB.
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") {
    return { r: 107, g: 114, b: 128 };
  }

  const cleanHex = hex.trim().replace(/^#/, "");
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return { r, g, b };
    }
  } else if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return { r, g, b };
    }
  }

  return { r: 107, g: 114, b: 128 };
}

/**
 * Convertit un code hexadécimal en format rgba().
 * @param {string} hex
 * @param {number} [alpha=1]
 * @returns {string}
 */
export function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calcule une couleur foncée lisible sur fond clair pour le texte d'un badge.
 * @param {string} hex
 * @param {number} [factor=0.45]
 * @returns {string}
 */
export function getDarkenedColor(hex, factor = 0.45) {
  const { r, g, b } = hexToRgb(hex);
  const darkR = Math.max(0, Math.floor(r * factor));
  const darkG = Math.max(0, Math.floor(g * factor));
  const darkB = Math.max(0, Math.floor(b * factor));
  return `rgb(${darkR}, ${darkG}, ${darkB})`;
}

/**
 * Calcule la couleur de fond atténuée pour une ligne de tableau, mélangée avec du blanc.
 * Renvoyer une couleur opaque évite la transparence des cellules sticky lors du défilement horizontal.
 * @param {string} hex
 * @param {number} [alpha=0.08]
 * @returns {string}
 */
export function getGroupRowBg(hex, alpha = 0.08) {
  const { r, g, b } = hexToRgb(hex || DEFAULT_GROUP_COLOR);
  const blendR = Math.round(r * alpha + 255 * (1 - alpha));
  const blendG = Math.round(g * alpha + 255 * (1 - alpha));
  const blendB = Math.round(b * alpha + 255 * (1 - alpha));
  return `rgb(${blendR}, ${blendG}, ${blendB})`;
}

/**
 * Retourne le style CSS complet pour un badge de groupe (fond atténué, bordure, texte contrasté).
 * @param {string} hex
 * @returns {{ backgroundColor: string, borderColor: string, color: string }}
 */
export function getGroupBadgeStyle(hex) {
  const color = hex || DEFAULT_GROUP_COLOR;
  return {
    backgroundColor: hexToRgba(color, 0.12),
    borderColor: hexToRgba(color, 0.35),
    color: getDarkenedColor(color, 0.5),
  };
}

