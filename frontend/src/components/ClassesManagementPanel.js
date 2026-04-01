import React from "react";

const ClassesManagementPanel = ({
  className,
  classTeacherId,
  submittingClass,
  classMessage,
  classError,
  showClassesList,
  classes,
  teachers,
  loadingClasses,
  onClassNameChange,
  onClassTeacherIdChange,
  onAddClass,
  onToggleClassesList,
}) => {
  return (
    <div id="zone-gestion-classes" className="w-full flex flex-col lg:flex-row gap-6 mb-6">
      <section id="section-gestion-classes" className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Gestion des classes</h3>

        <form onSubmit={onAddClass} className="space-y-4">
          <div id="bloc-form-classe-nom">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de la classe</label>
            <input
              type="text"
              value={className}
              onChange={(e) => onClassNameChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ex: CM1 A"
            />
          </div>

          <div id="bloc-form-classe-enseignant">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Enseignant associé (teacher_id)</label>
            <select
              value={classTeacherId}
              onChange={(e) => onClassTeacherIdChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Aucun (null)</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} (ID: {teacher.id})
                </option>
              ))}
            </select>
          </div>

          <div id="bloc-actions-classes" className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submittingClass}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
            >
              {submittingClass ? "Ajout en cours..." : "Ajouter"}
            </button>

            <button
              type="button"
              onClick={onToggleClassesList}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {showClassesList ? "Masquer la Liste des classes" : "Liste des classes"}
            </button>
          </div>
        </form>

        {classMessage && (
          <div id="bloc-message-classe" className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
            {classMessage}
          </div>
        )}

        {classError && (
          <div id="bloc-erreur-classe" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
            {classError}
          </div>
        )}
      </section>

      {showClassesList && (
        <section id="section-liste-classes" className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Liste des classes</h3>

          {loadingClasses ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : classes.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune classe trouvée.</p>
          ) : (
            <ul className="space-y-3">
              {classes.map((cls) => {
                const linkedTeacher = teachers.find((t) => Number(t.id) === Number(cls.teacher_id));
                const teacherText = linkedTeacher ? linkedTeacher.name : "Aucun";

                return (
                  <li key={cls.id} className="border border-slate-200 rounded-lg p-3">
                    <p className="font-semibold text-slate-800">{cls.name}</p>
                    <p className="text-sm text-slate-600">Enseignant associé: {teacherText}</p>
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

export default ClassesManagementPanel;
