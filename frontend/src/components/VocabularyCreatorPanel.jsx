import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  ExportIcon,
  IAGenerated,
  ImportIcon,
  SaveIcon,
} from "./ActionIcons";
import ConfirmModal from "./ConfirmModal";
import VocabularyWordEditor from "./VocabularyWordEditor";
import VocabularyReviewDashboard from "./VocabularyReviewDashboard";
import VocabularyEvaluationView from "./VocabularyEvaluationView";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import useConfirm from "../hooks/useConfirm";

const DEFAULT_PROVIDERS = [
  { id: "gemini", label: "Gemini", configured: false },
  { id: "openai", label: "ChatGPT / OpenAI", configured: false },
  { id: "mistral", label: "MistralAI", configured: false },
];

const STATUS_LABELS = {
  draft: "Brouillon",
  ready: "Prête",
  active: "Active",
};

const VocabularyCreatorPanel = ({
  selectedClassId = "",
  classes = [],
  activities = [],
  onActivitiesUpdated,
  hideTitle = false,
}) => {
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [selectedProvider, setSelectedProvider] = useState("gemini");

  const [sequences, setSequences] = useState([]);
  const [loadingSequences, setLoadingSequences] = useState(false);

  const [editingSequenceId, setEditingSequenceId] = useState(null);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("CE1");
  const [theme, setTheme] = useState("");
  const [status, setStatus] = useState("active");
  const [position, setPosition] = useState(1);
  const [wordsInputText, setWordsInputText] = useState(
    "rusé, courageux, timide, curieux, généreux, patient, joyeux, poli, attentif, agile"
  );
  const [wordsList, setWordsList] = useState([]);

  const [generatingAi, setGeneratingAi] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [savingSequence, setSavingSequence] = useState(false);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [exportingSequences, setExportingSequences] = useState(false);
  const [importingSequences, setImportingSequences] = useState(false);
  const [evaluationSequence, setEvaluationSequence] = useState(null);
  const importFileInputRef = useRef(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage);
  const { confirmAction, confirmModalState } = useConfirm();

  const loadProviders = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/ai/providers`);
      const data = await resp.json();
      if (resp.ok && Array.isArray(data?.providers)) {
        setProviders(data.providers);
        const firstConfigured = data.providers.find((p) => p.configured);
        if (firstConfigured) {
          setSelectedProvider(firstConfigured.id);
        }
      }
    } catch {
      // Silencieux en cas d'absence réseau lors des tests
    }
  }, []);

  const loadSequences = useCallback(async () => {
    setLoadingSequences(true);
    try {
      const resp = await fetch(`${API_URL}/vocabulary/sequences`);
      const data = await resp.json();
      if (resp.ok && Array.isArray(data)) {
        setSequences(data);
        if (!editingSequenceId) {
          setPosition(data.length + 1);
        }
      }
    } catch {
      // Silencieux
    } finally {
      setLoadingSequences(false);
    }
  }, [editingSequenceId]);

  useEffect(() => {
    void loadProviders();
    void loadSequences();
  }, [loadProviders, loadSequences]);

  const handleGenerateWithAi = async () => {
    const parsedWords = String(wordsInputText || "")
      .split(/[,;\n]+/)
      .map((w) => w.trim())
      .filter(Boolean);

    if (parsedWords.length === 0) {
      setError("Veuillez saisir au moins un mot dans la liste avant de lancer la génération IA.");
      return;
    }

    setGeneratingAi(true);
    setError("");
    setMessage("");

    try {
      const resp = await fetch(`${API_URL}/ai/vocabulary/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: parsedWords,
          level,
          theme: theme.trim(),
          provider: selectedProvider,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la génération IA.");
      }

      const generatedItems = Array.isArray(data.items) ? data.items : [];
      setWordsList(generatedItems);
      if (!title.trim()) {
        setTitle(
          theme.trim()
            ? `Vocabulaire ${level} : ${theme.trim()}`
            : `Vocabulaire ${level} - Séquence ${sequences.length + 1}`
        );
      }
      setMessage(
        `${generatedItems.length} mot(s) généré(s) par l'IA et phrases enregistrées dans la base de phrases. Vérifiez ou modifiez avant d'enregistrer la séquence.`
      );
    } catch (err) {
      setError(err.message || "Erreur lors de la génération IA.");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleAddEmptyWord = () => {
    setWordsList((prev) => [
      ...prev,
      {
        word: "",
        nature: "nom commun",
        definition: "",
        sentence1_full: "",
        sentence1_cloze: "",
        sentence2_full: "",
        sentence2_cloze: "",
        distractors: ["", ""],
        image_url: "",
        image_prompt: "",
        position: prev.length + 1,
      },
    ]);
  };

  const handleResetEditor = () => {
    setEditingSequenceId(null);
    setTitle("");
    setTheme("");
    setLevel("CE1");
    setStatus("active");
    setPosition(sequences.length + 1);
    setWordsList([]);
    setError("");
  };

  const handleSaveSequence = async (event) => {
    if (event) event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Veuillez donner un titre à la séquence.");
      return;
    }

    const validWords = wordsList.filter((w) => String(w?.word || "").trim());
    if (validWords.length === 0) {
      setError("Ajoutez ou générez au moins un mot avant d'enregistrer la séquence.");
      return;
    }

    setSavingSequence(true);
    setError("");
    setMessage("");

    try {
      const url = editingSequenceId
        ? `${API_URL}/vocabulary/sequences/${editingSequenceId}`
        : `${API_URL}/vocabulary/sequences`;
      const method = editingSequenceId ? "PUT" : "POST";

      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          theme: theme.trim(),
          level,
          status,
          position: Number(position) || 1,
          words: validWords.map((w, idx) => ({
            ...w,
            position: idx + 1,
          })),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la sauvegarde de la séquence.");
      }

      setMessage(
        editingSequenceId
          ? `Séquence « ${data.title} » mise à jour avec succès (${data.wordCount} mots).`
          : `Séquence « ${data.title} » enregistrée en base (${data.wordCount} mots).`
      );
      setEditingSequenceId(data.id);
      setWordsList(Array.isArray(data.words) ? data.words : validWords);
      await loadSequences();
    } catch (err) {
      setError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSavingSequence(false);
    }
  };

  const handleCreateClassActivity = async (seq = null) => {
    const targetLevel = seq?.level || level || "CE1";
    const targetLevelKey = targetLevel === "CE2" ? "level2" : "level1";
    const activityTitle = seq
      ? `Vocabulaire ${targetLevel} - ${seq.title}`
      : `Vocabulaire ${targetLevel}`;

    setCreatingActivity(true);
    setError("");
    try {
      const resp = await fetch(`${API_URL}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activityTitle,
          description: `Apprentissage et répétition espacée du vocabulaire (${targetLevel}).`,
          status: "Active",
          js_file: "src/activities/VocabularyLearningActivity.js",
          discipline: "Français",
          category: "Vocabulaire",
          content: {
            title: activityTitle,
            skill: "Comprendre, retenir et utiliser des mots nouveaux en contexte",
            instruction:
              "Observe la carte de découverte ou lis la question, puis clique sur le bon mot !",
            level: targetLevel,
            defaultLevel: targetLevelKey,
            wordCount: 10,
            maxRevisionsPerSession: 6,
            evaluationSentenceCount: 6,
            sequenceId: seq?.id || null,
            levels: {
              [targetLevelKey]: {
                label: targetLevel,
                schoolLevel: targetLevel,
                wordCount: 10,
                maxRevisionsPerSession: 6,
                skill: `Comprendre et mémoriser le vocabulaire ${targetLevel} en contexte`,
              },
            },
          },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la création de l'activité.");
      }

      setMessage(`Activité « ${activityTitle} » créée et activée dans la bibliothèque !`);
      if (onActivitiesUpdated) {
        await onActivitiesUpdated();
      }
    } catch (err) {
      setError(err.message || "Impossible de créer l'activité.");
    } finally {
      setCreatingActivity(false);
    }
  };

  const handleSelectSequenceToEdit = (seq) => {
    setEditingSequenceId(seq.id);
    setTitle(seq.title || "");
    setTheme(seq.theme || "");
    setLevel(seq.level || "CE1");
    setStatus(seq.status || "active");
    setPosition(seq.position || 1);
    const seqWords = Array.isArray(seq.words) ? seq.words : [];
    setWordsList(seqWords);
    if (seqWords.length > 0) {
      setWordsInputText(seqWords.map((w) => w.word).join(", "));
    }
    setError("");
  };

  const handleQuickStatusChange = async (seq, nextStatus) => {
    try {
      const resp = await fetch(`${API_URL}/vocabulary/sequences/${seq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (resp.ok) {
        setMessage(`Statut de « ${seq.title} » passé à ${STATUS_LABELS[nextStatus] || nextStatus}.`);
        await loadSequences();
      }
    } catch {
      setError("Erreur lors du changement de statut.");
    }
  };

  const handleMoveSequence = async (currentIndex, direction) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= sequences.length) {
      return;
    }

    const nextSequences = [...sequences];
    const [moved] = nextSequences.splice(currentIndex, 1);
    nextSequences.splice(targetIndex, 0, moved);

    const reorderedIds = nextSequences.map((s) => s.id);
    const updatedSequences = nextSequences.map((s, idx) => ({
      ...s,
      position: idx + 1,
    }));
    setSequences(updatedSequences);

    if (editingSequenceId) {
      const currentEditing = updatedSequences.find((s) => s.id === editingSequenceId);
      if (currentEditing) {
        setPosition(currentEditing.position);
      }
    }

    setReordering(true);
    try {
      const resp = await fetch(`${API_URL}/vocabulary/sequences/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequenceIds: reorderedIds }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors du réordonnancement des séquences.");
      }
      setMessage(`Ordre mis à jour : « ${moved.title} » déplacée.`);
      if (onActivitiesUpdated) onActivitiesUpdated();
    } catch (err) {
      setError(err.message || "Erreur lors du changement d'ordre.");
      await loadSequences();
    } finally {
      setReordering(false);
    }
  };

  const handleDeleteSequence = async (seq) => {
    const confirmed = await confirmAction(
      "Supprimer la séquence",
      `Supprimer la séquence « ${seq.title} » ainsi que ses mots et ses images ?`
    );
    if (!confirmed) return;

    try {
      const resp = await fetch(`${API_URL}/vocabulary/sequences/${seq.id}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Erreur lors de la suppression.");
      }
      if (editingSequenceId === seq.id) {
        handleResetEditor();
      }
      setMessage(`Séquence « ${seq.title} » supprimée.`);
      await loadSequences();
    } catch (err) {
      setError(err.message || "Erreur lors de la suppression.");
    }
  };

  const triggerJsonDownload = (payload, filename) => {
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportSequence = async (seq) => {
    setExportingSequences(true);
    setError("");
    try {
      const resp = await fetch(`${API_URL}/vocabulary/sequences/${seq.id}/export`);
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de l'export de la séquence.");
      }

      const safeSlug = String(seq.title || "sequence")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40) || "sequence";
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `sequence_vocabulaire_${(seq.level || "CE1").toLowerCase()}_${safeSlug}_${dateStr}.json`;

      triggerJsonDownload(data, filename);
      setMessage(`Séquence « ${seq.title} » exportée (illustrations incluses).`);
    } catch (err) {
      setError(err.message || "Erreur lors de l'export de la séquence.");
    } finally {
      setExportingSequences(false);
    }
  };

  const handleExportAllSequences = async () => {
    setExportingSequences(true);
    setError("");
    try {
      const resp = await fetch(`${API_URL}/vocabulary/sequences/export`);
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de l'export des séquences.");
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `sequences_vocabulaire_complet_${dateStr}.json`;

      triggerJsonDownload(data, filename);
      setMessage(
        `Export complet réussi : ${data.sequenceCount ?? sequences.length} séquence(s) exportée(s) (illustrations incluses).`
      );
    } catch (err) {
      setError(err.message || "Erreur lors de l'export des séquences.");
    } finally {
      setExportingSequences(false);
    }
  };

  const handlePickImportFile = () => {
    setError("");
    if (importFileInputRef.current) {
      importFileInputRef.current.value = "";
      importFileInputRef.current.click();
    }
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setImportingSequences(true);
    setError("");
    try {
      const rawText = await file.text();
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(rawText);
      } catch {
        throw new Error("Le fichier sélectionné n'est pas un JSON valide.");
      }

      const resp = await fetch(`${API_URL}/vocabulary/sequences/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedPayload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de l'import des séquences.");
      }

      await loadSequences();
      setMessage(
        `Import réussi : ${data.importedSequences} séquence(s) (${data.createdSequences} créée(s), ${data.updatedSequences} mise(s) à jour), ${data.importedWords} mot(s) et ${data.importedImages} illustration(s) importés.`
      );
    } catch (err) {
      setError(err.message || "Erreur lors de l'import du fichier JSON.");
    } finally {
      setImportingSequences(false);
    }
  };

  return (
    <section id="vocabulary-creator-panel" className="w-full space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            {!hideTitle && (
              <h2 id="vocabulary-creator-title" className="text-lg sm:text-xl font-extrabold text-slate-900">
                📚 Création et gestion des séquences de Vocabulaire (CE1 / CE2)
              </h2>
            )}
            <p className="text-xs sm:text-sm text-slate-600">
              Saisissez vos mots (10 par défaut), générez les définitions, phrases à trous, intrus et illustrations avec l'IA, puis validez avant d'enregistrer.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {editingSequenceId && (
              <button
                id="vocabulary-creator-new-sequence-button"
                type="button"
                onClick={handleResetEditor}
                title="Réinitialise le formulaire d'édition pour préparer la création d'une nouvelle séquence vierge sans écraser la séquence actuellement sélectionnée."
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700"
              >
                <AddIcon className="h-3.5 w-3.5" />
                Nouvelle séquence
              </button>
            )}
            <button
              id="vocabulary-creator-create-global-activity-button"
              type="button"
              disabled={creatingActivity}
              onClick={() => handleCreateClassActivity(null)}
              title={`Crée dans la bibliothèque d'activités une activité globale « Vocabulaire ${level} » (menu Français de l'Espace Élève) qui pioche automatiquement dans toutes vos séquences actives du niveau ${level} (révisions dues + nouveaux mots à découvrir).`}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              {creatingActivity ? "Création..." : `🎯 Créer l'activité Vocabulaire ${level}`}
            </button>
          </div>
        </div>

        {showMessage && message && (
          <div
            id="vocabulary-creator-message"
            className={`rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-emerald-800 transition-opacity duration-500 ${fadeMessage ? "opacity-0" : "opacity-100"
              }`}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            id="vocabulary-creator-error"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-rose-700"
          >
            {error}
          </div>
        )}

        {/* Formulaire de configuration de la séquence */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <label
              htmlFor="vocabulary-sequence-title-input"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Titre de la séquence *
            </label>
            <input
              id="vocabulary-sequence-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Les qualités et les émotions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label
              htmlFor="vocabulary-sequence-level-select"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Niveau de classe
            </label>
            <select
              id="vocabulary-sequence-level-select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            >
              <option value="CE1">CE1</option>
              <option value="CE2">CE2</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="vocabulary-sequence-theme-input"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Thème (facultatif)
            </label>
            <input
              id="vocabulary-sequence-theme-input"
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Peut être laissé vide"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="vocabulary-sequence-status-select"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Statut
              </label>
              <select
                id="vocabulary-sequence-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="draft">Brouillon</option>
                <option value="ready">Prête</option>
                <option value="active">Active</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="vocabulary-sequence-position-input"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Ordre
              </label>
              <input
                id="vocabulary-sequence-position-input"
                type="number"
                min={1}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-bold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Saisie des mots et appel IA */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
            <div>
              <label
                htmlFor="vocabulary-words-list-textarea"
                className="mb-1 block text-xs font-bold text-indigo-950"
              >
                Liste des mots à préparer (séparés par des virgules ou retours à la ligne — 10 par défaut)
              </label>
              <textarea
                id="vocabulary-words-list-textarea"
                rows={2}
                value={wordsInputText}
                onChange={(e) => setWordsInputText(e.target.value)}
                placeholder="rusé, courageux, timide, curieux, généreux..."
                className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex flex-col justify-between gap-2">
              <div>
                <label
                  htmlFor="vocabulary-ai-provider-select"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Fournisseur IA
                </label>
                <select
                  id="vocabulary-ai-provider-select"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} {p.configured ? "✓" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  id="vocabulary-generate-ai-button"
                  type="button"
                  disabled={generatingAi}
                  onClick={handleGenerateWithAi}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  <IAGenerated className="h-4 w-4" />
                  {generatingAi ? "Génération IA en cours..." : "Générer par IA"}
                </button>
                <button
                  id="vocabulary-add-manual-word-button"
                  type="button"
                  onClick={handleAddEmptyWord}
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-sky-700"
                >
                  <AddIcon className="h-3.5 w-3.5" />
                  Mot manuel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste éditable des mots de la séquence */}
        {wordsList.length > 0 && (
          <div id="vocabulary-words-editors-list" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800">
                ✏️ Validation et édition mot par mot ({wordsList.length} mot(s))
              </h3>
              <button
                id="vocabulary-save-sequence-top-button"
                type="button"
                disabled={savingSequence}
                onClick={handleSaveSequence}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <SaveIcon />
                {savingSequence
                  ? "Enregistrement..."
                  : editingSequenceId
                    ? "Enregistrer les modifications"
                    : "Valider et enregistrer en base"}
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {wordsList.map((wordItem, index) => (
                <VocabularyWordEditor
                  key={wordItem.id || `word-editor-${index}`}
                  index={index}
                  wordData={wordItem}
                  level={level}
                  theme={theme}
                  provider={selectedProvider}
                  onChange={(updatedWord) => {
                    setWordsList((prev) =>
                      prev.map((item, idx) => (idx === index ? updatedWord : item))
                    );
                  }}
                  onDelete={() => {
                    setWordsList((prev) => prev.filter((_, idx) => idx !== index));
                  }}
                />
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="vocabulary-save-sequence-bottom-button"
                type="button"
                disabled={savingSequence}
                onClick={handleSaveSequence}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                <SaveIcon />
                {savingSequence
                  ? "Enregistrement..."
                  : editingSequenceId
                    ? "Enregistrer les modifications de la séquence"
                    : "Valider et enregistrer la séquence en base"}
              </button>
            </div>
          </div>
        )}

        {/* Liste des séquences existantes */}
        <div id="vocabulary-sequences-list-section" className="border-t border-slate-200 pt-4 space-y-3">
          <input
            id="vocabulary-sequences-import-file-input"
            ref={importFileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFileChange}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
              🗂️ Séquences enregistrées ({sequences.length})
            </h3>

            <div id="vocabulary-sequences-import-export-actions" className="flex flex-wrap items-center gap-2">
              <button
                id="vocabulary-sequences-import-button"
                type="button"
                disabled={importingSequences}
                onClick={handlePickImportFile}
                title="Importe un fichier JSON contenant une séquence ou la totalité des séquences enregistrées (mots, phrases et illustrations inclus)."
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                <ImportIcon className="h-3.5 w-3.5" />
                {importingSequences ? "Import en cours..." : "Importer séquence(s)"}
              </button>

              <button
                id="vocabulary-sequences-export-all-button"
                type="button"
                disabled={exportingSequences || sequences.length === 0}
                onClick={handleExportAllSequences}
                title="Exporte la totalité des séquences enregistrées (mots, phrases et illustrations encodées inclus) dans un fichier JSON."
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <ExportIcon className="h-3.5 w-3.5" />
                {exportingSequences ? "Export en cours..." : "Exporter toutes les séquences"}
              </button>
            </div>
          </div>

          {loadingSequences ? (
            <p className="text-xs text-slate-500">Chargement des séquences...</p>
          ) : sequences.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aucune séquence enregistrée pour le moment. Utilisez le générateur ci-dessus pour créer votre première séquence.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {sequences.map((seq, index) => (
                <div
                  key={seq.id}
                  id={`vocabulary-sequence-card-${seq.id}`}
                  className={`flex flex-col justify-between gap-2 rounded-xl border p-3 ${editingSequenceId === seq.id
                    ? "border-indigo-400 bg-indigo-50/40"
                    : "border-slate-200 bg-slate-50/70"
                    }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="inline-flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-xs">
                          <button
                            id={`vocabulary-sequence-move-up-button-${seq.id}`}
                            type="button"
                            disabled={index === 0 || reordering}
                            onClick={() => handleMoveSequence(index, -1)}
                            title="Monter la séquence d'un rang"
                            className="px-1.5 py-0.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600"
                          >
                            ▲
                          </button>
                          <div className="h-3 w-px bg-slate-200" />
                          <button
                            id={`vocabulary-sequence-move-down-button-${seq.id}`}
                            type="button"
                            disabled={index === sequences.length - 1 || reordering}
                            onClick={() => handleMoveSequence(index, 1)}
                            title="Descendre la séquence d'un rang"
                            className="px-1.5 py-0.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600"
                          >
                            ▼
                          </button>
                        </div>
                        <span className="text-sm font-extrabold text-slate-900">
                          #{seq.position} • {seq.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-extrabold text-indigo-800">
                          {seq.level}
                        </span>
                        <select
                          id={`vocabulary-sequence-status-${seq.id}`}
                          value={seq.status || "active"}
                          onChange={(e) => handleQuickStatusChange(seq, e.target.value)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-700"
                        >
                          <option value="draft">Brouillon</option>
                          <option value="ready">Prête</option>
                          <option value="active">Active</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">{seq.words?.length || seq.wordCount || 0} mots : </span>
                      {(seq.words || []).map((w) => w.word).join(", ") || "—"}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      id={`vocabulary-sequence-eval-button-${seq.id}`}
                      type="button"
                      onClick={() => setEvaluationSequence(seq)}
                      title="Ouvre la vue Évaluation sur cahier : affiche tous les mots de cette séquence en en-tête et tire au sort 6 phrases à trous à recopier dans le cahier."
                      className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700"
                    >
                      📝 Évaluation
                    </button>
                    <button
                      id={`vocabulary-sequence-activity-button-${seq.id}`}
                      type="button"
                      onClick={() => handleCreateClassActivity(seq)}
                      title={`Crée dans la bibliothèque d'activités une activité ciblée uniquement sur les mots de la séquence « ${seq.title} ».`}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      🎯 Créer activité
                    </button>
                    <button
                      id={`vocabulary-sequence-edit-button-${seq.id}`}
                      type="button"
                      onClick={() => handleSelectSequenceToEdit(seq)}
                      title="Modifier la séquence dans le formulaire ci-dessus pour modifier ses mots, définitions, phrases ou illustrations."
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      <EditIcon />
                    </button>
                    <button
                      id={`vocabulary-sequence-export-button-${seq.id}`}
                      type="button"
                      disabled={exportingSequences}
                      onClick={() => handleExportSequence(seq)}
                      title={`Exporte la séquence « ${seq.title} » (mots, phrases et illustrations inclus) dans un fichier JSON réimportable.`}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <ExportIcon />
                    </button>
                    <button
                      id={`vocabulary-sequence-delete-button-${seq.id}`}
                      type="button"
                      onClick={() => handleDeleteSequence(seq)}
                      title="Supprime cette séquence, ses mots, ses illustrations locales et les progressions élèves associées."
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vue Évaluation directe depuis une carte de séquence */}
      {evaluationSequence && (
        <VocabularyEvaluationView
          sequence={evaluationSequence}
          defaultSentenceCount={6}
          onClose={() => setEvaluationSequence(null)}
        />
      )}

      {/* Tableau de bord enseignant (Répétition espacée, Liens Focus & Réinitialisation annuelle) */}
      <VocabularyReviewDashboard
        selectedClassId={selectedClassId}
        classes={classes}
        sequences={sequences}
        activities={activities}
      />

      <ConfirmModal
        {...confirmModalState}
        confirmStyle="danger"
        confirmText="Confirmer"
      />
    </section>
  );
};

export default VocabularyCreatorPanel;
