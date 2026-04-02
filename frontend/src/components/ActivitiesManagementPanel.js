import React from "react";

const ACTIVITY_FILES = [
  "src/activities/SortNumbersActivity.js",
  "src/activities/MatchAdditionsActivity.js",
  "src/activities/CountPencilsByTensActivity.js",
  "src/activities/InteractiveWhiteboardActivity.js",
];

const ActivitiesManagementPanel = ({
  activities,
  loadingActivities,
  showActivitiesList,
  selectedActivityEditId,
  editActivityTitle,
  editActivityDescription,
  editActivityStatus,
  editActivityJsFile,
  editActivityContentText,
  submittingEditActivity,
  editActivityError,
  activityMessage,
  showActivityMessage,
  fadeActivityMessage,
  onToggleActivitiesList,
  onSelectActivityToEdit,
  onUpdateActivity,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditStatusChange,
  onEditJsFileChange,
  onEditContentChange,
  // Optional props for Admin view (add form)
  showAddForm = false,
  activityTitle = "",
  activityDescription = "",
  activityStatus = "Active",
  activityJsFile = ACTIVITY_FILES[0],
  activityContentText = "",
  submittingActivity = false,
  activityError = "",
  onAddActivity = null,
  onActivityTitleChange = null,
  onActivityDescriptionChange = null,
  onActivityStatusChange = null,
  onActivityJsFileChange = null,
  onActivityContentChange = null,
}) => {
  return (
    <div id="activities-panel-root" className="w-full flex flex-col lg:flex-row gap-6 mb-6">
      <section
        id="activities-panel-form-section"
        className={`w-full ${showActivitiesList && selectedActivityEditId ? "lg:w-1/3" : "lg:w-1/2"} bg-white rounded-xl shadow p-6`}
      >
        <h3 id="activities-panel-title" className="text-xl font-bold text-slate-800 mb-4">Gestion des activités</h3>

    <div id="activities-panel-actions" className="flex flex-wrap gap-3">
          {showAddForm && (
            <button
              type="submit"
              disabled={submittingActivity}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
              form="activities-panel-add-form"
            >
              {submittingActivity ? "Ajout en cours..." : "Ajouter"}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleActivitiesList}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {showActivitiesList ? "Masquer la Liste des activités" : showAddForm ? "Liste des activités" : "Afficher les activités"}
          </button>
        </div>

        {showAddForm && (
          <form id="activities-panel-add-form" onSubmit={onAddActivity} className="space-y-4">
            <div id="activities-panel-title-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Titre</label>
              <input
                type="text"
                value={activityTitle}
                onChange={(e) => onActivityTitleChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Ex: Nombres croissants"
              />
            </div>

            <div id="activities-panel-description-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={activityDescription}
                onChange={(e) => onActivityDescriptionChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Description de l'activité"
              />
            </div>

            <div id="activities-panel-status-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Statut</label>
              <select
                value={activityStatus}
                onChange={(e) => onActivityStatusChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div id="activities-panel-js-file-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Fichier JS de l'activité</label>
              <select
                value={activityJsFile}
                onChange={(e) => onActivityJsFileChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {ACTIVITY_FILES.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
            </div>

            <div id="activities-panel-content-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contenu JSON</label>
              <textarea
                value={activityContentText}
                onChange={(e) => onActivityContentChange(e.target.value)}
                className="w-full h-[300px] border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </form>
        )}

        {showActivityMessage && activityMessage && (
          <div
            id="activities-panel-message"
            className={`mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 transition-opacity duration-500 ${
              fadeActivityMessage ? "opacity-0" : "opacity-100"
            }`}
          >
            {activityMessage}
          </div>
        )}
      </section>

      {showActivitiesList && (
        <section
          id="activities-panel-list-section"
          className={`w-full ${selectedActivityEditId ? "lg:w-1/3" : "lg:w-1/2"} bg-white rounded-xl shadow p-6`}
        >
          <h3 id="activities-panel-list-title" className="text-xl font-bold text-slate-800 mb-4">Liste des activités</h3>

          {loadingActivities ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : activities.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune activité trouvée.</p>
          ) : (
            <ul id="activities-panel-list" className="space-y-3">
              {activities.map((activity) => (
                <li
                  id={`activity-card-${activity.id}`}
                  key={activity.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectActivityToEdit(activity)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectActivityToEdit(activity);
                    }
                  }}
                  className={`border rounded-lg p-3 cursor-pointer ${
                    String(selectedActivityEditId) === String(activity.id)
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200"
                  }`}
                >
                  <p className="font-semibold text-slate-800">{activity.title}</p>
                  <p className="text-sm text-slate-600">Statut: {activity.status || "Non défini"}</p>
                  <p className="text-sm text-slate-600">Fichier: {activity.js_file || "Aucun"}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {showActivitiesList && selectedActivityEditId && (
        <section id="activities-panel-edit-section" className="w-full lg:w-1/3 bg-white rounded-xl shadow p-6">
          <h3 id="activities-panel-edit-title" className="text-xl font-bold text-slate-800 mb-4">Modifier l'activité</h3>

          <form id="activities-panel-edit-form" onSubmit={onUpdateActivity} className="space-y-4">
            <div id="activities-panel-edit-title-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Titre</label>
              <input
                type="text"
                value={editActivityTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div id="activities-panel-edit-description-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={editActivityDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div id="activities-panel-edit-status-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Statut</label>
              <select
                value={editActivityStatus}
                onChange={(e) => onEditStatusChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div id="activities-panel-edit-js-file-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Fichier JS de l'activité</label>
              <select
                value={editActivityJsFile}
                onChange={(e) => onEditJsFileChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {ACTIVITY_FILES.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
            </div>

            <div id="activities-panel-edit-content-field">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contenu JSON</label>
              <textarea
                value={editActivityContentText}
                onChange={(e) => onEditContentChange(e.target.value)}
                className="w-full h-[300px] border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div id="activities-panel-edit-actions" className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingEditActivity}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60"
              >
                {submittingEditActivity ? "Modification..." : "Modifier"}
              </button>
            </div>
          </form>

          {editActivityError && (
            <div id="activities-panel-edit-error" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {editActivityError}
            </div>
          )}

          {activityError && (
            <div id="activities-panel-error" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {activityError}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ActivitiesManagementPanel;
