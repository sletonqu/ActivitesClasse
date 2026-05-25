import React, { useMemo, useState } from "react";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";

const buildFocusedActivityUrl = ({ classId, groupId, activityId, studentId }) => {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("classId", String(classId));
  url.searchParams.set("groupId", String(groupId));
  url.searchParams.set("activityId", String(activityId));
  url.searchParams.set("studentId", String(studentId));
  return url.toString();
};

const CopyIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 3h7v7" />
    <path d="M10 14L21 3" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </svg>
);

const WorkshopManagementPanel = ({
  selectedClass,
  selectedGroup,
  selectedActivity,
  groupStudents,
  groups = [],
  activities = [],
  selectedGroupId = "",
  selectedActivityId = "",
  onSelectGroupId,
  onSelectActivityId,
}) => {
  const [message, setMessage] = useState("");
  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage);

  const studentLinks = useMemo(() => {
    if (!selectedClass?.id || !selectedGroup?.id || !selectedActivity?.id) {
      return [];
    }

    return groupStudents.map((student) => ({
      student,
      url: buildFocusedActivityUrl({
        classId: selectedClass.id,
        groupId: selectedGroup.id,
        activityId: selectedActivity.id,
        studentId: student.id,
      }),
    }));
  }, [groupStudents, selectedActivity?.id, selectedClass?.id, selectedGroup?.id]);

  const handleCopy = async (url, student) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = url;
        temporaryInput.setAttribute("readonly", "");
        temporaryInput.style.position = "absolute";
        temporaryInput.style.left = "-9999px";
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand("copy");
        document.body.removeChild(temporaryInput);
      }

      const studentName = `${student.firstname || ""} ${student.name || ""}`.trim() || "cet élève";
      setMessage(`URL copiée pour ${studentName}.`);
    } catch {
      setMessage("Impossible de copier l'URL automatiquement.");
    }
  };

  const handleOpen = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isReady = Boolean(selectedClass?.id && selectedGroup?.id && selectedActivity?.id);
  const activeActivities = useMemo(
    () => activities.filter((activity) => !activity.status || activity.status === "Active"),
    [activities]
  );

  return (
    <section id="workshop-management-panel" className="glass-panel w-full rounded-xl p-3 sm:p-4">
      <div id="workshop-management-header" className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="workshop-management-title" className="text-sm sm:text-base font-extrabold text-slate-800">
          Atelier: liens focus par élève
        </h2>
        {isReady && (
          <span id="workshop-management-selection" className="text-[11px] sm:text-xs font-semibold text-slate-600">
            {selectedGroup?.name || "Groupe"} - {selectedActivity?.title || "Activité"}
          </span>
        )}
      </div>

      {!!onSelectGroupId && !!onSelectActivityId && (
        <div id="workshop-management-controls" className="mt-3 grid gap-2 sm:grid-cols-2">
          <div id="workshop-management-group-field" className="space-y-1">
            <label htmlFor="workshop-management-group-selector" className="block text-[11px] sm:text-xs font-semibold text-slate-600">
              Groupe
            </label>
            <select
              id="workshop-management-group-selector"
              value={selectedGroupId}
              onChange={(event) => onSelectGroupId(event.target.value)}
              disabled={!selectedClass?.id}
              className="w-full border border-slate-300 bg-white/80 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
            >
              <option value="">Sélectionner un groupe</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div id="workshop-management-activity-field" className="space-y-1">
            <label htmlFor="workshop-management-activity-selector" className="block text-[11px] sm:text-xs font-semibold text-slate-600">
              Activité
            </label>
            <select
              id="workshop-management-activity-selector"
              value={selectedActivityId}
              onChange={(event) => onSelectActivityId(event.target.value)}
              disabled={!selectedClass?.id}
              className="w-full border border-slate-300 bg-white/80 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
            >
              <option value="">Sélectionner une activité</option>
              {activeActivities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!selectedClass?.id ? (
        <p id="workshop-management-empty-class" className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white/30 px-3 py-2 text-xs text-slate-600">
          Sélectionnez une classe pour préparer un atelier.
        </p>
      ) : !selectedGroup?.id ? (
        <p id="workshop-management-empty-group" className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white/30 px-3 py-2 text-xs text-slate-600">
          Sélectionnez un groupe de la classe pour générer les URLs.
        </p>
      ) : !selectedActivity?.id ? (
        <p id="workshop-management-empty-activity" className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white/30 px-3 py-2 text-xs text-slate-600">
          Sélectionnez une activité active pour générer les URLs focus.
        </p>
      ) : studentLinks.length === 0 ? (
        <p id="workshop-management-empty-students" className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white/30 px-3 py-2 text-xs text-slate-600">
          Aucun élève trouvé dans ce groupe.
        </p>
      ) : (
        <ul id="workshop-management-links-list" className="mt-3 space-y-2">
          {studentLinks.map(({ student, url }) => {
            const studentName = `${student.firstname || ""} ${student.name || ""}`.trim() || "Élève";
            return (
              <li
                id={`workshop-management-link-row-${student.id}`}
                key={student.id}
                className="rounded-lg border border-slate-200 bg-white/70 p-2.5"
              >
                <div className="grid items-center gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                  <p id={`workshop-management-student-${student.id}`} className="truncate text-xs sm:text-sm font-bold text-slate-800">
                    {studentName}
                  </p>

                  <a
                    id={`workshop-management-url-${student.id}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate rounded border border-slate-200 bg-white px-2 py-1 text-[11px] sm:text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                    title={url}
                  >
                    {url}
                  </a>

                  <div id={`workshop-management-actions-${student.id}`} className="flex items-center gap-1.5 justify-self-end">
                    <button
                      id={`workshop-management-copy-${student.id}`}
                      type="button"
                      onClick={() => handleCopy(url, student)}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                      title="Copier l'URL"
                    >
                      <CopyIcon />
                      Copier
                    </button>
                    <button
                      id={`workshop-management-open-${student.id}`}
                      type="button"
                      onClick={() => handleOpen(url)}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                      title="Ouvrir l'URL"
                    >
                      <ExternalLinkIcon />
                      Ouvrir l'URL
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showMessage && message && (
        <div
          id="workshop-management-message"
          className={`mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 transition-opacity duration-500 ${fadeMessage ? "opacity-0" : "opacity-100"}`}
        >
          {message}
        </div>
      )}
    </section>
  );
};

export default WorkshopManagementPanel;
