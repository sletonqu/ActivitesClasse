# Ma Classe Interactive

Application web locale pour gérer une classe de primaire et lancer des activités interactives en autonomie ou sur TNI.

---

## ✨ Aperçu

Le projet propose trois espaces complémentaires :

| Espace | Usage principal |
| --- | --- |
| `Admin` | Gérer enseignants, classes, activités, imports/exports globaux |
| `Enseignant` | Gérer les élèves de sa classe, importer/exporter les listes |
| `Élève` | Choisir une classe, lancer une activité, valider un score, consulter le classement |

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

### Repartir sur une base propre

Si le schéma SQLite change ou si vous voulez repartir de zéro :

1. arrêtez les conteneurs ;
2. supprimez `backend/database.sqlite` si présent ;
3. relancez `docker compose up --build`.

---

## ✅ Fonctionnalités disponibles

### Administration

- création et consultation des enseignants ;
- création et consultation des classes ;
- création, modification et suppression des activités ;
- suppression unitaire ou globale des activités ;
- import / export global CSV ;
- import / export CSV des élèves.

### Enseignant

- sélection d'une classe active ;
- ajout / suppression d'élèves ;
- suppression globale des élèves de la classe ;
- import / export CSV ciblé sur une classe.

### Élève

- sélection d'une classe active ;
- sélection d'une activité active ;
- exécution de l'activité ;
- validation du score ;
- classement de la classe ;
- export CSV du classement.

---

## 🧩 Activités disponibles

| Activité | Fichier | Objectif | Paramètres principaux |
| --- | --- | --- | --- |
| Tri de nombres | `frontend/src/activities/SortNumbersActivity.js` | Ranger des nombres dans l'ordre croissant | `defaultLevel`, `levels`, `numbersByLevel` |
| Additions CE1 | `frontend/src/activities/MatchAdditionsActivity.js` | Associer une addition à son résultat | `defaultLevel`, `levels`, `challenges`, `challengesByLevel` |
| Dizaines et unités | `frontend/src/activities/CountPencilsByTensActivity.js` | Compter unités, dizaines et centaines avec des crayons | `defaultLevel`, `levels` |
| Tableau blanc interactif | `frontend/src/activities/InteractiveWhiteboardActivity.js` | Dessiner, écrire, ajouter des images et exporter le tableau | `defaultTitle`, `width`, `height`, `backgroundColor`, `paperStyle`, `defaultZoom`, `storageKey` |

> Documentation détaillée des activités : voir `frontend/src/activities/README.md`.

### Focus : tableau blanc interactif

Le tableau blanc propose notamment :

- une **barre d'outils flottante** en bas de l'écran ;
- l'**export PNG avec le nom de l'élève** dans l'image et le nom du fichier ;
- l'export / import **JSON** ;
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
2. exporter une configuration par défaut depuis ce fichier ;
3. enregistrer l'activité dans `frontend/src/activities/ActivityContainer.js` ;
4. l'ajouter à `ACTIVITY_FILES` et à `getDefaultActivityContentText()` dans `frontend/src/views/AdminView.js` ;
5. créer l'activité depuis la vue admin.

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

- Application conçue pour être utilisé sur un TNI de 1024x768 pixels (4:3), model : Smart Board M600 DViT
- les mots de passe enseignants sont encore stockés en clair : à sécuriser avant une mise en production ;
- le projet est pensé pour un usage **local / MVP** ;
- le chargement des activités repose sur un registre explicite dans `ActivityContainer.js`.
