import React, { useEffect, useMemo, useState } from "react";
import ActivityContainer from "../activities/ActivityContainer";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import {
  fetchGroupsByClass,
  loadActivitiesIntoState,
  loadClassesIntoState,
  loadStudentsIntoState,
} from "../utils/dataLoaders";
import StudentPanel from "../components/StudentPanel";
import LeaderboardPanel from "../components/LeaderboardPanel";
const DEFAULT_ACTIVITY_CONTENT = {};
const HEADER_COLLAPSE_DELAY = 5000;

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
  const [preferredLevelByActivityId, setPreferredLevelByActivityId] = useState({});
  const [scoresByStudentId, setScoresByStudentId] = useState({});
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const selectedActivity = activities.find((a) => String(a.id) === String(selectedActivityId)) || null;
  const selectedGroup = groups.find((group) => String(group.id) === String(selectedGroupId)) || null;
  const availableDisciplines = Array.from(new Set(activities.map(a => a.discipline).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const activeActivities = activities.filter((a) => !a.status || a.status === "Active");
  const filteredActivities = activeActivities.filter((activity) => {
    if (!selectedDiscipline) return true;
    if (selectedDiscipline === "Autre") return !activity.discipline;
    return activity.discipline === selectedDiscipline;
  }).sort((a, b) => a.title.localeCompare(b.title));

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

  useEffect(() => {
    if (selectedActivityId || isDemoMode) {
      const timer = setTimeout(() => {
        setHeaderCollapsed(true);
      }, HEADER_COLLAPSE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [selectedActivityId, isDemoMode]);


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

    if (activityLevel) {
      setPreferredLevelByActivityId((prev) => ({
        ...prev,
        [selectedActivityId]: activityLevel,
      }));
    }

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

  const effectiveActivityContent = useMemo(() => {
    const preferredLevel = String(preferredLevelByActivityId[selectedActivityId] || "").trim();
    if (!preferredLevel) {
      return activityContent;
    }

    const baseContent =
      activityContent && typeof activityContent === "object" && !Array.isArray(activityContent)
        ? activityContent
        : DEFAULT_ACTIVITY_CONTENT;

    return {
      ...baseContent,
      defaultLevel: preferredLevel,
    };
  }, [activityContent, preferredLevelByActivityId, selectedActivityId]);

  const StudentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
      <path d="M2 21a10 10 0 0 1 20 0H2Z" />
    </svg>
  );

  return (
    <div id="student-view-root" className="min-h-screen animate-in fade-in duration-700 px-1 pt-2 pb-0 flex flex-col" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex w-full flex-1 flex-col items-center">

        {/* Header Glassy Unifié - Version Compacte */}
        {headerCollapsed ? (
          <button
            id="student-logo-collapsed"
            type="button"
            onClick={() => setHeaderCollapsed(false)}
            title="Afficher les contrôles"
            className={`fixed top-3 right-3 z-50 h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-md transition-colors ${isDemoMode
              ? "bg-orange-500 shadow-orange-200 hover:bg-orange-600"
              : "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700"
              }`}
          >
            <StudentIcon />
          </button>
        ) : (
          <header id="student-header" className="glass-panel sticky top-3 z-50 w-full mb-4 px-3 py-2 sm:px-4 flex flex-col lg:flex-row items-center gap-3 justify-between">
            
            {/* Title Block */}
            <div className="flex items-center gap-3 self-start lg:self-auto min-w-0 w-full lg:w-auto">
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
                <div id="student-view-discipline-container" className="relative group flex-1 sm:w-32">
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

                <div id="student-view-activity-container" className="relative group flex-1 sm:w-40">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${isDemoMode
                  ? "bg-amber-100 text-amber-700 border border-amber-200 shadow-sm"
                  : "bg-white/60 text-slate-600 border border-slate-200 hover:bg-white"
                  }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? "bg-amber-500 animate-pulse" : "bg-slate-300"}`}></div>
                Mode Démo
              </button>
              
              {/* Logo Button */}
              <button
                id="student-logo"
                type="button"
                onClick={() => setHeaderCollapsed(true)}
                title="Masquer les contrôles"
                className={`h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 transition-colors cursor-pointer ${isDemoMode
                  ? "bg-orange-500 shadow-orange-200 hover:bg-orange-600"
                  : "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700"
                  }`}
              >
                <StudentIcon />
              </button>
            </div>
          </header>
        )}

        <div
          id="student-view-main-layout"
          className={`mt-auto sticky bottom-0 z-10 grid w-full grid-cols-1 items-stretch gap-1 ${isDemoMode ? "lg:grid-cols-1" : "lg:grid-cols-[130px_minmax(0,1fr)_140px]"
            }`}
        >
          {!isDemoMode && (
            <div id="student-view-students-panel" className="w-full min-w-0 self-stretch">
              <StudentPanel
                students={filteredStudents}
                selectedStudent={selectedStudent}
                scoresByStudentId={scoresByStudentId}
                selectedGroup={selectedGroup}
                onStudentClick={handleStudentClick}
                selectedClassId={selectedClassId}
                selectedActivityId={selectedActivityId}
              />
            </div>
          )}

          <div id="student-view-activity-panel" className="w-full min-w-0">
            {!selectedActivityId ? (
              <div className="rounded-xl bg-white p-4 text-gray-500 shadow">
                Sélectionnez une activité active pour commencer.
              </div>
            ) : isDemoMode ? (
              <div className="space-y-3">
                <ActivityContainer
                  key={`demo-${selectedActivityId}`}
                  student={null}
                  content={effectiveActivityContent}
                  activityJsFile={selectedActivity?.js_file}
                  onComplete={() => { }}
                />
              </div>
            ) : selectedStudent ? (
              <div className="space-y-2.5">
                <ActivityContainer
                  key={`${selectedStudent.id}-${selectedActivityId}`}
                  student={selectedStudent}
                  content={effectiveActivityContent}
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
            <div id="student-view-leaderboard-panel" className="w-full min-w-0 self-stretch">
              <LeaderboardPanel
                leaderboard={leaderboard}
                selectedClassId={selectedClassId}
                selectedActivityId={selectedActivityId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentView;
