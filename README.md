# Ma Classe Interactive

Application web locale pour gérer une classe de primaire et lancer des activités interactives en autonomie, en groupe ou sur TNI.

GITHUB_REPO : https://github.com/sletonqu/ActivitesClasse

---

## ✨ Aperçu

Le projet propose trois espaces complémentaires :

| Espace | URL | Usage principal |
| --- | --- | --- |
| `Admin` | `/admin` | Gérer enseignants, classes, activités, imports/exports globaux |
| `Enseignant` | `/teacher` | Gérer les élèves, groupes, résultats et activités d'une classe |
| `Élève` | `/` | Choisir une classe, filtrer par groupe, lancer une activité ou un mode démo |

### Stack technique

- **Frontend** : React + React Router + Tailwind CSS
- **Backend** : Node.js + Express
- **Base de données** : SQLite
- **Conteneurisation** : Docker / Docker Compose

---

## 🚀 Démarrage rapide

### Prérequis

- Docker Desktop démarré
- Ports `3000` et `4000` disponibles

### Lancer l'application

```bash
docker compose up --build
```

Ou en arrière-plan :

```bash
docker compose up -d --build
```

### Accès

- **Frontend** : `http://localhost:3000`
- **API backend** : `http://localhost:4000`

### Arrêter l'application

```bash
docker compose down
```

## 🔄 Mise à jour sur un PC de classe

### Mode manuel recommandé

Sur le PC de la classe, le plus simple est d'utiliser le script :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update-application.ps1
```

> 💡 Guide détaillé d'installation et de mise à jour : voir `scripts/README.md`.

Ce script :

- sauvegarde préventivement la base SQLite dans le volume Docker ;
- récupère la dernière version GitHub via `git pull --ff-only` ;
- relance l'application avec `docker compose up -d --build`.

> ⚠️ Les données sont conservées tant que vous n'utilisez pas `docker compose down -v`.

### Mode automatisé depuis l'espace admin

Un panneau **Version et mise à jour** est disponible dans `Admin`.

Pour autoriser le bouton `Demander la mise à jour` sur le PC de classe :

1. démarrer sur Windows le service local suivant :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-updater.ps1 -Token "change-this-token"
```

2. activer les variables suivantes dans `docker-compose.yml` pour le service `backend` :

```yml
ENABLE_ADMIN_UPDATE_TRIGGER=true
HOST_UPDATER_URL=http://host.docker.internal:8765/update
UPDATER_TOKEN=change-this-token
```

Ce mode garde la logique de mise à jour **hors du conteneur** : l'interface admin demande l'opération, mais c'est bien le poste Windows qui exécute le script PowerShell.

### Repartir sur une base propre

Les données SQLite sont stockées dans le volume Docker `db-data`.

Pour repartir de zéro :

```bash
docker compose down -v
docker compose up --build
```

> ⚠️ `docker compose down -v` supprime toutes les données locales de l'application.

---

## ✅ Fonctionnalités disponibles

### Administration

- création, consultation et suppression des enseignants ;
- création, consultation et suppression des classes ;
- création, modification et suppression des activités ;
- suppression unitaire ou globale des activités ;
- import / export global CSV des `teachers`, `classes`, `groups`, `students`, `activities` et `results` ;
- conservation des colonnes de niveau des résultats (`activity_level`, `activity_level_label`) lors des imports/exports globaux.

### Enseignant

- sélection d'une classe active ;
- ajout, consultation et suppression d'élèves ;
- suppression globale des élèves de la classe ;
- **gestion des groupes** :
  - une classe peut avoir plusieurs groupes ou aucun ;
  - un groupe peut contenir plusieurs élèves ou aucun ;
  - un élève ne peut appartenir qu'à un seul groupe dans sa classe ;
  - ajout, affichage, suppression, vidage et affectation/retrait d'élèves ;
- **gestion des résultats** :
  - consultation des résultats d'un élève ;
  - suppression unitaire ou globale ;
  - calcul d'une moyenne qui remplace uniquement les résultats de la **même activité** et du **même niveau** ;
- import / export CSV ciblé sur une classe avec support des groupes ;
- modification des activités existantes et de leur JSON de configuration.

### Élève

- sélection compacte d'une classe, d'un groupe visible et d'une activité active ;
- filtrage de la liste d'élèves par groupe ;
- exécution d'activités avec niveaux (`level1`, `level2`, `level3` selon l'activité) ;
- activités de tri, de lecture de nombres et de classement en **glisser-déposer** ou en affichage simple selon l'exercice ;
- affichage lisible des grands nombres (ex. `1 234`) dans les activités numériques ;
- enregistrement des scores avec niveau et libellé de niveau ;
- **mode démo** :
  - aucune sélection d'élève requise ;
  - le panneau élève et le classement sont masqués ;
  - aucun résultat n'est enregistré ;
  - le bouton `Recommencer` reste disponible ;
- classement exportable en CSV sur le périmètre visible (classe entière ou groupe filtré).

---

## 📦 Import / export CSV

### Import / export élèves d'une classe

Le flux ciblé classe prend en charge les informations de groupe des élèves :

- `group_id`
- `group_name`

### Import / export global

Le format global attend une colonne `entity` avec l'une des valeurs suivantes :

- `teacher`
- `class`
- `group`
- `student`
- `activity`
- `result`

Pour les lignes de type `result`, les colonnes suivantes sont désormais supportées :

- `student_id`
- `activity_id`
- `score`
- `completed_at`
- `activity_level`
- `activity_level_label`

---

## 🧩 Activités disponibles

| Activité | Fichier | Objectif | Paramètres principaux |
| --- | --- | --- | --- |
| Tri de nombres | `frontend/src/activities/SortNumbersActivity.js` | Glisser des nombres dans des cases `? < ?` pour les ranger dans l'ordre croissant | `title`, `instruction`, `defaultLevel`, `levels`, `numbersByLevel` |
| Lecture de nombres | `frontend/src/activities/ReadNumbersActivity.js` | Afficher un nombre à lire selon le niveau, sans dépôt, validation ni score | `title`, `instruction`, `defaultLevel`, `levels`, `numbersByLevel` |
| Comparaison de nombres | `frontend/src/activities/CompareNumbersActivity.js` | Choisir `<`, `=` ou `>` entre deux nombres, avec écriture décomposée possible | `title`, `instruction`, `defaultLevel`, `levels.min/max`, `allowEquality`, `equalityChance`, `decompositionMode`, `pairsByLevel` |
| Additions CE1 | `frontend/src/activities/MatchAdditionsActivity.js` | Associer une addition à son résultat | `defaultLevel`, `levels`, `challenges`, `challengesByLevel` |
| Dizaines et unités | `frontend/src/activities/CountPencilsByTensActivity.js` | Compter unités, dizaines et centaines avec des crayons | `defaultLevel`, `levels`, `exerciseCount`, `min/maxCartons`, `min/maxPouches`, `min/maxUnits` |
| Fractions visuelles | `frontend/src/activities/FractionsVisualSelectionActivity.js` | Associer un visuel fractionné à la bonne fraction parmi plusieurs tuiles | `title`, `instruction`, `defaultLevel`, `levels.answerCount`, `levels.fractions`, `minDenominator`, `maxDenominator`, `visualTypes` |
| Classification de mots | `frontend/src/activities/WordClassificationActivity.js` | Classer des mots par catégorie grammaticale en glisser-déposer ou par clic | `title`, `instruction`, `defaultLevel`, `levels.totalWords`, `levels.wordsPerRound`, `levels.maxWordLevel`, `levels.classifications` |
| Tableau blanc interactif | `frontend/src/activities/InteractiveWhiteboardActivity.js` | Dessiner, écrire, ajouter des images et exporter le tableau | `defaultTitle`, `width`, `height`, `backgroundColor`, `paperStyle`, `defaultZoom`, `storageKey` |

> Documentation détaillée : voir `frontend/src/activities/README.md`.

### Focus : tableau blanc interactif

Le tableau blanc propose notamment :

- une **barre d'outils flottante** en bas de l'écran ;
- l'**export PNG** avec le nom de l'élève dans l'image et dans le nom du fichier ;
- l'import / export **JSON** ;
- un fond configurable :
  - `blank` → fond blanc,
  - `seyes` → lignage Seyès,
  - `grid` → quadrillage pour géométrie ;
- une sauvegarde locale par élève via `localStorage`.

Exemple de configuration JSON :

```json
{
  "defaultTitle": "Écriture du jour",
  "width": 1240,
  "height": 1754,
  "backgroundColor": "#ffffff",
  "paperStyle": "seyes",
  "defaultZoom": 0.7,
  "storageKey": "TBTS_INTERACTIVE_WHITEBOARD"
}
```

---

## 🗂️ Structure du projet

```text
.
├── backend/
│   ├── db.js
│   ├── Dockerfile
│   ├── init_db.js
│   ├── init_db.sql
│   ├── package.json
│   ├── server.js
│   └── routes/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── activities/
│       ├── components/
│       └── views/
├── docker-compose.yml
└── README.md
```

---

## ➕ Ajouter une nouvelle activité

1. créer un composant dans `frontend/src/activities/` ;
2. exporter une configuration par défaut robuste, compatible avec un `content` vide (`{}`) ;
3. si l'activité gère des niveaux, appeler `onComplete(score, { levelKey, levelLabel })` ;
4. enregistrer l'activité dans `frontend/src/activities/ActivityContainer.js` ;
5. l'ajouter au registre partagé dans `frontend/src/utils/activityManagement.js` ;
6. compléter au même endroit la configuration par défaut (`ACTIVITY_FILES`, `getDefaultActivityContentText()`) si nécessaire ;
7. créer ou modifier l'activité depuis l'espace admin / enseignant.

---

## 🔌 API principale

Quelques routes utiles :

- `GET /api/teachers`
- `POST /api/teachers`
- `GET /api/classes`
- `POST /api/classes`
- `GET /api/students`
- `POST /api/students`
- `DELETE /api/students/:id`
- `GET /api/groups?class_id=:id`
- `POST /api/groups`
- `POST /api/groups/:id/students`
- `DELETE /api/groups/:id/students/:studentId`
- `GET /api/results`
- `POST /api/results`
- `DELETE /api/results/:id`
- `GET /api/activities`
- `POST /api/activities`
- `PUT /api/activities/:id`
- `DELETE /api/activities/:id`
- `DELETE /api/activities`
- `POST /api/import/csv`
- `GET /api/export/csv`
- `POST /api/import/global-csv`
- `GET /api/export/global-csv`

---

## ⚠️ Notes actuelles

- application conçue pour un TNI `1024x768` (4:3), type Smart Board M600 DViT ;
- les mots de passe enseignants sont encore stockés en clair : à sécuriser avant une mise en production ;
- le projet est pensé pour un usage **local / MVP** ;
- le chargement des activités repose sur un registre explicite dans `ActivityContainer.js`.

