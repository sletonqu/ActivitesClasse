import React, { useEffect, useRef, useState } from "react";

export const defaultInteractiveWhiteboardActivityContent = {
  defaultTitle: "Tableau",
  width: 1240,
  height: 1754,
  backgroundColor: "#ffffff",
  paperStyle: "seyes",
  fontFamily: "Cursif",
  defaultZoom: 0.7,
  storageKey: "TBTS_INTERACTIVE_WHITEBOARD",
};

let fabricLoaderPromise = null;

function loadFabricScript() {
  if (window.fabric) {
    return Promise.resolve(window.fabric);
  }

  if (fabricLoaderPromise) {
    return fabricLoaderPromise;
  }

  fabricLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-fabric-loader="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.fabric));
      existingScript.addEventListener("error", () => reject(new Error("Impossible de charger Fabric.js")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js";
    script.async = true;
    script.dataset.fabricLoader = "true";
    script.onload = () => resolve(window.fabric);
    script.onerror = () => reject(new Error("Impossible de charger Fabric.js"));
    document.body.appendChild(script);
  });

  return fabricLoaderPromise;
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

const PAPER_STYLE_VALUES = ["blank", "seyes", "grid"];
const WHITEBOARD_FONT_OPTIONS = [
  { label: "Cursif", value: "Cursif" },
  { label: "Cursif ligné", value: "Cursifl" },
  { label: "Cursive standard", value: "Cursive Standard" },
  { label: "Écolier", value: "Ecolier" },
  { label: "Écolier cour.", value: "Ecolier Courant" },
  { label: "Inter", value: "Inter, Arial, sans-serif" },
];
const CUSTOM_WHITEBOARD_FONTS = [
  { family: "Cursif", url: "/polices/Cursif.TTF" },
  { family: "Cursifl", url: "/polices/Cursifl.TTF" },
  { family: "Cursive Standard", url: "/polices/Cursive%20standard.ttf" },
  { family: "Ecolier", url: "/polices/ec.TTF" },
  { family: "Ecolier Courant", url: "/polices/ec_cour.TTF" },
];
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

    for (let y = 0; y <= safeHeight; y += smallLineSpacing) {
      context.beginPath();
      context.strokeStyle = y % majorLineSpacing === 0 ? "#9fc5e8" : "#d9edf9";
      context.lineWidth = y % majorLineSpacing === 0 ? 1.15 : 0.7;
      context.moveTo(0, y + 0.5);
      context.lineTo(safeWidth, y + 0.5);
      context.stroke();
    }

    [leftMarginX - majorLineSpacing, leftMarginX - majorLineSpacing / 2].forEach((x) => {
      context.beginPath();
      context.strokeStyle = "#d1d5db";
      context.lineWidth = 0.8;
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, safeHeight);
      context.stroke();
    });

    context.beginPath();
    context.strokeStyle = "#f29cab";
    context.lineWidth = 1.2;
    context.moveTo(leftMarginX + 0.5, 0);
    context.lineTo(leftMarginX + 0.5, safeHeight);
    context.stroke();

    for (let x = leftMarginX + majorLineSpacing; x <= safeWidth; x += majorLineSpacing) {
      context.beginPath();
      context.strokeStyle = "#c7cedd";
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
  }

  return patternCanvas;
}

function applyPaperStyleToCanvas(canvas, paperStyle, backgroundColor) {
  const fabric = window.fabric;
  if (!canvas || !fabric) return;

  if (!paperStyle || paperStyle === "blank") {
    canvas.setBackgroundColor(backgroundColor, canvas.renderAll.bind(canvas));
    return;
  }

  const patternSource = createPaperPatternCanvas(
    paperStyle,
    backgroundColor,
    canvas.getWidth(),
    canvas.getHeight()
  );
  const pattern = new fabric.Pattern({
    source: patternSource,
    repeat: "no-repeat",
  });

  canvas.setBackgroundColor(pattern, canvas.renderAll.bind(canvas));
}

const InteractiveWhiteboardActivity = ({ content, onComplete, student }) => {
  const configuredPaperStyle = getInitialPaperStyle(content);
  const configuredFontFamily = resolveFontFamilyValue(content?.fontFamily, DEFAULT_TEXT_FONT_FAMILY);

  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const clipboardRef = useRef(null);
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const historyLockedRef = useRef(false);
  const imagePendingRef = useRef(null);
  const inputJsonRef = useRef(null);
  const inputImageRef = useRef(null);
  const modeRef = useRef("draw");
  const colorRef = useRef("black");
  const brushSizeRef = useRef("5");
  const paperStyleRef = useRef(configuredPaperStyle);
  const fontFamilyRef = useRef(configuredFontFamily);

  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState("draw");
  const [color, setColor] = useState("black");
  const [brushSize, setBrushSize] = useState("5");
  const [paperStyle, setPaperStyle] = useState(configuredPaperStyle);
  const [fontFamily, setFontFamily] = useState(configuredFontFamily);
  const [currentZoom, setCurrentZoom] = useState(Number(content?.defaultZoom) || 0.7);
  const [title, setTitle] = useState(content?.defaultTitle || "Tableau");
  const [showImageHint, setShowImageHint] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const canvasWidth = Number(content?.width) || defaultInteractiveWhiteboardActivityContent.width;
  const canvasHeight = Number(content?.height) || defaultInteractiveWhiteboardActivityContent.height;
  const backgroundColor = content?.backgroundColor || defaultInteractiveWhiteboardActivityContent.backgroundColor;
  const studentFullName = `${student?.firstname || ""} ${student?.name || ""}`.trim() || "Élève";
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
    const fabric = window.fabric;
    if (!canvas || !fabric || !json) return;

    historyLockedRef.current = true;

    canvas.loadFromJSON(json, () => {
      const parsed = JSON.parse(json);
      if (parsed.width && parsed.height) {
        canvas.setDimensions({ width: parsed.width, height: parsed.height });
      }
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

    canvas.isDrawingMode = mode === "draw" || mode === "erase";

    if (!canvas.freeDrawingBrush && window.fabric) {
      canvas.freeDrawingBrush = new window.fabric.PencilBrush(canvas);
    }

    if (!canvas.freeDrawingBrush) return;

    canvas.freeDrawingBrush.decimate = 2;
    canvas.freeDrawingBrush.strokeLineCap = "round";
    canvas.freeDrawingBrush.strokeLineJoin = "round";
    canvas.freeDrawingBrush.shadow = null;
    canvas.freeDrawingBrush.width = parseInt(brushSize, 10) || 1;
    canvas.freeDrawingBrush.color = mode === "erase" ? backgroundColor : color;

    const selectable = mode === "select";
    canvas.selection = selectable;
    canvas.forEachObject((obj) => {
      obj.selectable = selectable;
      obj.evented = selectable;
    });
    canvas.discardActiveObject();
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
      .then(([fabric]) => {
        if (disposed || !canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
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
        if (canvas.wrapperEl) {
          canvas.wrapperEl.style.touchAction = "none";
          canvas.wrapperEl.style.userSelect = "none";
        }

        fabricCanvasRef.current = canvas;
        setIsReady(true);

        const addTextAtPointer = (pointer) => {
          const text = new fabric.IText("Texte...", {
            left: pointer.x,
            top: pointer.y,
            fontFamily: fontFamilyRef.current || DEFAULT_TEXT_FONT_FAMILY,
            fontSize: (parseInt(brushSizeRef.current, 10) || 5) * 2 + 10,
            fill: colorRef.current,
            originX: "center",
            originY: "center",
          });

          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          text.selectAll();
          setMode("select");
          saveHistory();
        };

        canvas.on("mouse:down", (opt) => {
          if (imagePendingRef.current) {
            fabric.Image.fromURL(imagePendingRef.current, (img) => {
              img.set({
                left: opt.pointer.x,
                top: opt.pointer.y,
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
            addTextAtPointer(opt.pointer);
          }
        });

        canvas.on("object:modified", saveHistory);
        canvas.on("path:created", saveHistory);
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
              if (savedCanvas.width && savedCanvas.height) {
                canvas.setDimensions({ width: savedCanvas.width, height: savedCanvas.height });
              }
              applyPaperStyleToCanvas(canvas, savedPaperStyle, backgroundColor);
              historyLockedRef.current = false;
              historyRef.current = [JSON.stringify(savedCanvas)];
              historyStepRef.current = 0;
              updateHistoryButtons();
            });
          } else {
            applyPaperStyleToCanvas(canvas, paperStyleRef.current, backgroundColor);
            historyLockedRef.current = false;
            saveHistory();
          }
        } else {
          applyPaperStyleToCanvas(canvas, paperStyleRef.current, backgroundColor);
          saveHistory();
        }
      })
      .catch((error) => {
        setLoadError(error.message || "Chargement du tableau impossible");
      });

    return () => {
      disposed = true;
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
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
    applyPaperStyleToCanvas(canvas, paperStyleRef.current, backgroundColor);
    saveHistory();
  };

  const handleToggleOrientation = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const width = canvas.getWidth();
    const height = canvas.getHeight();
    canvas.setDimensions({ width: height, height: width });
    saveHistory();
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

  const handleSubmitActivity = () => {
    if (isSubmitted) return;
    if (onComplete) {
      onComplete(20);
    }
    setIsSubmitted(true);
  };

  if (loadError) {
    return <div className="text-rose-600 font-medium">{loadError}</div>;
  }

  return (
    <div id="interactive-whiteboard-activity" className="relative pb-40">
      <div id="interactive-whiteboard-header" className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div id="interactive-whiteboard-student-info">
          <h3 className="text-lg font-bold text-slate-800">Tableau blanc interactif</h3>
          <p className="text-sm text-slate-600">Élève : <span className="font-semibold">{studentFullName}</span></p>
        </div>

        <div id="interactive-whiteboard-submit-action" className="print:hidden">
          <button
            type="button"
            onClick={handleSubmitActivity}
            disabled={isSubmitted}
            aria-label={isSubmitted ? "Activité validée" : "Valider l'activité"}
            title={isSubmitted ? "Activité validée" : "Valider l'activité"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <span aria-hidden="true">✓</span>
            <span className="sr-only">{isSubmitted ? "Activité validée" : "Valider l'activité"}</span>
          </button>
        </div>
      </div>

      {showImageHint && (
        <div id="interactive-whiteboard-image-hint" className="mb-3 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow inline-block print:hidden">
          Cliquez sur le canevas pour poser l'image.
        </div>
      )}

      <div
        id="interactive-whiteboard-workspace"
        className="overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div
          id="interactive-whiteboard-canvas-frame"
          className="mx-auto rounded-lg bg-white shadow-2xl"
          style={{
            width: `${canvasWidth}px`,
            transform: `scale(${currentZoom})`,
            transformOrigin: "top center",
          }}
        >
          <canvas id="interactive-whiteboard-canvas" ref={canvasRef} />
        </div>
      </div>

      <div id="interactive-whiteboard-toolbar-dock" className="fixed bottom-4 left-1/2 z-50 w-[min(1100px,calc(100vw-1rem))] -translate-x-1/2 px-2 print:hidden">
        <div id="interactive-whiteboard-toolbar-stack" className="flex flex-col items-center gap-2">
          <section id="interactive-whiteboard-main-toolbar" className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/90 px-3 py-2 shadow-xl backdrop-blur">
            <div id="interactive-whiteboard-file-group" className="flex flex-wrap items-center gap-2 border-r border-slate-200 pr-3">
              <span className="text-xs font-medium text-slate-500">Titre</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 w-32 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <span className="text-xs font-medium text-slate-500">Fond</span>
              <select
                id="interactive-whiteboard-paper-style"
                value={paperStyle}
                onChange={(e) => setPaperStyle(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-700 focus:outline-none"
              >
                <option value="blank">Blanc</option>
                <option value="seyes">Lignage Seyès</option>
                <option value="grid">Carreaux géométrie</option>
              </select>
              <span className="text-xs font-medium text-slate-500">Police</span>
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
              <button type="button" onClick={handleExportJson} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50">💾</button>
              <button type="button" onClick={() => inputJsonRef.current?.click()} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50">📂</button>
              <input ref={inputJsonRef} type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              <button type="button" onClick={handleExportPng} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50">📷</button>
            </div>

            <div id="interactive-whiteboard-view-group" className="flex flex-wrap items-center gap-2 border-r border-slate-200 pr-3">
              <button type="button" onClick={handleToggleOrientation} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50">🔃</button>
              <button type="button" onClick={() => setCurrentZoom((prev) => Math.max(0.2, prev - 0.1))} className="h-9 rounded-lg border border-amber-200 bg-white px-3 text-sm font-bold text-amber-600 hover:bg-amber-50">−</button>
              <span className="min-w-12 text-center text-sm font-semibold text-slate-500">{Math.round(currentZoom * 100)}%</span>
              <button type="button" onClick={() => setCurrentZoom((prev) => prev + 0.1)} className="h-9 rounded-lg border border-amber-200 bg-white px-3 text-sm font-bold text-amber-600 hover:bg-amber-50">+</button>
            </div>

            <div id="interactive-whiteboard-tools-group" className="flex flex-wrap items-center gap-2 border-r border-slate-200 pr-3">
              <button type="button" onClick={() => setMode("draw")} className={`h-9 rounded-lg border px-3 text-sm ${mode === "draw" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`}>✏️</button>
              <button type="button" onClick={() => setMode("text")} className={`h-9 rounded-lg border px-3 text-sm ${mode === "text" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`}>T</button>
              <button type="button" onClick={() => setMode("erase")} className={`h-9 rounded-lg border px-3 text-sm ${mode === "erase" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`}>🧽</button>
              <button type="button" onClick={() => inputImageRef.current?.click()} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50">🖼️</button>
              <input ref={inputImageRef} type="file" accept="image/*" onChange={handlePrepareImage} className="hidden" />
              <button type="button" onClick={() => setMode("select")} className={`h-9 rounded-lg border px-3 text-sm ${mode === "select" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-200 hover:bg-slate-50"}`}>👇</button>
            </div>

            <div id="interactive-whiteboard-history-group" className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={undo} disabled={!canUndo} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-50">↩️</button>
              <button type="button" onClick={redo} disabled={!canRedo} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-50">↪️</button>
              <button type="button" onClick={handleClear} className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-sm text-rose-600 hover:bg-rose-50">🧹</button>
            </div>
          </section>

          <section id="interactive-whiteboard-secondary-toolbar" className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/80 px-3 py-2 shadow-lg backdrop-blur">
            {(mode === "draw" || mode === "text" || mode === "erase") && (
              <div id="interactive-whiteboard-style-group" className="flex items-center gap-2 border-r border-slate-200 pr-3">
                {mode !== "erase" && (
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 rounded-lg border border-sky-200 bg-sky-50 px-2 text-sm font-semibold text-sky-700 focus:outline-none"
                  >
                    <option value="black">⚫</option>
                    <option value="blue">🔵</option>
                    <option value="red">🔴</option>
                    <option value="green">🟢</option>
                  </select>
                )}
                <select
                  value={brushSize}
                  onChange={(e) => setBrushSize(e.target.value)}
                  className="h-9 rounded-lg border border-sky-200 bg-sky-50 px-2 text-sm font-semibold text-sky-700 focus:outline-none"
                >
                  <option value="1">XS</option>
                  <option value="5">S</option>
                  <option value="15">M</option>
                  <option value="30">L</option>
                  <option value="50">XL</option>
                </select>
              </div>
            )}

            {mode === "select" && (
              <div id="interactive-whiteboard-selection-group" className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleCut} className="h-9 rounded-lg border border-orange-200 bg-white px-3 text-sm text-orange-600 hover:bg-orange-50">✂️</button>
                <button type="button" onClick={handleCopy} className="h-9 rounded-lg border border-orange-200 bg-white px-3 text-sm text-orange-600 hover:bg-orange-50">📋</button>
                <button type="button" onClick={handlePaste} className="h-9 rounded-lg border border-orange-200 bg-white px-3 text-sm text-orange-600 hover:bg-orange-50">🗐</button>
                <button type="button" onClick={handleDeleteSelection} className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-sm text-rose-600 hover:bg-rose-50">❌</button>
                <button type="button" onClick={handleBringForward} className="h-9 rounded-lg border border-violet-200 bg-white px-3 text-sm text-violet-600 hover:bg-violet-50">🔺</button>
                <button type="button" onClick={handleSendBackward} className="h-9 rounded-lg border border-violet-200 bg-white px-3 text-sm text-violet-600 hover:bg-violet-50">🔻</button>
                <button type="button" onClick={handleToggleLock} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50">🔒</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default InteractiveWhiteboardActivity;
