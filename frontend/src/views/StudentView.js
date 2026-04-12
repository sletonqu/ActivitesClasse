import React, { useEffect, useState } from "react";
import ActivityContainer from "../activities/ActivityContainer";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import {
  fetchGroupsByClass,
  loadActivitiesIntoState,
  loadClassesIntoState,
  loadStudentsIntoState,
} from "../utils/dataLoaders";
const DEFAULT_ACTIVITY_CONTENT = {};

const StudentView = () => {
  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activityContent, setActivityContent] = useState(DEFAULT_ACTIVITY_CONTENT);
  const [scoresByStudentId, setScoresByStudentId] = useState({});
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const selectedActivity = activities.find((a) => String(a.id) === String(selectedActivityId)) || null;
  const selectedGroup = groups.find((group) => String(group.id) === String(selectedGroupId)) || null;
  const activityName = selectedActivity?.title || "Activite";
  const demoBannerMessage = isDemoMode && selectedActivityId ? "Mode démo actif" : "";
  const { show: showDemoBanner, fade: fadeDemoBanner } = useAutoDismissMessage(
    demoBannerMessage,
    null
  );

  useEffect(() => {
    loadClassesIntoState(setClasses);
    loadStudentsIntoState(setStudents);
    loadActivitiesIntoState(setActivities);
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setGroups([]);
      setSelectedGroupId("");
      return;
    }

    setLoadingGroups(true);
    fetchGroupsByClass(selectedClassId)
      .then((data) => {
        setGroups(data);
        setSelectedGroupId((prev) =>
          data.some((group) => String(group.id) === String(prev)) ? prev : ""
        );
      })
      .catch(() => {
        setGroups([]);
        setSelectedGroupId("");
      })
      .finally(() => setLoadingGroups(false));
  }, [selectedClassId]);

  const filteredStudents = students.filter((student) => {
    if (!selectedClassId || String(student.class_id) !== String(selectedClassId)) {
      return false;
    }

    if (!selectedGroupId) {
      return true;
    }

    return String(student.group_id) === String(selectedGroupId);
  });

  const selectedStudentStillVisible = selectedStudent
    ? filteredStudents.some((student) => String(student.id) === String(selectedStudent.id))
    : false;

  useEffect(() => {
    if (isDemoMode || !selectedClassId) {
      setSelectedStudent(null);
      return;
    }

    if (selectedStudent && !selectedStudentStillVisible) {
      setSelectedStudent(null);
    }
  }, [isDemoMode, selectedClassId, selectedGroupId, selectedStudent, selectedStudentStillVisible]);

  useEffect(() => {
    if (!selectedActivity) {
      setActivityContent(DEFAULT_ACTIVITY_CONTENT);
      setSelectedStudent(null);
      setScoresByStudentId({});
      return;
    }

    let parsedContent = DEFAULT_ACTIVITY_CONTENT;
    try {
      if (typeof selectedActivity.content === "string" && selectedActivity.content.trim() !== "") {
        parsedContent = JSON.parse(selectedActivity.content);
      } else if (selectedActivity.content && typeof selectedActivity.content === "object") {
        parsedContent = selectedActivity.content;
      }
    } catch {
      parsedContent = DEFAULT_ACTIVITY_CONTENT;
    }

    setActivityContent(parsedContent);
    setSelectedStudent(null);
    setScoresByStudentId({});
  }, [selectedActivityId, selectedActivity]);


  const leaderboard = filteredStudents
    .filter((student) => scoresByStudentId[student.id] !== undefined)
    .map((student) => ({
      ...student,
      score: scoresByStudentId[student.id],
    }))
    .sort((a, b) => b.score - a.score);

  const handleStudentClick = (student) => {
    if (isDemoMode || scoresByStudentId[student.id] !== undefined) return;
    setSelectedStudent(student);
  };

  const handleActivityComplete = async (scoreOrPayload, completionMeta = {}) => {
    if (isDemoMode || !selectedStudent || !selectedActivityId) return;

    const payload =
      scoreOrPayload && typeof scoreOrPayload === "object"
        ? scoreOrPayload
        : { score: scoreOrPayload, ...completionMeta };

    const numericScore = Number(payload.score);
    if (!Number.isFinite(numericScore)) return;

    const studentId = selectedStudent.id;
    const activityLevel = String(payload.levelKey || "").trim() || null;
    const activityLevelLabel = String(payload.levelLabel || "").trim() || null;

    setScoresByStudentId((prev) => ({
      ...prev,
      [studentId]: numericScore,
    }));

    try {
      await fetch(`${API_URL}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          activity_id: Number(selectedActivityId),
          score: numericScore,
          activity_level: activityLevel,
          activity_level_label: activityLevelLabel,
          completed_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du résultat:", err);
    }
  };

  const handleExportLeaderboard = () => {
    if (leaderboard.length === 0) return;

    const headers = ["rank", "firstname", "name", "score"];
    const rows = leaderboard.map((student, index) => [
      String(index + 1),
      String(student.firstname || ""),
      String(student.name || ""),
      String(student.score),
    ]);

    const escapeCsv = (value) => {
      if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
        return `"${value.replace(/\"/g, '""')}"`;
      }
      return value;
    };

    const csvLines = [headers, ...rows].map((line) => line.map((col) => escapeCsv(col)).join(","));
    const csvContent = `${csvLines.join("\n")}\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${activityName}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="student-view-root" className="min-h-screen bg-gray-100 px-1 py-3 lg:px-1 lg:py-2 flex flex-col">
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col items-center">
        <h2 id="student-view-title" className="mb-3 text-xl font-bold lg:mb-2">Espace Élève</h2>

        <div id="student-view-controls-grid" className="mb-2 grid w-full grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          <div id="student-view-class-selector" className="w-full rounded-xl bg-white p-2.5 shadow">
            <label
              id="student-view-class-selector-label"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Classe active
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedGroupId("");
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Sélectionner une classe</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div id="student-view-group-selector" className="w-full rounded-xl bg-white p-2.5 shadow">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Groupe visible</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              disabled={!selectedClassId || loadingGroups}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-100"
            >
              <option value="">Toute la classe</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {loadingGroups
                ? "Chargement des groupes..."
                : !selectedClassId
                ? "Sélectionnez d'abord une classe."
                : groups.length === 0
                ? "Aucun groupe défini pour cette classe."
                : "Filtre les élèves affichés dans la liste."}
            </p>
          </div>

          <div id="student-view-activity-selector" className="w-full rounded-xl bg-white p-2.5 shadow">
            <label
              id="student-view-activity-selector-label"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Activités disponibles
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Sélectionner une activité</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.title}
                </option>
              ))}
            </select>
          </div>

          <div id="student-view-demo-mode-panel" className="w-full rounded-xl bg-white p-2.5 shadow">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={(e) => setIsDemoMode(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-700">Mode démo</span>
                <span className="block text-[11px] leading-snug text-slate-500">
                  Lance une activité sans élève, sans classement et sans enregistrement de résultat.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div
          id="student-view-main-layout"
          className={`mt-auto sticky bottom-0 z-10 grid w-full grid-cols-1 items-start gap-1.5 lg:gap-2 ${
            isDemoMode ? "lg:grid-cols-1" : "lg:grid-cols-[180px_minmax(0,1fr)_190px]"
          }`}
        >
          {!isDemoMode && (
            <div
              id="student-view-students-panel"
              className="w-full min-w-0 bg-white rounded shadow p-3"
            >
              <h3 id="student-view-students-title" className="mb-2 text-sm font-semibold">
                Élèves {selectedGroup ? `- ${selectedGroup.name}` : ""}
              </h3>
              {!selectedClassId ? (
                <p className="text-gray-500 text-sm">Sélectionnez une classe active</p>
              ) : !selectedActivityId ? (
                <p className="text-gray-500 text-sm">Sélectionnez une activité active</p>
              ) : filteredStudents.length > 0 ? (
                <ul id="student-view-students-list" className="space-y-1">
                  {filteredStudents.map((student) => (
                    <li
                      key={student.id}
                      id={`student-view-student-${student.id}`}
                      className={`mb-1 rounded px-2 py-1 text-sm ${
                        scoresByStudentId[student.id] !== undefined
                          ? "bg-slate-100 text-slate-400 grayscale pointer-events-none"
                          : "cursor-pointer hover:bg-blue-100"
                      } ${selectedStudent?.id === student.id ? "bg-blue-200 font-bold" : ""}`}
                      onClick={() => handleStudentClick(student)}
                    >
                      {student.firstname} {student.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">
                  {selectedGroupId
                    ? "Aucun élève disponible pour ce groupe"
                    : "Aucun élève disponible pour cette classe"}
                </p>
              )}
            </div>
          )}

          <div id="student-view-activity-panel" className="w-full min-w-0">
            {!selectedActivityId ? (
              <div className="rounded-xl bg-white p-4 text-gray-500 shadow">
                Sélectionnez une activité active pour commencer.
              </div>
            ) : isDemoMode ? (
              <div className="space-y-3">
                {showDemoBanner && (
                  <div
                    id="student-view-demo-banner"
                    className={`rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 transition-opacity duration-500 ${
                      fadeDemoBanner ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    Mode démo activé : l'activité s'exécute sans élève sélectionné et aucun résultat ne sera enregistré.
                  </div>
                )}
                <ActivityContainer
                  key={`demo-${selectedActivityId}`}
                  student={null}
                  content={activityContent}
                  activityJsFile={selectedActivity?.js_file}
                  onComplete={() => {}}
                />
              </div>
            ) : selectedStudent ? (
              <ActivityContainer
                key={`${selectedStudent.id}-${selectedActivityId}`}
                student={selectedStudent}
                content={activityContent}
                activityJsFile={selectedActivity?.js_file}
                onComplete={handleActivityComplete}
              />
            ) : (
              <div className="rounded-xl bg-white p-4 text-gray-500 shadow">
                Sélectionnez un élève pour commencer l'activité.
              </div>
            )}
          </div>

          {!isDemoMode && (
            <div
              id="student-view-leaderboard-panel"
              className="w-full min-w-0 bg-white rounded shadow p-3"
            >
              <div id="student-view-leaderboard-header" className="mb-2 flex items-center justify-between gap-2">
                <h3 id="student-view-leaderboard-title" className="text-sm font-semibold">Classement</h3>
                <button
                  type="button"
                  onClick={handleExportLeaderboard}
                  disabled={leaderboard.length === 0}
                  className="rounded bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Exporter
                </button>
              </div>
              {!selectedClassId ? (
                <p className="text-gray-500 text-sm">Sélectionnez une classe active</p>
              ) : !selectedActivityId ? (
                <p className="text-gray-500 text-sm">Sélectionnez une activité active</p>
              ) : leaderboard.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun élève n'a encore validé l'activité</p>
              ) : (
                <ol id="student-view-leaderboard-list" className="space-y-2">
                  {leaderboard.map((student, index) => (
                    <li
                      key={student.id}
                      id={`student-view-leaderboard-item-${student.id}`}
                      className="flex items-center justify-between rounded border border-slate-200 px-2 py-2"
                    >
                      <span className="text-xs font-medium text-slate-700">
                        {index + 1}. {student.firstname} {student.name}
                      </span>
                      <span className="text-sm font-bold text-sky-700">{student.score}/20</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentView;
