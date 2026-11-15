import React, { useState } from "react";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";

export function buildVocabularyFocusedUrl({ classId, groupId, activityId, studentId }) {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";
  const url = new URL("/", origin);
  if (classId) url.searchParams.set("classId", String(classId));
  if (groupId) url.searchParams.set("groupId", String(groupId));
  if (activityId) url.searchParams.set("activityId", String(activityId));
  if (studentId) url.searchParams.set("studentId", String(studentId));
  return url.toString();
}

export function getWordStageBadgeInfo(stage, consecutiveSuccesses = 0) {
  const count = Number(consecutiveSuccesses || 0);
  if (stage === "mastered" || count >= 3) {
    return {
      icon: "👑",
      label: "Maîtrisé à long terme",
      shortLabel: "👑 Maîtrisé",
      className: "border-amber-300 bg-amber-100 text-amber-900",
    };
  }
  if (stage === "reviewing") {
    if (count === 2) {
      return {
        icon: "⭐⭐",
        label: "Presque maîtrisé (2/3)",
        shortLabel: "⭐⭐ (2/3)",
        className: "border-sky-300 bg-sky-100 text-sky-900",
      };
    }
    if (count === 1) {
      return {
        icon: "⭐",
        label: "En progression (1/3)",
        shortLabel: "⭐ (1/3)",
        className: "border-indigo-300 bg-indigo-100 text-indigo-900",
      };
    }
    return {
      icon: "🔁",
      label: "Appris • En révision",
      shortLabel: "🔁 Appris",
      className: "border-emerald-300 bg-emerald-100 text-emerald-900",
    };
  }
  return {
    icon: "🆕",
    label: "En découverte",
    shortLabel: "🆕 Découverte",
    className: "border-violet-300 bg-violet-100 text-violet-900",
  };
}

/**
 * Affiche soit un badge unitaire sur un mot (variant="word"),
 * soit un bandeau récapitulatif pour un élève avec lien Mode Focus (variant="student").
 */
const VocabularyProgressBadge = ({
  variant = "word",
  stage = "learning",
  consecutiveSuccesses = 0,
  dueTodayCount = 0,
  learningCount = 0,
  masteredCount = 0,
  classId = "",
  groupId = "",
  activityId = "",
  studentId = "",
  onLaunchActivity,
  id = "vocabulary-progress-badge",
}) => {
  const [copyMessage, setCopyMessage] = useState("");
  const { show: showCopyMessage, fade: fadeCopyMessage } = useAutoDismissMessage(
    copyMessage,
    setCopyMessage
  );

  if (variant === "word") {
    const badge = getWordStageBadgeInfo(stage, consecutiveSuccesses);
    return (
      <span
        id={id}
        title={badge.label}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.className}`}
      >
        <span>{badge.shortLabel}</span>
      </span>
    );
  }

  const canBuildFocusUrl = Boolean(classId && groupId && activityId && studentId);
  const focusUrl = canBuildFocusUrl
    ? buildVocabularyFocusedUrl({ classId, groupId, activityId, studentId })
    : "";

  const handleCopyFocusUrl = async () => {
    if (!focusUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(focusUrl);
      }
      setCopyMessage("Lien Focus copié !");
    } catch {
      setCopyMessage("Impossible de copier le lien.");
    }
  };

  const handleOpenFocusUrl = () => {
    if (!focusUrl) return;
    window.open(focusUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      id={id}
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/90 px-3 py-2 text-xs sm:text-sm text-slate-800 shadow-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-indigo-900">
          📚 {dueTodayCount > 0 ? `${dueTodayCount} mot(s) à réviser aujourd'hui` : "Aucun mot en retard aujourd'hui"}
        </span>
        {learningCount > 0 && (
          <span className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-xs font-semibold text-violet-800">
            🆕 {learningCount} à découvrir
          </span>
        )}
        {masteredCount > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
            👑 {masteredCount} maîtrisé(s)
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {onLaunchActivity && (
          <button
            id={`${id}-launch-button`}
            type="button"
            onClick={onLaunchActivity}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Lancer le vocabulaire
          </button>
        )}
        {focusUrl && (
          <>
            <button
              id={`${id}-copy-focus-button`}
              type="button"
              onClick={handleCopyFocusUrl}
              title="Copier l'URL en mode Focus (comme Atelier)"
              className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
            >
              Copier URL Focus
            </button>
            <button
              id={`${id}-open-focus-button`}
              type="button"
              onClick={handleOpenFocusUrl}
              title="Ouvrir l'activité de l'élève en mode Focus"
              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Mode Focus ↗
            </button>
          </>
        )}
        {showCopyMessage && copyMessage && (
          <span
            className={`text-xs font-semibold text-emerald-700 transition-opacity duration-500 ${
              fadeCopyMessage ? "opacity-0" : "opacity-100"
            }`}
          >
            {copyMessage}
          </span>
        )}
      </div>
    </div>
  );
};

export default VocabularyProgressBadge;
