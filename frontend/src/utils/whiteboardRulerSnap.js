// Échelle calibrée sur le canevas : papier millimétré avec 1 mm = 5 px et 1 cm = 50 px
export const RULER_CM_PX = 50;
export const RULER_MM_PX = 5;
export const RULER_HEIGHT = 80;
export const RULER_MIN_WIDTH = 300; // 6 cm * 50 = 300 px
export const RULER_MAX_WIDTH = 1200; // 24 cm * 50 = 1200 px
export const RULER_DEFAULT_WIDTH = 750; // 15 cm * 50 = 750 px

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
 * @param {number} [snapThreshold=30] - Tolérance de distance perpendiculaire en pixels.
 * @returns {{ x: number, y: number, isSnapped: boolean, distPerp: number, t: number, distAlong: number } | null}
 */
export function getRulerEdgeSnapPoint(point, ruler, snapThreshold = 30) {
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
