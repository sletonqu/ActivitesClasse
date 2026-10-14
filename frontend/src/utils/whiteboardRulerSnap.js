/**
 * Utilitaires géométriques, étalonnage métrique et aimantation pour la règle du tableau blanc interactif.
 *
 * Échelle métrique calibrée sur le canevas :
 * - 1 mm = 5 px
 * - 0.5 cm = 25 px (petits carreaux du fond "Carreaux géométrie")
 * - 1 cm = 50 px
 * - 3 cm = 150 px (grands carreaux du fond "Carreaux géométrie", soit 6 petits carreaux)
 *
 * Spécifications de la règle :
 * - Hauteur fixe : 80 px (1.6 cm)
 * - Longueur par défaut : 10 cm = 500 px
 * - Longueur min/max : 7 cm (350 px) à 24 cm (1200 px)
 * - Position par défaut : x = 370 px (centré horizontalement), y = 420 px (juste au-dessus de la barre d'outils)
 * - Tolérance d'aimantation par défaut : 15 px
 */
export const RULER_CM_PX = 50;
export const RULER_MM_PX = 5;
export const RULER_HEIGHT = 80;
export const RULER_MIN_WIDTH = 350; // 7 cm * 50 = 350 px
export const RULER_MAX_WIDTH = 1200; // 24 cm * 50 = 1200 px
export const RULER_DEFAULT_WIDTH = 500; // 10 cm * 50 = 500 px
export const RULER_DEFAULT_OPACITY = 0.8;
export const RULER_OPACITY_PRESETS = [0.8, 0.5, 0.25, 1.0];

export const DEFAULT_RULER_STATE = {
  x: 370,
  y: 420,
  width: RULER_DEFAULT_WIDTH,
  angle: 0,
  opacity: RULER_DEFAULT_OPACITY,
};

/**
 * Détermine le prochain niveau d'opacité dans le cycle (Option A : bouton cyclique).
 *
 * @param {number} [currentOpacity=0.8]
 * @returns {number}
 */
export function getNextRulerOpacity(currentOpacity) {
  const safeOpacity = typeof currentOpacity === "number" ? currentOpacity : RULER_DEFAULT_OPACITY;
  let closestIndex = 0;
  let minDiff = Infinity;
  for (let i = 0; i < RULER_OPACITY_PRESETS.length; i++) {
    const diff = Math.abs(RULER_OPACITY_PRESETS[i] - safeOpacity);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return RULER_OPACITY_PRESETS[(closestIndex + 1) % RULER_OPACITY_PRESETS.length];
}

/**
 * Calcule le nouvel état de la règle lors d'un clic sur le bouton de réinitialisation/bascule d'angle :
 * - Si l'angle est 0° : place verticalement à 90° avec rotation autour du milieu de la règle.
 * - Si l'angle est 90° : replace horizontalement à 0° avec rotation symétrique autour du milieu de la règle.
 * - Si l'angle est quelconque (ex: 30°) : réaligne à 0° avec le point 0 cm comme origine (x et y conservés).
 *
 * @param {{ x: number, y: number, width?: number, angle?: number }} ruler
 * @returns {{ x: number, y: number, angle: number }}
 */
export function getNextRulerAngleResetState(ruler) {
  const currentAngle = Math.round(Number(ruler?.angle) || 0);
  const normalizedAngle = ((currentAngle % 360) + 360) % 360;
  const x = Number(ruler?.x) || 0;
  const y = Number(ruler?.y) || 0;
  const width = Math.max(RULER_MIN_WIDTH, Number(ruler?.width) || RULER_DEFAULT_WIDTH);
  const height = RULER_HEIGHT;

  if (normalizedAngle === 0) {
    return {
      x: Math.round(x + (width + height) / 2),
      y: Math.round(y + (height - width) / 2),
      angle: 90,
      width,
    };
  }

  if (normalizedAngle === 90) {
    return {
      x: Math.round(x - (width + height) / 2),
      y: Math.round(y - (height - width) / 2),
      angle: 0,
      width,
    };
  }

  return {
    x,
    y,
    angle: 0,
    width,
  };
}


/**
 * Calcule les caractéristiques géométriques du bord supérieur de la règle.
 * L'origine locale (0, 0) correspond au point "0 cm" (coin supérieur gauche).
 *
 * @param {{ x: number, y: number, width: number, angle: number }} ruler
 * @returns {{ start: { x: number, y: number }, end: { x: number, y: number }, width: number, angleRad: number, cos: number, sin: number }}
 */
export function getRulerGeometry(ruler) {
  const angleRad = (((ruler?.angle || 0) % 360) * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const width = Math.max(RULER_MIN_WIDTH, ruler?.width || RULER_DEFAULT_WIDTH);

  return {
    start: { x: Number(ruler?.x) || 0, y: Number(ruler?.y) || 0 },
    end: {
      x: (Number(ruler?.x) || 0) + width * cos,
      y: (Number(ruler?.y) || 0) + width * sin,
    },
    width,
    angleRad,
    cos,
    sin,
  };
}

/**
 * Projette et aimante un point sur le bord supérieur de la règle.
 *
 * @param {{ x: number, y: number }} point - Coordonnées du point dans le repère du canevas.
 * @param {{ x: number, y: number, width: number, angle: number, active?: boolean }} ruler - État de la règle.
 * @param {number} [snapThreshold=15] - Tolérance de distance perpendiculaire en pixels.
 * @returns {{ x: number, y: number, isSnapped: boolean, distPerp: number, t: number, distAlong: number } | null}
 */
export function getRulerEdgeSnapPoint(point, ruler, snapThreshold = 15) {
  if (!ruler || !point) return null;
  if (ruler.active === false) return null;

  const geom = getRulerGeometry(ruler);
  const dx = point.x - geom.start.x;
  const dy = point.y - geom.start.y;

  // Projection le long du bord supérieur (axe X local)
  const distAlong = dx * geom.cos + dy * geom.sin;
  // Distance perpendiculaire au bord supérieur (axe Y local)
  const distPerp = -dx * geom.sin + dy * geom.cos;

  const margin = 14;
  const isWithinLength = distAlong >= -margin && distAlong <= geom.width + margin;
  const isWithinDistance = Math.abs(distPerp) <= snapThreshold;

  if (isWithinLength && isWithinDistance) {
    const clampedAlong = Math.max(0, Math.min(geom.width, distAlong));
    return {
      x: geom.start.x + clampedAlong * geom.cos,
      y: geom.start.y + clampedAlong * geom.sin,
      isSnapped: true,
      distPerp: Math.abs(distPerp),
      distAlong: clampedAlong,
      t: clampedAlong / geom.width,
    };
  }

  return null;
}
