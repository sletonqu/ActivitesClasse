import { API_URL } from "../config/api";

export async function fetchArrayFromApi(endpoint, errorMessage = "Erreur lors du chargement des données") {
  const response = await fetch(`${API_URL}${endpoint}`);
  const data = await response.json();

  if (!response.ok || !Array.isArray(data)) {
    throw new Error(errorMessage);
  }

  return data;
}

export async function loadCollectionIntoState(
  endpoint,
  setCollection,
  setLoading,
  errorMessage = "Erreur lors du chargement des données"
) {
  if (typeof setLoading === "function") {
    setLoading(true);
  }

  try {
    const data = await fetchArrayFromApi(endpoint, errorMessage);
    setCollection(data);
    return data;
  } catch {
    setCollection([]);
    return [];
  } finally {
    if (typeof setLoading === "function") {
      setLoading(false);
    }
  }
}

export const loadClassesIntoState = (setClasses, setLoadingClasses) =>
  loadCollectionIntoState("/classes", setClasses, setLoadingClasses, "Erreur lors du chargement des classes");

export const loadTeachersIntoState = (setTeachers, setLoadingTeachers) =>
  loadCollectionIntoState("/teachers", setTeachers, setLoadingTeachers, "Erreur lors du chargement des enseignants");

export const loadStudentsIntoState = (setStudents, setLoadingStudents) =>
  loadCollectionIntoState("/students", setStudents, setLoadingStudents, "Erreur lors du chargement des élèves");

export const loadActivitiesIntoState = (setActivities, setLoadingActivities) =>
  loadCollectionIntoState("/activities", setActivities, setLoadingActivities, "Erreur lors du chargement des activités");

export const fetchStudents = () => fetchArrayFromApi("/students", "Erreur lors du chargement des élèves");
export const fetchResults = () => fetchArrayFromApi("/results", "Erreur lors du chargement des résultats");

export const fetchGroupsByClass = async (classId) => {
  if (!classId) {
    return [];
  }

  return fetchArrayFromApi(
    `/groups?class_id=${encodeURIComponent(classId)}`,
    "Erreur lors du chargement des groupes"
  );
};
