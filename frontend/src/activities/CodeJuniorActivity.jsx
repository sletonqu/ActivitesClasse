import React, { useEffect, useState } from "react";
import { API_URL } from "../config/api";

const extractCodeJuniorStats = (rawGameState) => {
  if (!rawGameState) {
    return { lastReachedLevel: null, totalStars: 0 };
  }

  let parsedState = rawGameState;
  if (typeof rawGameState === "string") {
    try {
      parsedState = JSON.parse(rawGameState);
    } catch (error) {
      return { lastReachedLevel: null, totalStars: 0 };
    }
  }

  if (!Array.isArray(parsedState)) {
    return { lastReachedLevel: null, totalStars: 0 };
  }

  let lastReachedLevel = null;
  let totalStars = 0;

  parsedState.forEach((levelState, index) => {
    if (levelState?.win === true) {
      lastReachedLevel = index + 1;
    }

    const stars = Number(levelState?.star);
    if (Number.isFinite(stars) && stars > 0) {
      totalStars += stars;
    }
  });

  return { lastReachedLevel, totalStars };
};

export const summarizeCodeJuniorGameState = (rawGameState) => {
  const formatSummaryHtml = (lastReachedLevel, totalStars) => {
    const safeLastReachedLevel =
      Number.isFinite(Number(lastReachedLevel)) && Number(lastReachedLevel) > 0
        ? String(Number(lastReachedLevel))
        : "Aucun";
    const safeTotalStars =
      Number.isFinite(Number(totalStars)) && Number(totalStars) > 0
        ? String(Number(totalStars))
        : "0";

    return `Dernier niveau atteint : <span class="font-semibold">${safeLastReachedLevel}</span> | Étoiles totales : <span class="font-semibold">${safeTotalStars}</span>`;
  };

  const { lastReachedLevel, totalStars } = extractCodeJuniorStats(rawGameState);

  return formatSummaryHtml(lastReachedLevel, totalStars);
};

const CodeJuniorActivity = ({ student, content = {}, onComplete, activityId, isFocusedMode = false }) => {
  const [completed, setCompleted] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const isDemoMode = !student;

  const title = content?.title || "Code Junior";
  const description = content?.description || "Découvre la programmation en t'amusant !";

  const studentFullName = `${student?.firstname || ""} ${student?.name || ""}`.trim() || "Démo";
  const storageKey = `CODE_JUNIOR_STORAGE_${student?.id || studentFullName}`;
  const iframeSrc = `external-activities/code-junior/index.html?storageKey=${encodeURIComponent(storageKey)}`;

  // Charger la progression précédente depuis la base de données
  useEffect(() => {
    if (isDemoMode || !student?.id || !activityId) {
      setIframeReady(true);
      return;
    }

    fetch(`${API_URL}/results/game-state?student_id=${student.id}&activity_id=${activityId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.game_state) {
          try {
            localStorage.setItem(storageKey, data.game_state);
          } catch (e) {
            console.warn("Impossible de restaurer la progression Code Junior :", e);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIframeReady(true));
  }, [student?.id, activityId, storageKey, isDemoMode]);

  const handleComplete = () => {
    const gameState = localStorage.getItem(storageKey) || null;
    const gameStateStats = extractCodeJuniorStats(gameState);
    const gameStateSummary = summarizeCodeJuniorGameState(gameState);
    setCompleted(true);
    if (!isDemoMode && onComplete) {
      onComplete({
        score: gameStateStats.totalStars,
        game_state: gameState,
        game_state_summary: gameStateSummary,
      });
    }
  };

  const handleReset = () => {
    setCompleted(false);
    // Recharger l'iframe pour recommencer le jeu
    const iframe = document.getElementById("code-junior-iframe");
    if (iframe) {
      iframe.src = iframeSrc;
    }
  };

  return (
    <div id="code-junior-activity-wrapper" className="flex flex-col h-full bg-slate-50 text-slate-800">
      {/* Header */}
      <div id="code-junior-header" className="mb-0">
        <h2 id="code-junior-title" className="text-2xl font-bold text-slate-900">{title}</h2>
        <p id="code-junior-description" className="text-lg text-slate-600 mt-0">{description}</p>
      </div>

      {/* Main Content Area */}
      <div
        id="code-junior-content-area"
        className="flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative"
        style={{ minHeight: isDemoMode || isFocusedMode ? "565px" : "408px" }}
      >
        {iframeReady ? (
          <iframe
            id="code-junior-iframe"
            src={iframeSrc}
            className="absolute inset-0 w-full h-full border-none"
            title="Jeu Code Junior"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">
            Chargement de la progression…
          </div>
        )}

        {completed && (
          <div id="code-junior-completed-overlay" className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-all duration-500">
            <div className="transform scale-150 text-green-500 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 id="code-junior-completed-title" className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">Super travail !</h3>
            <p id="code-junior-completed-text" className="text-xl text-slate-600 mb-8 font-medium">L'activité est validée.</p>
            {isDemoMode && (
              <button
                id="code-junior-demo-restart-btn"
                onClick={handleReset}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                Recommencer (Mode Démo)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Validation Button for manual validation */}
      {!completed && (
        <div id="code-junior-validation-wrapper" className="mt-1 flex justify-center pb-1">
          <button
            id="code-junior-validation-btn"
            onClick={handleComplete}
            className="group relative inline-flex items-center justify-center px-8 py-1 font-bold text-white transition-all duration-200 bg-green-500 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 hover:bg-green-600 active:scale-95 shadow-md hover:shadow-lg"
          >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            J'ai terminé l'activité
          </button>
        </div>
      )}
    </div>
  );
};

export const defaultCodeJuniorActivityContent = {
  title: "Code Junior",
  description: "Découvre la programmation en t'amusant !",
};

export default CodeJuniorActivity;
