import React, { useState } from "react";

const API_URL = "http://localhost:4000/api";

const StudentsImportExportPanel = ({ title, selectedClassId = null, requireClassSelection = false }) => {
  const [csvText, setCsvText] = useState("name,firstname,class_id,group_id,group_name\nDupont,Alice,1,,");
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const classSelected = selectedClassId !== null && selectedClassId !== undefined && selectedClassId !== "";
  const mustSelectClass = requireClassSelection && !classSelected;

  const handleImport = async () => {
    if (mustSelectClass) return;

    setLoadingImport(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/import/csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvText,
          class_id: classSelected ? Number(selectedClassId) : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'import");
      }
      setResult(data);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoadingImport(false);
    }
  };

  const handleExport = async () => {
    if (mustSelectClass) return;

    setLoadingExport(true);
    setError("");

    try {
      const exportUrl = classSelected
        ? `${API_URL}/export/csv?class_id=${encodeURIComponent(selectedClassId)}`
        : `${API_URL}/export/csv`;
      const response = await fetch(exportUrl);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'export");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <section id="students-import-export-section" className="w-full bg-white rounded-xl shadow p-6">
      <h3 id="students-import-export-title" className="text-xl font-bold text-slate-800 mb-4">{title}</h3>

      {mustSelectClass && (
        <div id="students-import-export-class-alert" className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Sélectionnez une classe pour activer l'import/export.
        </div>
      )}

      <label id="students-import-export-textarea-label" className="block text-sm font-semibold text-slate-700 mb-2">
        CSV élèves (name, firstname, class_id, group_id, group_name)
      </label>
      <p className="mb-2 text-xs text-slate-500">
        `group_id` et `group_name` sont optionnels. Si une classe est sélectionnée, `class_id` est forcé automatiquement.
      </p>
      <textarea
        id="students-import-export-textarea"
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        className="w-full h-40 border border-slate-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
      />

      <div id="students-import-export-actions" className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={handleImport}
          disabled={loadingImport || mustSelectClass}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
        >
          {loadingImport ? "Import en cours..." : "Importer CSV"}
        </button>

        <button
          onClick={handleExport}
          disabled={loadingExport || mustSelectClass}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
        >
          {loadingExport ? "Export en cours..." : "Exporter CSV"}
        </button>
      </div>

      {result && (
        <div id="students-import-export-result" className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
          <div>Import terminé.</div>
          <div>Reçues: {result.received}</div>
          <div>Valides: {result.valid}</div>
          <div>Importées: {result.imported}</div>
          <div>Doublons ignorés: {result.skippedDuplicates}</div>
        </div>
      )}

      {error && (
        <div id="students-import-export-error" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </section>
  );
};

export default StudentsImportExportPanel;
