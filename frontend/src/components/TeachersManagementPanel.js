import React from "react";

const TeachersManagementPanel = ({
  teacherName,
  teacherEmail,
  teacherPassword,
  teacherSelectedClassId,
  submittingTeacher,
  teacherMessage,
  teacherError,
  showTeachersList,
  teachers,
  classes,
  loadingTeachers,
  selectedTeacherIds,
  deletingSelectedTeachers,
  deletingAllTeachers,
  onTeacherNameChange,
  onTeacherEmailChange,
  onTeacherPasswordChange,
  onTeacherSelectedClassIdChange,
  onAddTeacher,
  onToggleTeachersList,
  onToggleTeacherSelection,
  onToggleAllTeachersSelection,
  onDeleteSelectedTeachers,
  onDeleteAllTeachers,
}) => {
  const allTeachersSelected = teachers.length > 0 && selectedTeacherIds.length === teachers.length;
  const deletionInProgress = deletingSelectedTeachers || deletingAllTeachers;

  return (
    <div id="teachers-panel-root" className="w-full flex flex-col xl:flex-row gap-6 mb-6">
      <section id="teachers-panel-form-section" className="w-full xl:w-1/2 bg-white rounded-xl shadow p-6">
        <h3 id="teachers-panel-title" className="text-xl font-bold text-slate-800 mb-4">Gestion des enseignants</h3>

        <form id="teachers-panel-form" onSubmit={onAddTeacher} className="space-y-4">
          <div id="teachers-panel-name-field">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => onTeacherNameChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ex: Mme Martin"
            />
          </div>

          <div id="teachers-panel-email-field">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={teacherEmail}
              onChange={(e) => onTeacherEmailChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ex: martin@ecole.local"
            />
          </div>

          <div id="teachers-panel-password-field">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={teacherPassword}
              onChange={(e) => onTeacherPasswordChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Mot de passe"
            />
          </div>

          <div id="teachers-panel-class-field">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Associer à une classe</label>
            <select
              value={teacherSelectedClassId}
              onChange={(e) => onTeacherSelectedClassIdChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Aucune (null)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (ID: {cls.id})
                </option>
              ))}
            </select>
          </div>

          <div id="teachers-panel-actions" className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submittingTeacher}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
            >
              {submittingTeacher ? "Ajout en cours..." : "Ajouter"}
            </button>

            <button
              type="button"
              onClick={onToggleTeachersList}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {showTeachersList ? "Masquer la Liste des Enseignants" : "Liste des Enseignants"}
            </button>
          </div>
        </form>

        {teacherMessage && (
          <div id="teachers-panel-message" className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
            {teacherMessage}
          </div>
        )}

        {teacherError && (
          <div id="teachers-panel-error" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
            {teacherError}
          </div>
        )}
      </section>

      {showTeachersList && (
        <section id="teachers-panel-list-section" className="w-full xl:w-1/2 bg-white rounded-xl shadow p-6">
          <div id="teachers-panel-list-header" className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 id="teachers-panel-list-title" className="text-xl font-bold text-slate-800">Liste des Enseignants</h3>
              <p className="text-sm text-slate-500">
                {selectedTeacherIds.length} sélectionné{selectedTeacherIds.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onToggleAllTeachersSelection}
                disabled={loadingTeachers || teachers.length === 0 || deletionInProgress}
                className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-60"
              >
                {allTeachersSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>

              <button
                type="button"
                onClick={onDeleteSelectedTeachers}
                disabled={selectedTeacherIds.length === 0 || deletionInProgress}
                className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-60"
              >
                {deletingSelectedTeachers
                  ? "Suppression..."
                  : `Supprimer la sélection${selectedTeacherIds.length > 0 ? ` (${selectedTeacherIds.length})` : ""}`}
              </button>

              <button
                type="button"
                onClick={onDeleteAllTeachers}
                disabled={teachers.length === 0 || deletionInProgress}
                className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
              >
                {deletingAllTeachers ? "Suppression..." : "Supprimer Tout"}
              </button>
            </div>
          </div>

          {loadingTeachers ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : teachers.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun enseignant trouvé.</p>
          ) : (
            <ul id="teachers-panel-list" className="space-y-3">
              {teachers.map((teacher) => {
                const linkedClasses = classes.filter((c) => Number(c.teacher_id) === Number(teacher.id));
                const classesText =
                  linkedClasses.length > 0
                    ? linkedClasses.map((c) => c.name).join(", ")
                    : "Aucune";
                const isSelected = selectedTeacherIds.includes(String(teacher.id));

                return (
                  <li
                    id={`teacher-card-${teacher.id}`}
                    key={teacher.id}
                    className={`border rounded-lg p-3 ${isSelected ? "border-indigo-400 bg-indigo-50" : "border-slate-200"}`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleTeacherSelection(String(teacher.id))}
                        disabled={deletionInProgress}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />

                      <div className="min-w-0">
                        <p id={`teacher-name-${teacher.id}`} className="font-semibold text-slate-800">{teacher.name}</p>
                        <p className="text-sm text-slate-600 break-all">{teacher.email}</p>
                        <p className="text-sm text-slate-600">Classes associées : {classesText}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default TeachersManagementPanel;
