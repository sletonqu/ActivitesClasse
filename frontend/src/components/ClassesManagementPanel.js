import React from "react";

const ClassesManagementPanel = ({
  className,
  classTeacherId,
  editClassName,
  editClassTeacherId,
  selectedClass,
  submittingClass,
  classMessage,
  classError,
  showClassMessage,
  fadeClassMessage,
  showClassesList,
  classes,
  teachers,
  loadingClasses,
  selectedClassId,
  deletingClassId,
  deletingAllClasses,
  onClassNameChange,
  onClassTeacherIdChange,
  onEditClassNameChange,
  onEditClassTeacherIdChange,
  onAddClass,
  onToggleClassesList,
  onSelectClass,
  onUpdateClass,
  onDeleteClass,
  onDeleteAllClasses,
  hideTitle = false,
}) => {
  const shouldRenderEditSection = showClassesList && Boolean(selectedClass);
  const formSectionClassName = shouldRenderEditSection
    ? "lg:basis-1/3 lg:max-w-[33.333333%]"
    : "lg:basis-1/2 lg:max-w-[50%]";
  const listSectionClassName = shouldRenderEditSection
    ? "lg:basis-1/3 lg:max-w-[33.333333%]"
    : "lg:basis-1/2 lg:max-w-[50%]";

  return (
    <div id="classes-panel-root" className="w-full flex flex-col gap-6 mb-6 lg:flex-row">
      <section
        id="classes-panel-form-section"
        className={`w-full shrink-0 bg-white rounded-xl shadow p-6 ${formSectionClassName}`}
      >
        {!hideTitle && (
          <h3 id="classes-panel-title" className="text-xl font-bold text-slate-800 mb-4">Gestion des classes</h3>
        )}

        <form id="classes-panel-form" onSubmit={onAddClass} className="space-y-4">
          <div id="classes-panel-name-field">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de la classe</label>
            <input
              type="text"
              value={className}
              onChange={(e) => onClassNameChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ex: CM1 A"
            />
          </div>

          <div id="classes-panel-teacher-field">
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

          <div id="classes-panel-actions" className="flex flex-wrap gap-3">
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

        {showClassMessage && classMessage && (
          <div
            id="classes-panel-message"
            className={`mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 transition-opacity duration-500 ${
              fadeClassMessage ? "opacity-0" : "opacity-100"
            }`}
          >
            {classMessage}
          </div>
        )}

        {classError && (
          <div id="classes-panel-error" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
            {classError}
          </div>
        )}
      </section>

      {showClassesList && (
        <section id="classes-panel-list-section" className={`w-full grow bg-white rounded-xl shadow p-6 ${listSectionClassName}`}>
          <div id="classes-panel-list-header" className="flex items-center justify-between mb-4 gap-3">
            <h3 id="classes-panel-list-title" className="text-xl font-bold text-slate-800">Liste des classes</h3>
            <button
              type="button"
              onClick={onDeleteAllClasses}
              disabled={classes.length === 0 || deletingAllClasses}
              className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
            >
              {deletingAllClasses ? "Suppression..." : "Supprimer Tout"}
            </button>
          </div>

          {loadingClasses ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : classes.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune classe trouvée.</p>
          ) : (
            <ul id="classes-panel-list" className="space-y-3">
              {classes.map((cls) => {
                const linkedTeacher = teachers.find((t) => Number(t.id) === Number(cls.teacher_id));
                const teacherText = linkedTeacher ? linkedTeacher.name : "Aucun";

                return (
                  <li
                    id={`class-row-${cls.id}`}
                    key={cls.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectClass(cls)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectClass(cls);
                      }
                    }}
                    className={`border rounded-lg p-3 cursor-pointer ${
                      String(selectedClassId) === String(cls.id)
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div id={`class-row-actions-${cls.id}`} className="flex items-center justify-between gap-3">
                      <div>
                        <p id={`class-name-${cls.id}`} className="font-semibold text-slate-800">{cls.name}</p>
                        <p className="text-sm text-slate-600">Enseignant associé: {teacherText}</p>
                      </div>
                      {String(selectedClassId) === String(cls.id) && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteClass(cls);
                          }}
                          disabled={deletingClassId === String(cls.id) || deletingAllClasses}
                          className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
                        >
                          {deletingClassId === String(cls.id) ? "Suppression..." : "Supprimer"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {shouldRenderEditSection && (
        <section id="classes-panel-edit-section" className="w-full grow bg-white rounded-xl shadow p-6 lg:basis-1/3 lg:max-w-[33.333333%]">
          <h3 id="classes-panel-edit-title" className="text-xl font-bold text-slate-800 mb-4">Modifier la classe</h3>

          <form id="classes-panel-edit-form" onSubmit={onUpdateClass} className="space-y-4">
            <div id="classes-panel-edit-name-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de la classe</label>
              <input
                type="text"
                value={editClassName}
                onChange={(e) => onEditClassNameChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Ex: CM1 A"
              />
            </div>

            <div id="classes-panel-edit-teacher-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Enseignant associé (teacher_id)</label>
              <select
                value={editClassTeacherId}
                onChange={(e) => onEditClassTeacherIdChange(e.target.value)}
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

            <div id="classes-panel-edit-actions" className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={deletingAllClasses}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60"
              >
                Modifier
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};

export default ClassesManagementPanel;
