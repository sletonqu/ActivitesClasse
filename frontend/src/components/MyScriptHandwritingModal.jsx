import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "iink-ts";
/**
 * Composant utilisant le SDK MyScript iink pour une reconnaissance 
 * d'écriture manuscrite de haute précision.
 * Configurable pour s'adapter à différents contextes (normal/minimal).
 */
const MyScriptHandwritingModal = ({
  isOpen,
  activeFieldLabel,
  onRecognized,
  onClose,
  mode = "normal", // "normal" or "minimal"
  overlayType = "Blur", // "Blur" or "Normal"
  maxWidth = "max-w-[448px]", // Tailwind max-w class
  position = null // { top, left }
}) => {
  const editorRef = useRef(null);
  const modalRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const initializationIdRef = useRef(0);
  const dragOffsetRef = useRef(null);
  const [editor, setEditor] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [error, setError] = useState(null);
  const appKey = import.meta.env.VITE_MYSCRIPT_APP_KEY;
  const hmacKey = import.meta.env.VITE_MYSCRIPT_HMAC_KEY;
  const digitSubsetKnowledge = import.meta.env.VITE_MYSCRIPT_DIGITS_SK_PATH || "digitSubsetKnowledge";
  const hasValidKeys = appKey && appKey !== "VOTRE_APP_KEY" && hmacKey && hmacKey !== "VOTRE_HMAC_KEY";

  const clampPosition = (left, top) => {
    const modalWidth = modalRef.current?.offsetWidth || 448;
    const modalHeight = modalRef.current?.offsetHeight || 630;
    const maxLeft = Math.max(8, window.innerWidth - modalWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - modalHeight - 8);

    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop),
    };
  };

  useEffect(() => {
    if (!isOpen) {
      dragOffsetRef.current = null;
      setDragPosition(null);
      return undefined;
    }

    const handlePointerMove = (event) => {
      if (!dragOffsetRef.current) return;

      const { offsetX, offsetY } = dragOffsetRef.current;
      setDragPosition(clampPosition(event.clientX - offsetX, event.clientY - offsetY));
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

  const handleDragStart = (event) => {
    if (event.button !== 0) return;

    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = dragPosition?.left ?? rect.left;
    const top = dragPosition?.top ?? rect.top;
    dragOffsetRef.current = {
      offsetX: event.clientX - left,
      offsetY: event.clientY - top,
    };

    setDragPosition(clampPosition(left, top));
    event.preventDefault();
  };

  useEffect(() => {
    if (!isOpen || !editorRef.current || editorInstanceRef.current) return undefined;

    const initializationId = ++initializationIdRef.current;
    setError(null);

    const initEditor = async () => {
      let newEditor;
      try {
        newEditor = await Canvas.load(editorRef.current, "INTERACTIVE_INK", {
          configuration: {
            server: {
              scheme: "https",
              host: "cloud.myscript.com",
              applicationKey: appKey || "VOTRE_APP_KEY",
              hmacKey: hmacKey || "VOTRE_HMAC_KEY",
            },
            menu: { enable: false },
            penStyle: { width: 4, color: "#4f46e5" },
            recognition: {
              lang: "fr_FR",
              gesture: { enable: false },
              "raw-content": {
                recognition: { types: ["text"] },
                classification: { types: ["text"] },
                gestures: [],
                text: {
                  customResources: [digitSubsetKnowledge],
                  addLKText: true,
                },
              },
            },
          },
        });

        if (initializationId !== initializationIdRef.current) {
          await newEditor.destroy();
          return;
        }

        newEditor.renderer.ensurePointVisible = () => {};

        newEditor.event.addEventListener("exported", (event) => {
          const exports = event.detail;
          if (!exports) return;

          let text = "";
          if (exports["text/plain"]) {
            text = exports["text/plain"];
          } else if (exports["application/vnd.myscript.jiix"]) {
            const jiix = exports["application/vnd.myscript.jiix"];
            text = jiix.label || (jiix.elements ? jiix.elements.map((element) => element.label || "").join("") : "");
          }
          setRecognizedText(String(text));
        });

        newEditor.event.addEventListener("error", (event) => {
          setError(event.detail?.message || "Erreur de connexion MyScript");
        });

        editorInstanceRef.current = newEditor;
        setEditor(newEditor);
      } catch (err) {
        console.error("Erreur fatale MyScript:", err);
        if (initializationId === initializationIdRef.current) {
          setError(err.message || "Échec de l'initialisation du moteur MyScript");
        }
      }
    };

    initEditor();
    return () => {
      initializationIdRef.current += 1;
    };
  }, [isOpen, appKey, hmacKey, digitSubsetKnowledge]);

  useEffect(() => {
    if (!isOpen && editor) {
      editorInstanceRef.current = null;
      setEditor(null);
      setRecognizedText("");
      setError(null);
      editor.destroy().catch((err) => {
        console.error("Erreur lors de la fermeture de MyScript:", err);
      });
    }
  }, [isOpen, editor]);
  const handleValidate = () => {
    const cleanValue = recognizedText.trim().replace(/[^0-9]/g, "");
    onRecognized(cleanValue);
    onClose();
  };
  const handleClear = () => {
    if (editor) {
      editor.clear();
      setRecognizedText("");
    }
  };
  if (!isOpen) return null;
  const isMinimal = mode === "minimal";
  const overlayClass = overlayType === "Blur" ? "backdrop-blur-md" : "";
  const activePosition = dragPosition || position;
  const containerStyle = activePosition
    ? { position: "fixed", top: activePosition.top, left: activePosition.left, transform: "none" }
    : {};

  return (
    <div
      id="myscript-modal-overlay"
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 ${overlayClass}`}
    >
      <div
        id="myscript-modal-container"
        ref={modalRef}
        style={containerStyle}
        className={`w-full ${maxWidth} rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-black/5 sm:p-6`}
      >
        <div
          id="ms-modal-drag-handle"
          onPointerDown={handleDragStart}
          title="Déplacer la fenêtre d’écriture"
          aria-label="Déplacer la fenêtre d’écriture"
          className="mb-1.5 flex cursor-grab items-center justify-center rounded-full border border-stone-700/80 px-2 py-1 shadow-inner touch-none active:cursor-grabbing"
          style={{
            backgroundColor: "#2f2623",
            backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0 2px, transparent 2.5px), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.06) 0 1.5px, transparent 2px), radial-gradient(circle at 35% 75%, rgba(0,0,0,0.22) 0 2px, transparent 3px), linear-gradient(135deg, #4a3a34 0%, #2f2623 50%, #221b18 100%)"
          }}
        >
          <span className="sr-only">Déplacer la fenêtre d’écriture</span>
          <span aria-hidden="true" className="h-1 w-9 rounded-full bg-white/20 shadow-inner" />
        </div>
        <div id="ms-modal-header" className={`flex items-start justify-between ${isMinimal ? "mb-2" : "mb-6"}`}>
          <div id="ms-modal-title-area">
            {!isMinimal && <h3 id="ms-modal-title" className="text-sm font-black uppercase tracking-wider text-slate-400">Écriture MyScript</h3>}
            <p id="ms-modal-subtitle" className="text-xs font-bold text-indigo-600">{activeFieldLabel || "Saisie manuscrite"}</p>
          </div>
          <div id="ms-modal-actions" className="flex items-center gap-2">
            <button
              id="ms-btn-clear"
              title="Effacer"
              onClick={handleClear}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              ↺
            </button>
            <button
              id="ms-btn-validate"
              title="Valider"
              onClick={handleValidate}
              disabled={!recognizedText || recognizedText.trim().length === 0}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${recognizedText && recognizedText.trim().length > 0
                ? "bg-emerald-500 text-white shadow-md hover:bg-emerald-600"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
            >
              ✓
            </button>
            <button
              id="ms-btn-close"
              title="Fermer"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              ✕
            </button>
          </div>
        </div>
        {/* Zone de résultat */}
        {!error && (
          <div id="ms-result-container" className="mt-3 flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2">
            <div id="ms-result-labels" className="flex flex-col">
              <span id="ms-label-recognized" className="text-xs font-bold text-slate-400 uppercase">Reconnu :</span>
              <span id="ms-label-hint" className="text-sm text-slate-500 italic">Écrivez des chiffres...</span>
            </div>
            <span id="ms-recognized-text" className="text-3xl font-black text-indigo-600">{recognizedText || "..."}</span>
          </div>
        )}
        {/* Zone d'écriture MyScript */}
        <div
          id="ms-editor-area"
          ref={editorRef}
          className="mt-3 h-[400px] min-h-[400px] w-[400px] min-w-[400px] flex-none overflow-hidden rounded-2xl border-4 border-slate-100 bg-slate-50 shadow-inner"
          style={{ width: 400, height: 400, minWidth: 400, touchAction: "none", display: error ? "none" : "block" }}
        />
        {error && (
          <div id="ms-error-container" className="message-modal error-msg">
            <div id="ms-error-content" className="flex flex-col items-center gap-2">
              <span id="ms-error-icon" className="text-2xl">⚠️</span>
              <p id="ms-error-text">{error}</p>
              <button
                id="ms-btn-reload"
                onClick={() => window.location.reload()}
                className="mt-2 text-xs underline opacity-70 hover:opacity-100"
              >
                Recharger la page
              </button>
            </div>
          </div>
        )}
        {!isMinimal && (
          <p id="ms-modal-footer" className="mt-2 text-[10px] text-center text-slate-400">
            Nécessite une connexion internet et des clés API valides {hasValidKeys ? "🟢" : "🔴"}
          </p>
        )}
      </div>
    </div>
  );
};

export default MyScriptHandwritingModal;