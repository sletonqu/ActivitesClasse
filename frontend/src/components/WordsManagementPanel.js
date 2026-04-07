import React, { useEffect, useRef, useState } from "react";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";

const WordsManagementPanel = () => {
  const fileInputRef = useRef(null);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [deletingAllWords, setDeletingAllWords] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, byCategory: [], byClass: [] });

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
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllWords(false);
    }
  };

  return (
    <section id="words-management-section" className="w-full bg-white rounded-xl shadow p-6 mb-6">
      <div id="words-management-header" className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div>
          <h3 id="words-management-title" className="text-xl font-bold text-slate-800 mb-2">
            Gestion Mots
          </h3>
          <p id="words-management-description" className="text-sm text-slate-500 max-w-2xl">
            Import du référentiel Dubois-Buyse pour préparer les futures activités de vocabulaire et de grammaire.
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
    </section>
  );
};

export default WordsManagementPanel;
