import React, { useEffect, useState } from "react";
import {
  DEFAULT_GROUP_COLOR,
  PRESET_GROUP_COLORS,
  getGroupBadgeStyle,
} from "../utils/groupColors";

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
  onUpdateGroupColor,
  savingGroupColor = false,
  hideTitle = false,
}) => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [pendingColor, setPendingColor] = useState(
    selectedGroup?.color || DEFAULT_GROUP_COLOR
  );

  useEffect(() => {
    if (selectedGroup) {
      setPendingColor(selectedGroup.color || DEFAULT_GROUP_COLOR);
      setIsPaletteOpen(false);
    }
  }, [selectedGroup?.id, selectedGroup?.color]);
  return (
    <div id="groups-panel-root" className="w-full flex flex-col gap-6 mb-6 lg:flex-row">
      <section
        id="groups-panel-form-section"
        className={`w-full ${showGroupsList && selectedGroupId ? "lg:w-1/3" : "lg:w-1/2"} bg-white rounded-xl shadow-sm p-6`}
      >
        {!hideTitle && (
          <h3 id="groups-panel-title" className="text-xl font-bold text-slate-800 mb-4">
            Gestion des groupes
          </h3>
        )}

        <form id="groups-panel-form" onSubmit={onAddGroup} className="space-y-4">
          <div id="groups-panel-name-field">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-sky-400"
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
          className={`w-full ${selectedGroupId ? "lg:w-1/3" : "lg:w-1/2"} bg-white rounded-xl shadow-sm p-6`}
        >
          <div id="groups-panel-list-header" className="flex items-center justify-between mb-4 gap-3">
            <h3 id="groups-panel-list-title" className="text-xl font-bold text-slate-800">
              Liste des Groupes
            </h3>
            <button
              type="button"
              onClick={onDeleteAllGroups}
              disabled={!selectedClassId || groups.length === 0 || deletingAllGroups}
              className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded-sm hover:bg-rose-700 disabled:opacity-60"
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
                    <div className="flex items-center gap-2.5">
                      <span
                        id={`group-row-color-${group.id}`}
                        className="w-4 h-4 rounded-full shrink-0 border border-black/15 shadow-xs"
                        style={{ backgroundColor: group.color || DEFAULT_GROUP_COLOR }}
                        title={group.color || DEFAULT_GROUP_COLOR}
                      />
                      <div>
                        <p className="font-semibold text-slate-800">{group.name}</p>
                        <p className="text-sm text-slate-500">
                          {group.student_count || 0} élève{Number(group.student_count || 0) > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    {String(selectedGroupId) === String(group.id) && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteGroup(group);
                        }}
                        disabled={deletingGroupId === String(group.id) || deletingAllGroups}
                        className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded-sm hover:bg-rose-700 disabled:opacity-60"
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
        <section id="groups-panel-students-section" className="w-full bg-white rounded-xl shadow-sm p-6 lg:w-1/3">
          <div id="groups-panel-students-header" className="flex items-center justify-between mb-4 gap-3">
            <div>
              <h3 id="groups-panel-students-title" className="text-xl font-bold text-slate-800">
                Modifier le Groupe
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  id="groups-panel-selected-group-badge"
                  className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold"
                  style={getGroupBadgeStyle(selectedGroup.color || DEFAULT_GROUP_COLOR)}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: selectedGroup.color || DEFAULT_GROUP_COLOR }}
                  />
                  {selectedGroup.name}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onRemoveAllStudentsFromGroup}
              disabled={groupStudents.length === 0 || removingAllGroupStudents}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-sm hover:bg-amber-700 disabled:opacity-60"
            >
              {removingAllGroupStudents ? "Retrait..." : "Retirer Tout"}
            </button>
          </div>

          {/* Bloc de sélection de la couleur du groupe */}
          <div id="groups-panel-color-section" className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Couleur :</span>
                <span
                  id="groups-panel-current-color-dot"
                  className="w-4 h-4 rounded-full border border-black/20 shadow-xs shrink-0"
                  style={{ backgroundColor: selectedGroup.color || DEFAULT_GROUP_COLOR }}
                  title={selectedGroup.color || DEFAULT_GROUP_COLOR}
                />
                <span id="groups-panel-current-color-label" className="text-xs font-mono text-slate-500">
                  {selectedGroup.color || DEFAULT_GROUP_COLOR}
                </span>
              </div>
              <button
                id="groups-panel-open-palette-btn"
                type="button"
                onClick={() => {
                  setPendingColor(selectedGroup.color || DEFAULT_GROUP_COLOR);
                  setIsPaletteOpen((prev) => !prev);
                }}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-100 text-slate-700 shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span>🎨</span> {isPaletteOpen ? "Fermer la palette" : "Choisir une couleur"}
              </button>
            </div>

            {isPaletteOpen && (
              <div id="groups-panel-color-palette" className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-2">Choisir une couleur pour ce groupe :</p>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {PRESET_GROUP_COLORS.map((preset) => {
                    const isSelected =
                      (pendingColor || "").toLowerCase() === preset.value.toLowerCase();
                    return (
                      <button
                        key={preset.value}
                        id={`group-color-preset-${preset.value.replace("#", "")}`}
                        type="button"
                        title={preset.name}
                        onClick={() => setPendingColor(preset.value)}
                        className={`h-7 w-7 rounded-full border-2 transition-transform flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-indigo-500 ring-offset-1 border-white scale-110 shadow-sm"
                            : "border-black/10 hover:scale-105"
                        }`}
                        style={{ backgroundColor: preset.value }}
                      >
                        {isSelected && (
                          <span className="text-white text-[10px] font-bold drop-shadow-sm">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <label htmlFor="group-custom-color-input" className="text-xs text-slate-600">
                    Couleur personnalisée :
                  </label>
                  <input
                    id="group-custom-color-input"
                    type="color"
                    value={pendingColor}
                    onChange={(e) => setPendingColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-xs font-mono text-slate-500">{pendingColor}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    id="groups-panel-cancel-color-btn"
                    type="button"
                    onClick={() => {
                      setIsPaletteOpen(false);
                      setPendingColor(selectedGroup.color || DEFAULT_GROUP_COLOR);
                    }}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    id="groups-panel-save-color-btn"
                    type="button"
                    disabled={savingGroupColor}
                    onClick={async () => {
                      if (onUpdateGroupColor) {
                        await onUpdateGroupColor(selectedGroup.id, pendingColor);
                        setIsPaletteOpen(false);
                      }
                    }}
                    className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60 shadow-xs"
                  >
                    {savingGroupColor ? "Enregistrement..." : "Valider"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <form id="groups-panel-assign-form" onSubmit={onAssignStudentToGroup} className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Élève disponible</label>
              <select
                value={selectedAvailableStudentId}
                onChange={(e) => onSelectedAvailableStudentChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-sky-400"
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
                      className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded-sm hover:bg-rose-700 disabled:opacity-60"
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
