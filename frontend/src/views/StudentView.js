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
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activityContent, setActivityContent] = useState(DEFAULT_ACTIVITY_CONTENT);
  const [scoresByStudentId, setScoresByStudentId] = useState({});
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const selectedActivity = activities.find((a) => String(a.id) === String(selectedActivityId)) || null;
  const selectedGroup = groups.find((group) => String(group.id) === String(selectedGroupId)) || null;
  const activityName = selectedActivity?.title || "Activite";

  const availableDisciplines = Array.from(new Set(activities.map(a => a.discipline).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const activeActivities = activities.filter((a) => !a.status || a.status === "Active");
  const filteredActivities = activeActivities.filter((activity) => {
    if (!selectedDiscipline) return true;
    if (selectedDiscipline === "Autre") return !activity.discipline;
    return activity.discipline === selectedDiscipline;
  }).sort((a, b) => a.title.localeCompare(b.title));

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

  const allStudentsCompleted =
    !isDemoMode
    && Boolean(selectedClassId)
    && Boolean(selectedActivityId)
    && filteredStudents.length > 0
    && filteredStudents.every((student) => scoresByStudentId[student.id] !== undefined);

  const handleResetStudentRound = () => {
    setSelectedStudent(null);
    setScoresByStudentId({});
  };

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
    <div id="student-view-root" className="min-h-screen animate-in fade-in duration-700 px-2 py-4 lg:px-4 flex flex-col">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center">
        
        {/* Header Glassy Unifié - Version Compacte */}
        <header id="student-header" className="glass-panel sticky top-3 z-50 w-full mb-4 px-3 py-2 sm:px-4 flex flex-col lg:flex-row items-center gap-3 justify-between">
          <div className="flex items-center gap-3 self-start lg:self-auto min-w-0 w-full lg:w-auto">
            <div id="student-logo" className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
              <span className="text-lg font-bold">E</span>
            </div>
            <div id="student-title-block" className="flex flex-col min-w-0 items-start">
              <h1 id="student-view-title" className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight m-0 leading-none text-left">Espace Élève</h1>
              <span id="student-active-activity-label" className="text-[10px] sm:text-xs text-slate-500 font-semibold truncate leading-tight text-left">
                {selectedActivity?.title || "Choisir une activité"}
              </span>
            </div>
          </div>

          <div id="student-controls" className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto justify-end">
            {/* Groupe Classe/Groupe */}
            <div id="student-grouping-controls" className="flex gap-2 flex-1 sm:flex-initial">
              <div className="relative group flex-1 sm:w-32">
                <select
                  id="student-class-selector"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedGroupId("");
                  }}
                  className="w-full border border-slate-200 bg-white/60 backdrop-blur-sm rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-400 appearance-none cursor-pointer"
                >
                  <option value="">Classe</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative group flex-1 sm:w-28">
                <select
                  id="student-group-selector"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  disabled={!selectedClassId || loadingGroups}
                  className="w-full border border-slate-200 bg-white/60 backdrop-blur-sm rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-400 appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">Groupes</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Groupe Discipline/Activité */}
            <div id="student-activity-controls" className="flex gap-2 flex-1 sm:flex-initial">
              <div className="relative group flex-1 sm:w-32">
                <select
                  id="student-discipline-selector"
                  value={selectedDiscipline}
                  onChange={(e) => {
                    setSelectedDiscipline(e.target.value);
                    setSelectedActivityId("");
                  }}
                  className="w-full border border-slate-200 bg-white/60 backdrop-blur-sm rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-400 appearance-none cursor-pointer"
                >
                  <option value="">Discipline</option>
                  {availableDisciplines.map((disc) => (
                    <option key={disc} value={disc}>{disc}</option>
                  ))}
                </select>
              </div>

              <div className="relative group flex-1 sm:w-40">
                <select
                  id="student-activity-selector"
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="w-full border border-slate-200 bg-indigo-50/50 backdrop-blur-sm rounded-lg px-2 py-1.5 text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-400 appearance-none cursor-pointer"
                >
                  <option value="">Activité</option>
                  {filteredActivities.map((activity) => (
                    <option key={activity.id} value={activity.id}>{activity.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mode Démo Toggle */}
            <button
              id="student-demo-mode-toggle"
              type="button"
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                isDemoMode 
                ? "bg-amber-100 text-amber-700 border border-amber-200 shadow-sm" 
                : "bg-white/60 text-slate-600 border border-slate-200 hover:bg-white"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? "bg-amber-500 animate-pulse" : "bg-slate-300"}`}></div>
              Mode Démo
            </button>
          </div>
        </header>

        <div
          id="student-view-main-layout"
          className={`mt-auto sticky bottom-0 z-10 grid w-full grid-cols-1 items-start gap-1.5 lg:gap-2 ${
            isDemoMode ? "lg:grid-cols-1" : "lg:grid-cols-[180px_minmax(0,1fr)_190px]"
          }`}
        >
          {!isDemoMode && (
            <div
              id="student-view-students-panel"
              className="w-full min-w-0 self-end bg-white rounded shadow p-3"
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
              <div className="space-y-2.5">
                <ActivityContainer
                  key={`${selectedStudent.id}-${selectedActivityId}`}
                  student={selectedStudent}
                  content={activityContent}
                  activityJsFile={selectedActivity?.js_file}
                  onComplete={handleActivityComplete}
                  activityProps={{
                    allStudentsCompleted,
                    onResetStudentRound: handleResetStudentRound,
                  }}
                />
              </div>
            ) : (
              <div className="rounded-xl bg-white p-4 text-gray-500 shadow">
                Sélectionnez un élève pour commencer l'activité.
              </div>
            )}
          </div>

          {!isDemoMode && (
            <div
              id="student-view-leaderboard-panel"
              className="w-full min-w-0 self-end bg-white rounded shadow p-3"
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
