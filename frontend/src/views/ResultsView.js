import React, { useEffect, useMemo, useState } from "react";
import { API_URL } from "../config/api";
import {
  fetchGroupsByClass,
  fetchResults,
  fetchStudents,
  loadActivitiesIntoState,
  loadClassesIntoState,
} from "../utils/dataLoaders";

const VIEW_BACKGROUND_ICON = `${process.env.PUBLIC_URL}/images/favicon_io/favicon.png`;

const ResultsView = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activities, setActivities] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [studentSortMode, setStudentSortMode] = useState("name");

  // Couleurs subtiles de fond pour les groupes
  const groupColors = [
    "bg-blue-50",
    "bg-green-50",
    "bg-purple-50",
    "bg-pink-50",
    "bg-yellow-50",
    "bg-orange-50",
    "bg-red-50",
    "bg-teal-50",
    "bg-cyan-50",
    "bg-indigo-50",
  ];

  // Charger les classes et activités au démarrage
  useEffect(() => {
    loadClassesIntoState(setClasses);
    loadActivitiesIntoState(setActivities);
  }, []);

  // Charger les données de la classe sélectionnée
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setGroups([]);
      setResults([]);
      return;
    }

    const loadClassData = async () => {
      setLoading(true);
      try {
        const [studentsData, resultsData, groupsData] = await Promise.all([
          fetchStudents(),
          fetchResults(),
          fetchGroupsByClass(selectedClassId),
        ]);

        const classStudents = studentsData.filter(
          (s) => String(s.class_id) === String(selectedClassId)
        );
        const classResults = resultsData.filter((r) =>
          classStudents.some((s) => String(s.id) === String(r.student_id))
        );

        setStudents(classStudents);
        setGroups(groupsData);
        setResults(classResults);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    };

    loadClassData();
  }, [selectedClassId]);

  // Récupérer la moyenne des résultats pour une cellule
  const getAverageScore = (studentId, activityId, levelKey) => {
    const cellResults = results.filter(
      (r) =>
        String(r.student_id) === String(studentId) &&
        String(r.activity_id) === String(activityId) &&
        (levelKey ? String(r.activity_level) === String(levelKey) : !r.activity_level)
    );

    if (cellResults.length === 0) return null;

    const totalScore = cellResults.reduce((sum, r) => {
      const score = Number(r.score);
      return sum + (Number.isNaN(score) ? 0 : score);
    }, 0);

    return Math.round((totalScore / cellResults.length) * 100) / 100;
  };

  // Récupérer la couleur selon le score
  const getScoreColor = (score) => {
    if (score === null) return "";
    if (score > 15) return "text-green-600 bg-green-50";
    if (score > 10) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  // Récupérer la couleur de fond du groupe
  const getGroupColor = (groupId) => {
    const groupIndex = groups.findIndex((g) => String(g.id) === String(groupId));
    return groupIndex >= 0 ? groupColors[groupIndex % groupColors.length] : "bg-white";
  };

  const getGroupName = (groupId) => {
    if (!groupId) return "";
    return groups.find((group) => String(group.id) === String(groupId))?.name || "";
  };

  const sortedStudents = useMemo(() => {
    const sortableStudents = [...students];

    sortableStudents.sort((studentA, studentB) => {
      if (studentSortMode === "group") {
        const groupNameA = getGroupName(studentA.group_id).toLocaleLowerCase("fr-FR");
        const groupNameB = getGroupName(studentB.group_id).toLocaleLowerCase("fr-FR");
        const groupComparison = groupNameA.localeCompare(groupNameB, "fr", { sensitivity: "base" });

        if (groupComparison !== 0) {
          return groupComparison;
        }
      }

      const lastNameComparison = String(studentA.name || "").localeCompare(String(studentB.name || ""), "fr", {
        sensitivity: "base",
      });

      if (lastNameComparison !== 0) {
        return lastNameComparison;
      }

      return String(studentA.firstname || "").localeCompare(String(studentB.firstname || ""), "fr", {
        sensitivity: "base",
      });
    });

    return sortableStudents;
  }, [groups, studentSortMode, students]);

  // Structurer les colonnes d'activités avec leurs niveaux
  const activityColumns = useMemo(() => {
    return activities.map((activity) => {
      const activityResults = results.filter(
        (r) => String(r.activity_id) === String(activity.id)
      );

      const hasLevels = activityResults.some((r) => r.activity_level);
      const levels = hasLevels
        ? Array.from(new Set(activityResults.map((r) => r.activity_level).filter(Boolean)))
            .sort()
        : [];

      return {
        activity,
        levels: levels.length > 0 ? levels : [null],
      };
    });
  }, [activities, results]);

  // Détails des résultats pour la modale
  const handleCellClick = (studentId, activityId, levelKey) => {
    const cellResults = results.filter(
      (r) =>
        String(r.student_id) === String(studentId) &&
        String(r.activity_id) === String(activityId) &&
        (levelKey ? String(r.activity_level) === String(levelKey) : !r.activity_level)
    );

    if (cellResults.length === 0) return;

    const student = students.find((s) => String(s.id) === String(studentId));
    const activity = activities.find((a) => String(a.id) === String(activityId));

    setSelectedResult({
      student,
      activity,
      level: levelKey,
      results: cellResults,
      average: getAverageScore(studentId, activityId, levelKey),
    });
    setShowModal(true);
  };

  const selectedClass = classes.find((c) => String(c.id) === String(selectedClassId));

  return (
    <div id="results-view" style={{ "--view-background-icon": `url(${VIEW_BACKGROUND_ICON})` }} className="w-full h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* En-tête */}
      <header id="results-view-header" className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div id="results-view-header-content" className="flex items-center justify-between gap-4">
          <div id="results-view-title-block">
            <h1 id="results-view-title" className="text-2xl font-bold text-slate-800">Résultats de la Classe</h1>
            <p id="results-view-subtitle" className="text-sm text-slate-500 mt-1">
              {selectedClass ? selectedClass.name : "Sélectionnez une classe"}
            </p>
          </div>
          <div id="results-view-class-filter" className="flex-1 max-w-xs">
            <label id="results-view-class-filter-label" className="block text-sm font-semibold text-slate-700 mb-2">
              Classe
            </label>
            <select
              id="results-view-class-selector"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sélectionner une classe</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <div id="results-view-content" className="flex-1 overflow-auto p-6">
        {!selectedClassId ? (
          <div id="results-view-empty-class" className="flex items-center justify-center h-full">
            <div id="results-view-empty-class-message" className="text-center">
              <p id="results-view-empty-class-text" className="text-lg text-slate-500 font-semibold">
                Sélectionnez une classe pour afficher les résultats
              </p>
            </div>
          </div>
        ) : loading ? (
          <div id="results-view-loading" className="flex items-center justify-center h-full">
            <div id="results-view-loading-message" className="text-center">
              <p id="results-view-loading-text" className="text-lg text-slate-500 font-semibold">Chargement...</p>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div id="results-view-empty-students" className="flex items-center justify-center h-full">
            <div id="results-view-empty-students-message" className="text-center">
              <p id="results-view-empty-students-text" className="text-lg text-slate-500 font-semibold">
                Aucun élève dans cette classe
              </p>
            </div>
          </div>
        ) : activityColumns.length === 0 ? (
          <div id="results-view-empty-activities" className="flex items-center justify-center h-full">
            <div id="results-view-empty-activities-message" className="text-center">
              <p id="results-view-empty-activities-text" className="text-lg text-slate-500 font-semibold">
                Aucune activité disponible
              </p>
            </div>
          </div>
        ) : (
          <div id="results-view-table-wrapper" className="bg-white rounded-lg shadow-lg overflow-hidden overflow-x-auto">
            <table id="results-view-table" className="w-full border-collapse">
              {/* En-tête du tableau */}
              <thead id="results-view-table-head">
                <tr id="results-view-table-head-main-row" className="bg-slate-100 border-b-2 border-slate-300">
                  {/* Colonne des élèves */}
                  <th id="results-view-student-column-header" className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-0 z-10 bg-slate-100 min-w-[180px]">
                    Élèves
                  </th>

                  {/* Colonnes des activités */}
                  {activityColumns.map((col) => (
                    <th
                      key={col.activity.id}
                      colSpan={col.levels.length}
                      className="px-4 py-3 text-center font-semibold text-slate-700 border-l border-slate-200 bg-slate-100"
                    >
                      {col.activity.title}
                    </th>
                  ))}
                </tr>

                {/* Sous-en-tête avec les niveaux */}
                <tr id="results-view-table-head-sort-row" className="bg-slate-50 border-b border-slate-200">
                  <th id="results-view-student-sort-header" className="sticky left-0 z-10 bg-slate-50 px-4 py-2 min-w-[180px]">
                    <div id="results-view-student-sort-controls" className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <button
                        id="results-sort-by-name"
                        type="button"
                        onClick={() => setStudentSortMode("name")}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 transition-colors ${
                          studentSortMode === "name"
                            ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span aria-hidden="true">⇅</span>
                        <span>Élève</span>
                      </button>
                      <button
                        id="results-sort-by-group"
                        type="button"
                        onClick={() => setStudentSortMode("group")}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 transition-colors ${
                          studentSortMode === "group"
                            ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span aria-hidden="true">⇅</span>
                        <span>Groupe</span>
                      </button>
                    </div>
                  </th>
                  {activityColumns.map((col) =>
                    col.levels.map((level) => (
                      <th
                        key={`${col.activity.id}-${level || "all"}`}
                        className="px-3 py-2 text-center font-medium text-xs text-slate-600 border-l border-slate-200"
                      >
                        {level ? `${level}` : "-"}
                      </th>
                    ))
                  )}
                </tr>
              </thead>

              {/* Corps du tableau */}
              <tbody id="results-view-table-body">
                {sortedStudents.map((student) => (
                  <tr
                    id={`results-student-row-${student.id}`}
                    key={student.id}
                    className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${getGroupColor(
                      student.group_id
                    )}`}
                  >
                    {/* Cellule de l'élève */}
                    <td id={`results-student-cell-${student.id}`} className="px-4 py-3 font-medium text-slate-800 sticky left-0 z-10 min-w-[180px] bg-inherit">
                      <div id={`results-student-info-${student.id}`} className="flex flex-col">
                        <span id={`results-student-name-${student.id}`} className="font-semibold">
                          {student.firstname} {student.name}
                        </span>
                        {student.group_id && (
                          <span id={`results-student-group-${student.id}`} className="text-xs text-slate-500">
                            {getGroupName(student.group_id)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cellules de résultats */}
                    {activityColumns.map((col) =>
                      col.levels.map((level) => {
                        const average = getAverageScore(student.id, col.activity.id, level);
                        const scoreColor = getScoreColor(average);

                        return (
                          <td
                            id={`results-cell-${student.id}-${col.activity.id}-${level || "all"}`}
                            key={`${student.id}-${col.activity.id}-${level || "all"}`}
                            className="px-3 py-3 text-center border-l border-slate-200 cursor-pointer"
                            onClick={() =>
                              average !== null &&
                              handleCellClick(student.id, col.activity.id, level)
                            }
                          >
                            {average !== null ? (
                              <div
                                id={`results-score-${student.id}-${col.activity.id}-${level || "all"}`}
                                className={`rounded-lg py-2 px-3 font-semibold inline-block ${scoreColor} hover:shadow-md transition-shadow`}
                              >
                                {average}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-sm">—</span>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale de détails */}
      {showModal && selectedResult && (
        <div
          id="results-detail-modal-overlay"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            id="results-detail-modal"
            className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="results-detail-modal-header" className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white flex justify-between items-center">
              <div id="results-detail-modal-title-block">
                <h2 id="results-detail-modal-title" className="text-xl font-bold">Détails des résultats</h2>
                <p id="results-detail-modal-student" className="text-sm text-indigo-100 mt-1">
                  {selectedResult.student.firstname} {selectedResult.student.name}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-indigo-500 rounded-full p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <div id="results-detail-modal-content" className="px-6 py-4">
              <div id="results-detail-modal-summary" className="mb-4">
                <h3 id="results-detail-modal-activity" className="font-semibold text-slate-800 text-lg mb-2">
                  {selectedResult.activity.title}
                </h3>
                {selectedResult.level && (
                  <p id="results-detail-modal-level" className="text-sm text-slate-600 mb-3">
                    Niveau : <span className="font-medium">{selectedResult.level}</span>
                  </p>
                )}
                <div id="results-detail-modal-average" className={`rounded-lg py-3 px-4 text-center mb-4 ${getScoreColor(selectedResult.average)}`}>
                  <p id="results-detail-modal-average-label" className="text-xs text-slate-600 font-medium mb-1">Moyenne</p>
                  <p id="results-detail-modal-average-value" className="text-2xl font-bold">{selectedResult.average}</p>
                </div>
              </div>

              <div id="results-detail-modal-attempts" className="space-y-3">
                <h4 id="results-detail-modal-attempts-title" className="font-semibold text-slate-800">Tentatives ({selectedResult.results.length})</h4>
                {selectedResult.results
                  .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
                  .map((result, idx) => (
                    <div id={`results-detail-attempt-${result.id}`} key={result.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div id={`results-detail-attempt-header-${result.id}`} className="flex justify-between items-start mb-1">
                        <span id={`results-detail-attempt-title-${result.id}`} className="font-medium text-slate-800">Tentative {idx + 1}</span>
                        <span id={`results-detail-attempt-score-${result.id}`} className={`text-sm font-semibold px-2 py-1 rounded ${getScoreColor(result.score)}`}>
                          {result.score}
                        </span>
                      </div>
                      <p id={`results-detail-attempt-date-${result.id}`} className="text-xs text-slate-500">
                        {new Date(result.completed_at).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            <div id="results-detail-modal-footer" className="bg-slate-50 px-6 py-4 border-t border-slate-200 sticky bottom-0">
              <button
                id="results-detail-modal-close"
                onClick={() => setShowModal(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
