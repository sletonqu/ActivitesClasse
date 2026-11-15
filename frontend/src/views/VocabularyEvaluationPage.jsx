import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ActivityHero from "../components/ActivityHero";
import {
  decodeEvaluationPayload,
  pickRandomEvaluationSentences,
} from "../components/VocabularyEvaluationView";
import { API_URL } from "../config/api";

const VIEW_BACKGROUND_ICON = `${import.meta.env.BASE_URL}images/favicon_io/favicon.png`;

const VocabularyEvaluationPage = () => {
  const location = useLocation();

  const queryInfo = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const sequenceId = searchParams.get("sequenceId") || "";
    const countParam = Number(searchParams.get("count") || 6);
    const sentenceCount = Number.isNaN(countParam) || countParam <= 0 ? 6 : countParam;
    const rawData = searchParams.get("data") || "";
    const decoded = decodeEvaluationPayload(rawData);

    return {
      sequenceId: sequenceId || decoded?.sequenceId || "",
      sentenceCount: decoded?.sentenceCount || sentenceCount,
      decoded,
    };
  }, [location.search]);

  const [sequenceData, setSequenceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!queryInfo.sequenceId) return;

    let cancelled = false;
    const fetchSequence = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`${API_URL}/vocabulary/sequences/${queryInfo.sequenceId}`);
        if (!resp.ok) {
          throw new Error("Impossible de charger la séquence demandée.");
        }
        const data = await resp.json();
        if (!cancelled) {
          setSequenceData(data);
        }
      } catch (err) {
        if (!cancelled && !queryInfo.decoded) {
          setError(err.message || "Erreur lors du chargement de l'évaluation.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchSequence();
    return () => {
      cancelled = true;
    };
  }, [queryInfo.decoded, queryInfo.sequenceId]);

  const title =
    sequenceData?.title ||
    queryInfo.decoded?.title ||
    "Séquence de vocabulaire";

  const level =
    sequenceData?.level ||
    queryInfo.decoded?.level ||
    "CE1";

  const headerWords = useMemo(() => {
    if (Array.isArray(sequenceData?.words) && sequenceData.words.length > 0) {
      return [...sequenceData.words]
        .map((w) => String(w.word || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
    }
    if (Array.isArray(queryInfo.decoded?.headerWords)) {
      return queryInfo.decoded.headerWords;
    }
    return [];
  }, [queryInfo.decoded, sequenceData]);

  const selectedPrompts = useMemo(() => {
    if (
      Array.isArray(queryInfo.decoded?.selectedPrompts) &&
      queryInfo.decoded.selectedPrompts.length > 0
    ) {
      return queryInfo.decoded.selectedPrompts;
    }
    if (Array.isArray(sequenceData?.words) && sequenceData.words.length > 0) {
      return pickRandomEvaluationSentences(sequenceData.words, queryInfo.sentenceCount);
    }
    return [];
  }, [queryInfo.decoded, queryInfo.sentenceCount, sequenceData]);

  const unusedWordsCount = Math.max(0, headerWords.length - selectedPrompts.length);

  const instructionText = useMemo(() => {
    const base = "Recopie chaque phrase sur ton cahier et complète le trou avec le bon mot de la liste.";
    return base;
  }, [unusedWordsCount]);

  const renderClozeText = (cloze) => {
    const parts = String(cloze || "").split("_____");
    if (parts.length <= 1) {
      return (
        <span>
          {cloze}{" "}
          <span className="inline-block min-w-28 border-b-2 border-dashed border-slate-500 px-2 font-extrabold text-transparent">
            {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
          </span>
        </span>
      );
    }

    return parts.map((part, index) => (
      <React.Fragment key={index}>
        <span>{part}</span>
        {index < parts.length - 1 && (
          <span className="mx-1 inline-block min-w-28 border-b-2 border-dashed border-slate-600 px-2 text-center font-extrabold text-transparent">
            {"____________"}
          </span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div
      id="student-view-root"
      style={{ "--view-background-icon": `url(${VIEW_BACKGROUND_ICON})` }}
      className="min-h-screen animate-in fade-in duration-500 px-2 py-4 sm:px-4 sm:py-1 flex flex-col items-center"
    >
      <div
        id="activity-container"
        className="activity-print-zone mx-auto w-full max-w-4xl rounded-2xl bg-white p-3 sm:p-5 shadow-sm print:max-w-[190mm] print:p-0 print:shadow-none"
      >
        <section
          id="vocabulary-evaluation-page"
          className="mx-auto flex w-full flex-col gap-4"
        >
          {/* 1. En-tête de type Activité (Titre + Consigne) */}
          <ActivityHero
            idPrefix="vocabulary-evaluation-page"
            title={`Évaluation de vocabulaire : ${title}`}
            instruction={instructionText}
            showBadges={true}
            badges={[
              {
                key: "level",
                content: `Niveau ${level}`,
                className:
                  "inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold text-indigo-800",
              },
              {
                key: "skill",
                content: "Comprendre, mémoriser et réinvestir les mots appris en contexte",
                className:
                  "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800",
              },
            ]}
          />

          {error && (
            <div
              id="vocabulary-evaluation-page-error"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
            >
              {error}
            </div>
          )}

          {loading && selectedPrompts.length === 0 ? (
            <div className="py-12 text-center text-sm font-medium text-slate-500">
              Chargement de l'évaluation...
            </div>
          ) : (
            <>
              {/* 2. Liste des mots de la séquence */}
              <div
                id="vocabulary-evaluation-word-bank"
                className="rounded-2xl border-2 border-indigo-300 bg-indigo-50/70 p-4"
              >
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-indigo-900">
                    📚 Liste des mots de la séquence ({headerWords.length} mots) :
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

              {/* 3. Les phrases à trous à recopier et compléter sur le cahier */}
              <div
                id="vocabulary-evaluation-sentences-list"
                className="space-y-2 pt-1"
              >
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
                      {renderClozeText(item.cloze)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default VocabularyEvaluationPage;
