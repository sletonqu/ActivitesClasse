# AGENTS.md - Directives du projet "ActivitesClasse"

Ce fichier définit les règles métier et les standards d'implémentation pour tout agent IA (ou "cerveau") travaillant sur ce projet. Il a été synthétisé à partir des directives de contribution, des différents README, et de la structure actuelle du code.

## 1. Contexte Général et Langue
- **Application cible** : Application locale de gestion de classe (espaces Admin, Enseignant et Élève) proposant des exercices numériques interactifs.
- **Stack technologique** : React / React Router / Tailwind CSS (Frontend), Node.js / Express (Backend), SQLite (Base de données), Docker / Docker Compose (Déploiement).
- **Langue absolue** : Toute surcouche utilisateur, instruction, libellé d'UI ou même message d'erreur (frontend ET backend) **doit être en français** parfaitement accentué. Prenez en compte que le public final inclut des enfants de primaire (vocabulaire clair, simple).

## 2. Règles Métier : Panneaux d'Administration (Frontend)
Lors d'une modification des interfaces de gestion (`*ManagementPanel.js`) :
- **Parité stricte** : Tous les panneaux (Étudiants, Groupes, Classes, Enseignants) doivent fonctionner selon la même logique et la même structure visuelle.
- **Comportement des listes** : Préserver l'UX actuelle ("Supprimer Tout" dans l'en-tête, "Supprimer" sur les lignes individuelles).
- **Feedback visuel** : Utiliser impérativement le hook `useAutoDismissMessage` pour les retours positifs ou négatifs, avec les classes standards Tailwind de transition (`transition-opacity duration-500 opacity-0 opacity-100`).
- **Débogage et tests** : Maintenir l'ajout systématique d'attributs `id` clairs sur les balises de structure (`section`, `button`, champs de saisie).

## 3. Règles Métier : Activités Interactives
Lorsque la tâche concerne la création ou la modification d'une activité dans `frontend/src/activities/` :
- **Contrat de robustesse** : Toute activité doit savoir se charger et utiliser des valeurs par défaut si sa prop configuration (`content`) est vide (`{}`).
- **Mode Démo** : Si la prop `student` vaut `null`, l'activité est en "mode démo". Dans ce mode :
  - L'agent ne doit tenter **aucun appel d'enregistrement** de résultat.
  - Le bouton de réinitialisation (`Recommencer`) doit rester actif même après une réussite.
- **Gestion des Niveaux** : Si l'activité est nivelée, garantir que l'appel `onComplete` renverra bien la clé du niveau (`levelKey`) et le label lisible (`levelLabel`).
- **Structure visuelle** : Maintenir le découpage conventionnel : Titre > Consigne > Contenu Manipulable > Feedback > Boutons d'action.
- **Workflow d'ajout (Checklist)** : L'agent créant une NOUVELLE activité doit :
  1. Créer le composant et sa configuration explicite.
  2. L'importer et l'enregistrer dans `ActivityContainer.js`.
  3. L'ajouter formellement dans le registre `frontend/src/utils/activityManagement.js`.

## 4. Règles Métier : Backend & Bases de Données
- **Validation** : Valider rigoureusement les entrées API avant de les inscrire en base.
- **Intégrité Référentielle** : En cas de suppression d'une entité (ex: élève, classe, activité), gérer manuellement ou préventivement la cascade pour ne pas laisser de traces orphelines (retirer d'un groupe, supprimer des résultats).
- **Communication** : Renvoyer des messages lisibles en français depuis le framework Express lors d'un code 400 ou 500.
- **Persistance SQLite** : Lors de la modification du `docker-compose.yml`, assure-toi que le volume pour le fichier `.db` est correctement monté pour éviter la perte de données au redémarrage.
- **Sécurité** : Nous sommes dans un contexte scolaire. Le code doit privilégier la simplicité et la protection des données des élèves (pas d'appels API externes non nécessaires).
- **Variables d'environnement** : Les variables d'environnement sensibles, token API, etc sont stockées dans le fichier `.env` et ne doivent pas être partagées. Ne jamais commiter le fichier `.env`.
- **Environnement Windows** : Utilise des chemins compatibles Docker Desktop pour Windows (attention aux séparateurs de dossiers).

## 5. Exécution Locale et Déploiement
- Le système tourne sur Docker. En cas d'ajouts de dépendance logicielle côté Nodejs/React :
  - Les modifications doivent s'accompagner du redémarrage effectif en buildant (`docker compose up -d --build`).
- Côté production "classe", les mises à jour se font par écrasement Git (`git pull --ff-only` ou script powershell). Éviter absolument de modifier/corrompre sans l'accord de l'utilisateur le volume de base de données (`db-data`).

## 6. Améliorations continues
- **Refactoring** : Si une partie du code semble ancienne ou peu claire, propose une amélioration en expliquant ton raisonnement.
- **Factorisation de code** : Si tu remarques une partie du code qui pourrait être factorisée, propose une amélioration en expliquant ton raisonnement.
- **Documentation** : Si tu ajoutes une nouvelle fonctionnalité, mets à jour la documentation correspondante.
- **Tests** : Si tu ajoutes une nouvelle fonctionnalité, ajoute des tests pour vérifier qu'elle fonctionne correctement.
- **Performance** : Si tu remarques une lenteur ou une inefficacité, propose une amélioration en expliquant ton raisonnement.
- **Accessibilité** : Si tu remarques une amélioration possible en termes d'accessibilité, propose une amélioration en expliquant ton raisonnement.

## 7. Règles Métier : Antigravity Agent IA
- **Antigravity Agent IA** : Lire les directives, appeler les outils d'exécution dans le bon ordre, gérer les erreurs, demander des clarifications, mettre à jour les directives avec les apprentissages. Si tu remarques une règle métier à rajouter dans ce fichier, propose une amélioration en expliquant ton raisonnement.
