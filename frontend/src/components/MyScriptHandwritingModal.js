import React, { useEffect, useRef, useState } from "react";
import { InteractiveInkEditor } from "iink-ts";

/**
 * Composant de test utilisant le SDK MyScript iink pour une reconnaissance 
 * d'écriture manuscrite de haute précision (v3 API).
 */
const MyScriptHandwritingModal = ({
  isOpen,
  activeFieldLabel,
  onRecognized,
  onClose,
  position,
}) => {
  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [error, setError] = useState(null);

  const appKey = process.env.REACT_APP_MYSCRIPT_APP_KEY;
  const hmacKey = process.env.REACT_APP_MYSCRIPT_HMAC_KEY;
  const hasValidKeys = appKey && appKey !== "VOTRE_APP_KEY" && hmacKey && hmacKey !== "VOTRE_HMAC_KEY";

  useEffect(() => {
    console.log("MyScript useEffect - isOpen:", isOpen, "editorRef:", !!editorRef.current, "editorExists:", !!editor);

    // Initialisation du moteur MyScript (v3.2.1) quand la modale s'ouvre
    if (isOpen && editorRef.current && !editor) {
      setError(null);
      const initEditor = async () => {
        console.log("MyScript initEditor: début de l'initialisation...");

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
            recognition: {
              type: "TEXT",
              lang: "fr_FR",
              // On tente de désactiver les gestes partout
              gestures: { enable: false },
              text: {
                gestures: { enable: false },
                mimeTypes: ["text/plain", "application/vnd.myscript.jiix"],
              },
            },
            rendering: {
              // Thème global pour forcer l'épaisseur L (4px)
              theme: "* { -myscript-pen-width: 4; color: #4f46e5; }"
            },
            export: {
              "requested-mime-types": ["text/plain", "application/vnd.myscript.jiix"],
              "auto-export": true
            }
          },
        };

        try {
          console.log("MyScript options finales:", options);
          const newEditor = new InteractiveInkEditor(editorRef.current, options);

          // Force le thème après création au cas où les options initiales seraient ignorées
          newEditor.theme = "* { -myscript-pen-width: 4; color: #4f46e5; }";

          const handleExport = (exports) => {
            console.log("MyScript handleExport reçu:", exports);
            if (!exports) return;

            // On cherche le texte brut ou le label JIIX
            let text = "";
            if (exports['text/plain']) {
              text = exports['text/plain'];
            } else if (exports['application/vnd.myscript.jiix']) {
              const jiix = exports['application/vnd.myscript.jiix'];
              console.log("MyScript Extraction JIIX...", jiix);
              text = jiix.label || (jiix.elements ? jiix.elements.map(e => e.label || "").join("") : "");
            }

            console.log("MyScript Texte final extrait:", text);
            if (text !== undefined && text !== null) {
              setRecognizedText(String(text));
            }
          };

          // On écoute les exports via l'élément DOM
          editorRef.current.addEventListener('exported', (event) => {
            console.log("MyScript Event 'exported' reçu sur le DOM:", event.detail);
            // On essaie les deux structures possibles
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
            console.error("MyScript Runtime Error (DOM):", event.detail);
            const msg = event.detail?.message || "Erreur de connexion MyScript";
            setError(msg);
          });

          console.log("MyScript appel à newEditor.initialize()...");
          await newEditor.initialize();
          console.log("MyScript initialisation terminée avec succès !");

          setEditor(newEditor);
          newEditor._pollingInterval = interval;
        } catch (err) {
          console.error("Erreur fatale lors de l'initialisation MyScript:", err);
          setError(err.message || "Échec de l'initialisation du moteur MyScript");
        }
      };

      initEditor();
    }
  }, [isOpen, editor, appKey, hmacKey]);

  // Réinitialiser l'éditeur si on le ferme et rouvre
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
    // On ne garde que les chiffres pour cette activité
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

  const containerStyle = position
    ? { position: 'fixed', top: position.top, left: position.left, transform: 'none' }
    : {};

  return (
    <div
      id="myscript-modal-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div
        id="myscript-modal-container"
        style={containerStyle}
        className="w-full max-w-4xl rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-black/5"
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Mode MyScript Test (Agrandi)</h3>
            <p className="text-xs font-bold text-indigo-600">{activeFieldLabel || "Saisie manuscrite"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              title="Effacer"
              onClick={handleClear}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              ↺
            </button>
            <button
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
              title="Fermer"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Zone d'écriture MyScript - Agrandie à 450px pour le test */}
        <div
          ref={editorRef}
          className="h-[450px] min-h-[450px] w-full overflow-hidden rounded-2xl border-4 border-slate-100 bg-slate-50 shadow-inner"
          style={{ touchAction: 'none', display: error ? 'none' : 'block' }}
        />

        {error && (
          <div className="message-modal error-msg">
            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-xs underline opacity-70 hover:opacity-100"
              >
                Recharger la page
              </button>
            </div>
          </div>
        )}

        {!error && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase">Reconnu :</span>
              <span className="text-sm text-slate-500 italic">Écrivez des chiffres ou du texte...</span>
            </div>
            <span className="text-3xl font-black text-indigo-600">{recognizedText || "..."}</span>
          </div>
        )}

        <p className="mt-2 text-[10px] text-center text-slate-400">
          Nécessite une connexion internet et des clés API valides {hasValidKeys ? "🟢" : "🔴"}
        </p>
      </div>
    </div>
  );
};

export default MyScriptHandwritingModal;
