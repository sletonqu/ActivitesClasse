import React, { useCallback, useEffect, useRef } from "react";
import {
  RULER_CM_PX,
  RULER_MM_PX,
  RULER_HEIGHT,
  RULER_MIN_WIDTH,
  RULER_MAX_WIDTH,
  RULER_DEFAULT_WIDTH,
  RULER_DEFAULT_OPACITY,
  getNextRulerOpacity,
  getNextRulerAngleResetState,
} from "../utils/whiteboardRulerSnap";

/**
 * Composant de règle graduée interactive optimisé pour TBI (Tableau Blanc Interactif tactile).
 * - Étalonnage métrique : 1 mm = 5 px, 1 cm = 50 px (calé sur les fonds géométrie et papier millimétré).
 * - Longueur : 10 cm par défaut (500 px), redimensionnable de 7 cm (350 px) à 24 cm (1200 px) via la poignée droite ⇥.
 * - Position par défaut : centrée horizontalement sur l'écran et située juste au-dessus de la barre d'outils, réinitialisée via le bouton ✕.
 * - Déplacement direct : l'ensemble de la surface de la règle est sélectionnable et déplaçable au toucher ou à la souris.
 * - Double poignée ergonomique épurée (symboles vectoriels) :
 *   • Poignée gauche (⦿) : point fixe d'ancrage à 0 cm et translation.
 *   • Poignée droite (⤸, largeur 56 px) : orientation et pivotement libre au sous-degré près.
 * - Multi-touch 2 doigts TBI : un doigt pour ancrer au point 0 et un second doigt pour orienter la règle en temps réel.
 * - Ajustements d'angle : pas-à-pas de ±5° et bascule 0°/90° pivotant autour du milieu de la règle.
 * - Transparence : bouton cyclique ◐ alternant 80% ➔ 50% ➔ 25% ➔ 100% d'opacité pour voir les tracés sous-jacents.
 * - Aimantation magnétique : le tracé au crayon s'aimante le long du bord supérieur gradué (zone de tolérance de 15 px).
 * - Rafraîchissement 60 FPS+ optimisé avec requestAnimationFrame sans latence.
 *
 * @param {Object} props
 * @param {boolean} props.isActive - Indique si la règle est affichée.
 * @param {{ x: number, y: number, width: number, angle: number, opacity?: number }} props.rulerState - État de la règle.
 * @param {(updates: Partial<{ x: number, y: number, width: number, angle: number, opacity: number }>) => void} props.onUpdate - Callback de mise à jour.
 * @param {() => void} props.onClose - Callback pour fermer la règle et réinitialiser sa position.
 * @param {boolean} props.isSnapped - Indique si le tracé au crayon est actuellement aimanté à la règle.
 * @param {number} props.currentZoom - Niveau de zoom actuel du canevas.
 * @param {number} props.canvasWidth - Largeur totale du canevas.
 * @param {number} props.canvasHeight - Hauteur totale du canevas.
 * @param {React.RefObject<HTMLElement>} props.canvasFrameRef - Référence vers le cadre du canevas.
 * @param {string} props.mode - Mode actuel de l'outil (draw, select, pan...).
 */
const WhiteboardRuler = ({
  isActive,
  rulerState,
  onUpdate,
  onClose,
  isSnapped = false,
  currentZoom = 1.0,
  canvasWidth = 1240,
  canvasHeight = 1754,
  canvasFrameRef,
  mode = "draw",
}) => {
  // Références stables pour éviter les réattachements d'écouteurs pendant les mouvements
  const rulerStateRef = useRef(rulerState);
  useEffect(() => {
    rulerStateRef.current = rulerState;
  }, [rulerState]);

  const currentZoomRef = useRef(currentZoom);
  useEffect(() => {
    currentZoomRef.current = currentZoom;
  }, [currentZoom]);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Gestion multi-touch des pointeurs TBI
  const activePointersRef = useRef(new Map());
  const interactionRef = useRef(null);

  // Optimisation 60 FPS avec requestAnimationFrame pour éliminer toute saccade
  const rafIdRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  const scheduleUpdate = useCallback((updates) => {
    pendingUpdateRef.current = { ...(pendingUpdateRef.current || {}), ...updates };
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current && onUpdateRef.current) {
          onUpdateRef.current(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        rafIdRef.current = null;
      });
    }
  }, []);

  const flushPendingUpdate = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingUpdateRef.current && onUpdateRef.current) {
      onUpdateRef.current(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
  }, []);

  const getCanvasCoords = useCallback(
    (e) => {
      if (!canvasFrameRef?.current) {
        return { x: 0, y: 0 };
      }
      const rect = canvasFrameRef.current.getBoundingClientRect();
      const zoom = currentZoomRef.current || 1;
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
    },
    [canvasFrameRef]
  );

  const handlePointerDown = (e, targetType) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const canvasCoords = getCanvasCoords(e);
    activePointersRef.current.set(e.pointerId, {
      x: canvasCoords.x,
      y: canvasCoords.y,
      targetType,
    });

    const activeList = Array.from(activePointersRef.current.entries());
    const currentRuler = rulerStateRef.current;

    if (activeList.length === 1) {
      // 1 doigt ou stylet actif
      const [, pt] = activeList[0];
      const startAngleRad = Math.atan2(pt.y - currentRuler.y, pt.x - currentRuler.x);
      const startAngleDeg = (startAngleRad * 180) / Math.PI;

      interactionRef.current = {
        mode: "single",
        pointerId: e.pointerId,
        targetType,
        startPointerX: pt.x,
        startPointerY: pt.y,
        startRulerX: currentRuler.x,
        startRulerY: currentRuler.y,
        startRulerAngle: currentRuler.angle,
        startRulerWidth: currentRuler.width,
        startAngleDeg,
      };
    } else if (activeList.length >= 2) {
      // 2 doigts détectés simultanément (multi-touch TBI)
      let p1 = activeList[0];
      let p2 = activeList[1];

      // Détermine quel doigt est le plus proche de l'origine (0 cm)
      const rad = (currentRuler.angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const distAlong1 = (p1[1].x - currentRuler.x) * cos + (p1[1].y - currentRuler.y) * sin;
      const distAlong2 = (p2[1].x - currentRuler.x) * cos + (p2[1].y - currentRuler.y) * sin;

      if (distAlong1 > distAlong2 || p2[1].targetType === "left" || p1[1].targetType === "right") {
        p1 = activeList[1];
        p2 = activeList[0];
      }

      const initialVectorAngle = Math.atan2(p2[1].y - p1[1].y, p2[1].x - p1[1].x) * (180 / Math.PI);

      interactionRef.current = {
        mode: "dual",
        p1Id: p1[0],
        p2Id: p2[0],
        startP1: { x: p1[1].x, y: p1[1].y },
        startP2: { x: p2[1].y, y: p2[1].y },
        startRulerX: currentRuler.x,
        startRulerY: currentRuler.y,
        startRulerAngle: currentRuler.angle,
        startVectorAngle: initialVectorAngle,
      };
    }
  };

  const handleStepRotate = (deltaDeg) => {
    let nextAngle = ((rulerStateRef.current.angle + deltaDeg) % 360 + 360) % 360;
    // Arrondi propre à 1 décimale pour les boutons pas-à-pas
    nextAngle = Math.round(nextAngle * 10) / 10;
    scheduleUpdate({ angle: nextAngle });
  };

  const handleResetAngle = () => {
    const nextState = getNextRulerAngleResetState(rulerStateRef.current);
    scheduleUpdate(nextState);
  };

  const handleCycleOpacity = () => {
    const currentOpacity =
      typeof rulerStateRef.current.opacity === "number"
        ? rulerStateRef.current.opacity
        : RULER_DEFAULT_OPACITY;
    const nextOpacity = getNextRulerOpacity(currentOpacity);
    scheduleUpdate({ opacity: nextOpacity });
  };

  useEffect(() => {
    if (!isActive) return;

    const handleWindowPointerMove = (e) => {
      if (!activePointersRef.current.has(e.pointerId)) return;

      const coords = getCanvasCoords(e);
      const prevData = activePointersRef.current.get(e.pointerId);
      activePointersRef.current.set(e.pointerId, {
        ...prevData,
        x: coords.x,
        y: coords.y,
      });

      const interaction = interactionRef.current;
      if (!interaction) return;

      const currentRuler = rulerStateRef.current;

      if (interaction.mode === "dual") {
        // Multi-touch 2 doigts sur le TBI : rotation continue ultra-fluide sans aucune saccade
        const p1 = activePointersRef.current.get(interaction.p1Id);
        const p2 = activePointersRef.current.get(interaction.p2Id);
        if (!p1 || !p2) return;

        const currentVectorAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
        let deltaAngle = currentVectorAngle - interaction.startVectorAngle;
        while (deltaAngle > 180) deltaAngle -= 360;
        while (deltaAngle < -180) deltaAngle += 360;

        let nextAngle = ((interaction.startRulerAngle + deltaAngle) % 360 + 360) % 360;
        // Précision au millième de degré (0.001°) pour une fluidité absolue à l'écran
        nextAngle = Math.round(nextAngle * 1000) / 1000;

        // Le premier doigt (ancrage) translate la position
        const nextX = Math.round((interaction.startRulerX + (p1.x - interaction.startP1.x)) * 10) / 10;
        const nextY = Math.round((interaction.startRulerY + (p1.y - interaction.startP1.y)) * 10) / 10;

        const clampedX = Math.max(-currentRuler.width + 60, Math.min(canvasWidth - 60, nextX));
        const clampedY = Math.max(0, Math.min(canvasHeight - 60, nextY));

        scheduleUpdate({ x: clampedX, y: clampedY, angle: nextAngle });
      } else if (interaction.mode === "single" && interaction.pointerId === e.pointerId) {
        const {
          targetType,
          startPointerX,
          startPointerY,
          startRulerX,
          startRulerY,
          startRulerAngle,
          startAngleDeg,
          startRulerWidth,
        } = interaction;

        if (targetType === "move" || targetType === "left") {
          // Déplacement de la règle ou de l'ancre gauche
          const nextX = Math.round((startRulerX + (coords.x - startPointerX)) * 10) / 10;
          const nextY = Math.round((startRulerY + (coords.y - startPointerY)) * 10) / 10;

          const clampedX = Math.max(-currentRuler.width + 60, Math.min(canvasWidth - 60, nextX));
          const clampedY = Math.max(0, Math.min(canvasHeight - 60, nextY));

          scheduleUpdate({ x: clampedX, y: clampedY });
        } else if (targetType === "right" || targetType === "rotate") {
          // Poignée droite : pivotement continu ultra-fluide au millième de degré (0.001°)
          const currentAngleRad = Math.atan2(coords.y - startRulerY, coords.x - startRulerX);
          const currentAngleDeg = (currentAngleRad * 180) / Math.PI;
          let deltaAngle = currentAngleDeg - startAngleDeg;
          while (deltaAngle > 180) deltaAngle -= 360;
          while (deltaAngle < -180) deltaAngle += 360;

          let nextAngle = ((startRulerAngle + deltaAngle) % 360 + 360) % 360;
          // Précision au millième de degré (0.001°)
          nextAngle = Math.round(nextAngle * 1000) / 1000;

          scheduleUpdate({ angle: nextAngle });
        } else if (targetType === "resize") {
          // Ajustement de la longueur le long de l'axe longitudinal de la règle
          const rad = (currentRuler.angle * Math.PI) / 180;
          const dx = coords.x - startPointerX;
          const dy = coords.y - startPointerY;
          const deltaAlongAxis = dx * Math.cos(rad) + dy * Math.sin(rad);

          const maxWidth = Math.min(canvasWidth, RULER_MAX_WIDTH);
          const nextWidth = Math.max(
            RULER_MIN_WIDTH,
            Math.min(maxWidth, Math.round(startRulerWidth + deltaAlongAxis))
          );

          scheduleUpdate({ width: nextWidth });
        }
      }
    };

    const handleWindowPointerUp = (e) => {
      activePointersRef.current.delete(e.pointerId);
      flushPendingUpdate();

      const remaining = Array.from(activePointersRef.current.entries());
      const currentRuler = rulerStateRef.current;

      if (remaining.length === 1) {
        // Transition fluide si un doigt reste posé sur le TBI
        const [remainingId, pt] = remaining[0];
        const startAngleRad = Math.atan2(pt.y - currentRuler.y, pt.x - currentRuler.x);
        const startAngleDeg = (startAngleRad * 180) / Math.PI;

        interactionRef.current = {
          mode: "single",
          pointerId: remainingId,
          targetType: pt.targetType || "move",
          startPointerX: pt.x,
          startPointerY: pt.y,
          startRulerX: currentRuler.x,
          startRulerY: currentRuler.y,
          startRulerAngle: currentRuler.angle,
          startRulerWidth: currentRuler.width,
          startAngleDeg,
        };
      } else if (remaining.length === 0) {
        interactionRef.current = null;
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
      flushPendingUpdate();
    };
  }, [isActive, getCanvasCoords, canvasWidth, canvasHeight, scheduleUpdate, flushPendingUpdate]);

  if (!isActive) {
    return null;
  }

  const rulerWidth = Math.max(RULER_MIN_WIDTH, rulerState.width || RULER_DEFAULT_WIDTH);
  const totalMm = Math.floor(rulerWidth / RULER_MM_PX);
  const totalCm = Math.floor(rulerWidth / RULER_CM_PX);
  const rulerOpacity =
    typeof rulerState.opacity === "number"
      ? rulerState.opacity
      : RULER_DEFAULT_OPACITY;

  // Construction optimisée des graduations en un seul tracé vectoriel SVG
  let mmTicksPath = "";
  for (let mm = 0; mm <= totalMm; mm++) {
    const x = mm * RULER_MM_PX;
    if (x > rulerWidth - 2) break;
    const isCm = mm % 10 === 0;
    const isHalfCm = mm % 5 === 0;
    const tickH = isCm ? 18 : isHalfCm ? 12 : 7;
    mmTicksPath += `M ${x.toFixed(1)} 0 L ${x.toFixed(1)} ${tickH} `;
  }

  // Étiquettes des centimètres (0, 1, 2...)
  const cmLabels = [];
  for (let cm = 0; cm <= totalCm; cm++) {
    const x = cm * RULER_CM_PX;
    if (x > rulerWidth - 12) break;
    cmLabels.push(
      <text
        key={cm}
        x={cm === 0 ? 3 : x}
        y={28}
        textAnchor={cm === 0 ? "start" : "middle"}
        fontSize="11"
        fontWeight="700"
        fill="#1e293b"
        className="select-none pointer-events-none"
      >
        {cm}
      </text>
    );
  }

  return (
    <div
      id="interactive-whiteboard-ruler-overlay"
      className="absolute select-none shadow-2xl rounded-sm border pointer-events-none"
      style={{
        left: `${rulerState.x}px`,
        top: `${rulerState.y}px`,
        width: `${rulerWidth}px`,
        height: `${RULER_HEIGHT}px`,
        transform: `rotate(${rulerState.angle}deg)`,
        transformOrigin: "0 0",
        zIndex: 35,
        touchAction: "none",
        background: `linear-gradient(to bottom, rgba(254, 249, 195, ${rulerOpacity}), rgba(253, 230, 138, ${rulerOpacity * 0.92}), rgba(252, 211, 77, ${rulerOpacity * 0.85}))`,
        borderColor: `rgba(245, 158, 11, ${Math.max(0.35, rulerOpacity * 0.85)})`,
        backdropFilter: rulerOpacity < 0.9 ? "blur(2px)" : "none",
        WebkitBackdropFilter: rulerOpacity < 0.9 ? "blur(2px)" : "none",
        boxShadow: isSnapped
          ? "0 0 0 2px #0284c7, 0 10px 25px -5px rgba(2, 132, 199, 0.4)"
          : `0 8px 20px -4px rgba(0, 0, 0, ${0.15 * rulerOpacity + 0.1})`,
      }}
    >
      {/* Ligne d'aimantation du bord supérieur */}
      <div
        id="interactive-whiteboard-ruler-snap-edge"
        className={`absolute top-0 left-0 right-0 h-[2px] transition-all pointer-events-none ${
          isSnapped
            ? "bg-sky-600 shadow-[0_0_8px_#0284c7] scale-y-150"
            : "bg-amber-500/70"
        }`}
      />

      {/* Zone supérieure : Graduations SVG (pointer-events-none pour laisser passer le tracé sur le canevas) */}
      <div className="absolute top-0 left-0 right-0 h-[34px] pointer-events-none overflow-hidden">
        <svg
          className="w-full h-full block"
          viewBox={`0 0 ${rulerWidth} 34`}
          preserveAspectRatio="none"
        >
          <path
            d={mmTicksPath}
            stroke="#334155"
            strokeWidth="1"
            strokeLinecap="square"
          />
          {cmLabels}
          <text
            x={Math.min(rulerWidth - 16, totalCm * RULER_CM_PX + 12)}
            y={27}
            fontSize="9"
            fontWeight="600"
            fill="#64748b"
            className="select-none pointer-events-none"
          >
            cm
          </text>
        </svg>
      </div>

      {/* Surface principale déplaçable de l'ensemble de la règle */}
      <div
        id="interactive-whiteboard-ruler-drag-handle"
        onPointerDown={(e) => handlePointerDown(e, "move")}
        title="Glisser pour déplacer la règle"
        className={`absolute left-0 right-6 bottom-0 pointer-events-auto cursor-grab active:cursor-grabbing select-none ${
          mode === "draw" ? "top-[16px]" : "top-0"
        }`}
      />

      {/* Zone inférieure : Panneau de contrôle et poignées ergonomiques épurées pour TBI */}
      <div className="absolute bottom-1 left-2 right-6 h-[38px] flex items-center justify-between gap-1 pointer-events-none">
        {/* Poignée Extrémité Gauche (Origine 0 cm) : Idéale pour ancrer ou déplacer avec la main gauche */}
        <button
          id="interactive-whiteboard-ruler-handle-left"
          type="button"
          onPointerDown={(e) => handlePointerDown(e, "left")}
          title="Point fixe origine (0 cm) : Déplacer ou ancrer la règle (maintenable avec un 2e doigt)"
          className="h-7 w-7 flex items-center justify-center rounded-md bg-amber-600/10 hover:bg-amber-600/20 active:bg-amber-600/30 text-amber-950 text-base font-bold shadow-sm border border-amber-400 cursor-grab active:cursor-grabbing pointer-events-auto transition"
        >
          <span className="leading-none">⦿</span>
        </button>

        {/* Bloc d'angle et micro-ajustements */}
        <div className="flex items-center gap-1 bg-amber-600/10 rounded-md border border-amber-400 px-1 py-0.5 shadow-sm h-7 pointer-events-auto">
          <button
            id="interactive-whiteboard-ruler-rotate-minus"
            type="button"
            onClick={() => handleStepRotate(-5)}
            title="Ajuster de -5°"
            className="w-5 h-5 flex items-center justify-center text-amber-950 hover:bg-amber-600/20 text-xs font-bold rounded transition"
          >
            ⟲
          </button>

          <span
            id="interactive-whiteboard-ruler-angle-badge"
            className="px-1 text-xs font-extrabold text-amber-950 tracking-tight select-none min-w-[28px] text-center"
            title="Angle actuel de la règle"
          >
            {Math.round(rulerState.angle)}°
          </span>

          <button
            id="interactive-whiteboard-ruler-rotate-plus"
            type="button"
            onClick={() => handleStepRotate(5)}
            title="Ajuster de +5°"
            className="w-5 h-5 flex items-center justify-center text-amber-950 hover:bg-amber-600/20 text-xs font-bold rounded transition"
          >
            ⟳
          </button>

          <button
            id="interactive-whiteboard-ruler-angle-reset"
            type="button"
            onClick={handleResetAngle}
            title={
              Math.round(rulerState.angle || 0) === 0
                ? "Pivoter verticalement à 90° (depuis le milieu)"
                : "Remettre à l'horizontale (0°)"
            }
            className="text-[11px] px-1 text-amber-950 hover:bg-amber-600/20 rounded font-bold ml-0.5 border-l border-amber-400/60 h-5 flex items-center justify-center transition"
          >
            {Math.round(rulerState.angle || 0) === 0 ? "90°" : "0°"}
          </button>
        </div>

        {/* Bouton d'ajustement cyclique de la transparence */}
        <button
          id="interactive-whiteboard-ruler-opacity-button"
          type="button"
          onClick={handleCycleOpacity}
          title={`Opacité de la règle : ${Math.round(rulerOpacity * 100)}% (cliquer pour alterner 80% ➔ 50% ➔ 25% ➔ 100%)`}
          className="h-7 w-14 flex items-center justify-center gap-1 rounded-md bg-amber-600/10 hover:bg-amber-600/20 active:bg-amber-600/30 text-amber-950 text-xs font-bold shadow-sm border border-amber-400 cursor-pointer active:scale-95 transition select-none flex-shrink-0 pointer-events-auto"
        >
          <span className="text-sm leading-none" aria-hidden="true">◐</span>
          <span className="text-[10px] font-bold">{Math.round(rulerOpacity * 100)}%</span>
        </button>

        {/* Poignée Extrémité Droite : Pour orienter la règle avec la main droite (1 ou 2 doigts simultanés sur TBI) */}
        <button
          id="interactive-whiteboard-ruler-handle-right"
          type="button"
          onPointerDown={(e) => handlePointerDown(e, "right")}
          title="Poignée droite : Pivoter librement la règle à 1 ou 2 doigts sur le TBI"
          className="h-7 w-14 flex items-center justify-center rounded-md bg-amber-600/10 hover:bg-amber-600/20 active:bg-amber-600/30 text-amber-950 text-base font-bold shadow-sm border border-amber-400 cursor-pointer active:cursor-grabbing pointer-events-auto transition flex-shrink-0"
        >
          <span className="leading-none text-lg">⤸</span>
        </button>

        {/* Bouton de fermeture et réinitialisation de la règle */}
        <button
          id="interactive-whiteboard-ruler-close-button"
          type="button"
          onClick={onClose}
          title="Fermer et réinitialiser la position de la règle"
          className="h-7 w-7 flex items-center justify-center rounded-md bg-amber-600/10 hover:bg-amber-600/20 active:bg-amber-600/30 text-amber-950 font-bold text-xs shadow-sm border border-amber-400 cursor-pointer pointer-events-auto transition"
        >
          ✕
        </button>
      </div>

      {/* Poignée de redimensionnement de la longueur (à l'extrémité droite) */}
      <div
        id="interactive-whiteboard-ruler-resize-handle"
        onPointerDown={(e) => handlePointerDown(e, "resize")}
        title="Glisser pour allonger ou raccourcir la règle"
        className="absolute top-0 right-0 bottom-0 w-6 flex items-center justify-center text-amber-950 text-xs font-bold border-l cursor-ew-resize select-none pointer-events-auto transition rounded-r-sm"
        style={{
          backgroundColor: `rgba(252, 211, 77, ${Math.max(0.4, rulerOpacity * 0.75)})`,
          borderColor: `rgba(245, 158, 11, ${Math.max(0.35, rulerOpacity)})`,
        }}
      >
        <span className="leading-none">⇥</span>
      </div>
    </div>
  );
};

export default React.memo(WhiteboardRuler);
