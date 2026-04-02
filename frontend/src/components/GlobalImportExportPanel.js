import React, { useRef, useState } from "react";

const API_URL = "http://localhost:4000/api";

const GlobalImportExportPanel = () => {
  const fileInputRef = useRef(null);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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
    if (!file) return;

    setLoadingImport(true);
    setError("");
    setResult(null);

    try {
      const csv = await file.text();
      const response = await fetch(`${API_URL}/import/global-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'import global");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoadingImport(false);
    }
  };

  const handleExport = async () => {
    setLoadingExport(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/export/global-csv`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'export global");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `global_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <section id="global-import-export-section" className="w-full bg-white rounded-xl shadow p-6 mb-6">
      <h3 id="global-import-export-title" className="text-xl font-bold text-slate-800 mb-4">Import / Export global (Enseignants, Classes, Élèves, Activités, Résultats)</h3>

      <input
        id="global-import-export-file-input"
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportFileChange}
      />

      <div id="global-import-export-actions" className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleFilePick}
          disabled={loadingImport}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
        >
          {loadingImport ? "Import en cours..." : "Importer CSV"}
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={loadingExport}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
        >
          {loadingExport ? "Export en cours..." : "Exporter CVS"}
        </button>
      </div>

      <p id="global-import-export-description" className="mt-3 text-sm text-slate-500">
        Format attendu: colonnes entity,name,email,password,firstname,teacher_id,class_id,title,description,content,status,js_file,student_id,activity_id,score,completed_at avec entity parmi teacher, class, student, activity, result.
      </p>

      {result && (
        <div id="global-import-export-result" className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
          <div>Import global terminé.</div>
          <div>Lignes reçues: {result.received}</div>
          <div>Enseignants importés: {result.teachersImported}</div>
          <div>Classes importées: {result.classesImported}</div>
          <div>Élèves importés: {result.studentsImported}</div>
          <div>Activités importées: {result.activitiesImported}</div>
          <div>Résultats importés: {result.resultsImported}</div>
          <div>Doublons ignorés: {result.skippedDuplicates}</div>
        </div>
      )}

      {error && (
        <div id="global-import-export-error" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </section>
  );
};

export default GlobalImportExportPanel;
