Plan de Développement : Application Scolaire "Ma Classe Interactive"
Ce document sert de guide pour la génération de code par Copilot. L'application est une plateforme de gestion et d'exécution d'activités pédagogiques pour le primaire.

🛠 Stack Technique Recommandée
Frontend : React.js avec Tailwind CSS (pour une interface fluide, moderne et réactive).Backend : Node.js avec Express.Base de données : SQLite (léger, sans configuration complexe, idéal pour une exécution locale sur Windows/Ubuntu).Communication : API REST JSON.🗄️ Architecture des Données (Backend)L'application doit gérer les entités suivantes :Utilisateurs : Administrateurs, Enseignants.Classes : Nom de la classe, Enseignant associée.Élèves : Nom, Prénom, ID de classe.Activités : Titre, Description, Jeu de données (JSON), Statut (Active/Inactive).Résultats : ID Élève, ID Activité, Note, Date de complétion.🖥️ Structure du Frontend1. Vue Administrateur (/admin)Dashboard : Gestion CRUD complète (Create, Read, Update, Delete).Gestion du personnel : Créer/Modifier les comptes Enseignants.Supervision : Accès à toutes les classes et tous les résultats.2. Vue Enseignant (/enseignant)Gestion de classe : Ajouter/Supprimer des élèves.Sélecteur d'activité : Choisir quelle activité est "en cours" pour la classe.Carnet de notes : Visualisation des scores par activité et par élève.3. Vue Élève (/) - Interface InteractiveL'interface doit être divisée en quatre zones distinctes :ZoneDescriptionFonctionnalitéGaucheListe des élèvesAffichage des prénoms. Click = Sélection. Si l'élève a fini l'activité en cours -> Prénom grisé et clic désactivé.HautSélecteur d'activitéPermet de voir l'activité sélectionnée par la Enseignant.DroiteClassementListe des élèves ayant terminé l'activité avec leur score respectif.CentreZone d'ActivitéConteneur dynamique qui charge l'exercice.🚀 Étapes de Génération (Instructions pour Copilot)Étape 1 : Initialisation du Backend"Génère un serveur Express en Node.js utilisant SQLite. Crée les modèles de données pour Teachers, Classes, Students, Activities et Results. Implémente les routes API CRUD de base."Étape 2 : Développement du Frontend (Structure)"Crée une application React avec React Router. Configure trois routes principales : /admin, /teacher, et la racine / pour les élèves. Utilise Tailwind CSS pour un layout 'Dashboard' propre."Étape 3 : Logique de la Vue Élève"Dans la vue /, implémente un état selectedStudent. La colonne de gauche doit mapper les élèves de la classe. Ajoute une condition visuelle : si student.hasCompletedCurrentActivity est vrai, appliquer une classe CSS grayscale et pointer-events-none."Étape 4 : Système d'Activité "Plug-and-Play"L'activité doit être un composant qui reçoit ces props :JavaScript{
  student: Object,      // Données de l'élève sélectionné
  content: Object,      // Données de l'exercice (ex: questions)
  onComplete: Function  // Callback qui renvoie la note (ex: onComplete(18))
}
"Crée un composant ActivityContainer qui gère le passage de données vers l'activité et enregistre la note en base de données via l'API une fois terminée."📂 Structure de fichiers souhaitéePlaintext/
├── backend/
│   ├── server.js
│   ├── database.sqlite
│   └── routes/
├── frontend/
│   ├── src/
│   │   ├── components/       # Composants réutilisables (Table, Button)
│   │   ├── views/            # AdminView, TeacherView, StudentView
│   │   ├── activities/       # Dossier pour les futurs modules d'exercices
│   │   └── App.js
└── package.json
🛡️ Contraintes de PerformanceUtiliser le Context API ou Zustand pour la gestion d'état globale afin d'éviter les re-rendus inutiles.Optimiser les listes d'élèves avec des clés uniques pour un DOM virtuel fluide.Assurer la compatibilité PC (clavier/souris) et Tablettes (tactile) si nécessaire.