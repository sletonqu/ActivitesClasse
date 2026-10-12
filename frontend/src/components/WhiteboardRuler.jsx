import React, { useCallback, useEffect, useRef } from "react";
import {
  RULER_CM_PX,
  RULER_MM_PX,
  RULER_HEIGHT,
  RULER_MIN_WIDTH,
  RULER_MAX_WIDTH,
  RULER_DEFAULT_WIDTH,
} from "../utils/whiteboardRulerSnap";

/**
 * Composant de règle graduée interactive optimisé pour TBI (Tableau Blanc Interactif tactile).
 * - Rotation continue ultra-fluide au sous-degré près (sans saccades ni crans de 1° ou 15°).
 * - Double poignée ergonomique (gauche = ancrage / déplacement, droite = pivotement fluide).
 * - Multi-touch à deux doigts en temps réel : un doigt pour l'ancre 0 cm et un doigt pour orienter la règle.
 * - Rafraîchissement optimisé avec requestAnimationFrame (60 FPS+).
 *
 * @param {Object} props
 * @param {boolean} props.isActive - Indique si la règle est affichée.
 * @param {{ x: number, y: number, width: number, angle: number }} props.rulerState - État de position, taille et angle.
 * @param {(updates: Partial<{ x: number, y: number, width: number, angle: number }>) => void} props.onUpdate - Callback de mise à jour.
 * @param {() => void} props.onClose - Callback pour fermer la règle.
 * @param {boolean} props.isSnapped - Indique si le tracé au crayon est actuellement aimanté à la règle.
 * @param {number} props.currentZoom - Niveau de zoom actuel du canevas.
 * @param {number} props.canvasWidth - Largeur totale du canevas.
 * @param {number} props.canvasHeight - Hauteur totale du canevas.
 * @param {React.RefObject<HTMLElement>} props.canvasFrameRef - Référence vers le cadre du canevas.
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
    const nextAngle = rulerStateRef.current.angle === 0 ? 90 : 0;
    scheduleUpdate({ angle: nextAngle });
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
        const deltaAngle = currentVectorAngle - interaction.startVectorAngle;

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
          const deltaAngle = currentAngleDeg - startAngleDeg;

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
      className="absolute select-none shadow-2xl rounded-sm border border-amber-400/80 bg-gradient-to-b from-amber-50/95 via-amber-100/90 to-amber-200/85 backdrop-blur-[2px] pointer-events-none"
      style={{
        left: `${rulerState.x}px`,
        top: `${rulerState.y}px`,
        width: `${rulerWidth}px`,
        height: `${RULER_HEIGHT}px`,
        transform: `rotate(${rulerState.angle}deg)`,
        transformOrigin: "0 0",
        zIndex: 35,
        touchAction: "none",
        boxShadow: isSnapped
          ? "0 0 0 2px #0284c7, 0 10px 25px -5px rgba(2, 132, 199, 0.4)"
          : "0 8px 20px -4px rgba(0, 0, 0, 0.25)",
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

      {/* Zone inférieure : Panneau de contrôle et poignées ergonomiques pour TBI */}
      <div className="absolute bottom-1 left-2 right-6 h-[38px] flex items-center justify-between gap-1 pointer-events-auto">
        {/* Poignée Extrémité Gauche (Origine 0 cm) : Idéale pour ancrer ou déplacer avec la main gauche */}
        <button
          id="interactive-whiteboard-ruler-handle-left"
          type="button"
          onPointerDown={(e) => handlePointerDown(e, "left")}
          title="Poignée gauche (0 cm) : Déplacer ou ancrer la règle (maintenable avec un 2e doigt)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-600/10 hover:bg-amber-600/20 active:bg-amber-600/30 text-amber-950 text-xs font-bold shadow-sm border border-amber-400 cursor-grab active:cursor-grabbing transition"
        >
          <span className="text-amber-800 text-sm">📍</span>
          <span>0 cm</span>
        </button>

        {/* Poignée centrale de déplacement général */}
        <button
          id="interactive-whiteboard-ruler-drag-handle"
          type="button"
          onPointerDown={(e) => handlePointerDown(e, "move")}
          title="Glisser pour déplacer l'ensemble de la règle"
          className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-white/70 hover:bg-white text-slate-700 text-xs font-semibold shadow-sm border border-amber-300 cursor-grab active:cursor-grabbing transition"
        >
          <span className="text-amber-700">⠿</span>
          <span>Glisser</span>
        </button>

        {/* Bloc d'angle et micro-ajustements */}
        <div className="flex items-center gap-1 bg-white/80 rounded-md border border-amber-300 px-1 py-1 shadow-sm">
          <button
            id="interactive-whiteboard-ruler-rotate-minus"
            type="button"
            onClick={() => handleStepRotate(-5)}
            title="Ajuster de -5°"
            className="px-1 text-slate-600 hover:text-slate-900 text-xs font-bold hover:bg-amber-100 rounded"
          >
            ⟲
          </button>

          <span
            id="interactive-whiteboard-ruler-angle-badge"
            className="px-1.5 text-xs font-extrabold text-sky-900 tracking-tight select-none"
            title="Angle actuel de la règle"
          >
            {Math.round(rulerState.angle)}°
          </span>

          <button
            id="interactive-whiteboard-ruler-rotate-plus"
            type="button"
            onClick={() => handleStepRotate(5)}
            title="Ajuster de +5°"
            className="px-1 text-slate-600 hover:text-slate-900 text-xs font-bold hover:bg-amber-100 rounded"
          >
            ⟳
          </button>

          <button
            id="interactive-whiteboard-ruler-angle-reset"
            type="button"
            onClick={handleResetAngle}
            title="Remettre à l'horizontale (0°)"
            className="text-[11px] px-1 text-amber-800 hover:bg-amber-100 rounded font-bold ml-0.5 border-l border-amber-200"
          >
            0°
          </button>
        </div>

        {/* Poignée Extrémité Droite : Pour orienter la règle avec la main droite (1 ou 2 doigts simultanés sur TBI) */}
        <button
          id="interactive-whiteboard-ruler-handle-right"
          type="button"
          onPointerDown={(e) => handlePointerDown(e, "right")}
          title="Poignée droite : Pivoter librement la règle à 1 ou 2 doigts sur le TBI"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 text-xs font-bold shadow-md border border-sky-700 cursor-pointer active:cursor-grabbing transition"
        >
          <span>🔄</span>
          <span>Pivoter</span>
        </button>

        {/* Bouton de suppression / fermeture de la règle */}
        <button
          id="interactive-whiteboard-ruler-close-button"
          type="button"
          onClick={onClose}
          title="Fermer la règle"
          className="h-7 w-7 flex items-center justify-center rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs border border-rose-300 transition"
        >
          ✕
        </button>
      </div>

      {/* Poignée de redimensionnement de la longueur (à l'extrémité droite) */}
      <div
        id="interactive-whiteboard-ruler-resize-handle"
        onPointerDown={(e) => handlePointerDown(e, "resize")}
        title="Glisser pour allonger ou raccourcir la règle"
        className="absolute top-0 right-0 bottom-0 w-6 flex items-center justify-center bg-amber-300/70 hover:bg-amber-400 text-amber-950 text-xs font-bold border-l border-amber-400/80 cursor-ew-resize select-none pointer-events-auto transition rounded-r-sm"
      >
        <span className="leading-none">⇥</span>
      </div>
    </div>
  );
};

export default React.memo(WhiteboardRuler);
