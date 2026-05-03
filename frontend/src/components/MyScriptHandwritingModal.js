import React, { useEffect, useRef, useState } from "react";
import { InteractiveInkEditor } from "iink-ts";
/**
 * Composant utilisant le SDK MyScript iink pour une reconnaissance 
 * d'écriture manuscrite de haute précision (v3 API).
 * Configurable pour s'adapter à différents contextes (normal/minimal).
 */
const MyScriptHandwritingModal = ({
  isOpen,
  activeFieldLabel,
  onRecognized,
  onClose,
  mode = "normal", // "normal" or "minimal"
  overlayType = "Blur", // "Blur" or "Normal"
  maxWidth = "max-w-xl", // Tailwind max-w class
  position = null // { top, left }
}) => {
  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [error, setError] = useState(null);
  const appKey = process.env.REACT_APP_MYSCRIPT_APP_KEY;
  const hmacKey = process.env.REACT_APP_MYSCRIPT_HMAC_KEY;
  const hasValidKeys = appKey && appKey !== "VOTRE_APP_KEY" && hmacKey && hmacKey !== "VOTRE_HMAC_KEY";
  useEffect(() => {
    // Initialisation du moteur MyScript (v3.2.1) quand la modale s'ouvre
    if (isOpen && editorRef.current && !editor) {
      setError(null);
      const initEditor = async () => {
        const options = {
          configuration: {
            server: {
              protocol: "WEBSOCKET",
              apiVersion: 'V4',
              scheme: "https",
              host: "cloud.myscript.com",
              applicationKey: appKey || "VOTRE_APP_KEY",
              hmacKey: hmacKey || "VOTRE_HMAC_KEY",
            },
            menu: { enable: false },
            penStyle: { width: 4 },
            recognition: {
              type: "TEXT",
              lang: "fr_FR",
              gesture: { enable: false },
              text: {
                mimeTypes: ["text/plain", "application/vnd.myscript.jiix"],
              },
            },
            export: {
              "requested-mime-types": ["text/plain", "application/vnd.myscript.jiix"],
              "auto-export": true
            }
          },
        };
        try {
          const newEditor = new InteractiveInkEditor(editorRef.current, options);
          // Force le thème après création
          newEditor.theme = "* { -myscript-pen-width: 4; color: #4f46e5; }";
          const handleExport = (exports) => {
            if (!exports) return;
            let text = "";
            if (exports['text/plain']) {
              text = exports['text/plain'];
            } else if (exports['application/vnd.myscript.jiix']) {
              const jiix = exports['application/vnd.myscript.jiix'];
              text = jiix.label || (jiix.elements ? jiix.elements.map(e => e.label || "").join("") : "");
            }
            if (text !== undefined && text !== null) {
              setRecognizedText(String(text));
            }
          };
          // On écoute les exports via l'élément DOM
          editorRef.current.addEventListener('exported', (event) => {
            const data = event.detail?.exports || event.detail;
            handleExport(data);
          });
          // Fallback: Polling
          const interval = setInterval(() => {
            if (newEditor.exports) {
              handleExport(newEditor.exports);
            }
          }, 1000);
          // Gestion des erreurs via l'élément DOM
          editorRef.current.addEventListener('error', (event) => {
            const msg = event.detail?.message || "Erreur de connexion MyScript";
            setError(msg);
          });
          await newEditor.initialize();
          setEditor(newEditor);
          newEditor._pollingInterval = interval;
        } catch (err) {
          console.error("Erreur fatale MyScript:", err);
          setError(err.message || "Échec de l'initialisation du moteur MyScript");
        }
      };
      initEditor();
    }
  }, [isOpen, editor, appKey, hmacKey]);
  // Nettoyage
  useEffect(() => {
    if (!isOpen && editor) {
      if (editor._pollingInterval) {
        clearInterval(editor._pollingInterval);
      }
      setEditor(null);
      setRecognizedText("");
      setError(null);
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
  const containerStyle = position
    ? { position: 'fixed', top: position.top, left: position.left, transform: 'none' }
    : {};
  return (
    <div
      id="myscript-modal-overlay"
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 ${overlayClass}`}
    >
      <div
        id="myscript-modal-container"
        style={containerStyle}
        className={`w-full ${maxWidth} rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-black/5`}
      >
        <div id="ms-modal-header" className="mb-3 flex items-start justify-between">
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
          className={`${isMinimal ? 'h-[250px] min-h-[250px]' : 'h-[450px] min-h-[450px]'} w-full mt-3 overflow-hidden rounded-2xl border-4 border-slate-100 bg-slate-50 shadow-inner`}
          style={{ touchAction: 'none', display: error ? 'none' : 'block' }}
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