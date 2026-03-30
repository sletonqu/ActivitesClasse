import React, { useEffect, useState } from "react";
import StudentsImportExportPanel from "../components/StudentsImportExportPanel";

const API_URL = "http://localhost:4000/api";

const TeacherView = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentFirstname, setStudentFirstname] = useState("");
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [studentMessage, setStudentMessage] = useState("");
  const [showStudentMessage, setShowStudentMessage] = useState(false);
  const [fadeStudentMessage, setFadeStudentMessage] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [showStudentsList, setShowStudentsList] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [deletingStudentId, setDeletingStudentId] = useState("");
  const [deletingAllStudents, setDeletingAllStudents] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedResultStudentId, setSelectedResultStudentId] = useState("");
  const [loadingResults, setLoadingResults] = useState(false);
  const [studentResults, setStudentResults] = useState([]);
  const [resultsError, setResultsError] = useState("");
  const [selectedResultId, setSelectedResultId] = useState("");
  const [deletingResultId, setDeletingResultId] = useState("");
  const [deletingAllResults, setDeletingAllResults] = useState(false);
  const [calculatingAverageResultId, setCalculatingAverageResultId] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/classes`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setClasses([]);
        }
      })
      .catch(() => setClasses([]));

    fetch(`${API_URL}/activities`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActivities(data);
        } else {
          setActivities([]);
        }
      })
      .catch(() => setActivities([]));
  }, []);

  useEffect(() => {
    if (!studentMessage) {
      setShowStudentMessage(false);
      setFadeStudentMessage(false);
      return;
    }

    setShowStudentMessage(true);
    setFadeStudentMessage(false);

    const fadeTimer = setTimeout(() => {
      setFadeStudentMessage(true);
    }, 3500);

    const hideTimer = setTimeout(() => {
      setShowStudentMessage(false);
      setStudentMessage("");
      setFadeStudentMessage(false);
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [studentMessage]);

  const loadStudents = async () => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId("");
      return;
    }

    setLoadingStudents(true);
    try {
      const res = await fetch(`${API_URL}/students`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const filtered = data.filter((s) => String(s.class_id) === String(selectedClassId));
        setStudents(filtered);
        setSelectedStudentId((prev) =>
          filtered.some((student) => String(student.id) === String(prev)) ? prev : ""
        );
      } else {
        setStudents([]);
        setSelectedStudentId("");
      }
    } catch {
      setStudents([]);
      setSelectedStudentId("");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleToggleStudentsList = async () => {
    const next = !showStudentsList;
    setShowStudentsList(next);
    if (next) {
      await loadStudents();
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSubmittingStudent(true);
    setStudentError("");
    setStudentMessage("");

    try {
      if (!selectedClassId) {
        throw new Error("Sélectionnez une classe avant d'ajouter un élève");
      }

      if (!studentName.trim() || !studentFirstname.trim()) {
        throw new Error("Les champs nom et prénom sont obligatoires");
      }

      const resp = await fetch(`${API_URL}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentName.trim(),
          firstname: studentFirstname.trim(),
          class_id: Number(selectedClassId),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de l'ajout de l'élève");
      }

      setStudentMessage("Élève ajouté");
      setStudentName("");
      setStudentFirstname("");
      if (showStudentsList) {
        await loadStudents();
      }
    } catch (err) {
      setStudentError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingStudent(false);
    }
  };

  const deleteResultsForStudentId = async (studentId, existingResults) => {
    const results = Array.isArray(existingResults)
      ? existingResults
      : await (async () => {
          const res = await fetch(`${API_URL}/results`);
          const data = await res.json();
          if (!res.ok || !Array.isArray(data)) {
            throw new Error("Erreur lors du chargement des résultats");
          }
          return data;
        })();

    const linkedResults = results.filter((result) => String(result.student_id) === String(studentId));

    await Promise.all(
      linkedResults.map(async (result) => {
        const res = await fetch(`${API_URL}/results/${result.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erreur lors de la suppression des résultats associés");
        }
      })
    );
  };

  const handleDeleteStudent = async (student) => {
    const confirmed = window.confirm(
      `Supprimer ${student.firstname} ${student.name} et tous ses résultats associés ?`
    );
    if (!confirmed) return;

    setDeletingStudentId(String(student.id));
    setStudentError("");
    setStudentMessage("");

    try {
      await deleteResultsForStudentId(student.id);

      const res = await fetch(`${API_URL}/students/${student.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la suppression de l'élève");
      }

      setStudents((prev) => prev.filter((s) => String(s.id) !== String(student.id)));
      if (String(selectedStudentId) === String(student.id)) {
        setSelectedStudentId("");
      }

      if (String(selectedResultStudentId) === String(student.id)) {
        setSelectedResultStudentId("");
        setStudentResults([]);
        setSelectedResultId("");
      }

      setStudentMessage("Élève supprimé");
    } catch (err) {
      setStudentError(err.message || "Erreur inconnue");
    } finally {
      setDeletingStudentId("");
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!selectedClassId || students.length === 0) return;

    const confirmed = window.confirm(
      "Supprimer tous les élèves de la classe active et tous leurs résultats associés ?"
    );
    if (!confirmed) return;

    setDeletingAllStudents(true);
    setStudentError("");
    setStudentMessage("");

    try {
      const resultsRes = await fetch(`${API_URL}/results`);
      const resultsData = await resultsRes.json();
      if (!resultsRes.ok || !Array.isArray(resultsData)) {
        throw new Error("Erreur lors du chargement des résultats");
      }

      for (const student of students) {
        await deleteResultsForStudentId(student.id, resultsData);

        const studentRes = await fetch(`${API_URL}/students/${student.id}`, { method: "DELETE" });
        const studentData = await studentRes.json();
        if (!studentRes.ok) {
          throw new Error(studentData.error || "Erreur lors de la suppression de tous les élèves");
        }
      }

      setStudents([]);
      setSelectedStudentId("");
      setSelectedResultStudentId("");
      setStudentResults([]);
      setSelectedResultId("");
      setStudentMessage("Tous les élèves de la classe active ont été supprimés");
    } catch (err) {
      setStudentError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllStudents(false);
    }
  };

  const loadResultsForStudent = async (studentId) => {
    if (!studentId) {
      setStudentResults([]);
      setSelectedResultId("");
      return;
    }

    setLoadingResults(true);
    setResultsError("");
    try {
      const res = await fetch(`${API_URL}/results`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        throw new Error("Erreur lors du chargement des résultats");
      }

      const filtered = data
        .filter((r) => String(r.student_id) === String(studentId))
        .sort((a, b) => {
          const dateA = new Date(a.completed_at || 0).getTime();
          const dateB = new Date(b.completed_at || 0).getTime();
          return dateB - dateA;
        });

      setStudentResults(filtered);
      setSelectedResultId("");
    } catch (err) {
      setStudentResults([]);
      setSelectedResultId("");
      setResultsError(err.message || "Erreur inconnue");
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    loadStudents();
    setSelectedStudentId("");
    setSelectedResultStudentId("");
    setStudentResults([]);
    setSelectedResultId("");
    setResultsError("");
  }, [selectedClassId]);

  useEffect(() => {
    loadResultsForStudent(selectedResultStudentId);
  }, [selectedResultStudentId]);

  const selectedResultStudent = students.find(
    (student) => String(student.id) === String(selectedResultStudentId)
  );

  const getActivityLabel = (activityId) => {
    const activity = activities.find((a) => String(a.id) === String(activityId));
    return activity ? activity.title : "Activité inconnue";
  };

  const handleDeleteResult = async (resultId) => {
    setDeletingResultId(String(resultId));
    setResultsError("");

    try {
      const res = await fetch(`${API_URL}/results/${resultId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la suppression du résultat");
      }

      setStudentResults((prev) => prev.filter((result) => String(result.id) !== String(resultId)));
      if (String(selectedResultId) === String(resultId)) {
        setSelectedResultId("");
      }
    } catch (err) {
      setResultsError(err.message || "Erreur inconnue");
    } finally {
      setDeletingResultId("");
    }
  };

  const handleDeleteAllResults = async () => {
    if (!selectedResultStudentId || studentResults.length === 0) return;

    const confirmed = window.confirm(
      "Confirmer la suppression de tous les résultats de cet élève ?"
    );
    if (!confirmed) return;

    setDeletingAllResults(true);
    setResultsError("");

    try {
      await Promise.all(
        studentResults.map(async (result) => {
          const res = await fetch(`${API_URL}/results/${result.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Erreur lors de la suppression de tous les résultats");
          }
        })
      );

      setStudentResults([]);
      setSelectedResultId("");
    } catch (err) {
      setResultsError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllResults(false);
    }
  };

  const getActivityTypeKey = (activityId) => {
    const activity = activities.find((a) => String(a.id) === String(activityId));
    if (!activity) return `activity-id:${activityId}`;
    if (activity.js_file && String(activity.js_file).trim()) {
      return `js-file:${String(activity.js_file).trim()}`;
    }
    return `activity-id:${activityId}`;
  };

  const handleCalculateAverage = async (selectedResult) => {
    setCalculatingAverageResultId(String(selectedResult.id));
    setResultsError("");

    try {
      const selectedTypeKey = getActivityTypeKey(selectedResult.activity_id);
      const sameTypeResults = studentResults.filter(
        (result) => getActivityTypeKey(result.activity_id) === selectedTypeKey
      );

      if (sameTypeResults.length === 0) {
        throw new Error("Aucun résultat du même type trouvé");
      }

      const totalScore = sameTypeResults.reduce((sum, result) => {
        const numericScore = Number(result.score);
        return sum + (Number.isNaN(numericScore) ? 0 : numericScore);
      }, 0);
      const averageScore = Math.round((totalScore / sameTypeResults.length) * 100) / 100;

      await Promise.all(
        sameTypeResults.map(async (result) => {
          const res = await fetch(`${API_URL}/results/${result.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Erreur lors de la suppression des résultats du même type");
          }
        })
      );

      const createRes = await fetch(`${API_URL}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: Number(selectedResultStudentId),
          activity_id: Number(selectedResult.activity_id),
          score: averageScore,
          completed_at: new Date().toISOString(),
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || "Erreur lors de la création du résultat moyen");
      }

      await loadResultsForStudent(selectedResultStudentId);
      setSelectedResultId("");
    } catch (err) {
      setResultsError(err.message || "Erreur inconnue");
    } finally {
      setCalculatingAverageResultId("");
    }
  };

  return (
    <div id="teacher-view-root" className="min-h-screen bg-slate-100 p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Espace Enseignant</h2>

      <div id="bloc-classe-active" className="w-full max-w-3xl bg-white rounded-xl shadow p-6 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Classe ciblée</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Sélectionner une classe</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} (ID: {cls.id})
            </option>
          ))}
        </select>
      </div>

      <div id="zone-gestion-eleves" className="w-full flex flex-col lg:flex-row gap-6 mb-6">
        <section id="section-gestion-eleves" className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Gestion des élèves</h3>

          <form onSubmit={handleAddStudent} className="space-y-4">
            <div id="bloc-form-eleve-nom">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nom</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Ex: Dupont"
              />
            </div>

            <div id="bloc-form-eleve-prenom">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Prénom</label>
              <input
                type="text"
                value={studentFirstname}
                onChange={(e) => setStudentFirstname(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Ex: Alice"
              />
            </div>

            <div id="bloc-actions-eleves" className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingStudent}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
              >
                {submittingStudent ? "Ajout en cours..." : "Ajouter"}
              </button>

              <button
                type="button"
                onClick={handleToggleStudentsList}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {showStudentsList ? "Masquer la Liste des Élèves" : "Liste des Élèves"}
              </button>
            </div>
          </form>

          {showStudentMessage && studentMessage && (
            <div
              id="bloc-message-eleve"
              className={`mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 transition-opacity duration-500 ${
                fadeStudentMessage ? "opacity-0" : "opacity-100"
              }`}
            >
              {studentMessage}
            </div>
          )}

          {studentError && (
            <div id="bloc-erreur-eleve" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {studentError}
            </div>
          )}
        </section>

        {showStudentsList && (
          <section id="section-liste-eleves" className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
            <div id="bloc-entete-liste-eleves" className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-xl font-bold text-slate-800">Liste des Élèves</h3>
              <button
                type="button"
                onClick={handleDeleteAllStudents}
                disabled={!selectedClassId || students.length === 0 || deletingAllStudents}
                className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
              >
                {deletingAllStudents ? "Suppression..." : "Supprimer Tout"}
              </button>
            </div>

            {!selectedClassId ? (
              <p className="text-slate-500 text-sm">Sélectionnez une classe pour afficher les élèves.</p>
            ) : loadingStudents ? (
              <p className="text-slate-500 text-sm">Chargement...</p>
            ) : students.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucun élève trouvé pour cette classe.</p>
            ) : (
              <ul id="liste-eleves-classe-active" className="space-y-3">
                {students.map((student) => (
                  <li
                    id={`ligne-eleve-${student.id}`}
                    key={student.id}
                    onMouseEnter={() => setSelectedStudentId(String(student.id))}
                    onFocus={() => setSelectedStudentId(String(student.id))}
                    tabIndex={0}
                    className={`border rounded-lg p-3 ${
                      String(selectedStudentId) === String(student.id)
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div id={`bloc-actions-eleve-${student.id}`} className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-800">
                        {student.firstname} {student.name}
                      </p>
                      {String(selectedStudentId) === String(student.id) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student)}
                          disabled={deletingStudentId === String(student.id) || deletingAllStudents}
                          className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
                        >
                          {deletingStudentId === String(student.id) ? "Suppression..." : "Supprimer"}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <div id="zone-gestion-resultats" className="w-full flex flex-col lg:flex-row gap-6 mb-6">
        <section id="section-gestion-resultats" className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Gestion des Résultats</h3>

          {!selectedClassId ? (
            <p className="text-slate-500 text-sm">Sélectionnez une classe active pour gérer les résultats.</p>
          ) : students.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun élève trouvé dans cette classe.</p>
          ) : (
            <div id="bloc-selection-eleve-resultats">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Élève</label>
              <select
                value={selectedResultStudentId}
                onChange={(e) => setSelectedResultStudentId(e.target.value)}
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

        <section id="section-liste-resultats-eleve" className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Résultats de l'élève</h3>

          {!selectedClassId ? (
            <p className="text-slate-500 text-sm">Aucune classe active.</p>
          ) : !selectedResultStudentId ? (
            <p className="text-slate-500 text-sm">Sélectionnez un élève pour afficher ses résultats.</p>
          ) : loadingResults ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : resultsError ? (
            <div id="bloc-erreur-resultats" className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {resultsError}
            </div>
          ) : studentResults.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun résultat enregistré pour cet élève.</p>
          ) : (
            <div id="bloc-contenu-resultats-eleve">
              <div id="bloc-entete-resultats-eleve" className="flex items-center justify-between mb-3 gap-3">
                <p className="text-sm text-slate-600">
                  Élève: <span className="font-semibold text-slate-800">{selectedResultStudent?.firstname} {selectedResultStudent?.name}</span>
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAllResults}
                  disabled={deletingAllResults || studentResults.length === 0}
                  className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
                >
                  {deletingAllResults ? "Suppression..." : "Supprimer Tout"}
                </button>
              </div>
              <ul id="liste-resultats-eleve" className="space-y-3">
                {studentResults.map((result) => (
                  <li
                    id={`ligne-resultat-${result.id}`}
                    key={result.id}
                    onMouseEnter={() => setSelectedResultId(String(result.id))}
                    onFocus={() => setSelectedResultId(String(result.id))}
                    tabIndex={0}
                    className={`border rounded-lg p-3 cursor-default ${
                      String(selectedResultId) === String(result.id)
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div id={`bloc-actions-resultat-${result.id}`} className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-800">{getActivityLabel(result.activity_id)}</p>
                      {String(selectedResultId) === String(result.id) && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCalculateAverage(result);
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
                              handleDeleteResult(result.id);
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

      <StudentsImportExportPanel
        title="Import / Export des élèves (Enseignant)"
        selectedClassId={selectedClassId}
        requireClassSelection
      />
    </div>
  );
};

export default TeacherView;
