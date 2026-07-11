import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";

export const defaultInteractiveWhiteboardActivityContent = {
  defaultTitle: "Tableau",
  width: 1240,
  height: 1754,
  backgroundColor: "#ffffff",
  paperStyle: "seyes",
  fontFamily: "Cursif",
  defaultZoom: 2.0,
  storageKey: "TBTS_INTERACTIVE_WHITEBOARD",
};

function loadFabricScript() {
  return Promise.resolve(fabric);
}

function sanitizeFileNamePart(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "export";
}

function formatTimestampForFile() {
  const now = new Date();
  const date = now.toLocaleDateString("fr-FR").replace(/\//g, "-");
  const time = `${now.getHours()}h${now.getMinutes().toString().padStart(2, "0")}`;
  return `${date}_${time}`;
}

const PAPER_STYLE_VALUES = ["blank", "seyes", "grid", "millimeter"];
const WHITEBOARD_FONT_OPTIONS = [
  { label: "Cursif", value: "Cursif" },
  { label: "Cursive standard", value: "Cursive Standard" },
  { label: "Inter", value: "Inter, Arial, sans-serif" },
];
const CUSTOM_WHITEBOARD_FONTS = [
  { family: "Cursif", url: "/polices/Cursif.TTF" },
  { family: "Cursive Standard", url: "/polices/Cursive%20standard.ttf" },
];
const WHITEBOARD_COLOR_OPTIONS = [
  { value: "black", label: "⚫" },
  { value: "blue", label: "🔵" },
  { value: "red", label: "🔴" },
  { value: "green", label: "🟢" },
  { value: "orange", label: "🟠" },
  { value: "purple", label: "🟣" },
  { value: "rgba(250, 204, 21, 0.35)", label: "🟨" },
  { value: "rgba(74, 222, 128, 0.35)", label: "🟩" },
  { value: "rgba(244, 114, 182, 0.35)", label: "🟪" },
];
const WHITEBOARD_SHAPE_OPTIONS = [
  { value: "line", label: "━ Ligne" },
  { value: "rectangle", label: "▭ Rectangle" },
  { value: "square", label: "◻ Carré" },
  { value: "circle", label: "◯ Cercle" },
  { value: "triangle-iso", label: "△ Triangle" },
  { value: "triangle-right", label: "⊿ Triangle rect." },
];
const FIBONACCI_BRUSH_SIZES = [1, 2, 3, 5, 8, 13, 21, 34, 55];
const WHITEBOARD_BRUSH_SIZE_OPTIONS = FIBONACCI_BRUSH_SIZES.map((size) => ({
  value: String(size),
  label: `${size}px`,
}));
const WHITEBOARD_TOOLBAR_POSITION_STORAGE_KEY = "interactive-whiteboard-toolbar-position-v2";
const DEFAULT_TEXT_FONT_FAMILY =
  defaultInteractiveWhiteboardActivityContent.fontFamily || WHITEBOARD_FONT_OPTIONS[0].value;

let whiteboardFontsPromise = null;

function resolvePaperStyleValue(rawPaperStyle, fallback = "blank") {
  return PAPER_STYLE_VALUES.includes(rawPaperStyle) ? rawPaperStyle : fallback;
}

function resolveFontFamilyValue(rawFontFamily, fallback = DEFAULT_TEXT_FONT_FAMILY) {
  if (typeof rawFontFamily !== "string" || !rawFontFamily.trim()) {
    return fallback;
  }

  return rawFontFamily.trim();
}

function getInitialPaperStyle(activityContent) {
  if (PAPER_STYLE_VALUES.includes(activityContent?.paperStyle)) {
    return activityContent.paperStyle;
  }

  if (activityContent?.showGrid === true) {
    return "grid";
  }

  return defaultInteractiveWhiteboardActivityContent.paperStyle || "blank";
}

function ensureWhiteboardFontsLoaded() {
  if (typeof document === "undefined") {
    return Promise.resolve();
  }

  if (whiteboardFontsPromise) {
    return whiteboardFontsPromise;
  }

  const styleId = "interactive-whiteboard-font-faces";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = CUSTOM_WHITEBOARD_FONTS.map(
      ({ family, url }) => `
        @font-face {
          font-family: "${family}";
          src: url("${url}") format("truetype");
          font-display: swap;
        }
      `
    ).join("\n");
    document.head.appendChild(style);
  }

  if (!document.fonts?.load) {
    whiteboardFontsPromise = Promise.resolve();
    return whiteboardFontsPromise;
  }

  whiteboardFontsPromise = Promise.all(
    CUSTOM_WHITEBOARD_FONTS.map(({ family }) => document.fonts.load(`16px "${family}"`).catch(() => null))
  ).then(() => undefined);

  return whiteboardFontsPromise;
}

function createPaperPatternCanvas(paperStyle, backgroundColor, width = 1240, height = 1754) {
  const patternCanvas = document.createElement("canvas");
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const context = patternCanvas.getContext("2d");

  patternCanvas.width = safeWidth;
  patternCanvas.height = safeHeight;

  if (!context) return patternCanvas;

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, safeWidth, safeHeight);

  if (paperStyle === "seyes") {
    const smallLineSpacing = 8;
    const majorLineSpacing = smallLineSpacing * 4;
    const leftMarginX = 96;
    const secondaryLineColor = "#8bb8ff";
    const majorLineColor = "#c257ff";
    const outerGuideColor = "#d9dbe8";
    const innerGuideColor = "#d38cff";
    const marginLineColor = "#ff5a5a";

    for (let y = 0; y <= safeHeight; y += smallLineSpacing) {
      context.beginPath();
      context.strokeStyle = y % majorLineSpacing === 0 ? majorLineColor : secondaryLineColor;
      context.lineWidth = y % majorLineSpacing === 0 ? 1.2 : 0.85;
      context.moveTo(0, y + 0.5);
      context.lineTo(safeWidth, y + 0.5);
      context.stroke();
    }

    [leftMarginX - majorLineSpacing, leftMarginX - majorLineSpacing / 2].forEach((x) => {
      context.beginPath();
      context.strokeStyle = outerGuideColor;
      context.lineWidth = 0.8;
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, safeHeight);
      context.stroke();
    });

    context.beginPath();
    context.strokeStyle = marginLineColor;
    context.lineWidth = 1.3;
    context.moveTo(leftMarginX + 0.5, 0);
    context.lineTo(leftMarginX + 0.5, safeHeight);
    context.stroke();

    for (let x = leftMarginX + majorLineSpacing; x <= safeWidth; x += majorLineSpacing) {
      context.beginPath();
      context.strokeStyle = innerGuideColor;
      context.lineWidth = 0.8;
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, safeHeight);
      context.stroke();
    }
  } else if (paperStyle === "grid") {
    const cellSize = 24;
    const majorStep = cellSize * 5;

    for (let pos = 0; pos <= Math.max(safeWidth, safeHeight); pos += cellSize) {
      const isMajorLine = pos % majorStep === 0;
      context.beginPath();
      context.strokeStyle = isMajorLine ? "#94a3b8" : "#d7dde5";
      context.lineWidth = isMajorLine ? 1.1 : 0.7;
      context.moveTo(pos + 0.5, 0);
      context.lineTo(pos + 0.5, safeHeight);
      context.moveTo(0, pos + 0.5);
      context.lineTo(safeWidth, pos + 0.5);
      context.stroke();
    }
  } else if (paperStyle === "millimeter") {
    const mmSize = 5;
    const halfCmSize = mmSize * 5;
    const cmSize = mmSize * 10;

    for (let pos = 0; pos <= Math.max(safeWidth, safeHeight); pos += mmSize) {
      const isCmLine = pos % cmSize === 0;
      const isHalfCmLine = pos % halfCmSize === 0;

      context.beginPath();
      if (isCmLine) {
        context.strokeStyle = "#f87171";
        context.lineWidth = 1.0;
      } else if (isHalfCmLine) {
        context.strokeStyle = "#fca5a5";
        context.lineWidth = 0.8;
      } else {
        context.strokeStyle = "#fee2e2";
        context.lineWidth = 0.5;
      }

      if (pos <= safeWidth) {
        context.moveTo(pos + 0.5, 0);
        context.lineTo(pos + 0.5, safeHeight);
      }
      if (pos <= safeHeight) {
        context.moveTo(0, pos + 0.5);
        context.lineTo(safeWidth, pos + 0.5);
      }
      context.stroke();
    }
  }

  return patternCanvas;
}

function applyPaperStyleToCanvas(canvas, paperStyle, backgroundColor) {
  const fabricApi = fabric;
  if (!canvas || !fabricApi) return;

  const resolvedPaperStyle = resolvePaperStyleValue(paperStyle, "blank");
  const patternSource = createPaperPatternCanvas(
    resolvedPaperStyle,
    backgroundColor,
    canvas.getWidth(),
    canvas.getHeight()
  );

  const backgroundImage = new fabricApi.Image(patternSource, {
    originX: "left",
    originY: "top",
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
    erasable: false,
  });

  backgroundImage.scaleX = canvas.getWidth() / Math.max(1, patternSource.width);
  backgroundImage.scaleY = canvas.getHeight() / Math.max(1, patternSource.height);

  canvas.backgroundVpt = true;
  canvas.backgroundColor = backgroundColor;
  canvas.backgroundImage = backgroundImage;
  canvas.requestRenderAll();
}

function alignFabricLayersTopLeft(canvas) {
  if (!canvas) return;

  if (canvas.wrapperEl) {
    canvas.wrapperEl.style.position = "relative";
  }

  [canvas.lowerCanvasEl, canvas.upperCanvasEl].forEach((element) => {
    if (!element) return;
    element.style.position = "absolute";
    element.style.left = "0px";
    element.style.top = "0px";
  });
}

function logWhiteboardFabricDiagnostics(fabric) {
  if (!fabric) {
    console.warn("[Tableau blanc] Fabric.js introuvable au chargement.");
    return;
  }

  const diagnostics = {
    versionFabric: fabric.version || "inconnue",
    eraserBrushDisponible: false,
    pencilBrushDisponible: typeof fabric.PencilBrush !== "undefined",
  };

  console.info("[Tableau blanc] Diagnostic Fabric au chargement :", diagnostics);

  if (!diagnostics.eraserBrushDisponible) {
    console.warn(
      "[Tableau blanc] EraserBrush indisponible : le mode gomme utilisera le fallback de suppression d'objets."
    );
  }
}

const DropupSelect = ({
  id,
  value,
  onChange,
  options,
  title,
  triggerClassName = "",
  renderOption,
  renderSelectedOption,
  getOptionStyle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <div id={`${id}-container`} ref={containerRef} className="relative">
      {isOpen && (
        <div
          id={`${id}-menu`}
          role="listbox"
          aria-label={title}
          className="absolute bottom-full left-0 z-40 mb-2 min-w-full rounded-lg border border-sky-200 bg-white p-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                id={`${id}-option-${option.value}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                aria-label={option.label}
                className={`flex w-full items-center justify-center rounded-md px-2 py-1 text-sm font-semibold transition ${isSelected ? "bg-sky-100 text-sky-700" : "text-slate-700 hover:bg-slate-100"
                  }`}
                style={{ minHeight: "2rem", ...(getOptionStyle ? getOptionStyle(option, isSelected) : null) }}
              >
                {renderOption ? renderOption(option, isSelected) : option.label}
              </button>
            );
          })}
        </div>
      )}
      <button
        id={`${id}-trigger`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={title}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={selectedOption?.label || title}
        className={`inline-flex h-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-2 text-sm font-semibold text-sky-700 focus:outline-none ${triggerClassName}`}
      >
        <span>{renderSelectedOption ? renderSelectedOption(selectedOption) : selectedOption?.label}</span>
        <span className="ml-1 text-[10px]">▲</span>
      </button>
    </div>
  );
};

const getGridSnapSize = (style) => {
  switch (style) {
    case "grid": return 24;
    case "seyes": return 8;
    case "millimeter": return 5;
    default: return null;
  }
};

const snapCoordinate = (val, gridSize) => {
  if (!gridSize) return val;
  return Math.round(val / gridSize) * gridSize;
};

const getCanvasScenePoint = (canvas, opt) => {
  if (!canvas || !opt) {
    return null;
  }

  if (opt.scenePoint) {
    return opt.scenePoint;
  }

  if (opt.viewportPoint) {
    return opt.viewportPoint;
  }

  if (typeof canvas.getScenePoint === "function" && opt.e) {
    return canvas.getScenePoint(opt.e);
  }

  return opt.pointer || opt.absolutePointer || null;
};

const normalizePolygonPoints = (points) => {
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));

  return {
    left: minX,
    top: minY,
    points: points.map((point) => ({
      x: point.x - minX,
      y: point.y - minY,
    })),
  };
};

const getEquilateralTrianglePoints = (startPoint, endPoint) => {
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const sideLength = Math.hypot(deltaX, deltaY);

  if (!sideLength) {
    return [startPoint, endPoint, endPoint];
  }

  const midpoint = {
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2,
  };

  const perpendicularUnitVector = {
    x: -deltaY / sideLength,
    y: deltaX / sideLength,
  };
  const triangleHeight = (Math.sqrt(3) / 2) * sideLength;
  const direction = deltaX >= 0 ? -1 : 1;

  return [
    startPoint,
    endPoint,
    {
      x: midpoint.x + perpendicularUnitVector.x * triangleHeight * direction,
      y: midpoint.y + perpendicularUnitVector.y * triangleHeight * direction,
    },
  ];
};

const getRightTrianglePoints = (startPoint, endPoint) => {
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;

  // Keep mouse-up as the second vertex and build a perpendicular leg from the first vertex.
  return [
    startPoint,
    endPoint,
    {
      x: startPoint.x - deltaY,
      y: startPoint.y + deltaX,
    },
  ];
};
const WHITEBOARD_ERASER_CLIP_MARKER = "__whiteboardEraserClipAccumulator";

const isWhiteboardEraserClipAccumulator = (clipPath) =>
  Boolean(clipPath?.[WHITEBOARD_ERASER_CLIP_MARKER] && typeof clipPath?.add === "function");

const isLikelyPersistedEraserAccumulator = (clipPath) => {
  if (!clipPath || clipPath.type !== "group" || clipPath.inverted !== true || typeof clipPath.add !== "function") {
    return false;
  }

  const children = typeof clipPath.getObjects === "function" ? clipPath.getObjects() : clipPath._objects || [];
  if (!Array.isArray(children) || children.length === 0) {
    return false;
  }

  return children.every((child) => child?.type === "path" && child?.erasable === false);
};

const normalizeObjectEraserClipAccumulator = (fabricApi, targetObject) => {
  if (!fabricApi || !targetObject?.clipPath) {
    return;
  }

  const existingClipPath = targetObject.clipPath;
  if (isWhiteboardEraserClipAccumulator(existingClipPath) || isLikelyPersistedEraserAccumulator(existingClipPath)) {
    existingClipPath[WHITEBOARD_ERASER_CLIP_MARKER] = true;
    existingClipPath.set({
      inverted: true,
      selectable: false,
      evented: false,
      erasable: false,
      objectCaching: false,
    });
    return;
  }

  const accumulator = new fabricApi.Group([existingClipPath], {
    absolutePositioned: false,
    inverted: true,
    selectable: false,
    evented: false,
    erasable: false,
    objectCaching: false,
  });
  accumulator[WHITEBOARD_ERASER_CLIP_MARKER] = true;
  targetObject.clipPath = accumulator;
};

const clonePathForObjectEraser = async (fabricApi, eraserPath, targetObject) => {
  if (!fabricApi || !eraserPath || !targetObject || typeof eraserPath.clone !== "function") {
    return null;
  }

  const clonedPath = await eraserPath.clone();
  const objectTransform = targetObject.calcTransformMatrix();
  const pathTransform = clonedPath.calcTransformMatrix();
  const desiredTransform = fabricApi.util.multiplyTransformMatrices(
    fabricApi.util.invertTransform(objectTransform),
    pathTransform
  );

  fabricApi.util.applyTransformToObject(clonedPath, desiredTransform);
  clonedPath.set({
    fill: null,
    stroke: "black",
    strokeLineCap: "round",
    strokeLineJoin: "round",
    strokeWidth: eraserPath.strokeWidth || 1,
    strokeUniform: false,
    absolutePositioned: false,
    inverted: false,
    globalCompositeOperation: "source-over",
    selectable: false,
    evented: false,
    erasable: false,
  });

  return clonedPath;
};

const applyPartialEraserPathToObject = async (fabricApi, targetObject, eraserPath) => {
  if (!fabricApi || !targetObject || !eraserPath || targetObject.erasable === false) {
    return false;
  }

  if (typeof targetObject.forEachObject === "function" && targetObject.erasable === "deep") {
    const childObjects = targetObject.getObjects().filter((childObject) => childObject?.erasable !== false);
    if (childObjects.length === 0) {
      return false;
    }

    const childResults = await Promise.all(
      childObjects.map((childObject) => applyPartialEraserPathToObject(fabricApi, childObject, eraserPath))
    );

    if (childResults.some(Boolean)) {
      targetObject.dirty = true;
      if (typeof targetObject.setCoords === "function") {
        targetObject.setCoords();
      }
      return true;
    }

    return false;
  }

  const localizedEraserPath = await clonePathForObjectEraser(fabricApi, eraserPath, targetObject);
  if (!localizedEraserPath) {
    return false;
  }

  normalizeObjectEraserClipAccumulator(fabricApi, targetObject);

  if (!targetObject.clipPath) {
    const eraserClipAccumulator = new fabricApi.Group([localizedEraserPath], {
      absolutePositioned: false,
      inverted: true,
      selectable: false,
      evented: false,
      erasable: false,
      objectCaching: false,
    });
    eraserClipAccumulator[WHITEBOARD_ERASER_CLIP_MARKER] = true;
    targetObject.clipPath = eraserClipAccumulator;
  } else if (isWhiteboardEraserClipAccumulator(targetObject.clipPath)) {
    targetObject.clipPath.add(localizedEraserPath);
    targetObject.clipPath.dirty = true;
  } else {
    // Safety net: normalize and append, never merge inverted masks (can produce inverse effects).
    normalizeObjectEraserClipAccumulator(fabricApi, targetObject);
    if (isWhiteboardEraserClipAccumulator(targetObject.clipPath)) {
      targetObject.clipPath.add(localizedEraserPath);
      targetObject.clipPath.dirty = true;
    }
  }

  targetObject.dirty = true;

  if (typeof targetObject.setCoords === "function") {
    targetObject.setCoords();
  }

  return true;
};

const getEraserTargetsForPath = (canvas, eraserPath) => {
  if (!canvas || !eraserPath) {
    return [];
  }

  return canvas
    .getObjects()
    .filter((object) => object !== eraserPath)
    .filter((object) => object?.erasable !== false)
    .filter((object) => {
      if (typeof object.intersectsWithObject === "function" && object.intersectsWithObject(eraserPath, true, true)) {
        return true;
      }

      if (typeof eraserPath.intersectsWithObject === "function" && eraserPath.intersectsWithObject(object, true, true)) {
        return true;
      }

      if (typeof object.containsPoint === "function") {
        const center = eraserPath.getCenterPoint?.();
        if (center && object.containsPoint(center)) {
          return true;
        }
      }

      return false;
    });
};

const createEraserSegmentPath = (fabricApi, fromPoint, toPoint, strokeWidth) => {
  if (!fabricApi || !fromPoint || !toPoint) {
    return null;
  }

  const path = new fabricApi.Path(`M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`, {
    fill: null,
    stroke: "black",
    strokeWidth: Math.max(1, strokeWidth || 1),
    strokeLineCap: "round",
    strokeLineJoin: "round",
    selectable: false,
    evented: false,
    erasable: false,
  });

  if (typeof path.setCoords === "function") {
    path.setCoords();
  }

  return path;
};

const applyLiveEraserSegment = (canvas, fabricApi, fromPoint, toPoint, brushWidth) => {
  if (!canvas || !fabricApi || !fromPoint || !toPoint) {
    return Promise.resolve(false);
  }

  const segmentPath = createEraserSegmentPath(fabricApi, fromPoint, toPoint, brushWidth);
  if (!segmentPath) {
    return Promise.resolve(false);
  }

  const liveTargets = getEraserTargetsForPath(canvas, segmentPath);
  return Promise.all(
    liveTargets.map((targetObject) => applyPartialEraserPathToObject(fabricApi, targetObject, segmentPath))
  ).then((results) => {
    const changed = results.some(Boolean);
    if (changed) {
      canvas.requestRenderAll();
    }
    return changed;
  });
};

const InteractiveWhiteboardActivity = ({ content, student }) => {
  const configuredPaperStyle = getInitialPaperStyle(content);
  const configuredFontFamily = resolveFontFamilyValue(content?.fontFamily, DEFAULT_TEXT_FONT_FAMILY);

  const canvasRef = useRef(null);
  const canvasFrameRef = useRef(null);
  const brushPreviewRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const clipboardRef = useRef(null);
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const historyLockedRef = useRef(false);
  const imagePendingRef = useRef(null);
  const inputJsonRef = useRef(null);
  const inputImageRef = useRef(null);
  const toolbarDockRef = useRef(null);
  const toolbarDragOffsetRef = useRef(null);
  const eraserFallbackLoggedRef = useRef(false);
  const modeRef = useRef("draw");
  const colorRef = useRef("black");
  const brushSizeRef = useRef("1");
  const paperStyleRef = useRef(configuredPaperStyle);
  const fontFamilyRef = useRef(configuredFontFamily);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });
  const shapeTypeRef = useRef("line");
  const isDrawingShapeRef = useRef(false);
  const shapeOriginRef = useRef({ x: 0, y: 0 });
  const activeShapeRef = useRef(null);
  const isErasingRef = useRef(false);
  const lastErasePointRef = useRef(null);
  const eraseLivePendingRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState("draw");
  const [color, setColor] = useState("black");
  const [brushSize, setBrushSize] = useState("1");
  const [paperStyle, setPaperStyle] = useState(configuredPaperStyle);
  const [fontFamily, setFontFamily] = useState(configuredFontFamily);
  const [shapeType, setShapeType] = useState("line");
  const [currentZoom, setCurrentZoom] = useState(Number(content?.defaultZoom) || 1.0);
  const [title, setTitle] = useState(content?.defaultTitle || "Tableau");
  const [showImageHint, setShowImageHint] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: null, y: null });
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);

  const clampToolbarPosition = (nextX, nextY) => {
    const toolbarWidth = toolbarDockRef.current?.offsetWidth || 800;
    const toolbarHeight = toolbarDockRef.current?.offsetHeight || 180;
    const maxX = Math.max(8, window.innerWidth - toolbarWidth - 8);
    const maxY = Math.max(8, window.innerHeight - toolbarHeight - 8);

    return {
      x: Math.min(Math.max(8, nextX), maxX),
      y: Math.min(Math.max(8, nextY), maxY),
    };
  };

  const getExplicitBrushSize = (rawSize) => {
    const numericSize = Math.max(1, parseInt(rawSize, 10) || 1);
    return FIBONACCI_BRUSH_SIZES.includes(numericSize) ? numericSize : 1;
  };

  const getBrushSizePreviewMetrics = (rawSize, compact = false) => {
    const numericSize = getExplicitBrushSize(rawSize);
    const isEraseMode = mode === "erase";

    if (isEraseMode) {
      const diameter = compact
        ? Math.max(6, Math.round(Math.pow(numericSize, 0.72) * 3))
        : numericSize;
      const optionHeight = compact ? 32 : Math.max(36, diameter + 18);
      return {
        isEraseMode,
        shapeSize: diameter,
        optionHeight,
      };
    }

    const lineThickness = compact
      ? Math.max(2, Math.round(Math.pow(numericSize, 0.68) * 2.2))
      : numericSize;
    const optionHeight = compact ? 32 : Math.max(36, lineThickness + 18);
    const lineWidth = compact ? 34 : 56;

    return {
      isEraseMode,
      shapeSize: lineThickness,
      optionHeight,
      lineWidth,
    };
  };

  const renderBrushSizePreview = (option, compact = false) => {
    const metrics = getBrushSizePreviewMetrics(option?.value, compact);
    const isEraseMode = mode === "erase";

    if (isEraseMode) {
      const displayDiameter = metrics.shapeSize;

      return (
        <span className="flex w-full items-center justify-center" title={option.label}>
          <span
            aria-hidden="true"
            className="rounded-full border-2"
            style={{
              width: `${displayDiameter}px`,
              height: `${displayDiameter}px`,
              borderColor: "rgba(2, 132, 199, 0.8)",
              backgroundColor: "rgba(125, 211, 252, 0.2)",
            }}
          />
        </span>
      );
    }

    const lineThickness = metrics.shapeSize;

    return (
      <span className="flex w-full items-center justify-center" title={option.label}>
        <span
          aria-hidden="true"
          className="block rounded-full"
          style={{
            width: `${metrics.lineWidth}px`,
            height: `${lineThickness}px`,
            backgroundColor: color,
          }}
        />
      </span>
    );
  };

  const getBrushSizeOptionStyle = (option) => {
    const metrics = getBrushSizePreviewMetrics(option?.value, false);
    return {
      minHeight: `${metrics.optionHeight}px`,
    };
  };

  const hideBrushPreview = () => {
    if (!brushPreviewRef.current) return;
    brushPreviewRef.current.style.opacity = "0";
  };

  const showBrushPreviewAt = (clientX, clientY) => {
    const preview = brushPreviewRef.current;
    const frame = canvasFrameRef.current;

    if (!preview || !frame) return;

    const isEraseMode = modeRef.current === "erase";
    const isDrawMode = modeRef.current === "draw";

    if (!isEraseMode && !isDrawMode) {
      hideBrushPreview();
      return;
    }

    const rect = frame.getBoundingClientRect();
    const zoom = Math.max(0.01, Number(currentZoom) || 1);
    const diameter = Math.max(6, parseInt(brushSizeRef.current, 10) || 1);
    const strokeColor = colorRef.current || "black";
    const previewFillColor =
      typeof strokeColor === "string" && strokeColor.startsWith("rgba(") ? strokeColor : `${strokeColor}33`;

    preview.style.width = `${diameter}px`;
    preview.style.height = `${diameter}px`;
    preview.style.left = `${(clientX - rect.left) / zoom}px`;
    preview.style.top = `${(clientY - rect.top) / zoom}px`;
    preview.style.borderColor = isEraseMode ? "rgba(2, 132, 199, 0.8)" : strokeColor;
    preview.style.backgroundColor = isEraseMode ? "rgba(125, 211, 252, 0.2)" : previewFillColor;
    preview.style.opacity = "1";
  };

  const handleCanvasFramePointerMove = (event) => {
    showBrushPreviewAt(event.clientX, event.clientY);
  };

  const handleCanvasFramePointerLeave = () => {
    hideBrushPreview();
  };

  const canvasWidth = Number(content?.width) || defaultInteractiveWhiteboardActivityContent.width;
  const canvasHeight = Number(content?.height) || defaultInteractiveWhiteboardActivityContent.height;
  const backgroundColor = content?.backgroundColor || defaultInteractiveWhiteboardActivityContent.backgroundColor;
  const studentFullName = `${student?.firstname || ""} ${student?.name || ""}`.trim() || "Démo";
  const storageKeyBase = content?.storageKey || defaultInteractiveWhiteboardActivityContent.storageKey;
  const storageKey = `${storageKeyBase}_${student?.id || sanitizeFileNamePart(studentFullName)}`;

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    fontFamilyRef.current = fontFamily;
  }, [fontFamily]);

  useEffect(() => {
    shapeTypeRef.current = shapeType;
  }, [shapeType]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const savedPosition = window.sessionStorage.getItem(WHITEBOARD_TOOLBAR_POSITION_STORAGE_KEY);
      if (!savedPosition) {
        return;
      }

      const parsedPosition = JSON.parse(savedPosition);
      if (typeof parsedPosition?.x === "number" && typeof parsedPosition?.y === "number") {
        setToolbarPosition(parsedPosition);
      }
    } catch {
      window.sessionStorage.removeItem(WHITEBOARD_TOOLBAR_POSITION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || toolbarPosition.x === null || toolbarPosition.y === null) {
      return;
    }

    window.sessionStorage.setItem(WHITEBOARD_TOOLBAR_POSITION_STORAGE_KEY, JSON.stringify(toolbarPosition));
  }, [toolbarPosition]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!toolbarDragOffsetRef.current) {
        return;
      }

      const { offsetX, offsetY } = toolbarDragOffsetRef.current;
      setToolbarPosition(clampToolbarPosition(event.clientX - offsetX, event.clientY - offsetY));
    };

    const stopDraggingToolbar = () => {
      toolbarDragOffsetRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDraggingToolbar);
    window.addEventListener("pointercancel", stopDraggingToolbar);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDraggingToolbar);
      window.removeEventListener("pointercancel", stopDraggingToolbar);
    };
  }, [isToolbarCollapsed]);

  useEffect(() => {
    const handleWindowResize = () => {
      setToolbarPosition((currentPosition) => {
        if (currentPosition.x === null || currentPosition.y === null) {
          return currentPosition;
        }
        return clampToolbarPosition(currentPosition.x, currentPosition.y);
      });
    };

    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [isToolbarCollapsed]);

  useEffect(() => {
    paperStyleRef.current = paperStyle;
    if (!fabricCanvasRef.current) return;
    applyPaperStyleToCanvas(fabricCanvasRef.current, paperStyle, backgroundColor);
  }, [paperStyle, backgroundColor]);

  const updateHistoryButtons = () => {
    setCanUndo(historyStepRef.current > 0);
    setCanRedo(historyStepRef.current < historyRef.current.length - 1);
  };

  const persistBoardState = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const payload = {
      meta: {
        title,
        studentName: studentFullName,
        paperStyle: paperStyleRef.current,
        fontFamily: fontFamilyRef.current,
        savedAt: new Date().toISOString(),
      },
      canvas: canvas.toJSON(["width", "height"]),
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  };

  const saveHistory = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyLockedRef.current) return;

    const json = JSON.stringify(canvas.toJSON(["width", "height"]));

    if (historyStepRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
    }

    historyRef.current.push(json);
    historyStepRef.current += 1;

    if (historyRef.current.length > 30) {
      historyRef.current.shift();
      historyStepRef.current -= 1;
    }

    updateHistoryButtons();
    persistBoardState();
  };

  const renderHistoryStep = (json) => {
    const canvas = fabricCanvasRef.current;
    const fabricApi = fabric;
    if (!canvas || !fabricApi || !json) return;

    historyLockedRef.current = true;

    canvas.loadFromJSON(json, () => {
      const parsed = JSON.parse(json);
      if (parsed.width && parsed.height) {
        canvas.setDimensions({ width: parsed.width, height: parsed.height });
      }
      alignFabricLayersTopLeft(canvas);
      applyPaperStyleToCanvas(canvas, paperStyleRef.current, backgroundColor);
      historyLockedRef.current = false;
      updateHistoryButtons();
    });
  };

  const undo = () => {
    if (historyStepRef.current <= 0) return;
    historyStepRef.current -= 1;
    renderHistoryStep(historyRef.current[historyStepRef.current]);
  };

  const redo = () => {
    if (historyStepRef.current >= historyRef.current.length - 1) return;
    historyStepRef.current += 1;
    renderHistoryStep(historyRef.current[historyStepRef.current]);
  };

  const updateBrush = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const fabricApi = fabric;
    if (!fabricApi) return;
    const pencilBrush = fabricApi.PencilBrush;

    canvas.isDrawingMode = mode === "draw" || mode === "erase";

    if (mode === "erase") {
      if (!eraserFallbackLoggedRef.current) {
        console.warn("[Tableau blanc] Mode gomme sans EraserBrush : fallback activé.");
        eraserFallbackLoggedRef.current = true;
      }
      if (!(canvas.freeDrawingBrush instanceof pencilBrush)) {
        canvas.freeDrawingBrush = new pencilBrush(canvas);
      }
      canvas.freeDrawingBrush.globalCompositeOperation = "source-over";
      canvas.freeDrawingBrush.color = "rgba(0, 0, 0, 0)";
    } else if (mode === "draw") {
      if (!(canvas.freeDrawingBrush instanceof pencilBrush)) {
        canvas.freeDrawingBrush = new pencilBrush(canvas);
      }
      canvas.freeDrawingBrush.globalCompositeOperation = "source-over";
      canvas.freeDrawingBrush.color = color;
    }

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.decimate = 2;
      canvas.freeDrawingBrush.strokeLineCap = "round";
      canvas.freeDrawingBrush.strokeLineJoin = "round";
      canvas.freeDrawingBrush.shadow = null;
      canvas.freeDrawingBrush.width = parseInt(brushSize, 10) || 1;
    }

    const selectable = mode === "select";
    canvas.selection = selectable;
    canvas.forEachObject((obj) => {
      obj.selectable = selectable;
      obj.evented = selectable;
    });
    canvas.discardActiveObject();

    if (mode === "pan") {
      canvas.defaultCursor = "grab";
      canvas.hoverCursor = "grab";
    } else if (mode === "shape") {
      canvas.defaultCursor = "crosshair";
      canvas.hoverCursor = "crosshair";
    } else {
      canvas.defaultCursor = "default";
      canvas.hoverCursor = "move";
    }

    canvas.requestRenderAll();
  };

  const handleFontFamilyChange = (nextFontFamily) => {
    const resolvedFontFamily = resolveFontFamilyValue(nextFontFamily, DEFAULT_TEXT_FONT_FAMILY);
    setFontFamily(resolvedFontFamily);

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const selectedObjects = canvas.getActiveObjects().flatMap((obj) =>
      obj.type === "activeSelection" ? obj.getObjects() : [obj]
    );
    const textObjects = selectedObjects.filter((obj) => ["i-text", "text", "textbox"].includes(obj.type));

    if (textObjects.length === 0) {
      return;
    }

    textObjects.forEach((obj) => obj.set("fontFamily", resolvedFontFamily));
    canvas.requestRenderAll();
    saveHistory();
  };

  useEffect(() => {
    let disposed = false;

    Promise.all([loadFabricScript(), ensureWhiteboardFontsLoaded()])
      .then(([fabricApi]) => {
        if (disposed || !canvasRef.current) return;

        logWhiteboardFabricDiagnostics(fabricApi);

        const canvas = new fabricApi.Canvas(canvasRef.current, {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor,
          isDrawingMode: true,
          preserveObjectStacking: true,
          allowTouchScrolling: false,
          enableRetinaScaling: true,
        });

        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.touchAction = "none";
        }
        if (canvas.lowerCanvasEl) {
          canvas.lowerCanvasEl.style.touchAction = "none";
        }
        if (canvas.wrapperEl) {
          canvas.wrapperEl.style.touchAction = "none";
          canvas.wrapperEl.style.userSelect = "none";
        }

        alignFabricLayersTopLeft(canvas);

        fabricCanvasRef.current = canvas;

        const addTextAtPointer = (pointer) => {
          const defaulttext = "Bonjour...";
          const brushSize = parseInt(brushSizeRef.current, 10);
          const offsetValue = 6 + brushSize * 0.28; // Adjust this until the baseline hits the bottom blue line
          const gridSize = getGridSnapSize(paperStyleRef.current);
          const text = new fabric.IText(defaulttext, {
            left: snapCoordinate(pointer.x, gridSize),
            top: snapCoordinate(pointer.y, gridSize),
            fontFamily: fontFamilyRef.current || DEFAULT_TEXT_FONT_FAMILY,
            fontSize: 22 + brushSize,
            fill: colorRef.current,
            textAlign: "left",
            lineHeight: 1.16,
            fontWeight: 'normal', // 'normal' | 'bold' | 400 | 600 | 800
            padding: 20,
            originX: "left",
            originY: "bottom",
            styles: {
              0: Array.from(defaulttext).reduce((acc, _, i) => {
                acc[i] = { deltaY: offsetValue };
                return acc;
              }, {})
            }
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          text.selectAll();
          setMode("select");
          saveHistory();
        };

        canvas.on("mouse:down", (opt) => {
          const pointer = getCanvasScenePoint(canvas, opt);

          if (modeRef.current === "erase") {
            isErasingRef.current = true;
            const startPoint = pointer ? { x: pointer.x, y: pointer.y } : null;
            lastErasePointRef.current = startPoint;

            if (startPoint && !eraseLivePendingRef.current) {
              eraseLivePendingRef.current = true;
              const epsilon = 0.01;
              const immediatePoint = { x: startPoint.x + epsilon, y: startPoint.y + epsilon };
              applyLiveEraserSegment(
                canvas,
                fabricApi,
                startPoint,
                immediatePoint,
                parseInt(brushSizeRef.current, 10) || 1
              ).finally(() => {
                eraseLivePendingRef.current = false;
              });
            }
          }

          if (imagePendingRef.current) {
            if (!pointer) {
              return;
            }

            fabric.Image.fromURL(imagePendingRef.current, (img) => {
              img.set({
                left: pointer.x,
                top: pointer.y,
                originX: "center",
                originY: "center",
              });
              img.scaleToWidth(180);
              canvas.add(img);
              imagePendingRef.current = null;
              setShowImageHint(false);
              if (inputImageRef.current) inputImageRef.current.value = "";
              saveHistory();
            });
            return;
          }

          if (modeRef.current === "text") {
            if (pointer) {
              addTextAtPointer(pointer);
            }
          }

          if (modeRef.current === "shape") {
            if (!pointer) {
              return;
            }

            isDrawingShapeRef.current = true;
            const gridSize = getGridSnapSize(paperStyleRef.current);
            const startX = snapCoordinate(pointer.x, gridSize);
            const startY = snapCoordinate(pointer.y, gridSize);
            shapeOriginRef.current = { x: startX, y: startY };

            const shapeProps = {
              left: startX,
              top: startY,
              fill: "transparent",
              stroke: colorRef.current,
              strokeWidth: parseInt(brushSizeRef.current, 10) || 1,
              strokeUniform: true,
              strokeLineCap: 'round',
              selectable: false,
              evented: false,
            };

            let newShape;
            switch (shapeTypeRef.current) {
              case "line":
                newShape = new fabric.Line([startX, startY, startX, startY], { ...shapeProps, originY: 'center', originX: 'center' });
                break;
              case "rectangle":
              case "square":
                newShape = new fabric.Rect({ ...shapeProps, width: 0, height: 0, originX: "left", originY: "top" });
                break;
              case "circle":
                newShape = new fabric.Circle({ ...shapeProps, radius: 0, originX: "center", originY: "center" });
                break;
              case "triangle-iso": {
                const initialTriangle = normalizePolygonPoints([
                  { x: startX, y: startY },
                  { x: startX, y: startY },
                  { x: startX, y: startY },
                ]);
                newShape = new fabric.Polygon(initialTriangle.points, {
                  ...shapeProps,
                  left: initialTriangle.left,
                  top: initialTriangle.top,
                  originX: "left",
                  originY: "top",
                  objectCaching: false,
                });
                break;
              }
              case "triangle-right": {
                const initialTriangle = normalizePolygonPoints([
                  { x: startX, y: startY },
                  { x: startX, y: startY },
                  { x: startX, y: startY },
                ]);
                newShape = new fabric.Polygon([
                  ...initialTriangle.points,
                ], {
                  ...shapeProps,
                  left: initialTriangle.left,
                  top: initialTriangle.top,
                  originX: "left",
                  originY: "top",
                  objectCaching: false,
                });
                break;
              }
            }

            if (newShape) {
              canvas.add(newShape);
              activeShapeRef.current = newShape;
            }
          }

          if (modeRef.current === "pan") {
            isPanningRef.current = true;
            lastPanPointRef.current = { x: opt.e.clientX, y: opt.e.clientY };
            canvas.setCursor("grabbing");
          }
        });

        canvas.on("mouse:move", (opt) => {
          if (modeRef.current === "erase" && isErasingRef.current) {
            const pointer = getCanvasScenePoint(canvas, opt);
            if (!pointer) {
              return;
            }

            const previousPoint = lastErasePointRef.current;
            const currentPoint = { x: pointer.x, y: pointer.y };

            if (!previousPoint) {
              lastErasePointRef.current = currentPoint;
              return;
            }

            if (eraseLivePendingRef.current) {
              // Keep previous point to accumulate motion while async erase is pending.
              return;
            }

            const distance = Math.hypot(currentPoint.x - previousPoint.x, currentPoint.y - previousPoint.y);
            const brushWidth = parseInt(brushSizeRef.current, 10) || 1;
            const liveThreshold = Math.max(0.5, Math.min(2, brushWidth * 0.12));
            if (distance < liveThreshold) {
              // Keep the same origin point so tiny moves accumulate into a visible segment.
              return;
            }

            lastErasePointRef.current = currentPoint;

            eraseLivePendingRef.current = true;
            applyLiveEraserSegment(canvas, fabricApi, previousPoint, currentPoint, brushWidth)
              .finally(() => {
                eraseLivePendingRef.current = false;
              });

            return;
          }

          if (modeRef.current === "shape" && isDrawingShapeRef.current && activeShapeRef.current) {
            const pointer = getCanvasScenePoint(canvas, opt);
            if (!pointer) {
              return;
            }

            const origin = shapeOriginRef.current;
            const gridSize = getGridSnapSize(paperStyleRef.current);
            const pointerX = snapCoordinate(pointer.x, gridSize);
            const pointerY = snapCoordinate(pointer.y, gridSize);
            const shape = activeShapeRef.current;
            const type = shapeTypeRef.current;

            if (type === "line") {
              shape.set({ x2: pointerX, y2: pointerY });
            } else {
              const deltaX = pointerX - origin.x;
              const deltaY = pointerY - origin.y;
              let w = Math.abs(deltaX);
              let h = Math.abs(deltaY);

              if (type === "square") {
                const size = Math.max(w, h);
                w = size;
                h = size;
              }

              const newLeft = deltaX < 0 ? origin.x - w : origin.x;
              const newTop = deltaY < 0 ? origin.y - h : origin.y;

              if (type === "rectangle" || type === "square") {
                shape.set({ left: newLeft, top: newTop });
              }

              if (type === "rectangle" || type === "square") {
                shape.set({ width: w, height: h });
              } else if (type === "circle") {
                shape.set({
                  left: origin.x,
                  top: origin.y,
                  radius: Math.hypot(deltaX, deltaY),
                });
              } else if (type === "triangle-iso" || type === "triangle-right") {
                const trianglePoints = type === "triangle-iso"
                  ? getEquilateralTrianglePoints(origin, { x: pointerX, y: pointerY })
                  : getRightTrianglePoints(origin, { x: pointerX, y: pointerY });
                const normalizedTriangle = normalizePolygonPoints(trianglePoints);
                shape.set({
                  left: normalizedTriangle.left,
                  top: normalizedTriangle.top,
                  points: normalizedTriangle.points,
                });
              }
            }

            canvas.requestRenderAll();
            return;
          }

          if (!isPanningRef.current || modeRef.current !== "pan") return;
          const deltaX = opt.e.clientX - lastPanPointRef.current.x;
          const deltaY = opt.e.clientY - lastPanPointRef.current.y;
          lastPanPointRef.current = { x: opt.e.clientX, y: opt.e.clientY };
          canvas.relativePan(new fabric.Point(deltaX, deltaY));
        });

        canvas.on("mouse:up", (opt) => {
          if (modeRef.current === "erase") {
            isErasingRef.current = false;
            lastErasePointRef.current = null;
          }

          if (modeRef.current === "shape" && isDrawingShapeRef.current) {
            isDrawingShapeRef.current = false;
            if (activeShapeRef.current) {
              if (activeShapeRef.current.type === "polygon") {
                const pointer = getCanvasScenePoint(canvas, opt);
                if (pointer) {
                  const origin = shapeOriginRef.current;
                  const gridSize = getGridSnapSize(paperStyleRef.current);
                  const pointerX = snapCoordinate(pointer.x, gridSize);
                  const pointerY = snapCoordinate(pointer.y, gridSize);
                  const trianglePoints = shapeTypeRef.current === "triangle-iso"
                    ? getEquilateralTrianglePoints(origin, { x: pointerX, y: pointerY })
                    : getRightTrianglePoints(origin, { x: pointerX, y: pointerY });
                  const normalizedTriangle = normalizePolygonPoints(trianglePoints);
                  const previousShape = activeShapeRef.current;

                  const finalizedTriangle = new fabric.Polygon(normalizedTriangle.points, {
                    left: normalizedTriangle.left,
                    top: normalizedTriangle.top,
                    originX: "left",
                    originY: "top",
                    fill: previousShape.fill,
                    stroke: previousShape.stroke,
                    strokeWidth: previousShape.strokeWidth,
                    strokeUniform: previousShape.strokeUniform,
                    strokeLineCap: previousShape.strokeLineCap,
                    selectable: previousShape.selectable,
                    evented: previousShape.evented,
                    objectCaching: false,
                  });

                  canvas.remove(previousShape);
                  canvas.add(finalizedTriangle);
                  activeShapeRef.current = finalizedTriangle;
                }
              }

              activeShapeRef.current.setCoords();
              saveHistory();
              activeShapeRef.current = null;
            }
          }

          if (isPanningRef.current) {
            isPanningRef.current = false;
            if (modeRef.current === "pan") canvas.setCursor("grab");
          }
        });

        canvas.on("object:moving", (opt) => {
          const gridSize = getGridSnapSize(paperStyleRef.current);
          if (!gridSize) return;
          const obj = opt.target;
          const isAlignable = ["i-text", "text", "textbox", "rect", "circle", "triangle", "polygon", "line", "activeSelection"].includes(obj.type);
          if (isAlignable) {
            obj.set({
              left: snapCoordinate(obj.left, gridSize),
              top: snapCoordinate(obj.top, gridSize)
            });
          }
        });

        canvas.on("object:modified", saveHistory);
        canvas.on("path:created", (event) => {
          const createdPath = event?.path;

          if (modeRef.current === "erase" && createdPath) {
            const eraserTargets = getEraserTargetsForPath(canvas, createdPath);

            Promise.all(
              eraserTargets.map((targetObject) => applyPartialEraserPathToObject(fabricApi, targetObject, createdPath))
            )
              .then((results) => {
                const changedCount = results.filter(Boolean).length;

            canvas.remove(createdPath);
            canvas.discardActiveObject();
            canvas.requestRenderAll();

                if (changedCount > 0) {
              saveHistory();
            }
              })
              .catch(() => {
                canvas.remove(createdPath);
                canvas.requestRenderAll();
              });

            return;
          }

          saveHistory();
        });
        canvas.on("erasing:end", saveHistory);
        canvas.on("object:added", (e) => {
          if (!historyLockedRef.current && e.target?.type !== "path") {
            saveHistory();
          }
        });

        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          historyLockedRef.current = true;
          let savedCanvas = null;
          let savedPaperStyle = configuredPaperStyle;
          let savedFontFamily = configuredFontFamily;

          try {
            const parsedSaved = JSON.parse(saved);
            if (parsedSaved?.meta?.title) {
              setTitle(parsedSaved.meta.title);
            }
            if (parsedSaved?.meta?.paperStyle && !content?.paperStyle && content?.showGrid !== true) {
              savedPaperStyle = resolvePaperStyleValue(parsedSaved.meta.paperStyle, configuredPaperStyle);
            }
            if (parsedSaved?.meta?.fontFamily && !content?.fontFamily) {
              savedFontFamily = resolveFontFamilyValue(parsedSaved.meta.fontFamily, configuredFontFamily);
            }
            setPaperStyle(savedPaperStyle);
            setFontFamily(savedFontFamily);
            savedCanvas = parsedSaved?.canvas ? parsedSaved.canvas : parsedSaved;
          } catch {
            savedCanvas = null;
          }

          if (savedCanvas) {
            canvas.loadFromJSON(savedCanvas, () => {
              if (disposed) return;
              if (savedCanvas.width && savedCanvas.height) {
                canvas.setDimensions({ width: savedCanvas.width, height: savedCanvas.height });
              }
              alignFabricLayersTopLeft(canvas);
              applyPaperStyleToCanvas(canvas, savedPaperStyle, backgroundColor);
              historyLockedRef.current = false;
              historyRef.current = [JSON.stringify(savedCanvas)];
              historyStepRef.current = 0;
              updateHistoryButtons();
              setIsReady(true);
            });
          } else {
            if (disposed) return;
            applyPaperStyleToCanvas(canvas, paperStyleRef.current, backgroundColor);
            historyLockedRef.current = false;
            saveHistory();
            setIsReady(true);
          }
        } else {
          if (disposed) return;
          applyPaperStyleToCanvas(canvas, paperStyleRef.current, backgroundColor);
          saveHistory();
          setIsReady(true);
        }
      })
      .catch((error) => {
        if (disposed) return;
        setLoadError(error.message || "Chargement du tableau impossible");
      });

    return () => {
      disposed = true;
      if (fabricCanvasRef.current) {
        // Prévenir les appels de rendu asynchrones post-dispose (ex: fin de loadFromJSON en StrictMode)
        fabricCanvasRef.current.renderAll = () => { };
        fabricCanvasRef.current.requestRenderAll = () => { };
        try {
          fabricCanvasRef.current.dispose();
        } catch (e) {
          // Ignorer les erreurs internes de destruction Fabric
        }
        fabricCanvasRef.current = null;
      }
    };
  }, [
    backgroundColor,
    canvasHeight,
    canvasWidth,
    configuredFontFamily,
    configuredPaperStyle,
    content?.fontFamily,
    content?.paperStyle,
    content?.showGrid,
    storageKey,
  ]);

  useEffect(() => {
    if (!isReady) return;
    updateBrush();
  }, [isReady, mode, color, brushSize]);

  useEffect(() => {
    if (mode !== "erase" && mode !== "draw") {
      hideBrushPreview();
    }
  }, [mode]);

  useEffect(() => {
    if (!isReady) return;
    persistBoardState();
  }, [isReady, title, paperStyle, fontFamily]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const activeObject = canvas.getActiveObject();
      const isEditingText = activeObject && activeObject.isEditing;

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "z") {
          e.preventDefault();
          undo();
        }
        if (key === "y") {
          e.preventDefault();
          redo();
        }
        if (key === "c" && !isEditingText) {
          e.preventDefault();
          if (activeObject) {
            activeObject.clone((cloned) => {
              clipboardRef.current = cloned;
            });
          }
        }
        if (key === "v" && !isEditingText) {
          e.preventDefault();
          if (!clipboardRef.current) return;
          clipboardRef.current.clone((clonedObj) => {
            canvas.discardActiveObject();
            clonedObj.set({
              left: (clonedObj.left || 0) + 20,
              top: (clonedObj.top || 0) + 20,
              evented: true,
            });
            if (clonedObj.type === "activeSelection") {
              clonedObj.canvas = canvas;
              clonedObj.forEachObject((obj) => canvas.add(obj));
              clonedObj.setCoords();
            } else {
              canvas.add(clonedObj);
            }
            canvas.setActiveObject(clonedObj);
            saveHistory();
          });
        }
        if (key === "x" && !isEditingText && activeObject) {
          e.preventDefault();
          activeObject.clone((cloned) => {
            clipboardRef.current = cloned;
            canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
            canvas.discardActiveObject();
            saveHistory();
          });
        }
      }

      if ((e.key === "Delete" || e.key === "Backspace") && activeObject && !isEditingText && !canvas.isDrawingMode) {
        e.preventDefault();
        canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        saveHistory();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !window.confirm("Voulez-vous vraiment tout effacer ?")) return;
    canvas.clear();
    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    alignFabricLayersTopLeft(canvas);
    applyPaperStyleToCanvas(canvas, paperStyleRef.current, backgroundColor);
    saveHistory();
  };

  const handleToggleOrientation = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const width = canvas.getWidth();
    const height = canvas.getHeight();
    canvas.setDimensions({ width: height, height: width });
    alignFabricLayersTopLeft(canvas);
    applyPaperStyleToCanvas(canvas, paperStyleRef.current, backgroundColor);
    saveHistory();
  };

  const resetCanvasViewportToOrigin = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.requestRenderAll();
  };

  const handlePanButtonClick = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      setMode("pan");
      return;
    }

    if (modeRef.current === "pan") {
      isPanningRef.current = false;
      lastPanPointRef.current = { x: 0, y: 0 };
      resetCanvasViewportToOrigin();
      canvas.setCursor("grab");
      return;
    }

    setMode("pan");
  };

  const handleCopy = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active) return;
    active.clone((cloned) => {
      clipboardRef.current = cloned;
    });
  };

  const handleCut = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.clone((cloned) => {
      clipboardRef.current = cloned;
      canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      saveHistory();
    });
  };

  const handlePaste = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !clipboardRef.current) return;

    clipboardRef.current.clone((clonedObj) => {
      canvas.discardActiveObject();
      clonedObj.set({
        left: (clonedObj.left || 0) + 20,
        top: (clonedObj.top || 0) + 20,
        evented: true,
      });

      if (clonedObj.type === "activeSelection") {
        clonedObj.canvas = canvas;
        clonedObj.forEachObject((obj) => canvas.add(obj));
        clonedObj.setCoords();
      } else {
        canvas.add(clonedObj);
      }

      clipboardRef.current.top = (clipboardRef.current.top || 0) + 20;
      clipboardRef.current.left = (clipboardRef.current.left || 0) + 20;
      canvas.setActiveObject(clonedObj);
      saveHistory();
    });
  };

  const handleDeleteSelection = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    saveHistory();
  };

  const handleBringForward = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((obj) => obj.bringForward());
    saveHistory();
  };

  const handleSendBackward = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((obj) => obj.sendBackwards());
    saveHistory();
  };

  const handleToggleLock = () => {
    const canvas = fabricCanvasRef.current;
    const objects = canvas?.getActiveObjects() || [];
    if (objects.length === 0) return;

    const nextLocked = !objects[0].lockMovementX;
    objects.forEach((obj) => {
      obj.set({
        lockMovementX: nextLocked,
        lockMovementY: nextLocked,
        lockScalingX: nextLocked,
        lockScalingY: nextLocked,
        lockRotation: nextLocked,
        hasControls: !nextLocked,
      });
    });

    canvas.discardActiveObject().renderAll();
    saveHistory();
  };

  const handlePrepareImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      imagePendingRef.current = loadEvent.target?.result;
      setShowImageHint(true);
      setMode("select");
    };
    reader.readAsDataURL(file);
  };

  const handleExportJson = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const payload = {
      meta: {
        title,
        studentName: studentFullName,
        paperStyle,
        fontFamily,
        exportedAt: new Date().toISOString(),
      },
      canvas: canvas.toJSON(["width", "height"]),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileNamePart(title)}_${sanitizeFileNamePart(studentFullName)}_${formatTimestampForFile()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (event) => {
    const file = event.target.files?.[0];
    if (!file || !fabricCanvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const raw = String(loadEvent.target?.result || "{}");
        const parsed = JSON.parse(raw);
        const payload = parsed?.canvas ? parsed.canvas : parsed;

        if (parsed?.meta?.title) {
          setTitle(parsed.meta.title);
        }

        if (parsed?.meta?.paperStyle) {
          setPaperStyle(parsed.meta.paperStyle);
        }

        if (parsed?.meta?.fontFamily) {
          setFontFamily(resolveFontFamilyValue(parsed.meta.fontFamily, configuredFontFamily));
        }

        historyLockedRef.current = true;
        fabricCanvasRef.current.loadFromJSON(payload, () => {
          if (payload.width && payload.height) {
            fabricCanvasRef.current.setDimensions({ width: payload.width, height: payload.height });
          }
          alignFabricLayersTopLeft(fabricCanvasRef.current);
          applyPaperStyleToCanvas(
            fabricCanvasRef.current,
            parsed?.meta?.paperStyle || paperStyleRef.current,
            backgroundColor
          );
          historyLockedRef.current = false;
          saveHistory();
          window.alert("Tableau chargé avec succès !");
        });
      } catch {
        window.alert("Le fichier JSON sélectionné est invalide.");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const handleExportPng = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const boardDataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
    const exportCanvas = document.createElement("canvas");
    const headerHeight = 120;
    exportCanvas.width = canvas.getWidth();
    exportCanvas.height = canvas.getHeight() + headerHeight;

    const context = exportCanvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    context.fillStyle = "#111827";
    context.font = "bold 40px Inter, Arial, sans-serif";
    context.fillText(title.trim() || "Tableau", 36, 48);
    context.font = "26px Inter, Arial, sans-serif";
    context.fillStyle = "#475569";
    context.fillText(`Élève : ${studentFullName}`, 36, 92);

    const img = new Image();
    img.onload = () => {
      context.drawImage(img, 0, headerHeight, canvas.getWidth(), canvas.getHeight());
      const link = document.createElement("a");
      link.download = `${sanitizeFileNamePart(title)}_${sanitizeFileNamePart(studentFullName)}_${formatTimestampForFile()}.png`;
      link.href = exportCanvas.toDataURL("image/png");
      link.click();
    };
    img.src = boardDataUrl;
  };

  const handleToolbarDragStart = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const rect = toolbarDockRef.current?.getBoundingClientRect();
    const startX = toolbarPosition.x ?? rect?.left ?? 8;
    const startY = toolbarPosition.y ?? rect?.top ?? 8;

    toolbarDragOffsetRef.current = {
      offsetX: event.clientX - startX,
      offsetY: event.clientY - startY,
    };

    setToolbarPosition(clampToolbarPosition(startX, startY));
    event.preventDefault();
  };

  const handleToolbarCollapseToggle = () => {
    setIsToolbarCollapsed((previousState) => !previousState);
  };

  if (loadError) {
    return <div className="text-rose-600 font-medium">{loadError}</div>;
  }

  return (
    <div id="interactive-whiteboard-activity" className="relative pb-40">
      {showImageHint && (
        <div id="interactive-whiteboard-image-hint" className="mb-3 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow inline-block print:hidden">
          Cliquez sur le canevas pour poser l'image.
        </div>
      )}

      <div
        id="interactive-whiteboard-workspace"
        className="overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-0"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div
          id="interactive-whiteboard-canvas-frame"
          ref={canvasFrameRef}
          onPointerMove={handleCanvasFramePointerMove}
          onPointerLeave={handleCanvasFramePointerLeave}
          className="relative mx-auto overflow-hidden rounded-lg bg-white shadow-2xl"
          style={{
            width: `${canvasWidth}px`,
            transform: `scale(${currentZoom})`,
            transformOrigin: "top left",
          }}
        >
          <div
            id="interactive-whiteboard-brush-preview"
            ref={brushPreviewRef}
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-600/80 bg-sky-300/20 opacity-0 transition-opacity duration-100"
          />
          <canvas id="interactive-whiteboard-canvas" ref={canvasRef} />
        </div>
      </div>

      <div
        id="interactive-whiteboard-toolbar-dock"
        ref={toolbarDockRef}
        style={
          toolbarPosition.x !== null && toolbarPosition.y !== null
            ? { left: toolbarPosition.x, top: toolbarPosition.y, bottom: "auto", transform: "none" }
            : undefined
        }
        className="fixed bottom-4 right-4 z-50 w-[min(1024px,calc(100vw-1rem))] px-2 print:hidden"
      >
        <div
          id="interactive-whiteboard-toolbar-row"
          className="flex items-start justify-end gap-0"
        >
          <button
            id="interactive-whiteboard-toolbar-collapse-button"
            type="button"
            onClick={handleToolbarCollapseToggle}
            title={isToolbarCollapsed ? "Déplier les barres d'outils" : "Replier les barres d'outils"}
            aria-label={isToolbarCollapsed ? "Déplier les barres d'outils" : "Replier les barres d'outils"}
            className="h-[105.33px] min-w-5 rounded-l-2xl rounded-r-none border border-white/90 bg-slate-800/90 px-0.5 text-white shadow-xl backdrop-blur transition hover:bg-slate-600/90"
          >
            <span aria-hidden="true" className="block text-sm leading-none tracking-tight">
              {isToolbarCollapsed ? "⌞⌝" : "〢"}
            </span>
          </button>

          {!isToolbarCollapsed && (
            <div id="interactive-whiteboard-toolbar-stack" className="flex flex-col items-center gap-1">
              <section
                id="interactive-whiteboard-main-toolbar"
                className="flex w-full flex-col items-stretch rounded-none border border-white/40 bg-white/90 pb-2 pt-0 shadow-xl backdrop-blur"
              >
                <button
                  id="interactive-whiteboard-toolbar-drag-handle"
                  type="button"
                  onPointerDown={handleToolbarDragStart}
                  title="Déplacer la barre d'outils"
                  aria-label="Déplacer la barre d'outils"
                  className="h-5 w-full border-none bg-slate-50 px-0 text-slate-300 transition hover:bg-slate-100 active:cursor-grabbing"
                >
                  <span aria-hidden="true" className="block h-full w-full overflow-hidden whitespace-nowrap text-center text-sm leading-none tracking-[-0.02em]">
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  </span>
                </button>

                <div id="interactive-whiteboard-main-toolbar-content" className="flex flex-wrap items-center justify-center gap-1 px-3 pt-0">
            <div id="interactive-whiteboard-file-group" className="flex flex-wrap items-center gap-2 border-r border-slate-200 pr-3">
              <select
                id="interactive-whiteboard-paper-style"
                value={paperStyle}
                onChange={(e) => setPaperStyle(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-700 focus:outline-none"
              >
                <option value="blank">Blanc</option>
                <option value="seyes">Lignage Seyès</option>
                <option value="grid">Carreaux géométrie</option>
                <option value="millimeter">Papier millimétré</option>
              </select>
              <select
                id="interactive-whiteboard-font-family"
                value={fontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value)}
                className="h-9 max-w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-700 focus:outline-none"
                style={{ fontFamily }}
                title="Police utilisée pour les textes"
              >
                {WHITEBOARD_FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} style={{ fontFamily: option.value }}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleExportJson} title="Exporter le tableau au format JSON" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50" >💾</button>
              <button type="button" onClick={() => inputJsonRef.current?.click()} title="Importer un fichier JSON" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50" >📂</button>
              <input ref={inputJsonRef} type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              <button type="button" onClick={handleExportPng} title="Exporter le tableau au format PNG" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50" >📷</button>
            </div>

            <div id="interactive-whiteboard-view-group" className="flex flex-wrap items-center gap-2 border-r border-slate-200 pr-3">
              <button type="button" onClick={handleToggleOrientation} title="Basculer l'orientation" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50" >🔃</button>
              <button type="button" onClick={() => setCurrentZoom((prev) => Math.max(0.2, prev - 0.1))} title="Zoom arrière" className="h-9 rounded-lg border border-amber-200 bg-white px-3 text-sm font-bold text-amber-600 hover:bg-amber-50" >−</button>
              <span className="min-w-12 text-center text-sm font-semibold text-slate-500">{Math.round(currentZoom * 100)}%</span>
              <button type="button" onClick={() => setCurrentZoom((prev) => prev + 0.1)} title="Zoom avant" className="h-9 rounded-lg border border-amber-200 bg-white px-3 text-sm font-bold text-amber-600 hover:bg-amber-50" >+</button>
            </div>

            <div id="interactive-whiteboard-tools-group" className="flex flex-wrap items-center gap-2 border-r border-slate-200 pr-3">
              <button type="button" onClick={handlePanButtonClick} title="Déplacer la vue" className={`h-9 rounded-lg border px-3 text-sm ${mode === "pan" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`} >✋</button>
              <button type="button" onClick={() => setMode("draw")} title="Dessiner" className={`h-9 rounded-lg border px-3 text-sm ${mode === "draw" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`} >✏️</button>
              <button type="button" onClick={() => setMode("shape")} className={`h-9 rounded-lg border px-3 text-sm ${mode === "shape" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`} title="Formes géométriques">{WHITEBOARD_SHAPE_OPTIONS.find((o) => o.value === shapeType)?.label.split(" ")[0] || "▭"}</button>
              <button type="button" onClick={() => setMode("text")} title="Texte" className={`h-9 rounded-lg border px-3 text-sm ${mode === "text" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`} >T</button>
              <button type="button" onClick={() => setMode("erase")} title="Effacer" className={`h-9 rounded-lg border px-3 text-sm ${mode === "erase" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`} >🧽</button>
              <button type="button" onClick={() => inputImageRef.current?.click()} title="Insérer une image" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50" >🖼️</button>
              <input ref={inputImageRef} type="file" accept="image/*" onChange={handlePrepareImage} className="hidden" />
              <button type="button" onClick={() => setMode("select")} title="Sélectionner" className={`h-9 rounded-lg border px-3 text-sm ${mode === "select" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`} >👇</button>
            </div>

            <div id="interactive-whiteboard-history-group" className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={undo} disabled={!canUndo} title="Annuler" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-50" >↩️</button>
              <button type="button" onClick={redo} disabled={!canRedo} title="Rétablir" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-50" >↪️</button>
              <button type="button" onClick={handleClear} title="Effacer tout le tableau" className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-sm text-rose-600 hover:bg-rose-50" >🧹</button>
            </div>
                </div>
              </section>

              {(mode === "draw" || mode === "text" || mode === "erase" || mode === "select" || mode === "shape") && (
                <section id="interactive-whiteboard-secondary-toolbar" className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/80 px-3 py-2 shadow-lg backdrop-blur">
                  {(mode === "draw" || mode === "text" || mode === "erase" || mode === "shape") && (
                    <div id="interactive-whiteboard-style-group" className="flex items-center gap-2 border-r border-slate-200 pr-3">
                      {mode !== "erase" && (
                        <DropupSelect
                          id="interactive-whiteboard-color-select"
                          value={color}
                          onChange={setColor}
                          options={WHITEBOARD_COLOR_OPTIONS}
                          title="Couleur"
                          triggerClassName="min-w-14"
                        />
                      )}
                      <DropupSelect
                        id="interactive-whiteboard-size-select"
                        value={brushSize}
                        onChange={setBrushSize}
                        options={WHITEBOARD_BRUSH_SIZE_OPTIONS}
                        title="Taille du trait"
                        triggerClassName="min-w-14"
                        renderOption={(option) => renderBrushSizePreview(option)}
                        renderSelectedOption={(option) => renderBrushSizePreview(option, true)}
                        getOptionStyle={getBrushSizeOptionStyle}
                      />
                      {mode === "shape" && (
                        <DropupSelect
                          id="interactive-whiteboard-shape-type-select"
                          value={shapeType}
                          onChange={setShapeType}
                          options={WHITEBOARD_SHAPE_OPTIONS}
                          title="Forme géométrique"
                          triggerClassName="min-w-14"
                        />
                      )}
                    </div>
                  )}

                  {mode === "select" && (
                    <div id="interactive-whiteboard-selection-group" className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={handleCut} title="Couper la sélection" className="h-9 rounded-lg border border-orange-200 bg-white px-3 text-sm text-orange-600 hover:bg-orange-50" >✂️</button>
                      <button type="button" onClick={handleCopy} title="Copier la sélection" className="h-9 rounded-lg border border-orange-200 bg-white px-3 text-sm text-orange-600 hover:bg-orange-50" >📋</button>
                      <button type="button" onClick={handlePaste} title="Coller" className="h-9 rounded-lg border border-orange-200 bg-white px-3 text-sm text-orange-600 hover:bg-orange-50" >🗐</button>
                      <button type="button" onClick={handleDeleteSelection} title="Supprimer la sélection" className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-sm text-rose-600 hover:bg-rose-50" >❌</button>
                      <button type="button" onClick={handleBringForward} title="Avancer l’objet" className="h-9 rounded-lg border border-violet-200 bg-white px-3 text-sm text-violet-600 hover:bg-violet-50" >🔺</button>
                      <button type="button" onClick={handleSendBackward} title="Reculer l’objet" className="h-9 rounded-lg border border-violet-200 bg-white px-3 text-sm text-violet-600 hover:bg-violet-50" >🔻</button>
                      <button type="button" onClick={handleToggleLock} title="Verrouiller / Déverrouiller" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50" >🔒</button>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveWhiteboardActivity;
