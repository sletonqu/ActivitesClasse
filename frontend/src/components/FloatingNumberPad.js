import React, { useEffect, useRef, useState } from "react";

const NUMBER_PAD_POSITION_STORAGE_KEY = "floating-number-pad-position";
const NUMBER_PAD_KEYS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["<", "0", ">"],
  ["="],
];

const FloatingNumberPad = ({
  isOpen,
  activeFieldLabel,
  onKeyPress,
  onBackspace,
  onClose,
  disabledKeys = [],
}) => {
  const [position, setPosition] = useState({ x: null, y: null });
  const panelRef = useRef(null);
  const dragOffsetRef = useRef(null);

  const clampPosition = (nextX, nextY) => {
    const panelWidth = panelRef.current?.offsetWidth || 240;
    const panelHeight = panelRef.current?.offsetHeight || 210;
    const maxX = Math.max(8, window.innerWidth - panelWidth - 8);
    const maxY = Math.max(8, window.innerHeight - panelHeight - 8);

    return {
      x: Math.min(Math.max(8, nextX), maxX),
      y: Math.min(Math.max(8, nextY), maxY),
    };
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const savedPosition = window.sessionStorage.getItem(NUMBER_PAD_POSITION_STORAGE_KEY);
      if (!savedPosition) {
        return;
      }

      const parsedPosition = JSON.parse(savedPosition);
      if (typeof parsedPosition?.x === "number" && typeof parsedPosition?.y === "number") {
        setPosition(parsedPosition);
      }
    } catch {
      window.sessionStorage.removeItem(NUMBER_PAD_POSITION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || position.x === null || position.y === null) {
      return;
    }

    window.sessionStorage.setItem(NUMBER_PAD_POSITION_STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (!isOpen) {
      dragOffsetRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    if (position.x !== null && position.y !== null) {
      setPosition((currentPosition) => clampPosition(currentPosition.x, currentPosition.y));
    }

    const handlePointerMove = (event) => {
      if (!dragOffsetRef.current) {
        return;
      }

      const { offsetX, offsetY } = dragOffsetRef.current;
      setPosition(clampPosition(event.clientX - offsetX, event.clientY - offsetY));
    };

    const stopDragging = () => {
      dragOffsetRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const disabledSet = new Set(disabledKeys);

  const handleDragStart = (event) => {
    const rect = panelRef.current?.getBoundingClientRect();
    const startX = position.x ?? rect?.left ?? 8;
    const startY = position.y ?? rect?.top ?? 8;

    dragOffsetRef.current = {
      offsetX: event.clientX - startX,
      offsetY: event.clientY - startY,
    };

    setPosition(clampPosition(startX, startY));
    event.preventDefault();
  };

  return (
    <div
      id="floating-number-pad-wrapper"
      className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-1.5 sm:justify-end"
    >
      <section
        id="floating-number-pad"
        ref={panelRef}
        aria-label="Pavé numérique flottant"
        style={position.x !== null && position.y !== null ? { left: position.x, top: position.y } : undefined}
        className={`pointer-events-auto w-full max-w-[12rem] rounded-lg border border-slate-200 bg-white p-2 shadow-2xl ${
          position.x !== null && position.y !== null ? "fixed" : ""
        }`}
      >
        <div
          id="floating-number-pad-drag-handle"
          onPointerDown={handleDragStart}
          title="Déplacer le pavé numérique"
          aria-label="Déplacer le pavé numérique"
          className="mb-1.5 flex cursor-grab items-center justify-center rounded-full border border-stone-700/80 px-2 py-1 shadow-inner touch-none active:cursor-grabbing"
          style={{
            backgroundColor: "#2f2623",
            backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0 2px, transparent 2.5px), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.06) 0 1.5px, transparent 2px), radial-gradient(circle at 35% 75%, rgba(0,0,0,0.22) 0 2px, transparent 3px), linear-gradient(135deg, #4a3a34 0%, #2f2623 50%, #221b18 100%)"
          }}
        >
          <span className="sr-only">Déplacer le pavé numérique</span>
          <span aria-hidden="true" className="h-1 w-9 rounded-full bg-white/20 shadow-inner" />
        </div>

        <div className="flex items-start justify-between gap-1.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Pavé numérique</p>
            <p id="floating-number-pad-active-field" className="text-[11px] leading-tight text-slate-600 sm:text-xs">
              {activeFieldLabel || "Sélectionne une case à compléter."}
            </p>
          </div>
        </div>

        <div id="floating-number-pad-grid" className="mt-2 grid grid-cols-3 gap-1">
          {NUMBER_PAD_KEYS.flat()
            .filter((keyValue) => !disabledSet.has(keyValue))
            .map((keyValue) => {
              return (
                <button
                  key={keyValue}
                  id={`floating-number-pad-key-${keyValue === "=" ? "equal" : keyValue === "<" ? "lt" : keyValue === ">" ? "gt" : keyValue}`}
                  type="button"
                  onClick={() => onKeyPress?.(keyValue)}
                  className={`inline-flex min-h-8 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-base font-bold text-slate-800 shadow-sm transition hover:bg-indigo-100 sm:min-h-9 sm:text-lg ${keyValue === "=" ? "col-span-3" : ""}`}
                >
                  {keyValue}
                </button>
              );
            })}
        </div>

        <div id="floating-number-pad-actions" className="mt-2 grid grid-cols-2 gap-1">
          <button
            id="floating-number-pad-backspace-button"
            type="button"
            onClick={onBackspace}
            className="inline-flex items-center justify-center rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 shadow-sm transition hover:bg-amber-200"
          >
            ⌫ Retour
          </button>
          <button
            id="floating-number-pad-close-button"
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Fermer
          </button>
        </div>
      </section>
    </div>
  );
};

export default FloatingNumberPad;
