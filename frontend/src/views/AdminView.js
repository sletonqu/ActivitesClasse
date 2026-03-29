import React, { useEffect, useState } from "react";
import StudentsImportExportPanel from "../components/StudentsImportExportPanel";
import GlobalImportExportPanel from "../components/GlobalImportExportPanel";

const API_URL = "http://localhost:4000/api";
const ACTIVITY_FILES = [
  "src/activities/SortNumbersActivity.js",
  "src/activities/MatchAdditionsActivity.js",
];

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
  const [activityContentText, setActivityContentText] = useState('{"numbers":[8,2,5,1,7]}');
  const [activities, setActivities] = useState([]);
  const [showActivitiesList, setShowActivitiesList] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [activityMessage, setActivityMessage] = useState("");
  const [activityError, setActivityError] = useState("");

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
      setActivityContentText('{"numbers":[8,2,5,1,7]}');
      await loadActivities();
    } catch (err) {
      setActivityError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingActivity(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Tableau de bord Administrateur</h2>

      <div className="w-full flex flex-col lg:flex-row gap-6 mb-6">
        <section className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Gestion des enseignants</h3>

        <form onSubmit={handleAddTeacher} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ex: Mme Martin"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ex: martin@ecole.local"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Mot de passe"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Associer à une classe</label>
            <select
              value={teacherSelectedClassId}
              onChange={(e) => setTeacherSelectedClassId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Aucune (null)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (ID: {cls.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submittingTeacher}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
            >
              {submittingTeacher ? "Ajout en cours..." : "Ajouter"}
            </button>

            <button
              type="button"
              onClick={handleToggleTeachersList}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {showTeachersList ? "Masquer la Liste des Enseignants" : "Liste des Enseignants"}
            </button>
          </div>
        </form>

        {teacherMessage && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
            {teacherMessage}
          </div>
        )}

        {teacherError && (
          <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
            {teacherError}
          </div>
        )}
        </section>

        {showTeachersList && (
          <section className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Liste des Enseignants</h3>

            {loadingTeachers ? (
              <p className="text-slate-500 text-sm">Chargement...</p>
            ) : teachers.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucun enseignant trouvé.</p>
            ) : (
              <ul className="space-y-3">
                {teachers.map((teacher) => {
                  const linkedClasses = classes.filter((c) => Number(c.teacher_id) === Number(teacher.id));
                  const classesText =
                    linkedClasses.length > 0
                      ? linkedClasses.map((c) => c.name).join(", ")
                      : "Aucune";

                  return (
                    <li key={teacher.id} className="border border-slate-200 rounded-lg p-3">
                      <p className="font-semibold text-slate-800">{teacher.name}</p>
                      <p className="text-sm text-slate-600">Classe associée: {classesText}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-6 mb-6">
        <section className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Gestion des classes</h3>

          <form onSubmit={handleAddClass} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de la classe</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Ex: CM1 A"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Enseignant associé (teacher_id)</label>
              <select
                value={classTeacherId}
                onChange={(e) => setClassTeacherId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">Aucun (null)</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} (ID: {teacher.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingClass}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
              >
                {submittingClass ? "Ajout en cours..." : "Ajouter"}
              </button>

              <button
                type="button"
                onClick={handleToggleClassesList}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {showClassesList ? "Masquer la Liste des classes" : "Liste des classes"}
              </button>
            </div>
          </form>

          {classMessage && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              {classMessage}
            </div>
          )}

          {classError && (
            <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {classError}
            </div>
          )}
        </section>

        {showClassesList && (
          <section className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Liste des classes</h3>

            {loadingClasses ? (
              <p className="text-slate-500 text-sm">Chargement...</p>
            ) : classes.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucune classe trouvée.</p>
            ) : (
              <ul className="space-y-3">
                {classes.map((cls) => {
                  const linkedTeacher = teachers.find((t) => Number(t.id) === Number(cls.teacher_id));
                  const teacherText = linkedTeacher ? linkedTeacher.name : "Aucun";

                  return (
                    <li key={cls.id} className="border border-slate-200 rounded-lg p-3">
                      <p className="font-semibold text-slate-800">{cls.name}</p>
                      <p className="text-sm text-slate-600">Enseignant associé: {teacherText}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-6 mb-6">
        <section className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Gestion des activités</h3>

          <form onSubmit={handleAddActivity} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Titre</label>
              <input
                type="text"
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Ex: Nombres croissants"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Description de l'activité"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Statut</label>
              <select
                value={activityStatus}
                onChange={(e) => setActivityStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Fichier JS de l'activité</label>
              <select
                value={activityJsFile}
                onChange={(e) => setActivityJsFile(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {ACTIVITY_FILES.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contenu JSON</label>
              <textarea
                value={activityContentText}
                onChange={(e) => setActivityContentText(e.target.value)}
                className="w-full h-32 border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingActivity}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
              >
                {submittingActivity ? "Ajout en cours..." : "Ajouter"}
              </button>

              <button
                type="button"
                onClick={handleToggleActivitiesList}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {showActivitiesList ? "Masquer la Liste des activités" : "Liste des activités"}
              </button>
            </div>
          </form>

          {activityMessage && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              {activityMessage}
            </div>
          )}

          {activityError && (
            <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              {activityError}
            </div>
          )}
        </section>

        {showActivitiesList && (
          <section className="w-full lg:w-1/2 bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Liste des activités</h3>

            {loadingActivities ? (
              <p className="text-slate-500 text-sm">Chargement...</p>
            ) : activities.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucune activité trouvée.</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((activity) => (
                  <li key={activity.id} className="border border-slate-200 rounded-lg p-3">
                    <p className="font-semibold text-slate-800">{activity.title}</p>
                    <p className="text-sm text-slate-600">Statut: {activity.status || "Non défini"}</p>
                    <p className="text-sm text-slate-600">Fichier: {activity.js_file || "Aucun"}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <GlobalImportExportPanel />

      <StudentsImportExportPanel title="Import / Export des élèves (Admin)" />
    </div>
  );
};

export default AdminView;
