import React, { useEffect, useState } from "react";
import ActivityContainer from "../activities/ActivityContainer";

const API_URL = "http://localhost:4000/api";

const StudentView = () => {
  const [classes, setClasses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activityContent, setActivityContent] = useState({ numbers: [8, 2, 5, 1, 7] });
  const [scoresByStudentId, setScoresByStudentId] = useState({});

  const selectedActivity = activities.find((a) => String(a.id) === String(selectedActivityId)) || null;
  const activityName = selectedActivity?.title || "Activite";

  useEffect(() => {
    fetch(`${API_URL}/classes`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setClasses([]);
        }
      })
      .catch(() => setClasses([]));

    fetch(`${API_URL}/students`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStudents(data);
        } else {
          console.error("Erreur API:", data.error || "Réponse invalide");
          setStudents([]);
        }
      })
      .catch((err) => {
        console.error("Erreur lors du chargement des élèves:", err);
        setStudents([]);
      });

    fetch(`${API_URL}/activities`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActivities(data);
        } else {
          setActivities([]);
        }
      })
      .catch(() => setActivities([]));
  }, []);

  const filteredStudents = students.filter(
    (student) => selectedClassId && String(student.class_id) === String(selectedClassId)
  );

  useEffect(() => {
    if (!selectedClassId) {
      setSelectedStudent(null);
      return;
    }

    if (selectedStudent && String(selectedStudent.class_id) !== String(selectedClassId)) {
      setSelectedStudent(null);
    }
  }, [selectedClassId, selectedStudent]);

  useEffect(() => {
    if (!selectedActivity) {
      setActivityContent({ numbers: [8, 2, 5, 1, 7] });
      setSelectedStudent(null);
      setScoresByStudentId({});
      return;
    }

    let parsedContent = { numbers: [8, 2, 5, 1, 7] };
    try {
      if (typeof selectedActivity.content === "string" && selectedActivity.content.trim() !== "") {
        parsedContent = JSON.parse(selectedActivity.content);
      } else if (selectedActivity.content && typeof selectedActivity.content === "object") {
        parsedContent = selectedActivity.content;
      }
    } catch {
      parsedContent = { numbers: [8, 2, 5, 1, 7] };
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
    if (scoresByStudentId[student.id] !== undefined) return;
    setSelectedStudent(student);
  };

  const handleActivityComplete = async (score) => {
    if (!selectedStudent) return;

    const studentId = selectedStudent.id;
    setScoresByStudentId((prev) => ({
      ...prev,
      [studentId]: score,
    }));

    try {
      await fetch(`${API_URL}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          activity_id: Number(selectedActivityId),
          score,
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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-6">Espace Élève</h2>
      <div className="w-full max-w-3xl bg-white rounded-xl shadow p-4 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Classe active</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Sélectionner une classe</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} (ID: {cls.id})
            </option>
          ))}
        </select>
      </div>

      <div className="w-full max-w-3xl bg-white rounded-xl shadow p-4 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Activité active</label>
        <select
          value={selectedActivityId}
          onChange={(e) => setSelectedActivityId(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Sélectionner une activité</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.title} (ID: {activity.id}){activity.js_file ? ` - ${activity.js_file}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full max-w-[1400px] px-4 flex flex-col lg:flex-row gap-8 items-start">
        {/* Liste des élèves */}
        <div className="bg-white rounded shadow p-4 min-w-[220px]">
          <h3 className="font-semibold mb-2">Élèves</h3>
          {!selectedClassId ? (
            <p className="text-gray-500 text-sm">Sélectionnez une classe active</p>
          ) : !selectedActivityId ? (
            <p className="text-gray-500 text-sm">Sélectionnez une activité active</p>
          ) : filteredStudents && filteredStudents.length > 0 ? (
            <ul>
              {filteredStudents.map((student) => (
                <li
                  key={student.id}
                  className={`px-2 py-1 rounded mb-1 ${
                    scoresByStudentId[student.id] !== undefined
                      ? "bg-slate-100 text-slate-400 grayscale pointer-events-none"
                      : "cursor-pointer hover:bg-blue-100"
                  } ${selectedStudent?.id === student.id ? "bg-blue-200 font-bold" : ""}
                  }`}
                  onClick={() => handleStudentClick(student)}
                >
                  {student.firstname} {student.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Aucun élève disponible pour cette classe</p>
          )}
        </div>

        {/* Zone d'activité */}
        <div className="flex-1 min-w-0 lg:min-w-[720px] xl:min-w-[840px]">
          {selectedStudent && selectedActivityId ? (
            <ActivityContainer
              key={selectedStudent.id}
              student={selectedStudent}
              content={activityContent}
              activityJsFile={selectedActivity?.js_file}
              onComplete={handleActivityComplete}
            />
          ) : !selectedActivityId ? (
            <div className="text-gray-500 mt-8">Sélectionnez une activité active pour commencer.</div>
          ) : (
            <div className="text-gray-500 mt-8">Sélectionnez un élève pour commencer l'activité.</div>
          )}
        </div>

        {/* Classement */}
        <div className="bg-white rounded shadow p-4 min-w-[260px] w-full lg:w-[300px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Classement</h3>
            <button
              type="button"
              onClick={handleExportLeaderboard}
              disabled={leaderboard.length === 0}
              className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60"
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
            <ol className="space-y-2">
              {leaderboard.map((student, index) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between border border-slate-200 rounded px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {index + 1}. {student.firstname} {student.name}
                  </span>
                  <span className="text-sm font-bold text-sky-700">{student.score}/20</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentView;
