import React from "react";

const GroupManagementPanel = ({
  groupName,
  submittingGroup,
  groupMessage,
  groupError,
  showGroupMessage,
  fadeGroupMessage,
  showGroupsList,
  groups,
  selectedClassId,
  selectedGroupId,
  selectedGroup,
  loadingGroups,
  deletingAllGroups,
  deletingGroupId,
  availableStudents,
  selectedAvailableStudentId,
  assigningStudentToGroup,
  groupStudents,
  removingGroupStudentId,
  removingAllGroupStudents,
  onGroupNameChange,
  onAddGroup,
  onToggleGroupsList,
  onSelectGroup,
  onDeleteGroup,
  onDeleteAllGroups,
  onSelectedAvailableStudentChange,
  onAssignStudentToGroup,
  onRemoveStudentFromGroup,
  onRemoveAllStudentsFromGroup,
}) => {
  return (
    <div id="groups-panel-root" className="w-full flex flex-col xl:flex-row gap-6 mb-6">
      <section
        id="groups-panel-form-section"
        className={`w-full ${showGroupsList && selectedGroupId ? "xl:w-1/3" : "xl:w-1/2"} bg-white rounded-xl shadow p-6`}
      >
        <h3 id="groups-panel-title" className="text-xl font-bold text-slate-800 mb-4">
          Gestion des groupes
        </h3>

        <form id="groups-panel-form" onSubmit={onAddGroup} className="space-y-4">
          <div id="groups-panel-name-field">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ex: Groupe A"
            />
          </div>

          <div id="groups-panel-actions" className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submittingGroup}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
            >
              {submittingGroup ? "Ajout en cours..." : "Ajouter"}
            </button>

            <button
              type="button"
              onClick={onToggleGroupsList}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {showGroupsList ? "Masquer la liste de Groupes" : "Liste des Groupes"}
            </button>
          </div>
        </form>

        {showGroupMessage && groupMessage && (
          <div
            id="groups-panel-message"
            className={`mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 transition-opacity duration-500 ${
              fadeGroupMessage ? "opacity-0" : "opacity-100"
            }`}
          >
            {groupMessage}
          </div>
        )}

        {groupError && (
          <div
            id="groups-panel-error"
            className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700"
          >
            {groupError}
          </div>
        )}
      </section>

      {showGroupsList && (
        <section
          id="groups-panel-list-section"
          className={`w-full ${selectedGroupId ? "xl:w-1/3" : "xl:w-1/2"} bg-white rounded-xl shadow p-6`}
        >
          <div id="groups-panel-list-header" className="flex items-center justify-between mb-4 gap-3">
            <h3 id="groups-panel-list-title" className="text-xl font-bold text-slate-800">
              Liste des Groupes
            </h3>
            <button
              type="button"
              onClick={onDeleteAllGroups}
              disabled={!selectedClassId || groups.length === 0 || deletingAllGroups}
              className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
            >
              {deletingAllGroups ? "Suppression..." : "Supprimer Tout"}
            </button>
          </div>

          {!selectedClassId ? (
            <p className="text-slate-500 text-sm">Sélectionnez une classe pour afficher les groupes.</p>
          ) : loadingGroups ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : groups.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun groupe trouvé pour cette classe.</p>
          ) : (
            <ul id="groups-panel-list" className="space-y-3">
              {groups.map((group) => (
                <li
                  id={`group-row-${group.id}`}
                  key={group.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectGroup(String(group.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectGroup(String(group.id));
                    }
                  }}
                  className={`border rounded-lg p-3 cursor-pointer ${
                    String(selectedGroupId) === String(group.id)
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200"
                  }`}
                >
                  <div id={`group-row-actions-${group.id}`} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{group.name}</p>
                      <p className="text-sm text-slate-500">
                        {group.student_count || 0} élève{Number(group.student_count || 0) > 1 ? "s" : ""}
                      </p>
                    </div>
                    {String(selectedGroupId) === String(group.id) && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteGroup(group);
                        }}
                        disabled={deletingGroupId === String(group.id) || deletingAllGroups}
                        className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
                      >
                        {deletingGroupId === String(group.id) ? "Suppression..." : "Supprimer"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {showGroupsList && selectedGroup && (
        <section id="groups-panel-students-section" className="w-full xl:w-1/3 bg-white rounded-xl shadow p-6">
          <div id="groups-panel-students-header" className="flex items-center justify-between mb-4 gap-3">
            <div>
              <h3 id="groups-panel-students-title" className="text-xl font-bold text-slate-800">
                Liste des Élèves du groupe
              </h3>
              <p className="text-sm text-slate-500">{selectedGroup.name}</p>
            </div>
            <button
              type="button"
              onClick={onRemoveAllStudentsFromGroup}
              disabled={groupStudents.length === 0 || removingAllGroupStudents}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-60"
            >
              {removingAllGroupStudents ? "Retrait..." : "Retirer Tout"}
            </button>
          </div>

          <form id="groups-panel-assign-form" onSubmit={onAssignStudentToGroup} className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Élève disponible</label>
              <select
                value={selectedAvailableStudentId}
                onChange={(e) => onSelectedAvailableStudentChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">Sélectionner un élève</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstname} {student.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!selectedAvailableStudentId || assigningStudentToGroup}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
            >
              {assigningStudentToGroup ? "Ajout..." : "Ajouter au groupe"}
            </button>
          </form>

          {groupStudents.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun élève n'est actuellement affecté à ce groupe.</p>
          ) : (
            <ul id="groups-panel-students-list" className="space-y-3">
              {groupStudents.map((student) => (
                <li
                  id={`group-student-row-${student.id}`}
                  key={student.id}
                  className="border border-slate-200 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-800">
                      {student.firstname} {student.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveStudentFromGroup(student)}
                      disabled={removingGroupStudentId === String(student.id) || removingAllGroupStudents}
                      className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-60"
                    >
                      {removingGroupStudentId === String(student.id) ? "Retrait..." : "Retirer"}
                    </button>
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

export default GroupManagementPanel;
