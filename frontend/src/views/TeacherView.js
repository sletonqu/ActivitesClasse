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
  const [studentError, setStudentError] = useState("");
  const [showStudentsList, setShowStudentsList] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState([]);

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
  }, []);

  const loadStudents = async () => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);
    try {
      const res = await fetch(`${API_URL}/students`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const filtered = data.filter((s) => String(s.class_id) === String(selectedClassId));
        setStudents(filtered);
      } else {
        setStudents([]);
      }
    } catch {
      setStudents([]);
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

  useEffect(() => {
    if (showStudentsList) {
      loadStudents();
    }
  }, [selectedClassId]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Espace Enseignant</h2>

      <div className="w-full max-w-3xl bg-white rounded-xl shadow p-6 mb-6">
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

      <div className="w-full flex flex-col lg:flex-row gap-6 mb-6">
        <section className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Gestion des élèves</h3>

          <form onSubmit={handleAddStudent} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nom</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Ex: Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Prénom</label>
              <input
                type="text"
                value={studentFirstname}
                onChange={(e) => setStudentFirstname(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Ex: Alice"
              />
            </div>

            <div className="flex flex-wrap gap-3">
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

          {studentMessage && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              {studentMessage}
            </div>
          )}

          {studentError && (
            <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {studentError}
            </div>
          )}
        </section>

        {showStudentsList && (
          <section className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Liste des Élèves</h3>

            {!selectedClassId ? (
              <p className="text-slate-500 text-sm">Sélectionnez une classe pour afficher les élèves.</p>
            ) : loadingStudents ? (
              <p className="text-slate-500 text-sm">Chargement...</p>
            ) : students.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucun élève trouvé pour cette classe.</p>
            ) : (
              <ul className="space-y-3">
                {students.map((student) => (
                  <li key={student.id} className="border border-slate-200 rounded-lg p-3">
                    <p className="font-semibold text-slate-800">
                      {student.firstname} {student.name}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
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
