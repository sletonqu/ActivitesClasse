import React, { useEffect, useRef, useState } from "react";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";

const WordsManagementPanel = ({ hideTitle = false }) => {
  const fileInputRef = useRef(null);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [deletingAllWords, setDeletingAllWords] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [deletingWordId, setDeletingWordId] = useState("");
  const [savingWordId, setSavingWordId] = useState("");
  const [selectedWordId, setSelectedWordId] = useState("");
  const [selectedWordDraft, setSelectedWordDraft] = useState({
    word: "",
    echelon_db: "",
    nature: "",
    category: "",
    school_class: "",
    level: "",
  });
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, byCategory: [], byClass: [] });
  const [searchText, setSearchText] = useState("");
  const [searchedWords, setSearchedWords] = useState([]);

  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage);

  const loadStats = async () => {
    setLoadingStats(true);

    try {
      const response = await fetch(`${API_URL}/words/stats`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement des statistiques des mots");
      }

      setStats({
        total: data.total ?? 0,
        byCategory: Array.isArray(data.byCategory) ? data.byCategory : [],
        byClass: Array.isArray(data.byClass) ? data.byClass : [],
      });
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadSearchedWords = async (rawSearchText = "") => {
    setLoadingSearch(true);
    setError("");

    try {
      const query = String(rawSearchText || "").trim();
      const params = new URLSearchParams({ limit: "25" });
      if (query) {
        params.set("search", query);
      }

      const response = await fetch(`${API_URL}/words?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement des mots");
      }

      setSearchedWords(Array.isArray(data) ? data : []);
    } catch (err) {
      setSearchedWords([]);
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleFilePick = () => {
    setError("");
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    setLoadingImport(true);
    setError("");
    setResult(null);

    try {
      const csv = await file.text();
      const response = await fetch(`${API_URL}/import/words-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'import des mots");
      }

      setResult(data);
      setMessage(`${data.imported ?? 0} mots importés avec succès`);
      await loadStats();
      await loadSearchedWords(searchText);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoadingImport(false);
    }
  };

  const handleDeleteAllWords = async () => {
    if (stats.total === 0) {
      return;
    }

    const confirmDelete = window.confirm(
      "Supprimer l'ensemble des mots importés de la base de données ?"
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingAllWords(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/words`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression des mots");
      }

      setMessage(
        data.deleted > 0 ? "Tous les mots ont été supprimés" : "Aucun mot à supprimer"
      );
      await loadStats();
      setSearchedWords([]);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllWords(false);
    }
  };

  const handleSearchWords = async (event) => {
    event.preventDefault();
    await loadSearchedWords(searchText);
  };

  const handleDeleteWord = async (word) => {
    if (!word?.id) {
      return;
    }

    const confirmDelete = window.confirm(`Supprimer le mot « ${word.word || "(vide)"} » de la base ?`);
    if (!confirmDelete) {
      return;
    }

    setDeletingWordId(String(word.id));
    setError("");

    try {
      const response = await fetch(`${API_URL}/words/${word.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression du mot");
      }

      setMessage(data.deleted > 0 ? "Mot supprimé de la base." : "Aucun mot supprimé.");
      await loadStats();
      await loadSearchedWords(searchText);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setDeletingWordId("");
    }
  };

  const handleSelectWord = (word) => {
    if (!word?.id) {
      return;
    }

    setSelectedWordId(String(word.id));
    setSelectedWordDraft({
      word: String(word.word || ""),
      echelon_db: word.echelon_db ?? "",
      nature: String(word.nature || ""),
      category: String(word.category || ""),
      school_class: String(word.school_class || ""),
      level: word.level ?? "",
    });
  };

  const handleDraftChange = (field, value) => {
    setSelectedWordDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleUpdateWord = async (word) => {
    if (!word?.id) {
      return;
    }

    const trimmedWord = String(selectedWordDraft.word || "").trim();
    if (!trimmedWord) {
      setError("Le mot est obligatoire");
      return;
    }

    setSavingWordId(String(word.id));
    setError("");

    try {
      const response = await fetch(`${API_URL}/words/${word.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: trimmedWord,
          echelon_db: selectedWordDraft.echelon_db,
          nature: selectedWordDraft.nature,
          category: selectedWordDraft.category,
          school_class: selectedWordDraft.school_class,
          level: selectedWordDraft.level,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la modification du mot");
      }

      setMessage("Mot modifié avec succès.");
      await loadStats();
      await loadSearchedWords(searchText);

      if (data?.word?.id) {
        handleSelectWord(data.word);
      }
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setSavingWordId("");
    }
  };

  useEffect(() => {
    if (!selectedWordId) {
      return;
    }

    const selectedStillVisible = searchedWords.some(
      (word) => String(word.id) === String(selectedWordId)
    );

    if (!selectedStillVisible) {
      setSelectedWordId("");
    }
  }, [searchedWords, selectedWordId]);

  return (
    <section id="words-management-section" className="w-full bg-white rounded-xl shadow p-6 mb-6">
      <div id="words-management-header" className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div>
          {!hideTitle && (
            <h3 id="words-management-title" className="text-xl font-bold text-slate-800 mb-2">
              Gestion Mots
            </h3>
          )}
          <p id="words-management-description" className="text-sm text-slate-500 max-w-2xl">
            Importe le référentiel Dubois-Buyse, consulte les mots en base et supprime les entrées qui ne sont plus utiles.
          </p>
        </div>

        <div
          id="words-management-stats-card"
          className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 min-w-[180px]"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Mots en base</div>
          <div className="text-2xl font-bold text-sky-900">{loadingStats ? "..." : stats.total}</div>
        </div>
      </div>

      <input
        id="words-management-file-input"
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportFileChange}
      />

      <div id="words-management-actions" className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleFilePick}
          disabled={loadingImport || deletingAllWords}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
        >
          {loadingImport ? "Import en cours..." : "Importer le CSV Dubois-Buyse"}
        </button>

        <button
          id="words-management-delete-all-button"
          type="button"
          onClick={handleDeleteAllWords}
          disabled={deletingAllWords || loadingImport || stats.total === 0}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-60"
        >
          {deletingAllWords ? "Suppression..." : "Supprimer Tout"}
        </button>
      </div>

      <p id="words-management-format" className="mt-3 text-sm text-slate-500">
        Colonnes attendues : <span className="font-mono">Mot, EchelonDB, Nature, Categorie, Classe, Niveau</span>
      </p>

      <form id="words-management-search-form" className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleSearchWords}>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Recherche d'un mot</label>
          <input
            id="words-management-search-input"
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Exemple : chat"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <div className="flex items-end">
          <button
            id="words-management-search-button"
            type="submit"
            disabled={loadingSearch || loadingImport || deletingAllWords}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
          >
            {loadingSearch ? "Recherche..." : "Rechercher"}
          </button>
        </div>
      </form>

      {showMessage && message && (
        <div
          id="words-management-message"
          className={`mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 transition-opacity duration-500 ${
            fadeMessage ? "opacity-0" : "opacity-100"
          }`}
        >
          {message}
        </div>
      )}

      {result && (
        <div id="words-management-result" className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 space-y-1">
          <div>Import terminé.</div>
          <div>Lignes reçues : {result.received}</div>
          <div>Lignes valides : {result.valid}</div>
          <div>Mots importés : {result.imported}</div>
          <div>Doublons ignorés : {result.skippedDuplicates}</div>
          <div>Total en base : {result.totalWordsInDb}</div>
        </div>
      )}

      {error && (
        <div id="words-management-error" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {(stats.byClass.length > 0 || stats.byCategory.length > 0) && (
        <div id="words-management-overview" className="mt-4 grid gap-4 md:grid-cols-2">
          <div id="words-management-classes" className="rounded-lg border border-slate-200 p-3">
            <h4 className="font-semibold text-slate-800 mb-2">Répartition par classe</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              {stats.byClass.slice(0, 6).map((item) => (
                <li key={`class-${item.school_class}`} className="flex justify-between gap-3">
                  <span>{item.school_class || "Non renseignée"}</span>
                  <span className="font-semibold text-slate-800">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div id="words-management-categories" className="rounded-lg border border-slate-200 p-3">
            <h4 className="font-semibold text-slate-800 mb-2">Répartition par catégorie</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              {stats.byCategory.slice(0, 6).map((item) => (
                <li key={`category-${item.category}`} className="flex justify-between gap-3">
                  <span>{item.category || "Non renseignée"}</span>
                  <span className="font-semibold text-slate-800">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div id="words-management-search-results" className="mt-4 space-y-3">
        {searchedWords.length === 0 && !loadingSearch ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            {searchText.trim()
              ? "Aucun mot trouvé pour cette recherche."
              : "Utilise la recherche pour afficher les mots en base."}
          </div>
        ) : (
          searchedWords.map((item) => (
            <div
              key={item.id}
              id={`words-management-item-${item.id}`}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectWord(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSelectWord(item);
                }
              }}
              className={`rounded-lg border p-3 cursor-pointer ${
                String(selectedWordId) === String(item.id)
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="w-full space-y-2">
                  {String(selectedWordId) === String(item.id) ? (
                    <div
                      id={`words-management-item-edit-${item.id}`}
                      className="grid gap-2 md:grid-cols-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Mot</label>
                        <input
                          id={`words-management-edit-word-${item.id}`}
                          type="text"
                          value={selectedWordDraft.word}
                          onChange={(event) => handleDraftChange("word", event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Échelon DB</label>
                        <input
                          id={`words-management-edit-echelon-${item.id}`}
                          type="number"
                          min="0"
                          value={selectedWordDraft.echelon_db}
                          onChange={(event) => handleDraftChange("echelon_db", event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Nature</label>
                        <input
                          id={`words-management-edit-nature-${item.id}`}
                          type="text"
                          value={selectedWordDraft.nature}
                          onChange={(event) => handleDraftChange("nature", event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Catégorie</label>
                        <input
                          id={`words-management-edit-category-${item.id}`}
                          type="text"
                          value={selectedWordDraft.category}
                          onChange={(event) => handleDraftChange("category", event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Classe</label>
                        <input
                          id={`words-management-edit-class-${item.id}`}
                          type="text"
                          value={selectedWordDraft.school_class}
                          onChange={(event) => handleDraftChange("school_class", event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Niveau</label>
                        <input
                          id={`words-management-edit-level-${item.id}`}
                          type="number"
                          min="0"
                          value={selectedWordDraft.level}
                          onChange={(event) => handleDraftChange("level", event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-base font-semibold text-slate-800">{item.word || "—"}</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-800">
                          Nature : {item.nature || "—"}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
                          Catégorie : {item.category || "—"}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                          Classe : {item.school_class || "—"}
                        </span>
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 font-semibold text-slate-700">
                          Niveau : {item.level ?? "—"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {String(selectedWordId) === String(item.id) && (
                  <div
                    id={`words-management-item-actions-${item.id}`}
                    className="flex shrink-0 items-start gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      id={`words-management-update-word-button-${item.id}`}
                      type="button"
                      onClick={() => {
                        void handleUpdateWord(item);
                      }}
                      disabled={savingWordId === String(item.id) || deletingAllWords || loadingImport}
                      className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                      {savingWordId === String(item.id) ? "Modification..." : "Modifier"}
                    </button>

                    <button
                      id={`words-management-delete-word-button-${item.id}`}
                      type="button"
                      onClick={() => {
                        void handleDeleteWord(item);
                      }}
                      disabled={deletingWordId === String(item.id) || deletingAllWords || loadingImport}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      {deletingWordId === String(item.id) ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default WordsManagementPanel;
