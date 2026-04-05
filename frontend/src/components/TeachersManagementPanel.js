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
  onTeacherNameChange,
  onTeacherEmailChange,
  onTeacherPasswordChange,
  onTeacherSelectedClassIdChange,
  onAddTeacher,
  onToggleTeachersList,
}) => {
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
          <h3 id="teachers-panel-list-title" className="text-xl font-bold text-slate-800 mb-4">Liste des Enseignants</h3>

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

                return (
                  <li id={`teacher-card-${teacher.id}`} key={teacher.id} className="border border-slate-200 rounded-lg p-3">
                    <p id={`teacher-name-${teacher.id}`} className="font-semibold text-slate-800">{teacher.name}</p>
                    <p className="text-sm text-slate-600">Classe associée: {classesText}</p>
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
