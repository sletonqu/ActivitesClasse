import React from "react";

const StudentsManagementPanel = ({
  studentName,
  studentFirstname,
  submittingStudent,
  studentMessage,
  studentError,
  showStudentMessage,
  fadeStudentMessage,
  showStudentsList,
  students,
  selectedClassId,
  selectedStudentId,
  loadingStudents,
  deletingAllStudents,
  deletingStudentId,
  onStudentNameChange,
  onStudentFirstnameChange,
  onAddStudent,
  onToggleStudentsList,
  onSelectStudent,
  onDeleteStudent,
  onDeleteAllStudents,
}) => {
  return (
    <div id="students-panel-root" className="w-full flex flex-col xl:flex-row gap-6 mb-6">
      <section id="students-panel-form-section" className="w-full xl:w-1/2 bg-white rounded-xl shadow p-6">
        <h3 id="students-panel-title" className="text-xl font-bold text-slate-800 mb-4">Gestion des élèves</h3>

        <form id="students-panel-form" onSubmit={onAddStudent} className="space-y-4">
          <div id="students-panel-lastname-field">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => onStudentNameChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ex: Dupont"
            />
          </div>

          <div id="students-panel-firstname-field">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Prénom</label>
            <input
              type="text"
              value={studentFirstname}
              onChange={(e) => onStudentFirstnameChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ex: Alice"
            />
          </div>

          <div id="students-panel-actions" className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submittingStudent}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
            >
              {submittingStudent ? "Ajout en cours..." : "Ajouter"}
            </button>

            <button
              type="button"
              onClick={onToggleStudentsList}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {showStudentsList ? "Masquer la Liste des Élèves" : "Liste des Élèves"}
            </button>
          </div>
        </form>

        {showStudentMessage && studentMessage && (
          <div
            id="students-panel-message"
            className={`mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 transition-opacity duration-500 ${
              fadeStudentMessage ? "opacity-0" : "opacity-100"
            }`}
          >
            {studentMessage}
          </div>
        )}

        {studentError && (
          <div id="students-panel-error" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
            {studentError}
          </div>
        )}
      </section>

      {showStudentsList && (
        <section id="students-panel-list-section" className="w-full xl:w-1/2 bg-white rounded-xl shadow p-6">
          <div id="students-panel-list-header" className="flex items-center justify-between mb-4 gap-3">
            <h3 id="students-panel-list-title" className="text-xl font-bold text-slate-800">Liste des Élèves</h3>
            <button
              type="button"
              onClick={onDeleteAllStudents}
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
            <ul id="students-panel-list" className="space-y-3">
              {students.map((student) => (
                <li
                  id={`student-row-${student.id}`}
                  key={student.id}
                  onMouseEnter={() => onSelectStudent(String(student.id))}
                  onFocus={() => onSelectStudent(String(student.id))}
                  tabIndex={0}
                  className={`border rounded-lg p-3 ${
                    String(selectedStudentId) === String(student.id)
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200"
                  }`}
                >
                  <div id={`student-row-actions-${student.id}`} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {student.firstname} {student.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        Groupe : {student.group_name || "Aucun"}
                      </p>
                    </div>
                    {String(selectedStudentId) === String(student.id) && (
                      <button
                        type="button"
                        onClick={() => onDeleteStudent(student)}
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
  );
};

export default StudentsManagementPanel;
