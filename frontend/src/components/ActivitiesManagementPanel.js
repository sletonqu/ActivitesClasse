import React from "react";

const ACTIVITY_FILES = [
  "src/activities/SortNumbersActivity.js",
  "src/activities/MatchAdditionsActivity.js",
  "src/activities/CountPencilsByTensActivity.js",
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
    <div id="zone-gestion-activites" className="w-full flex flex-col lg:flex-row gap-6 mb-6">
      <section
        id="section-gestion-activites"
        className={`w-full ${showActivitiesList && selectedActivityEditId ? "lg:w-1/3" : "lg:w-1/2"} bg-white rounded-xl shadow p-6`}
      >
        <h3 className="text-xl font-bold text-slate-800 mb-4">Gestion des activités</h3>

    <div id="bloc-actions-activites" className="flex flex-wrap gap-3">
          {showAddForm && (
            <button
              type="submit"
              disabled={submittingActivity}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
              form="form-add-activity"
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
          <form id="form-add-activity" onSubmit={onAddActivity} className="space-y-4">
            <div id="bloc-form-activite-titre">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Titre</label>
              <input
                type="text"
                value={activityTitle}
                onChange={(e) => onActivityTitleChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Ex: Nombres croissants"
              />
            </div>

            <div id="bloc-form-activite-description">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={activityDescription}
                onChange={(e) => onActivityDescriptionChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Description de l'activité"
              />
            </div>

            <div id="bloc-form-activite-statut">
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

            <div id="bloc-form-activite-js-file">
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

            <div id="bloc-form-activite-contenu-json">
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
            id="bloc-message-activite"
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
          id="section-liste-activites"
          className={`w-full ${selectedActivityEditId ? "lg:w-1/3" : "lg:w-1/2"} bg-white rounded-xl shadow p-6`}
        >
          <h3 className="text-xl font-bold text-slate-800 mb-4">Liste des activités</h3>

          {loadingActivities ? (
            <p className="text-slate-500 text-sm">Chargement...</p>
          ) : activities.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune activité trouvée.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((activity) => (
                <li
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
        <section id="section-edition-activite" className="w-full lg:w-1/3 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Modifier l'activité</h3>

          <form onSubmit={onUpdateActivity} className="space-y-4">
            <div id="bloc-form-edition-activite-titre">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Titre</label>
              <input
                type="text"
                value={editActivityTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div id="bloc-form-edition-activite-description">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={editActivityDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div id="bloc-form-edition-activite-statut">
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

            <div id="bloc-form-edition-activite-js-file">
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

            <div id="bloc-form-edition-activite-contenu-json">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contenu JSON</label>
              <textarea
                value={editActivityContentText}
                onChange={(e) => onEditContentChange(e.target.value)}
                className="w-full h-[300px] border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div id="bloc-actions-edition-activite" className="flex flex-wrap gap-3">
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
            <div id="bloc-erreur-edition-activite" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {editActivityError}
            </div>
          )}

          {activityError && (
            <div id="bloc-erreur-activite" className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {activityError}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ActivitiesManagementPanel;
