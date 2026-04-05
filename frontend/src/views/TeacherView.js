import React, { useEffect, useState } from "react";
import StudentsImportExportPanel from "../components/StudentsImportExportPanel";
import ActivitiesManagementPanel from "../components/ActivitiesManagementPanel";
import StudentsManagementPanel from "../components/StudentsManagementPanel";
import GroupManagementPanel from "../components/GroupManagementPanel";
import ResultsManagementPanel from "../components/ResultsManagementPanel";
import { defaultSortNumbersActivityContent } from "../activities/SortNumbersActivity";
import { defaultMatchAdditionsActivityContent } from "../activities/MatchAdditionsActivity";
import { defaultCountPencilsByTensActivityContent } from "../activities/CountPencilsByTensActivity";

const API_URL = "http://localhost:4000/api";
const ACTIVITY_FILES = [
  "src/activities/SortNumbersActivity.js",
  "src/activities/MatchAdditionsActivity.js",
  "src/activities/CountPencilsByTensActivity.js",
];

function getDefaultActivityContentText(jsFile) {
  if (jsFile === "src/activities/SortNumbersActivity.js") {
    return JSON.stringify(defaultSortNumbersActivityContent, null, 2);
  }

  if (jsFile === "src/activities/MatchAdditionsActivity.js") {
    return JSON.stringify(defaultMatchAdditionsActivityContent, null, 2);
  }

  if (jsFile === "src/activities/CountPencilsByTensActivity.js") {
    return JSON.stringify(defaultCountPencilsByTensActivityContent, null, 2);
  }

  return "{}";
}

const TeacherView = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentFirstname, setStudentFirstname] = useState("");
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [studentMessage, setStudentMessage] = useState("");
  const [showStudentMessage, setShowStudentMessage] = useState(false);
  const [fadeStudentMessage, setFadeStudentMessage] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [showStudentsList, setShowStudentsList] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [deletingStudentId, setDeletingStudentId] = useState("");
  const [deletingAllStudents, setDeletingAllStudents] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [submittingGroup, setSubmittingGroup] = useState(false);
  const [groupMessage, setGroupMessage] = useState("");
  const [showGroupMessage, setShowGroupMessage] = useState(false);
  const [fadeGroupMessage, setFadeGroupMessage] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [showGroupsList, setShowGroupsList] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [deletingGroupId, setDeletingGroupId] = useState("");
  const [deletingAllGroups, setDeletingAllGroups] = useState(false);
  const [selectedAvailableStudentId, setSelectedAvailableStudentId] = useState("");
  const [assigningStudentToGroup, setAssigningStudentToGroup] = useState(false);
  const [removingGroupStudentId, setRemovingGroupStudentId] = useState("");
  const [removingAllGroupStudents, setRemovingAllGroupStudents] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedResultStudentId, setSelectedResultStudentId] = useState("");
  const [loadingResults, setLoadingResults] = useState(false);
  const [studentResults, setStudentResults] = useState([]);
  const [resultsError, setResultsError] = useState("");
  const [selectedResultId, setSelectedResultId] = useState("");
  const [deletingResultId, setDeletingResultId] = useState("");
  const [deletingAllResults, setDeletingAllResults] = useState(false);
  const [calculatingAverageResultId, setCalculatingAverageResultId] = useState("");
  const [showActivitiesList, setShowActivitiesList] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [selectedActivityEditId, setSelectedActivityEditId] = useState("");
  const [editActivityTitle, setEditActivityTitle] = useState("");
  const [editActivityDescription, setEditActivityDescription] = useState("");
  const [editActivityStatus, setEditActivityStatus] = useState("Active");
  const [editActivityJsFile, setEditActivityJsFile] = useState(ACTIVITY_FILES[0]);
  const [editActivityContentText, setEditActivityContentText] = useState("{}");
  const [submittingEditActivity, setSubmittingEditActivity] = useState(false);
  const [editActivityError, setEditActivityError] = useState("");
  const [activityMessage, setActivityMessage] = useState("");
  const [showActivityMessage, setShowActivityMessage] = useState(false);
  const [fadeActivityMessage, setFadeActivityMessage] = useState(false);

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

    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await fetch(`${API_URL}/activities`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setActivities(data);
      } else {
        setActivities([]);
      }
    } catch {
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (!studentMessage) {
      setShowStudentMessage(false);
      setFadeStudentMessage(false);
      return;
    }

    setShowStudentMessage(true);
    setFadeStudentMessage(false);

    const fadeTimer = setTimeout(() => {
      setFadeStudentMessage(true);
    }, 3500);

    const hideTimer = setTimeout(() => {
      setShowStudentMessage(false);
      setStudentMessage("");
      setFadeStudentMessage(false);
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [studentMessage]);

  useEffect(() => {
    if (!groupMessage) {
      setShowGroupMessage(false);
      setFadeGroupMessage(false);
      return;
    }

    setShowGroupMessage(true);
    setFadeGroupMessage(false);

    const fadeTimer = setTimeout(() => {
      setFadeGroupMessage(true);
    }, 3500);

    const hideTimer = setTimeout(() => {
      setShowGroupMessage(false);
      setGroupMessage("");
      setFadeGroupMessage(false);
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [groupMessage]);

  useEffect(() => {
    if (!activityMessage) {
      setShowActivityMessage(false);
      setFadeActivityMessage(false);
      return;
    }

    setShowActivityMessage(true);
    setFadeActivityMessage(false);

    const fadeTimer = setTimeout(() => {
      setFadeActivityMessage(true);
    }, 3500);

    const hideTimer = setTimeout(() => {
      setShowActivityMessage(false);
      setActivityMessage("");
      setFadeActivityMessage(false);
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [activityMessage]);

  const loadStudents = async () => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId("");
      return;
    }

    setLoadingStudents(true);
    try {
      const res = await fetch(`${API_URL}/students`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const filtered = data.filter((s) => String(s.class_id) === String(selectedClassId));
        setStudents(filtered);
        setSelectedStudentId((prev) =>
          filtered.some((student) => String(student.id) === String(prev)) ? prev : ""
        );
      } else {
        setStudents([]);
        setSelectedStudentId("");
      }
    } catch {
      setStudents([]);
      setSelectedStudentId("");
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadGroups = async () => {
    if (!selectedClassId) {
      setGroups([]);
      setSelectedGroupId("");
      return;
    }

    setLoadingGroups(true);
    try {
      const res = await fetch(`${API_URL}/groups?class_id=${encodeURIComponent(selectedClassId)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setGroups(data);
        setSelectedGroupId((prev) =>
          data.some((group) => String(group.id) === String(prev)) ? prev : ""
        );
      } else {
        setGroups([]);
        setSelectedGroupId("");
      }
    } catch {
      setGroups([]);
      setSelectedGroupId("");
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleToggleStudentsList = async () => {
    const next = !showStudentsList;
    setShowStudentsList(next);
    if (next) {
      await loadStudents();
    }
  };

  const handleToggleGroupsList = async () => {
    const next = !showGroupsList;
    setShowGroupsList(next);
    if (next) {
      await loadGroups();
    } else {
      setSelectedGroupId("");
      setSelectedAvailableStudentId("");
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    setSubmittingGroup(true);
    setGroupError("");
    setGroupMessage("");

    try {
      if (!selectedClassId) {
        throw new Error("Sélectionnez une classe avant d'ajouter un groupe");
      }

      if (!groupName.trim()) {
        throw new Error("Le nom du groupe est obligatoire");
      }

      const resp = await fetch(`${API_URL}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          class_id: Number(selectedClassId),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de l'ajout du groupe");
      }

      setGroupName("");
      setGroupMessage("Groupe ajouté");
      if (showGroupsList) {
        await loadGroups();
      }
    } catch (err) {
      setGroupError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingGroup(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSubmittingStudent(true);
    setStudentError("");
    setStudentMessage("");

    try {
      if (!selectedClassId) {
        throw new Error("Sélectionnez une classe avant d'ajouter un élève");
      }

      if (!studentName.trim() || !studentFirstname.trim()) {
        throw new Error("Les champs nom et prénom sont obligatoires");
      }

      const resp = await fetch(`${API_URL}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentName.trim(),
          firstname: studentFirstname.trim(),
          class_id: Number(selectedClassId),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de l'ajout de l'élève");
      }

      setStudentMessage("Élève ajouté");
      setStudentName("");
      setStudentFirstname("");
        await loadStudents();
    } catch (err) {
      setStudentError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingStudent(false);
    }
  };

  const deleteResultsForStudentId = async (studentId, existingResults) => {
    const results = Array.isArray(existingResults)
      ? existingResults
      : await (async () => {
          const res = await fetch(`${API_URL}/results`);
          const data = await res.json();
          if (!res.ok || !Array.isArray(data)) {
            throw new Error("Erreur lors du chargement des résultats");
          }
          return data;
        })();

    const linkedResults = results.filter((result) => String(result.student_id) === String(studentId));

    await Promise.all(
      linkedResults.map(async (result) => {
        const res = await fetch(`${API_URL}/results/${result.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erreur lors de la suppression des résultats associés");
        }
      })
    );
  };

  const handleDeleteStudent = async (student) => {
    const confirmed = window.confirm(
      `Supprimer ${student.firstname} ${student.name} et tous ses résultats associés ?`
    );
    if (!confirmed) return;

    setDeletingStudentId(String(student.id));
    setStudentError("");
    setStudentMessage("");

    try {
      await deleteResultsForStudentId(student.id);

      const res = await fetch(`${API_URL}/students/${student.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la suppression de l'élève");
      }

      setStudents((prev) => prev.filter((s) => String(s.id) !== String(student.id)));
      if (String(selectedStudentId) === String(student.id)) {
        setSelectedStudentId("");
      }

      if (String(selectedResultStudentId) === String(student.id)) {
        setSelectedResultStudentId("");
        setStudentResults([]);
        setSelectedResultId("");
      }

      await loadGroups();
      setStudentMessage("Élève supprimé");
    } catch (err) {
      setStudentError(err.message || "Erreur inconnue");
    } finally {
      setDeletingStudentId("");
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!selectedClassId || students.length === 0) return;

    const confirmed = window.confirm(
      "Supprimer tous les élèves de la classe active et tous leurs résultats associés ?"
    );
    if (!confirmed) return;

    setDeletingAllStudents(true);
    setStudentError("");
    setStudentMessage("");

    try {
      const resultsRes = await fetch(`${API_URL}/results`);
      const resultsData = await resultsRes.json();
      if (!resultsRes.ok || !Array.isArray(resultsData)) {
        throw new Error("Erreur lors du chargement des résultats");
      }

      for (const student of students) {
        await deleteResultsForStudentId(student.id, resultsData);

        const studentRes = await fetch(`${API_URL}/students/${student.id}`, { method: "DELETE" });
        const studentData = await studentRes.json();
        if (!studentRes.ok) {
          throw new Error(studentData.error || "Erreur lors de la suppression de tous les élèves");
        }
      }

      setStudents([]);
      setSelectedStudentId("");
      setSelectedResultStudentId("");
      setStudentResults([]);
      setSelectedResultId("");
      setSelectedGroupId("");
      await loadGroups();
      setStudentMessage("Tous les élèves de la classe active ont été supprimés");
    } catch (err) {
      setStudentError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllStudents(false);
    }
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(String(groupId));
    setSelectedAvailableStudentId("");
    setGroupError("");
  };

  const handleDeleteGroup = async (group) => {
    const confirmed = window.confirm(
      `Supprimer le groupe ${group.name} et retirer tous ses élèves du groupe ?`
    );
    if (!confirmed) return;

    setDeletingGroupId(String(group.id));
    setGroupError("");
    setGroupMessage("");

    try {
      const res = await fetch(`${API_URL}/groups/${group.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la suppression du groupe");
      }

      await Promise.all([loadGroups(), loadStudents()]);
      if (String(selectedGroupId) === String(group.id)) {
        setSelectedGroupId("");
        setSelectedAvailableStudentId("");
      }
      setGroupMessage("Groupe supprimé");
    } catch (err) {
      setGroupError(err.message || "Erreur inconnue");
    } finally {
      setDeletingGroupId("");
    }
  };

  const handleDeleteAllGroups = async () => {
    if (!selectedClassId || groups.length === 0) return;

    const confirmed = window.confirm(
      "Supprimer tous les groupes de la classe active et retirer les élèves de leurs groupes ?"
    );
    if (!confirmed) return;

    setDeletingAllGroups(true);
    setGroupError("");
    setGroupMessage("");

    try {
      await Promise.all(
        groups.map(async (group) => {
          const res = await fetch(`${API_URL}/groups/${group.id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Erreur lors de la suppression de tous les groupes");
          }
        })
      );

      await Promise.all([loadGroups(), loadStudents()]);
      setSelectedGroupId("");
      setSelectedAvailableStudentId("");
      setGroupMessage("Tous les groupes de la classe active ont été supprimés");
    } catch (err) {
      setGroupError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllGroups(false);
    }
  };

  const handleAssignStudentToGroup = async (e) => {
    e.preventDefault();
    if (!selectedGroupId || !selectedAvailableStudentId) return;

    setAssigningStudentToGroup(true);
    setGroupError("");
    setGroupMessage("");

    try {
      const res = await fetch(`${API_URL}/groups/${selectedGroupId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: Number(selectedAvailableStudentId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'ajout de l'élève au groupe");
      }

      await Promise.all([loadGroups(), loadStudents()]);
      setSelectedAvailableStudentId("");
      setGroupMessage("Élève ajouté au groupe");
    } catch (err) {
      setGroupError(err.message || "Erreur inconnue");
    } finally {
      setAssigningStudentToGroup(false);
    }
  };

  const handleRemoveStudentFromGroup = async (student) => {
    if (!selectedGroupId) return;

    setRemovingGroupStudentId(String(student.id));
    setGroupError("");
    setGroupMessage("");

    try {
      const res = await fetch(`${API_URL}/groups/${selectedGroupId}/students/${student.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du retrait de l'élève du groupe");
      }

      await Promise.all([loadGroups(), loadStudents()]);
      setGroupMessage("Élève retiré du groupe");
    } catch (err) {
      setGroupError(err.message || "Erreur inconnue");
    } finally {
      setRemovingGroupStudentId("");
    }
  };

  const handleRemoveAllStudentsFromGroup = async () => {
    if (!selectedGroupId) return;

    const confirmed = window.confirm("Retirer tous les élèves de ce groupe ?");
    if (!confirmed) return;

    setRemovingAllGroupStudents(true);
    setGroupError("");
    setGroupMessage("");

    try {
      const res = await fetch(`${API_URL}/groups/${selectedGroupId}/students`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du retrait de tous les élèves du groupe");
      }

      await Promise.all([loadGroups(), loadStudents()]);
      setGroupMessage("Le groupe a été vidé");
    } catch (err) {
      setGroupError(err.message || "Erreur inconnue");
    } finally {
      setRemovingAllGroupStudents(false);
    }
  };

  const loadResultsForStudent = async (studentId) => {
    if (!studentId) {
      setStudentResults([]);
      setSelectedResultId("");
      return;
    }

    setLoadingResults(true);
    setResultsError("");
    try {
      const res = await fetch(`${API_URL}/results`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        throw new Error("Erreur lors du chargement des résultats");
      }

      const filtered = data
        .filter((r) => String(r.student_id) === String(studentId))
        .sort((a, b) => {
          const dateA = new Date(a.completed_at || 0).getTime();
          const dateB = new Date(b.completed_at || 0).getTime();
          return dateB - dateA;
        });

      setStudentResults(filtered);
      setSelectedResultId("");
    } catch (err) {
      setStudentResults([]);
      setSelectedResultId("");
      setResultsError(err.message || "Erreur inconnue");
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    loadStudents();
    loadGroups();
    setSelectedStudentId("");
    setSelectedResultStudentId("");
    setStudentResults([]);
    setSelectedResultId("");
    setResultsError("");
    setSelectedGroupId("");
    setSelectedAvailableStudentId("");
    setGroupError("");
    setGroupMessage("");
  }, [selectedClassId]);

  useEffect(() => {
    loadResultsForStudent(selectedResultStudentId);
  }, [selectedResultStudentId]);

  const selectedGroup = groups.find((group) => String(group.id) === String(selectedGroupId));
  const groupStudents = students.filter(
    (student) => String(student.group_id) === String(selectedGroupId)
  );
  const availableStudents = students.filter(
    (student) => student.group_id === null || student.group_id === undefined || student.group_id === ""
  );

  const selectedResultStudent = students.find(
    (student) => String(student.id) === String(selectedResultStudentId)
  );

  const getActivityLabel = (activityId) => {
    const activity = activities.find((a) => String(a.id) === String(activityId));
    return activity ? activity.title : "Activité inconnue";
  };

  const handleDeleteResult = async (resultId) => {
    setDeletingResultId(String(resultId));
    setResultsError("");

    try {
      const res = await fetch(`${API_URL}/results/${resultId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la suppression du résultat");
      }

      setStudentResults((prev) => prev.filter((result) => String(result.id) !== String(resultId)));
      if (String(selectedResultId) === String(resultId)) {
        setSelectedResultId("");
      }
    } catch (err) {
      setResultsError(err.message || "Erreur inconnue");
    } finally {
      setDeletingResultId("");
    }
  };

  const handleDeleteAllResults = async () => {
    if (!selectedResultStudentId || studentResults.length === 0) return;

    const confirmed = window.confirm(
      "Confirmer la suppression de tous les résultats de cet élève ?"
    );
    if (!confirmed) return;

    setDeletingAllResults(true);
    setResultsError("");

    try {
      await Promise.all(
        studentResults.map(async (result) => {
          const res = await fetch(`${API_URL}/results/${result.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Erreur lors de la suppression de tous les résultats");
          }
        })
      );

      setStudentResults([]);
      setSelectedResultId("");
    } catch (err) {
      setResultsError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllResults(false);
    }
  };

  const getActivityTypeKey = (activityId) => {
    const activity = activities.find((a) => String(a.id) === String(activityId));
    if (!activity) return `activity-id:${activityId}`;
    if (activity.js_file && String(activity.js_file).trim()) {
      return `js-file:${String(activity.js_file).trim()}`;
    }
    return `activity-id:${activityId}`;
  };

  const normalizeActivityContentForEditor = (content) => {
    if (content === null || content === undefined || content === "") {
      return "{}";
    }

    if (typeof content === "string") {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    }

    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return "{}";
    }
  };

  const handleToggleActivitiesList = async () => {
    const next = !showActivitiesList;
    setShowActivitiesList(next);
    if (next) {
      await loadActivities();
    } else {
      setSelectedActivityEditId("");
      setEditActivityError("");
    }
  };

  const handleSelectActivityToEdit = (activity) => {
    setSelectedActivityEditId(String(activity.id));
    setEditActivityTitle(activity.title || "");
    setEditActivityDescription(activity.description || "");
    setEditActivityStatus(activity.status || "Active");
    setEditActivityJsFile(activity.js_file || ACTIVITY_FILES[0]);
    setEditActivityContentText(normalizeActivityContentForEditor(activity.content));
    setEditActivityError("");
    setActivityMessage("");
  };

  const handleUpdateActivity = async (e) => {
    e.preventDefault();
    setSubmittingEditActivity(true);
    setEditActivityError("");
    setActivityMessage("");

    try {
      if (!selectedActivityEditId) {
        throw new Error("Aucune activité sélectionnée");
      }

      if (!editActivityTitle.trim()) {
        throw new Error("Le titre de l'activité est obligatoire");
      }

      let parsedContent = {};
      if (editActivityContentText.trim()) {
        parsedContent = JSON.parse(editActivityContentText);
      }

      const resp = await fetch(`${API_URL}/activities/${selectedActivityEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editActivityTitle.trim(),
          description: editActivityDescription.trim(),
          content: parsedContent,
          status: editActivityStatus,
          js_file: editActivityJsFile || null,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la modification de l'activité");
      }

      setActivityMessage("Activité modifiée");
      setSelectedActivityEditId("");
      setEditActivityError("");
      await loadActivities();
    } catch (err) {
      setEditActivityError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingEditActivity(false);
    }
  };

  const handleCalculateAverage = async (selectedResult) => {
    setCalculatingAverageResultId(String(selectedResult.id));
    setResultsError("");

    try {
      const selectedTypeKey = getActivityTypeKey(selectedResult.activity_id);
      const sameTypeResults = studentResults.filter(
        (result) => getActivityTypeKey(result.activity_id) === selectedTypeKey
      );

      if (sameTypeResults.length === 0) {
        throw new Error("Aucun résultat du même type trouvé");
      }

      const totalScore = sameTypeResults.reduce((sum, result) => {
        const numericScore = Number(result.score);
        return sum + (Number.isNaN(numericScore) ? 0 : numericScore);
      }, 0);
      const averageScore = Math.round((totalScore / sameTypeResults.length) * 100) / 100;

      await Promise.all(
        sameTypeResults.map(async (result) => {
          const res = await fetch(`${API_URL}/results/${result.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Erreur lors de la suppression des résultats du même type");
          }
        })
      );

      const createRes = await fetch(`${API_URL}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: Number(selectedResultStudentId),
          activity_id: Number(selectedResult.activity_id),
          score: averageScore,
          completed_at: new Date().toISOString(),
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || "Erreur lors de la création du résultat moyen");
      }

      await loadResultsForStudent(selectedResultStudentId);
      setSelectedResultId("");
    } catch (err) {
      setResultsError(err.message || "Erreur inconnue");
    } finally {
      setCalculatingAverageResultId("");
    }
  };

  return (
    <div id="teacher-view-root" className="min-h-screen bg-slate-100 p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Espace Enseignant</h2>

      <div id="bloc-classe-active" className="w-full max-w-3xl bg-white rounded-xl shadow p-6 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Classe ciblée</label>
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

      <StudentsManagementPanel
        studentName={studentName}
        studentFirstname={studentFirstname}
        submittingStudent={submittingStudent}
        studentMessage={studentMessage}
        studentError={studentError}
        showStudentMessage={showStudentMessage}
        fadeStudentMessage={fadeStudentMessage}
        showStudentsList={showStudentsList}
        students={students}
        selectedClassId={selectedClassId}
        selectedStudentId={selectedStudentId}
        loadingStudents={loadingStudents}
        deletingAllStudents={deletingAllStudents}
        deletingStudentId={deletingStudentId}
        onStudentNameChange={setStudentName}
        onStudentFirstnameChange={setStudentFirstname}
        onAddStudent={handleAddStudent}
        onToggleStudentsList={handleToggleStudentsList}
        onSelectStudent={setSelectedStudentId}
        onDeleteStudent={handleDeleteStudent}
        onDeleteAllStudents={handleDeleteAllStudents}
      />

      <GroupManagementPanel
        groupName={groupName}
        submittingGroup={submittingGroup}
        groupMessage={groupMessage}
        groupError={groupError}
        showGroupMessage={showGroupMessage}
        fadeGroupMessage={fadeGroupMessage}
        showGroupsList={showGroupsList}
        groups={groups}
        selectedClassId={selectedClassId}
        selectedGroupId={selectedGroupId}
        selectedGroup={selectedGroup}
        loadingGroups={loadingGroups}
        deletingAllGroups={deletingAllGroups}
        deletingGroupId={deletingGroupId}
        availableStudents={availableStudents}
        selectedAvailableStudentId={selectedAvailableStudentId}
        assigningStudentToGroup={assigningStudentToGroup}
        groupStudents={groupStudents}
        removingGroupStudentId={removingGroupStudentId}
        removingAllGroupStudents={removingAllGroupStudents}
        onGroupNameChange={setGroupName}
        onAddGroup={handleAddGroup}
        onToggleGroupsList={handleToggleGroupsList}
        onSelectGroup={handleSelectGroup}
        onDeleteGroup={handleDeleteGroup}
        onDeleteAllGroups={handleDeleteAllGroups}
        onSelectedAvailableStudentChange={setSelectedAvailableStudentId}
        onAssignStudentToGroup={handleAssignStudentToGroup}
        onRemoveStudentFromGroup={handleRemoveStudentFromGroup}
        onRemoveAllStudentsFromGroup={handleRemoveAllStudentsFromGroup}
      />

      <ResultsManagementPanel
        selectedClassId={selectedClassId}
        selectedResultStudentId={selectedResultStudentId}
        selectedResultId={selectedResultId}
        students={students}
        studentResults={studentResults}
        selectedResultStudent={selectedResultStudent}
        loadingResults={loadingResults}
        resultsError={resultsError}
        deletingAllResults={deletingAllResults}
        deletingResultId={deletingResultId}
        calculatingAverageResultId={calculatingAverageResultId}
        onSelectResultStudent={setSelectedResultStudentId}
        onSelectResult={setSelectedResultId}
        onCalculateAverage={handleCalculateAverage}
        onDeleteResult={handleDeleteResult}
        onDeleteAllResults={handleDeleteAllResults}
        getActivityLabel={getActivityLabel}
      />

      <div id="zone-gestion-activites" className="w-full flex flex-col lg:flex-row gap-6 mb-6">
        <ActivitiesManagementPanel
          activities={activities}
          loadingActivities={loadingActivities}
          showActivitiesList={showActivitiesList}
          selectedActivityEditId={selectedActivityEditId}
          editActivityTitle={editActivityTitle}
          editActivityDescription={editActivityDescription}
          editActivityStatus={editActivityStatus}
          editActivityJsFile={editActivityJsFile}
          editActivityContentText={editActivityContentText}
          submittingEditActivity={submittingEditActivity}
          editActivityError={editActivityError}
          activityMessage={activityMessage}
          showActivityMessage={showActivityMessage}
          fadeActivityMessage={fadeActivityMessage}
          onToggleActivitiesList={handleToggleActivitiesList}
          onSelectActivityToEdit={handleSelectActivityToEdit}
          onUpdateActivity={handleUpdateActivity}
          onEditTitleChange={setEditActivityTitle}
          onEditDescriptionChange={setEditActivityDescription}
          onEditStatusChange={setEditActivityStatus}
          onEditJsFileChange={setEditActivityJsFile}
          onEditContentChange={setEditActivityContentText}
        />
      </div>

      <StudentsImportExportPanel
        title="Import / Export des élèves (Enseignant)"
        selectedClassId={selectedClassId}
        requireClassSelection
      />
    </div>
  );
};

export default TeacherView;
