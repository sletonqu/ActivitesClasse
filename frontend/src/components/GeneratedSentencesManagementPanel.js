import React, { useEffect, useMemo, useState } from "react";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";

const LEVEL_OPTIONS = ["", "CE1", "CE2"];
const SORT_OPTIONS = [
  { value: "least-used", label: "Moins utilisées d'abord" },
  { value: "most-used", label: "Plus utilisées d'abord" },
  { value: "newest", label: "Plus récentes d'abord" },
  { value: "oldest", label: "Plus anciennes d'abord" },
];

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR");
}

function getDateRank(value) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortSentencesList(sentences, sortOrder) {
  const items = Array.isArray(sentences) ? [...sentences] : [];

  return items.sort((first, second) => {
    if (sortOrder === "most-used") {
      return (second.compteur ?? 0) - (first.compteur ?? 0) || second.id - first.id;
    }

    if (sortOrder === "newest") {
      return getDateRank(second.created_at) - getDateRank(first.created_at) || second.id - first.id;
    }

    if (sortOrder === "oldest") {
      return getDateRank(first.created_at) - getDateRank(second.created_at) || first.id - second.id;
    }

    return (first.compteur ?? 0) - (second.compteur ?? 0) || second.id - first.id;
  });
}

const GeneratedSentencesManagementPanel = () => {
  const [sentences, setSentences] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [themeFilter, setThemeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("least-used");
  const [selectedSentenceId, setSelectedSentenceId] = useState("");
  const [deletingSentenceId, setDeletingSentenceId] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);
  const [resettingCounters, setResettingCounters] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage);

  const sortedSentences = useMemo(
    () => sortSentencesList(sentences, sortOrder),
    [sentences, sortOrder]
  );

  const selectedSentence = useMemo(
    () => sortedSentences.find((sentence) => String(sentence.id) === String(selectedSentenceId)) || null,
    [selectedSentenceId, sortedSentences]
  );

  const loadSentences = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ limit: "100" });
      if (levelFilter) {
        params.set("level", levelFilter);
      }
      if (themeFilter.trim()) {
        params.set("theme", themeFilter.trim());
      }
      if (searchText.trim()) {
        params.set("search", searchText.trim());
      }

      const response = await fetch(`${API_URL}/ai/generated-sentences?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement des phrases générées");
      }

      const nextSentences = Array.isArray(data.sentences) ? data.sentences : [];
      setSentences(nextSentences);
      setTotal(data.total ?? nextSentences.length);
      setSelectedSentenceId((currentId) =>
        nextSentences.some((sentence) => String(sentence.id) === String(currentId)) ? currentId : ""
      );
    } catch (err) {
      setSentences([]);
      setTotal(0);
      setSelectedSentenceId("");
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSentences();
  }, []);

  const handleApplyFilters = async (event) => {
    event.preventDefault();
    await loadSentences();
  };

  const handleSelectSentence = (sentenceId) => {
    setSelectedSentenceId((currentId) =>
      String(currentId) === String(sentenceId) ? "" : String(sentenceId)
    );
  };

  const handleDeleteSelected = async () => {
    if (!selectedSentence?.id) {
      return;
    }

    const confirmDelete = window.confirm(
      `Supprimer la phrase « ${selectedSentence.sentence} » de la base ?`
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingSentenceId(String(selectedSentence.id));
    setError("");

    try {
      const response = await fetch(`${API_URL}/ai/generated-sentences/${selectedSentence.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression de la phrase");
      }

      setMessage("Phrase supprimée de la base.");
      setSelectedSentenceId("");
      await loadSentences();
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setDeletingSentenceId("");
    }
  };

  const buildFilterQueryString = () => {
    const params = new URLSearchParams();
    if (levelFilter) {
      params.set("level", levelFilter);
    }
    if (themeFilter.trim()) {
      params.set("theme", themeFilter.trim());
    }
    if (searchText.trim()) {
      params.set("search", searchText.trim());
    }
    return params.toString() ? `?${params.toString()}` : "";
  };

  const handleResetCounters = async () => {
    if (total === 0) {
      return;
    }

    const hasFilter = Boolean(levelFilter || themeFilter.trim() || searchText.trim());
    const confirmReset = window.confirm(
      hasFilter
        ? "Réinitialiser les compteurs des phrases correspondant aux filtres actuels ?"
        : "Réinitialiser tous les compteurs d'utilisation sans supprimer les phrases ?"
    );
    if (!confirmReset) {
      return;
    }

    setResettingCounters(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/ai/generated-sentences/reset-counters${buildFilterQueryString()}`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la réinitialisation des compteurs");
      }

      setMessage(`${data.reset ?? 0} compteur(s) réinitialisé(s).`);
      await loadSentences();
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setResettingCounters(false);
    }
  };

  const handleDeleteAll = async () => {
    if (total === 0) {
      return;
    }

    const hasFilter = Boolean(levelFilter || themeFilter.trim() || searchText.trim());
    const confirmDelete = window.confirm(
      hasFilter
        ? "Supprimer toutes les phrases correspondant aux filtres actuels ?"
        : "Supprimer toutes les phrases générées stockées en base ?"
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingAll(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/ai/generated-sentences${buildFilterQueryString()}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression des phrases");
      }

      setMessage(`${data.deleted ?? 0} phrase(s) supprimée(s).`);
      setSelectedSentenceId("");
      await loadSentences();
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <section id="generated-sentences-management-section" className="w-full rounded-xl bg-white p-6 shadow mb-6">
      <div
        id="generated-sentences-management-header"
        className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <h3 id="generated-sentences-management-title" className="mb-2 text-xl font-bold text-slate-800">
            Phrases générées en base
          </h3>
          <p id="generated-sentences-management-description" className="max-w-3xl text-sm text-slate-500">
            Visualise les phrases créées par l'IA, leur compteur d'utilisation et supprime celles qui ne sont plus utiles.
          </p>
        </div>

        <div className="min-w-[180px] rounded-lg border border-violet-100 bg-violet-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Phrases stockées</div>
          <div className="text-2xl font-bold text-violet-900">{loading ? "..." : total}</div>
        </div>
      </div>

      <form id="generated-sentences-management-filters" className="grid gap-3 md:grid-cols-5" onSubmit={handleApplyFilters}>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Niveau</label>
          <select
            id="generated-sentences-level-filter"
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            {LEVEL_OPTIONS.map((level) => (
              <option key={level || "all"} value={level}>
                {level || "Tous"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Thème</label>
          <input
            id="generated-sentences-theme-filter"
            type="text"
            value={themeFilter}
            onChange={(event) => setThemeFilter(event.target.value)}
            placeholder="animaux, école..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Recherche</label>
          <input
            id="generated-sentences-search-filter"
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Mot présent dans la phrase"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Tri</label>
          <select
            id="generated-sentences-sort-order"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 md:col-span-2">
          <button
            id="generated-sentences-apply-filters-button"
            type="submit"
            disabled={loading}
            className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "Chargement..." : "Actualiser"}
          </button>

          <button
            id="generated-sentences-reset-counters-button"
            type="button"
            onClick={handleResetCounters}
            disabled={resettingCounters || deletingAll || loading || total === 0}
            className="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {resettingCounters ? "Réinitialisation..." : "Réinitialiser les compteurs"}
          </button>

          <button
            id="generated-sentences-delete-all-button"
            type="button"
            onClick={handleDeleteAll}
            disabled={deletingAll || resettingCounters || loading || total === 0}
            className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {deletingAll ? "Suppression..." : "Supprimer Tout"}
          </button>
        </div>
      </form>

      {showMessage && message && (
        <div
          id="generated-sentences-management-message"
          className={`mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 transition-opacity duration-500 ${
            fadeMessage ? "opacity-0" : "opacity-100"
          }`}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          id="generated-sentences-management-error"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div id="generated-sentences-management-list" className="mt-4 space-y-3">
        {sortedSentences.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            Aucune phrase enregistrée pour le moment.
          </div>
        ) : (
          sortedSentences.map((sentence) => {
            const isSelected = String(selectedSentenceId) === String(sentence.id);

            return (
              <div
                key={sentence.id}
                id={`generated-sentences-item-${sentence.id}`}
                onClick={() => handleSelectSentence(sentence.id)}
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  isSelected
                    ? "border-violet-300 bg-violet-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="text-base font-semibold text-slate-800">{sentence.sentence}</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-800">
                        Niveau : {sentence.level || "—"}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
                        Thème : {sentence.theme || "—"}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                        Compteur : {sentence.compteur ?? 0}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 font-semibold text-slate-700">
                        {sentence.provider || "source inconnue"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Ajoutée le {formatDate(sentence.created_at)} • modèle : {sentence.model || "—"}
                    </div>
                  </div>

                  {isSelected && (
                    <button
                      id={`generated-sentences-delete-button-${sentence.id}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteSelected();
                      }}
                      disabled={deletingSentenceId === String(sentence.id)}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      {deletingSentenceId === String(sentence.id) ? "Suppression..." : "Supprimer"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default GeneratedSentencesManagementPanel;
