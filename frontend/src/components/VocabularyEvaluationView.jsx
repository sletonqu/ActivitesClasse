import React, { useMemo, useState } from "react";
import { CopyIcon, ExternalLinkIcon } from "./ActionIcons";

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function encodeEvaluationPayload(payload) {
  try {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  } catch {
    return "";
  }
}

export function decodeEvaluationPayload(encoded) {
  if (!encoded || typeof encoded !== "string") return null;
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function buildVocabularyEvaluationUrl({
  sequenceId = null,
  title = "",
  level = "CE1",
  headerWords = [],
  selectedPrompts = [],
  sentenceCount = 6,
} = {}) {
  const params = new URLSearchParams();
  if (sequenceId) {
    params.set("sequenceId", String(sequenceId));
  }
  params.set("count", String(sentenceCount || 6));

  const encoded = encodeEvaluationPayload({
    sequenceId,
    title,
    level,
    headerWords,
    selectedPrompts,
    sentenceCount,
  });
  if (encoded) {
    params.set("data", encoded);
  }

  const baseOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  return `${baseOrigin}/vocabulary-evaluation?${params.toString()}`;
}

export function pickRandomEvaluationSentences(words = [], sentenceCount = 6) {
  const validWords = Array.isArray(words) ? words.filter((w) => w?.word) : [];
  if (validWords.length === 0) return [];
  const safeCount = Math.min(Math.max(1, Number(sentenceCount) || 6), validWords.length);
  const shuffledWords = shuffleArray(validWords).slice(0, safeCount);

  return shuffledWords.map((wordObj, idx) => {
    const candidates = [
      wordObj.sentence1_cloze,
      wordObj.sentence2_cloze,
    ].filter((s) => Boolean(String(s || "").trim()));

    const chosenCloze =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : `Complète avec le mot qui convient : _____`;

    return {
      number: idx + 1,
      word: wordObj.word,
      nature: wordObj.nature || "",
      cloze: chosenCloze,
    };
  });
}

const VocabularyEvaluationView = ({
  sequence,
  defaultSentenceCount = 6,
  onClose,
}) => {
  const words = useMemo(
    () => (Array.isArray(sequence?.words) ? sequence.words.filter((w) => w?.word) : []),
    [sequence]
  );

  const maxSentences = Math.max(1, words.length);
  const [sentenceCount, setSentenceCount] = useState(
    Math.min(Math.max(1, Number(defaultSentenceCount) || 6), maxSentences)
  );
  const [drawSeed, setDrawSeed] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Liste des mots en en-tête (mélangée ou alphabétique pour que l'ordre ne révèle pas les phrases)
  const headerWords = useMemo(() => {
    return [...words]
      .map((w) => String(w.word || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  }, [words]);

  // Tirage aléatoire de N mots distincts (1 phrase à trou par mot tiré)
  const selectedPrompts = useMemo(() => {
    void drawSeed; // dépendance volontaire pour relancer un nouveau tirage
    return pickRandomEvaluationSentences(words, sentenceCount);
  }, [words, sentenceCount, drawSeed]);

  const unusedWordsCount = Math.max(0, headerWords.length - selectedPrompts.length);

  const evaluationUrl = useMemo(
    () =>
      buildVocabularyEvaluationUrl({
        sequenceId: sequence?.id || null,
        title: sequence?.title || "Séquence de vocabulaire",
        level: sequence?.level || "CE1",
        headerWords,
        selectedPrompts,
        sentenceCount,
      }),
    [headerWords, selectedPrompts, sentenceCount, sequence?.id, sequence?.level, sequence?.title]
  );

  const handleOpenEvaluationUrl = () => {
    if (typeof window !== "undefined") {
      window.open(evaluationUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyEvaluationUrl = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(evaluationUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    } catch {
      // Silencieux si le presse-papiers n'est pas disponible
    }
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;

    const viewElement = document.getElementById("vocabulary-evaluation-view");
    if (!viewElement) {
      window.print();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    try {
      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      const clone = viewElement.cloneNode(true);
      const toolbar = clone.querySelector("#vocabulary-evaluation-toolbar");
      if (toolbar) toolbar.remove();

      const printHeader = clone.querySelector(".print\\:block");
      if (printHeader) {
        printHeader.classList.remove("hidden");
        printHeader.style.display = "block";
      }

      const styleTags = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
        .map((tag) => tag.outerHTML)
        .join("\n");

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="utf-8" />
            <title>${sequence?.title ? `Évaluation - ${sequence.title}` : "Évaluation de vocabulaire"}</title>
            ${styleTags}
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              html, body {
                background: #fff !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: 'Outfit', sans-serif;
              }
              #vocabulary-evaluation-view {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
              }
            </style>
          </head>
          <body class="p-2">
            ${clone.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            iframe.remove();
          }, 1500);
        }
      }, 300);
    } catch {
      iframe.remove();
      window.print();
    }
  };

  const renderClozeText = (cloze, answerWord) => {
    const parts = String(cloze || "").split("_____");
    if (parts.length <= 1) {
      return (
        <span>
          {cloze}{" "}
          <span className="inline-block min-w-28 border-b-2 border-dashed border-slate-500 px-2 font-extrabold text-emerald-700">
            {showAnswers ? answerWord : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
          </span>
        </span>
      );
    }

    return parts.map((part, index) => (
      <React.Fragment key={index}>
        <span>{part}</span>
        {index < parts.length - 1 && (
          <span
            className={`mx-1 inline-block min-w-28 border-b-2 px-2 text-center font-extrabold ${showAnswers
              ? "border-emerald-600 bg-emerald-50 text-emerald-800 rounded-md"
              : "border-dashed border-slate-600 text-transparent"
              }`}
          >
            {showAnswers ? answerWord : "____________"}
          </span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <section
      id="vocabulary-evaluation-view"
      className="rounded-2xl border-2 border-indigo-200 bg-white p-4 sm:p-2.5 shadow-md space-y-5 print:border-0 print:shadow-none"
    >
      {/* Barre d'outils enseignant (masquée à l'impression) */}
      <div
        id="vocabulary-evaluation-toolbar"
        className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 print:hidden"
      >
        <div>
          <h3 id="vocabulary-evaluation-title" className="text-lg sm:text-xl font-extrabold text-slate-900">
            📝 Évaluation sur cahier : {sequence?.title || "Séquence de vocabulaire"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Recopie chaque phrase sur ton cahier et complète le trou avec le bon mot de la liste.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="vocabulary-evaluation-count-input"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700"
          >
            <span>Nombre de phrases :</span>
            <input
              id="vocabulary-evaluation-count-input"
              type="number"
              min={1}
              max={maxSentences}
              value={sentenceCount}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (!Number.isNaN(parsed)) {
                  setSentenceCount(Math.min(Math.max(1, parsed), maxSentences));
                }
              }}
              className="w-14 rounded border border-slate-300 bg-white px-2 py-0.5 text-center text-xs font-extrabold text-indigo-800"
            />
          </label>

          <button
            id="vocabulary-evaluation-redraw-button"
            type="button"
            onClick={() => setDrawSeed((s) => s + 1)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            🎲 Nouveau tirage
          </button>

          <button
            id="vocabulary-evaluation-toggle-answers-button"
            type="button"
            onClick={() => setShowAnswers((prev) => !prev)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${showAnswers
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
          >
            {showAnswers ? "🙈 Masquer la correction" : "👁️ Afficher la correction"}
          </button>

          <button
            id="vocabulary-evaluation-copy-url-button"
            type="button"
            onClick={handleCopyEvaluationUrl}
            title="Copie le lien de cette évaluation pour l'ouvrir sur un autre appareil ou navigateur."
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
          >
            <CopyIcon className="h-3.5 w-3.5" />
            {copiedUrl ? "URL copiée !" : "Copier URL"}
          </button>

          <button
            id="vocabulary-evaluation-open-url-button"
            type="button"
            onClick={handleOpenEvaluationUrl}
            title="Ouvre l'évaluation dans un nouvel onglet sous forme d'activité plein écran (Titre, Consigne, Liste des mots et Phrases à trous à recopier)."
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
            Ouvrir URL
          </button>

          <button
            id="vocabulary-evaluation-print-button"
            type="button"
            onClick={handlePrint}
            title="Imprime la fiche d'évaluation (Titre, Consigne, Banque de mots et Phrases à trous)."
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            🖨️ Imprimer
          </button>

          {onClose && (
            <button
              id="vocabulary-evaluation-close-button"
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* En-tête visible uniquement à l'impression (puisque la barre d'outils est masquée) */}
      <div className="hidden print:block border-b border-slate-300 pb-3 mb-3">
        <h2 className="text-xl font-extrabold text-slate-900">
          Évaluation de vocabulaire ({sequence?.level || "CE1"}) : {sequence?.title || "Séquence de vocabulaire"}
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          Consigne : Recopie chaque phrase sur ton cahier et complète le trou avec le bon mot de la liste.
          {unusedWordsCount > 0 && ` (${unusedWordsCount} mot(s) de la liste ne seront pas utilisés.)`}
        </p>
      </div>

      {/* En-tête : Banque de tous les mots de la session à apprendre */}
      <div
        id="vocabulary-evaluation-word-bank"
        className="rounded-2xl border-2 border-indigo-300 bg-indigo-50/70 p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-indigo-900">
            📚 Mots appris dans cette séquence ({headerWords.length} mots) :
          </span>
          {unusedWordsCount > 0 && (
            <span className="text-xs font-bold text-indigo-700">
              {selectedPrompts.length} phrases à compléter • {unusedWordsCount} mot(s) intrus
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          {headerWords.map((word, index) => (
            <span
              key={`${word}-${index}`}
              id={`vocabulary-evaluation-bank-word-${index}`}
              className="rounded-xl border-2 border-indigo-200 bg-white px-3.5 py-1.5 text-base sm:text-lg font-extrabold text-slate-900 shadow-xs"
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Liste des phrases à trous à recopier dans le cahier */}
      <div id="vocabulary-evaluation-sentences-list" className="space-y-2 pt-1">
        {selectedPrompts.map((item) => (
          <div
            key={`${item.number}-${item.word}`}
            id={`vocabulary-evaluation-sentence-${item.number}`}
            className="flex items-baseline gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-base sm:text-xl leading-relaxed text-slate-900"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-extrabold text-white">
              {item.number}
            </span>
            <p className="font-semibold text-slate-800">
              {renderClozeText(item.cloze, item.word)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VocabularyEvaluationView;
