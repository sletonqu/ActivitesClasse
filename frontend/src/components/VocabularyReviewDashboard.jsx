import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CopyIcon, ExternalLinkIcon, RefreshIcon, ResetIcon } from "./ActionIcons";
import ConfirmModal from "./ConfirmModal";
import VocabularyEvaluationView from "./VocabularyEvaluationView";
import { buildVocabularyFocusedUrl } from "./VocabularyProgressBadge";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import useConfirm from "../hooks/useConfirm";
import { DEFAULT_GROUP_COLOR, getGroupBadgeStyle } from "../utils/groupColors";

const VocabularyReviewDashboard = ({
  selectedClassId: propClassId = "",
  classes = [],
  sequences = [],
  activities = [],
}) => {
  const [localClassId, setLocalClassId] = useState(propClassId || "");
  const effectiveClassId = propClassId || localClassId;

  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [showEvaluationView, setShowEvaluationView] = useState(false);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resettingClass, setResettingClass] = useState(false);
  const [resettingStudentId, setResettingStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage);
  const { confirmAction, confirmModalState } = useConfirm();

  useEffect(() => {
    if (propClassId) {
      setLocalClassId(propClassId);
    } else if (!localClassId && classes.length > 0) {
      setLocalClassId(String(classes[0].id));
    }
  }, [propClassId, classes, localClassId]);

  useEffect(() => {
    if (!selectedSequenceId && sequences.length > 0) {
      setSelectedSequenceId(String(sequences[0].id));
    }
  }, [sequences, selectedSequenceId]);

  const vocabularyActivities = useMemo(() => {
    const fromProp = Array.isArray(activities)
      ? activities.filter((a) => String(a.js_file || "").includes("VocabularyLearningActivity"))
      : [];
    if (fromProp.length > 0) return fromProp;
    return Array.isArray(dashboardData?.vocabularyActivities)
      ? dashboardData.vocabularyActivities
      : [];
  }, [activities, dashboardData]);

  useEffect(() => {
    if (!selectedActivityId && vocabularyActivities.length > 0) {
      setSelectedActivityId(String(vocabularyActivities[0].id));
    }
  }, [vocabularyActivities, selectedActivityId]);

  const selectedSequence = useMemo(
    () => sequences.find((s) => String(s.id) === String(selectedSequenceId)) || sequences[0] || null,
    [sequences, selectedSequenceId]
  );

  const loadDashboard = useCallback(async () => {
    if (!effectiveClassId) {
      setDashboardData(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_URL}/vocabulary/dashboard/${effectiveClassId}`);
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors du chargement du suivi vocabulaire.");
      }
      setDashboardData(data);
    } catch (err) {
      setError(err.message || "Impossible de charger le suivi de la classe.");
    } finally {
      setLoading(false);
    }
  }, [effectiveClassId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleResetClassProgress = async () => {
    const confirmed = await confirmAction(
      "Réinitialiser la progression (nouvelle année)",
      effectiveClassId
        ? "Réinitialiser toute la progression de vocabulaire des élèves de cette classe ? Les séquences, mots et images seront intégralement conservés."
        : "Réinitialiser toute la progression de vocabulaire de tous les élèves ? Les séquences, mots et images seront intégralement conservés."
    );
    if (!confirmed) return;

    setResettingClass(true);
    setError("");
    try {
      const query = effectiveClassId ? `?classId=${effectiveClassId}` : "";
      const resp = await fetch(`${API_URL}/vocabulary/progress${query}`, {
        method: "DELETE",
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la réinitialisation.");
      }
      setMessage(`Progression réinitialisée (${data.deleted || 0} entrée(s) purgée(s)).`);
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Erreur lors de la réinitialisation.");
    } finally {
      setResettingClass(false);
    }
  };

  const handleResetStudentProgress = async (student) => {
    const studentName = `${student.firstname || ""} ${student.name || ""}`.trim();
    const confirmed = await confirmAction(
      "Réinitialiser l'élève",
      `Réinitialiser la progression de vocabulaire de ${studentName} ?`
    );
    if (!confirmed) return;

    setResettingStudentId(String(student.id));
    setError("");
    try {
      const resp = await fetch(`${API_URL}/vocabulary/progress?studentId=${student.id}`, {
        method: "DELETE",
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la réinitialisation de l'élève.");
      }
      setMessage(`Progression de ${studentName} réinitialisée.`);
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Erreur lors de la réinitialisation.");
    } finally {
      setResettingStudentId("");
    }
  };

  const handleCopyFocusUrl = async (url, student) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      const studentName = `${student.firstname || ""} ${student.name || ""}`.trim();
      setMessage(`URL Focus copiée pour ${studentName}.`);
    } catch {
      setError("Impossible de copier l'URL automatiquement.");
    }
  };

  const studentRows = Array.isArray(dashboardData?.students) ? dashboardData.students : [];

  return (
    <section
      id="vocabulary-review-dashboard"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div
        id="vocabulary-review-dashboard-header"
        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-3"
      >
        <div>
          <h3 id="vocabulary-review-dashboard-title" className="text-base sm:text-lg font-extrabold text-slate-800">
            🔁 Suivi de la répétition espacée, Liens Focus & Évaluation
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="vocabulary-dashboard-evaluation-button"
            type="button"
            disabled={!selectedSequence}
            onClick={() => setShowEvaluationView((prev) => !prev)}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {showEvaluationView ? "Fermer l'évaluation" : "📝 Évaluation"}
          </button>

          <button
            id="vocabulary-dashboard-refresh-button"
            type="button"
            onClick={loadDashboard}
            title="Actualiser les données"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            <RefreshIcon />
          </button>

          <button
            id="vocabulary-dashboard-reset-class-button"
            type="button"
            onClick={handleResetClassProgress}
            title="Réinitialiser la progression (nouvelle année)"
            disabled={resettingClass}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            <ResetIcon />
          </button>
        </div>
      </div>

      {/* Filtres : Classe, Séquence pour l'Évaluation, Activité pour le lien Focus */}
      <div id="vocabulary-review-dashboard-controls" className="grid gap-3 sm:grid-cols-3">
        {!propClassId && (
          <div>
            <label
              htmlFor="vocabulary-dashboard-class-select"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Classe suivie
            </label>
            <select
              id="vocabulary-dashboard-class-select"
              value={localClassId}
              onChange={(e) => setLocalClassId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
            >
              <option value="">Sélectionner une classe</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="vocabulary-dashboard-sequence-select"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Séquence pour la vue « Évaluation »
          </label>
          <select
            id="vocabulary-dashboard-sequence-select"
            value={selectedSequenceId}
            onChange={(e) => setSelectedSequenceId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
          >
            {sequences.length === 0 ? (
              <option value="">Aucune séquence créée</option>
            ) : (
              sequences.map((seq) => (
                <option key={seq.id} value={seq.id}>
                  {seq.title} ({seq.level} • {seq.words?.length || seq.wordCount || 0} mots)
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="vocabulary-dashboard-activity-select"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Activité Vocabulaire (pour les liens Mode Focus)
          </label>
          <select
            id="vocabulary-dashboard-activity-select"
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
          >
            {vocabularyActivities.length === 0 ? (
              <option value="">Créez une activité Vocabulaire pour activer les liens Focus</option>
            ) : (
              vocabularyActivities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.title}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {showMessage && message && (
        <div
          id="vocabulary-dashboard-message"
          className={`rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition-opacity duration-500 ${fadeMessage ? "opacity-0" : "opacity-100"
            }`}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          id="vocabulary-dashboard-error"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
        >
          {error}
        </div>
      )}

      {/* Vue Évaluation projetable (si ouverte) */}
      {showEvaluationView && selectedSequence && (
        <VocabularyEvaluationView
          sequence={selectedSequence}
          defaultSentenceCount={6}
          onClose={() => setShowEvaluationView(false)}
        />
      )}

      {/* Liste des élèves et statut de répétition espacée */}
      {!effectiveClassId ? (
        <p className="text-xs text-slate-500">
          Sélectionnez une classe pour afficher l'état de répétition espacée des élèves.
        </p>
      ) : loading ? (
        <p className="text-xs text-slate-500">Chargement du suivi des élèves...</p>
      ) : studentRows.length === 0 ? (
        <p className="text-xs text-slate-500">Aucun élève dans cette classe.</p>
      ) : (
        <div id="vocabulary-dashboard-students-list" className="space-y-2">
          {studentRows.map((entry) => {
            const {
              student,
              dueTodayCount,
              learningCount,
              reviewingCount,
              masteredCount,
              nextReviewDate,
              dueWords = [],
            } = entry;
            const groupColor = student.group_color || DEFAULT_GROUP_COLOR;
            const hasFocusLink = Boolean(
              effectiveClassId && (student.group_id || "1") && selectedActivityId && student.id
            );
            const focusUrl = hasFocusLink
              ? buildVocabularyFocusedUrl({
                classId: effectiveClassId,
                groupId: student.group_id || "1",
                activityId: selectedActivityId,
                studentId: student.id,
              })
              : "";

            return (
              <div
                key={student.id}
                id={`vocabulary-dashboard-student-row-${student.id}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">
                      {student.firstname} {student.name}
                    </span>
                    {student.group_name && (
                      <span
                        className="rounded-full border px-2 py-0.5 text-[11px] font-bold"
                        style={getGroupBadgeStyle(groupColor)}
                      >
                        {student.group_name}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${dueTodayCount > 0
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                    >
                      📚 {dueTodayCount} à réviser aujourd'hui
                    </span>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800">
                      🆕 {learningCount} en découverte
                    </span>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800">
                      ⭐ {reviewingCount} en révision
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      👑 {masteredCount} maîtrisé(s)
                    </span>
                  </div>

                  {dueWords.length > 0 ? (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Mots dus : </span>
                      {dueWords
                        .map((dw) => `${dw.word} (J+${dw.interval_days || 1})`)
                        .join(", ")}
                    </div>
                  ) : nextReviewDate ? (
                    <div className="text-xs text-slate-500">
                      Prochaine révision prévue à partir du {nextReviewDate}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {focusUrl && (
                    <>
                      <button
                        id={`vocabulary-dashboard-copy-focus-${student.id}`}
                        type="button"
                        onClick={() => handleCopyFocusUrl(focusUrl, student)}
                        title="Copier l'URL"
                        className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        <CopyIcon />
                      </button>
                      <button
                        id={`vocabulary-dashboard-open-focus-${student.id}`}
                        type="button"
                        onClick={() => window.open(focusUrl, "_blank", "noopener,noreferrer")}
                        title="Ouvrir l'URL"
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <ExternalLinkIcon />
                      </button>
                    </>
                  )}
                  <button
                    id={`vocabulary-dashboard-reset-student-${student.id}`}
                    type="button"
                    disabled={resettingStudentId === String(student.id)}
                    onClick={() => handleResetStudentProgress(student)}
                    title="Réinitialiser la progression"
                    className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    <ResetIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        {...confirmModalState}
        confirmStyle="danger"
        confirmText="Confirmer"
      />
    </section>
  );
};

export default VocabularyReviewDashboard;
