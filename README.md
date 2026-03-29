# Ma Classe Interactive

Ma Classe Interactive est une application web de gestion d'activites scolaires pour l'ecole primaire.

Le projet propose trois espaces distincts:

- Vue Admin: gestion des enseignants, des classes, des activites, import/export global et import/export eleves.
- Vue Enseignant: gestion des eleves de la classe selectionnee, import/export CSV des eleves pour une classe ciblee.
- Vue Eleve: selection d'une classe active, selection d'une activite active, participation a l'activite, calcul du score, classement et export CSV du classement.

## Fonctionnement General

L'application repose sur:

- un frontend React avec React Router et Tailwind CSS;
- un backend Node.js avec Express;
- une base SQLite locale;
- une communication entre frontend et backend via API REST JSON.

Les entites principales gerees par l'application sont:

- enseignants;
- classes;
- eleves;
- activites;
- resultats.

## Fonctionnalites Disponibles

### Administration

- creation d'un enseignant;
- association optionnelle d'un enseignant a une classe;
- affichage de la liste des enseignants et des classes associees;
- creation d'une classe avec enseignant associe ou null;
- affichage de la liste des classes;
- creation d'une activite avec:
  - titre;
  - description;
  - statut;
  - contenu JSON;
  - fichier JavaScript associe a l'activite;
- import/export global CSV pour enseignants, classes et eleves;
- import/export CSV des eleves.

### Enseignant

- selection d'une classe ciblee;
- ajout d'eleves dans la classe selectionnee;
- affichage de la liste des eleves de la classe selectionnee;
- import/export CSV des eleves pour une classe precise.

### Eleve

- selection d'une classe active;
- selection d'une activite active;
- affichage uniquement des eleves de la classe selectionnee;
- lancement d'une activite interactive basee sur le fichier JavaScript reference par l'activite;
- validation de l'activite avec calcul du score;
- desactivation de l'eleve apres participation;
- classement des eleves par score;
- export CSV du classement.

## Activites Actuellement Disponibles

### 1. Tri de nombres

Fichier associe:

- frontend/src/activities/SortNumbersActivity.js

Principe:

- l'eleve doit remettre des nombres melanges dans l'ordre croissant par glisser-deposer.

### 2. Additions CE1

Fichier associe:

- frontend/src/activities/MatchAdditionsActivity.js

Principe:

- l'eleve doit associer des additions simples a leur bon resultat.

## Structure du Projet

```text
.
├── backend/
│   ├── db.js
│   ├── Dockerfile
│   ├── init_db.sql
│   ├── package.json
│   ├── server.js
│   └── routes/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── docker-compose.yml
└── README.md
```

## Installation

### Prerequis

Avant d'installer l'application, assurez-vous d'avoir:

- Docker Desktop installe et demarre;
- Docker Compose disponible;
- les ports 3000 et 4000 libres sur la machine.

### Installation avec Docker Compose

1. Cloner ou copier le projet dans un dossier local.
2. Ouvrir un terminal a la racine du projet.
3. Lancer la construction et le demarrage des conteneurs:

```bash
docker-compose up --build
```

4. Ouvrir l'application dans le navigateur:

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Redemarrage apres modification du code

Apres des modifications significatives du projet, relancer:

```bash
docker-compose down
docker-compose up --build
```

### Base de donnees en phase alpha

Le projet est actuellement en phase alpha.

La gestion automatique des migrations de base n'est pas active. Si vous modifiez le schema SQLite, il peut etre necessaire de supprimer la base existante pour repartir proprement.

Dans ce cas:

1. Arreter les conteneurs.
2. Supprimer le fichier backend/database.sqlite si present.
3. Relancer:

```bash
docker-compose up --build
```

Les tables seront recreees au demarrage a partir de `backend/init_db.sql`.

## API Principale

Quelques routes utiles:

- `GET /api/teachers`
- `POST /api/teachers`
- `GET /api/classes`
- `POST /api/classes`
- `GET /api/students`
- `POST /api/students`
- `GET /api/activities`
- `POST /api/activities`
- `POST /api/auth/login`
- `POST /api/import/csv`
- `GET /api/export/csv`
- `POST /api/import/global-csv`
- `GET /api/export/global-csv`

## Remarques

- les mots de passe enseignants sont actuellement stockes tels quels en base: ce comportement est acceptable pour la phase alpha mais devra etre securise plus tard;
- le chargement dynamique des activites repose actuellement sur un registre des composants disponibles dans `frontend/src/activities/ActivityContainer.js`;
- l'application est orientee MVP/local, avec une execution simple via Docker Desktop.