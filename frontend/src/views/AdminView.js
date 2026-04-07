import React, { useEffect, useState } from "react";
import StudentsImportExportPanel from "../components/StudentsImportExportPanel";
import GlobalImportExportPanel from "../components/GlobalImportExportPanel";
import ActivitiesManagementPanel from "../components/ActivitiesManagementPanel";
import TeachersManagementPanel from "../components/TeachersManagementPanel";
import ClassesManagementPanel from "../components/ClassesManagementPanel";
import SystemUpdatePanel from "../components/SystemUpdatePanel";
import WordsManagementPanel from "../components/WordsManagementPanel";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";
import {
  fetchGroupsByClass,
  fetchResults,
  fetchStudents,
  loadActivitiesIntoState,
  loadClassesIntoState,
  loadTeachersIntoState,
} from "../utils/dataLoaders";
import {
  ACTIVITY_FILES,
  getDefaultActivityContentText,
  normalizeActivityContentForEditor,
} from "../utils/activityManagement";

const AdminView = () => {
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherSelectedClassId, setTeacherSelectedClassId] = useState("");
  const [submittingTeacher, setSubmittingTeacher] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState("");
  const [teacherError, setTeacherError] = useState("");

  const [className, setClassName] = useState("");
  const [classTeacherId, setClassTeacherId] = useState("");
  const [submittingClass, setSubmittingClass] = useState(false);
  const [classMessage, setClassMessage] = useState("");
  const [classError, setClassError] = useState("");

  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityStatus, setActivityStatus] = useState("Active");
  const [activityJsFile, setActivityJsFile] = useState(ACTIVITY_FILES[0]);
  const [activityContentText, setActivityContentText] = useState(
    getDefaultActivityContentText(ACTIVITY_FILES[0])
  );
  const [activities, setActivities] = useState([]);
  const [showActivitiesList, setShowActivitiesList] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [activityMessage, setActivityMessage] = useState("");
  const [activityError, setActivityError] = useState("");
  const [selectedActivityEditId, setSelectedActivityEditId] = useState("");
  const [editActivityTitle, setEditActivityTitle] = useState("");
  const [editActivityDescription, setEditActivityDescription] = useState("");
  const [editActivityStatus, setEditActivityStatus] = useState("Active");
  const [editActivityJsFile, setEditActivityJsFile] = useState(ACTIVITY_FILES[0]);
  const [editActivityContentText, setEditActivityContentText] = useState("{}");
  const [submittingEditActivity, setSubmittingEditActivity] = useState(false);
  const [editActivityError, setEditActivityError] = useState("");
  const [deletingAllActivities, setDeletingAllActivities] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState("");

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [showTeachersList, setShowTeachersList] = useState(false);
  const [showClassesList, setShowClassesList] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [deletingTeacherId, setDeletingTeacherId] = useState("");
  const [deletingAllTeachers, setDeletingAllTeachers] = useState(false);
  const [selectedClassListId, setSelectedClassListId] = useState("");
  const [deletingClassId, setDeletingClassId] = useState("");
  const [deletingAllClasses, setDeletingAllClasses] = useState(false);

  const { show: showTeacherMessage, fade: fadeTeacherMessage } = useAutoDismissMessage(
    teacherMessage,
    setTeacherMessage
  );
  const { show: showClassMessage, fade: fadeClassMessage } = useAutoDismissMessage(
    classMessage,
    setClassMessage
  );
  const { show: showActivityMessage, fade: fadeActivityMessage } = useAutoDismissMessage(
    activityMessage,
    setActivityMessage
  );

  const refreshAdminData = async () => {
    await Promise.all([
      loadClassesIntoState(setClasses, setLoadingClasses),
      loadTeachersIntoState(setTeachers, setLoadingTeachers),
    ]);
  };

  const refreshActivities = async () => {
    await loadActivitiesIntoState(setActivities, setLoadingActivities);
  };

  const resetActivityEditor = () => {
    setSelectedActivityEditId("");
    setEditActivityTitle("");
    setEditActivityDescription("");
    setEditActivityStatus("Active");
    setEditActivityJsFile(ACTIVITY_FILES[0]);
    setEditActivityContentText(getDefaultActivityContentText(ACTIVITY_FILES[0]));
    setEditActivityError("");
  };

  useEffect(() => {
    refreshAdminData();
    refreshActivities();
  }, []);

  useEffect(() => {
    setSelectedTeacherId((prev) =>
      teachers.some((teacher) => String(teacher.id) === String(prev)) ? prev : ""
    );
  }, [teachers]);

  useEffect(() => {
    setSelectedClassListId((prev) =>
      classes.some((cls) => String(cls.id) === String(prev)) ? prev : ""
    );

    setTeacherSelectedClassId((prev) =>
      classes.some((cls) => String(cls.id) === String(prev)) ? prev : ""
    );
  }, [classes]);

  const handleToggleTeachersList = async () => {
    const next = !showTeachersList;
    setShowTeachersList(next);
    if (next) {
      await refreshAdminData();
    } else {
      setSelectedTeacherId("");
    }
  };

  const handleToggleClassesList = async () => {
    const next = !showClassesList;
    setShowClassesList(next);
    if (next) {
      await refreshAdminData();
    } else {
      setSelectedClassListId("");
    }
  };

  const handleToggleActivitiesList = async () => {
    const next = !showActivitiesList;
    setShowActivitiesList(next);
    if (next) {
      await refreshActivities();
    } else {
      resetActivityEditor();
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
    setActivityError("");
  };

  const handleUpdateActivity = async (e) => {
    e.preventDefault();
    setSubmittingEditActivity(true);
    setEditActivityError("");
    setActivityMessage("");
    setActivityError("");

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
      resetActivityEditor();
      await refreshActivities();
    } catch (err) {
      setEditActivityError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingEditActivity(false);
    }
  };

  const handleDeleteActivity = async (activity) => {
    if (!activity?.id) {
      return;
    }

    const confirmDelete = window.confirm(
      `Supprimer l'activité "${activity.title || "Sans titre"}" et ses résultats associés ?`
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingActivityId(String(activity.id));
    setActivityError("");
    setEditActivityError("");
    setActivityMessage("");

    try {
      const resp = await fetch(`${API_URL}/activities/${activity.id}`, {
        method: "DELETE",
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la suppression de l'activité");
      }

      if (String(selectedActivityEditId) === String(activity.id)) {
        resetActivityEditor();
      }

      setActivityMessage("Activité supprimée");
      await refreshActivities();
    } catch (err) {
      setActivityError(err.message || "Erreur inconnue");
    } finally {
      setDeletingActivityId("");
    }
  };

  const handleDeleteAllActivities = async () => {
    if (activities.length === 0) {
      return;
    }

    const confirmDelete = window.confirm(
      "Supprimer toutes les activités et tous les résultats associés ?"
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingAllActivities(true);
    setDeletingActivityId("");
    setActivityError("");
    setEditActivityError("");
    setActivityMessage("");

    try {
      const resp = await fetch(`${API_URL}/activities`, {
        method: "DELETE",
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la suppression des activités");
      }

      resetActivityEditor();
      setActivityMessage("Toutes les activités ont été supprimées");
      await refreshActivities();
    } catch (err) {
      setActivityError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllActivities(false);
    }
  };

  const handleSelectTeacher = (teacherId) => {
    setSelectedTeacherId((prev) => (String(prev) === String(teacherId) ? "" : String(teacherId)));
  };

  const unlinkTeacherFromClasses = async (teacherId) => {
    const linkedClasses = classes.filter((cls) => String(cls.teacher_id) === String(teacherId));

    for (const cls of linkedClasses) {
      const resp = await fetch(`${API_URL}/classes/${cls.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cls.name,
          teacher_id: null,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || `Erreur lors de la dissociation de la classe ${cls.name}`);
      }
    }
  };

  const deleteTeacherWithCleanup = async (teacherId) => {
    await unlinkTeacherFromClasses(teacherId);

    const resp = await fetch(`${API_URL}/teachers/${teacherId}`, {
      method: "DELETE",
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || "Erreur lors de la suppression de l'enseignant");
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    if (!teacher?.id) {
      return;
    }

    const confirmDelete = window.confirm(
      `Supprimer l'enseignant ${teacher.name} et le dissocier de ses classes ?`
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingTeacherId(String(teacher.id));
    setTeacherError("");
    setTeacherMessage("");

    try {
      await deleteTeacherWithCleanup(teacher.id);
      setSelectedTeacherId((prev) => (String(prev) === String(teacher.id) ? "" : prev));
      setClassTeacherId((prev) => (String(prev) === String(teacher.id) ? "" : prev));
      await refreshAdminData();
      setTeacherMessage("Enseignant supprimé");
    } catch (err) {
      setTeacherError(err.message || "Erreur inconnue");
    } finally {
      setDeletingTeacherId("");
    }
  };

  const handleDeleteAllTeachers = async () => {
    if (teachers.length === 0) {
      return;
    }

    const confirmDelete = window.confirm(
      "Supprimer tous les enseignants et les dissocier de leurs classes ?"
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingAllTeachers(true);
    setTeacherError("");
    setTeacherMessage("");

    try {
      for (const teacher of teachers) {
        await deleteTeacherWithCleanup(teacher.id);
      }

      setSelectedTeacherId("");
      setClassTeacherId("");
      await refreshAdminData();
      setTeacherMessage("Tous les enseignants ont été supprimés");
    } catch (err) {
      setTeacherError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllTeachers(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setSubmittingTeacher(true);
    setTeacherError("");
    setTeacherMessage("");

    try {
      if (!teacherName.trim() || !teacherEmail.trim() || !teacherPassword.trim()) {
        throw new Error("Les champs nom, email et mot de passe sont obligatoires");
      }

      const createTeacherResp = await fetch(`${API_URL}/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teacherName.trim(),
          email: teacherEmail.trim(),
          password: teacherPassword,
        }),
      });

      const createTeacherData = await createTeacherResp.json();
      if (!createTeacherResp.ok) {
        throw new Error(createTeacherData.error || "Erreur lors de la création de l'enseignant");
      }

      const teacherId = createTeacherData.id;

      if (teacherSelectedClassId) {
        const selectedClass = classes.find((c) => String(c.id) === String(teacherSelectedClassId));
        if (!selectedClass) {
          throw new Error("Classe sélectionnée introuvable");
        }

        const assignResp = await fetch(`${API_URL}/classes/${teacherSelectedClassId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedClass.name,
            teacher_id: teacherId,
          }),
        });

        const assignData = await assignResp.json();
        if (!assignResp.ok) {
          throw new Error(assignData.error || "Enseignant créé, mais association à la classe échouée");
        }
      }

      setTeacherMessage(teacherSelectedClassId ? "Enseignant créé et associé à la classe" : "Enseignant créé");
      setTeacherName("");
      setTeacherEmail("");
      setTeacherPassword("");
      setTeacherSelectedClassId("");
      await refreshAdminData();
    } catch (err) {
      setTeacherError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingTeacher(false);
    }
  };

  const handleSelectClass = (classId) => {
    setSelectedClassListId((prev) => (String(prev) === String(classId) ? "" : String(classId)));
  };

  const deleteResultsForStudentIds = async (studentIds, existingResults) => {
    const normalizedStudentIds = studentIds.map((studentId) => String(studentId));
    if (normalizedStudentIds.length === 0) {
      return;
    }

    const resultsData = Array.isArray(existingResults) ? existingResults : await fetchResults();
    const linkedResults = resultsData.filter((result) =>
      normalizedStudentIds.includes(String(result.student_id))
    );

    for (const result of linkedResults) {
      const resp = await fetch(`${API_URL}/results/${result.id}`, { method: "DELETE" });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la suppression des résultats associés");
      }
    }
  };

  const deleteClassWithCleanup = async (cls, existingStudents, existingResults) => {
    const studentsData = Array.isArray(existingStudents) ? existingStudents : await fetchStudents();
    const classStudents = studentsData.filter(
      (student) => String(student.class_id) === String(cls.id)
    );

    await deleteResultsForStudentIds(
      classStudents.map((student) => student.id),
      existingResults
    );

    const classGroups = await fetchGroupsByClass(cls.id);
    for (const group of classGroups) {
      const groupResp = await fetch(`${API_URL}/groups/${group.id}`, { method: "DELETE" });
      const groupData = await groupResp.json();
      if (!groupResp.ok) {
        throw new Error(groupData.error || "Erreur lors de la suppression des groupes associés");
      }
    }

    for (const student of classStudents) {
      const studentResp = await fetch(`${API_URL}/students/${student.id}`, { method: "DELETE" });
      const studentData = await studentResp.json();
      if (!studentResp.ok) {
        throw new Error(studentData.error || "Erreur lors de la suppression des élèves associés");
      }
    }

    const classResp = await fetch(`${API_URL}/classes/${cls.id}`, { method: "DELETE" });
    const classData = await classResp.json();
    if (!classResp.ok) {
      throw new Error(classData.error || "Erreur lors de la suppression de la classe");
    }
  };

  const handleDeleteClass = async (cls) => {
    if (!cls?.id) {
      return;
    }

    const confirmDelete = window.confirm(
      `Supprimer la classe ${cls.name} ainsi que ses groupes, ses élèves et leurs résultats ?`
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingClassId(String(cls.id));
    setClassError("");
    setClassMessage("");

    try {
      await deleteClassWithCleanup(cls);
      setSelectedClassListId((prev) => (String(prev) === String(cls.id) ? "" : prev));
      setTeacherSelectedClassId((prev) => (String(prev) === String(cls.id) ? "" : prev));
      await refreshAdminData();
      setClassMessage("Classe supprimée");
    } catch (err) {
      setClassError(err.message || "Erreur inconnue");
    } finally {
      setDeletingClassId("");
    }
  };

  const handleDeleteAllClasses = async () => {
    if (classes.length === 0) {
      return;
    }

    const confirmDelete = window.confirm(
      "Supprimer toutes les classes, tous les groupes, tous les élèves et tous leurs résultats ?"
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingAllClasses(true);
    setClassError("");
    setClassMessage("");

    try {
      const [studentsData, resultsData] = await Promise.all([fetchStudents(), fetchResults()]);

      for (const cls of classes) {
        await deleteClassWithCleanup(cls, studentsData, resultsData);
      }

      setSelectedClassListId("");
      setTeacherSelectedClassId("");
      await refreshAdminData();
      setClassMessage("Toutes les classes ont été supprimées");
    } catch (err) {
      setClassError(err.message || "Erreur inconnue");
    } finally {
      setDeletingAllClasses(false);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    setSubmittingClass(true);
    setClassError("");
    setClassMessage("");

    try {
      if (!className.trim()) {
        throw new Error("Le nom de la classe est obligatoire");
      }

      const payloadTeacherId = classTeacherId === "" ? null : Number(classTeacherId);
      if (payloadTeacherId !== null && Number.isNaN(payloadTeacherId)) {
        throw new Error("teacher_id invalide");
      }

      const createClassResp = await fetch(`${API_URL}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: className.trim(),
          teacher_id: payloadTeacherId,
        }),
      });

      const createClassData = await createClassResp.json();
      if (!createClassResp.ok) {
        throw new Error(createClassData.error || "Erreur lors de la création de la classe");
      }

      setClassMessage("Classe créée");
      setClassName("");
      setClassTeacherId("");
      await refreshAdminData();
    } catch (err) {
      setClassError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingClass(false);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    setSubmittingActivity(true);
    setActivityError("");
    setActivityMessage("");

    try {
      if (!activityTitle.trim()) {
        throw new Error("Le titre de l'activité est obligatoire");
      }

      let parsedContent = {};
      if (activityContentText.trim()) {
        parsedContent = JSON.parse(activityContentText);
      }

      const resp = await fetch(`${API_URL}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activityTitle.trim(),
          description: activityDescription.trim(),
          content: parsedContent,
          status: activityStatus,
          js_file: activityJsFile || null,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la création de l'activité");
      }

      setActivityMessage("Activité créée");
      setActivityTitle("");
      setActivityDescription("");
      setActivityStatus("Active");
      setActivityJsFile(ACTIVITY_FILES[0]);
      setActivityContentText(getDefaultActivityContentText(ACTIVITY_FILES[0]));
      await refreshActivities();
    } catch (err) {
      setActivityError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingActivity(false);
    }
  };

  return (
    <div id="admin-view-root" className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="w-full max-w-[1024px] mx-auto">
        <h2 id="admin-view-title" className="text-2xl font-bold text-slate-800 mb-6">Tableau de bord Administrateur</h2>

        <TeachersManagementPanel
        teacherName={teacherName}
        teacherEmail={teacherEmail}
        teacherPassword={teacherPassword}
        teacherSelectedClassId={teacherSelectedClassId}
        submittingTeacher={submittingTeacher}
        teacherMessage={teacherMessage}
        teacherError={teacherError}
        showTeacherMessage={showTeacherMessage}
        fadeTeacherMessage={fadeTeacherMessage}
        showTeachersList={showTeachersList}
        teachers={teachers}
        classes={classes}
        loadingTeachers={loadingTeachers}
        selectedTeacherId={selectedTeacherId}
        deletingTeacherId={deletingTeacherId}
        deletingAllTeachers={deletingAllTeachers}
        onTeacherNameChange={setTeacherName}
        onTeacherEmailChange={setTeacherEmail}
        onTeacherPasswordChange={setTeacherPassword}
        onTeacherSelectedClassIdChange={setTeacherSelectedClassId}
        onAddTeacher={handleAddTeacher}
        onToggleTeachersList={handleToggleTeachersList}
        onSelectTeacher={handleSelectTeacher}
        onDeleteTeacher={handleDeleteTeacher}
        onDeleteAllTeachers={handleDeleteAllTeachers}
      />

      <ClassesManagementPanel
        className={className}
        classTeacherId={classTeacherId}
        submittingClass={submittingClass}
        classMessage={classMessage}
        classError={classError}
        showClassMessage={showClassMessage}
        fadeClassMessage={fadeClassMessage}
        showClassesList={showClassesList}
        classes={classes}
        teachers={teachers}
        loadingClasses={loadingClasses}
        selectedClassId={selectedClassListId}
        deletingClassId={deletingClassId}
        deletingAllClasses={deletingAllClasses}
        onClassNameChange={setClassName}
        onClassTeacherIdChange={setClassTeacherId}
        onAddClass={handleAddClass}
        onToggleClassesList={handleToggleClassesList}
        onSelectClass={handleSelectClass}
        onDeleteClass={handleDeleteClass}
        onDeleteAllClasses={handleDeleteAllClasses}
      />

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
        deletingAllActivities={deletingAllActivities}
        deletingActivityId={deletingActivityId}
        onToggleActivitiesList={handleToggleActivitiesList}
        onSelectActivityToEdit={handleSelectActivityToEdit}
        onUpdateActivity={handleUpdateActivity}
        onDeleteActivity={handleDeleteActivity}
        onDeleteAllActivities={handleDeleteAllActivities}
        onEditTitleChange={setEditActivityTitle}
        onEditDescriptionChange={setEditActivityDescription}
        onEditStatusChange={setEditActivityStatus}
        onEditJsFileChange={setEditActivityJsFile}
        onEditContentChange={setEditActivityContentText}
        showAddForm={true}
        activityTitle={activityTitle}
        activityDescription={activityDescription}
        activityStatus={activityStatus}
        activityJsFile={activityJsFile}
        activityContentText={activityContentText}
        submittingActivity={submittingActivity}
        activityError={activityError}
        onAddActivity={handleAddActivity}
        onActivityTitleChange={setActivityTitle}
        onActivityDescriptionChange={setActivityDescription}
        onActivityStatusChange={setActivityStatus}
        onActivityJsFileChange={(nextJsFile) => {
          setActivityJsFile(nextJsFile);
          setActivityContentText(getDefaultActivityContentText(nextJsFile));
        }}
        onActivityContentChange={setActivityContentText}
      />

        <WordsManagementPanel />

        <SystemUpdatePanel />

        <GlobalImportExportPanel />

        <StudentsImportExportPanel title="Import / Export des élèves (Admin)" />
      </div>
    </div>
  );
};

export default AdminView;
