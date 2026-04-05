import React from "react";

const ResultsManagementPanel = ({
  selectedClassId,
  selectedResultStudentId,
  selectedResultId,
  students,
  studentResults,
  selectedResultStudent,
  loadingResults,
  resultsError,
  deletingAllResults,
  deletingResultId,
  calculatingAverageResultId,
  onSelectResultStudent,
  onSelectResult,
  onCalculateAverage,
  onDeleteResult,
  onDeleteAllResults,
  getActivityLabel,
  getResultLevelLabel,
}) => {
  return (
    <div id="results-panel-root" className="w-full flex flex-col lg:flex-row gap-6 mb-6">
      <section id="results-panel-filter-section" className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
        <h3 id="results-panel-title" className="text-xl font-bold text-slate-800 mb-4">Gestion des Résultats</h3>

        {!selectedClassId ? (
          <p className="text-slate-500 text-sm">Sélectionnez une classe active pour gérer les résultats.</p>
        ) : students.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucun élève trouvé dans cette classe.</p>
        ) : (
          <div id="results-panel-student-selector">
            <label id="results-panel-student-selector-label" className="block text-sm font-semibold text-slate-700 mb-2">Élève</label>
            <select
              value={selectedResultStudentId}
              onChange={(e) => onSelectResultStudent(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Sélectionner un élève</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstname} {student.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section id="results-panel-list-section" className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
        <h3 id="results-panel-list-title" className="text-xl font-bold text-slate-800 mb-4">Résultats de l'élève</h3>

        {!selectedClassId ? (
          <p className="text-slate-500 text-sm">Aucune classe active.</p>
        ) : !selectedResultStudentId ? (
          <p className="text-slate-500 text-sm">Sélectionnez un élève pour afficher ses résultats.</p>
        ) : loadingResults ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : resultsError ? (
          <div id="results-panel-error" className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
            {resultsError}
          </div>
        ) : studentResults.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucun résultat enregistré pour cet élève.</p>
        ) : (
          <div id="results-panel-content">
            <div id="results-panel-content-header" className="flex items-center justify-between mb-3 gap-3">
              <p className="text-sm text-slate-600">
                Élève: <span className="font-semibold text-slate-800">{selectedResultStudent?.firstname} {selectedResultStudent?.name}</span>
              </p>
              <button
                type="button"
                onClick={onDeleteAllResults}
                disabled={deletingAllResults || studentResults.length === 0}
                className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
              >
                {deletingAllResults ? "Suppression..." : "Supprimer Tout"}
              </button>
            </div>
            <ul id="results-panel-list" className="space-y-3">
              {studentResults.map((result) => (
                <li
                  id={`result-row-${result.id}`}
                  key={result.id}
                  onMouseEnter={() => onSelectResult(String(result.id))}
                  onFocus={() => onSelectResult(String(result.id))}
                  tabIndex={0}
                  className={`border rounded-lg p-3 cursor-default ${
                    String(selectedResultId) === String(result.id)
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200"
                  }`}
                >
                  <div id={`result-row-actions-${result.id}`} className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-800">{getActivityLabel(result.activity_id)}</p>
                    {String(selectedResultId) === String(result.id) && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onCalculateAverage(result);
                          }}
                          disabled={
                            calculatingAverageResultId === String(result.id) ||
                            deletingResultId === String(result.id) ||
                            deletingAllResults
                          }
                          className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-60"
                        >
                          {calculatingAverageResultId === String(result.id)
                            ? "Calcul..."
                            : "Calculer Moyenne"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteResult(result.id);
                          }}
                          disabled={
                            deletingResultId === String(result.id) ||
                            deletingAllResults ||
                            calculatingAverageResultId === String(result.id)
                          }
                          className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
                        >
                          {deletingResultId === String(result.id) ? "Suppression..." : "Supprimer"}
                        </button>
                      </div>
                    )}
                  </div>
                  {getResultLevelLabel?.(result) && (
                    <p className="text-sm text-slate-600">Niveau : {getResultLevelLabel(result)}</p>
                  )}
                  <p className="text-sm text-slate-600">Score: {result.score}/20</p>
                  <p className="text-sm text-slate-500">
                    Date: {result.completed_at ? new Date(result.completed_at).toLocaleString() : "Non définie"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};

export default ResultsManagementPanel;
