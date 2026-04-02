import React, { useEffect, useState } from "react";
import StudentsImportExportPanel from "../components/StudentsImportExportPanel";
import GlobalImportExportPanel from "../components/GlobalImportExportPanel";
import ActivitiesManagementPanel from "../components/ActivitiesManagementPanel";
import TeachersManagementPanel from "../components/TeachersManagementPanel";
import ClassesManagementPanel from "../components/ClassesManagementPanel";
import { defaultSortNumbersActivityContent } from "../activities/SortNumbersActivity";
import { defaultMatchAdditionsActivityContent } from "../activities/MatchAdditionsActivity";
import { defaultCountPencilsByTensActivityContent } from "../activities/CountPencilsByTensActivity";
import { defaultInteractiveWhiteboardActivityContent } from "../activities/InteractiveWhiteboardActivity";

const API_URL = "http://localhost:4000/api";
const ACTIVITY_FILES = [
  "src/activities/SortNumbersActivity.js",
  "src/activities/MatchAdditionsActivity.js",
  "src/activities/CountPencilsByTensActivity.js",
  "src/activities/InteractiveWhiteboardActivity.js",
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

  if (jsFile === "src/activities/InteractiveWhiteboardActivity.js") {
    return JSON.stringify(defaultInteractiveWhiteboardActivityContent, null, 2);
  }

  return "{}";
}

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
  const [showActivityMessage, setShowActivityMessage] = useState(false);
  const [fadeActivityMessage, setFadeActivityMessage] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [selectedActivityEditId, setSelectedActivityEditId] = useState("");
  const [editActivityTitle, setEditActivityTitle] = useState("");
  const [editActivityDescription, setEditActivityDescription] = useState("");
  const [editActivityStatus, setEditActivityStatus] = useState("Active");
  const [editActivityJsFile, setEditActivityJsFile] = useState(ACTIVITY_FILES[0]);
  const [editActivityContentText, setEditActivityContentText] = useState("{}");
  const [submittingEditActivity, setSubmittingEditActivity] = useState(false);
  const [editActivityError, setEditActivityError] = useState("");

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [showTeachersList, setShowTeachersList] = useState(false);
  const [showClassesList, setShowClassesList] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch(`${API_URL}/classes`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setClasses(data);
      } else {
        setClasses([]);
      }
    } catch {
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

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

  const loadTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await fetch(`${API_URL}/teachers`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setTeachers(data);
      } else {
        setTeachers([]);
      }
    } catch {
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    loadClasses();
    loadTeachers();
    loadActivities();
  }, []);

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

  const handleToggleTeachersList = async () => {
    const next = !showTeachersList;
    setShowTeachersList(next);
    if (next) {
      await loadClasses();
      await loadTeachers();
    }
  };

  const handleToggleClassesList = async () => {
    const next = !showClassesList;
    setShowClassesList(next);
    if (next) {
      await loadClasses();
      await loadTeachers();
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
      setSelectedActivityEditId("");
      setEditActivityError("");
      await loadActivities();
    } catch (err) {
      setEditActivityError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingEditActivity(false);
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
      await loadClasses();
      await loadTeachers();
      if (showTeachersList) {
        await loadTeachers();
      }
    } catch (err) {
      setTeacherError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingTeacher(false);
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
      await loadClasses();
      if (showClassesList) {
        await loadClasses();
      }
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
      await loadActivities();
    } catch (err) {
      setActivityError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingActivity(false);
    }
  };

  return (
    <div id="admin-view-root" className="min-h-screen bg-slate-100 p-6">
      <h2 id="admin-view-title" className="text-2xl font-bold text-slate-800 mb-6">Tableau de bord Administrateur</h2>

      <TeachersManagementPanel
        teacherName={teacherName}
        teacherEmail={teacherEmail}
        teacherPassword={teacherPassword}
        teacherSelectedClassId={teacherSelectedClassId}
        submittingTeacher={submittingTeacher}
        teacherMessage={teacherMessage}
        teacherError={teacherError}
        showTeachersList={showTeachersList}
        teachers={teachers}
        classes={classes}
        loadingTeachers={loadingTeachers}
        onTeacherNameChange={setTeacherName}
        onTeacherEmailChange={setTeacherEmail}
        onTeacherPasswordChange={setTeacherPassword}
        onTeacherSelectedClassIdChange={setTeacherSelectedClassId}
        onAddTeacher={handleAddTeacher}
        onToggleTeachersList={handleToggleTeachersList}
      />

      <ClassesManagementPanel
        className={className}
        classTeacherId={classTeacherId}
        submittingClass={submittingClass}
        classMessage={classMessage}
        classError={classError}
        showClassesList={showClassesList}
        classes={classes}
        teachers={teachers}
        loadingClasses={loadingClasses}
        onClassNameChange={setClassName}
        onClassTeacherIdChange={setClassTeacherId}
        onAddClass={handleAddClass}
        onToggleClassesList={handleToggleClassesList}
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
        onToggleActivitiesList={handleToggleActivitiesList}
        onSelectActivityToEdit={handleSelectActivityToEdit}
        onUpdateActivity={handleUpdateActivity}
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

      <GlobalImportExportPanel />

      <StudentsImportExportPanel title="Import / Export des élèves (Admin)" />
    </div>
  );
};

export default AdminView;
