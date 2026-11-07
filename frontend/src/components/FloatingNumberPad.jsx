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
  showCommaKey = false,
}) => {
  const [position, setPosition] = useState({ x: null, y: null });
  const panelRef = useRef(null);
  const dragBoundsRef = useRef(null);
  const rafRef = useRef(null);

  const getMinY = () => {
    if (typeof document === "undefined") {
      return 8;
    }

    const headerElement = document.getElementById("student-header");
    if (!headerElement) {
      return 8;
    }

    const rect = headerElement.getBoundingClientRect();
    return Math.max(8, Math.ceil(rect.bottom) + 8);
  };

  const clampPosition = (nextX, nextY) => {
    const panelWidth = panelRef.current?.offsetWidth || 240;
    const panelHeight = panelRef.current?.offsetHeight || 210;
    const minY = getMinY();
    const maxX = Math.max(8, window.innerWidth - panelWidth - 8);
    const maxY = Math.max(minY, window.innerHeight - panelHeight - 8);

    return {
      x: Math.min(Math.max(8, nextX), maxX),
      y: Math.min(Math.max(minY, nextY), maxY),
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
      dragBoundsRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
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
      const bounds = dragBoundsRef.current;
      if (!bounds) {
        return;
      }

      const rawX = event.clientX - bounds.offsetX;
      const rawY = event.clientY - bounds.offsetY;

      const nextX = Math.min(Math.max(8, rawX), bounds.maxX);
      const nextY = Math.min(Math.max(bounds.minY, rawY), bounds.maxY);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        setPosition({ x: nextX, y: nextY });
      });
    };

    const stopDragging = () => {
      dragBoundsRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const disabledSet = new Set(disabledKeys);
  const keysGrid = showCommaKey
    ? [
        ["7", "8", "9"],
        ["4", "5", "6"],
        ["1", "2", "3"],
        ["<", "0", ","],
        ["="],
      ]
    : NUMBER_PAD_KEYS;

  const handleDragStart = (event) => {
    const rect = panelRef.current?.getBoundingClientRect();
    const panelWidth = rect?.width || panelRef.current?.offsetWidth || 240;
    const panelHeight = rect?.height || panelRef.current?.offsetHeight || 210;

    const startX = position.x ?? rect?.left ?? 8;
    const startY = position.y ?? rect?.top ?? 8;

    const headerElement = document.getElementById("student-header");
    const headerBottom = headerElement
      ? Math.ceil(headerElement.getBoundingClientRect().bottom)
      : 0;
    const minY = Math.max(8, headerBottom + 8);
    const maxX = Math.max(8, window.innerWidth - panelWidth - 8);
    const maxY = Math.max(minY, window.innerHeight - panelHeight - 8);

    dragBoundsRef.current = {
      offsetX: event.clientX - startX,
      offsetY: event.clientY - startY,
      minY,
      maxX,
      maxY,
    };

    setPosition(clampPosition(startX, startY));
    event.preventDefault();
  };

  return (
    <div
      id="floating-number-pad-wrapper"
      className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-center p-1.5 sm:justify-end"
    >
      <section
        id="floating-number-pad"
        ref={panelRef}
        aria-label="Pavé numérique flottant"
        style={position.x !== null && position.y !== null ? { left: position.x, top: position.y } : undefined}
        className={`pointer-events-auto z-[100] w-full max-w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-2xl ${
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
          {keysGrid.flat()
            .filter((keyValue) => !disabledSet.has(keyValue))
            .map((keyValue) => {
              return (
                <button
                  key={keyValue}
                  id={`floating-number-pad-key-${keyValue === "=" ? "equal" : keyValue === "<" ? "lt" : keyValue === ">" ? "gt" : keyValue === "," ? "comma" : keyValue}`}
                  type="button"
                  onClick={() => onKeyPress?.(keyValue)}
                  className={`inline-flex min-h-8 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-base font-bold text-slate-800 shadow-xs transition hover:bg-indigo-100 sm:min-h-9 sm:text-lg ${keyValue === "=" ? "col-span-3" : ""}`}
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
            className="inline-flex items-center justify-center rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 shadow-xs transition hover:bg-amber-200"
          >
            ⌫ Retour
          </button>
          <button
            id="floating-number-pad-close-button"
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-slate-800"
          >
            Fermer
          </button>
        </div>
      </section>
    </div>
  );
};

export default FloatingNumberPad;
