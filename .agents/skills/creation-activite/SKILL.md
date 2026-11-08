---
name: creation-activite
description: >-
  Utiliser ce skill quand l'utilisateur demande de créer une nouvelle activité
  interactive pour l'application ActivitesClasse. Couvre le workflow complet :
  création du composant React, configuration par défaut, enregistrement dans
  ActivityContainer et dans le registre activityManagement, tests et rebuild Docker.
---

# Créer une nouvelle activité interactive

Ce skill guide la création d'une activité de bout en bout dans le projet
ActivitesClasse. Suivre chaque étape dans l'ordre et ne valider qu'après
vérification.

## Règles impératives

- Tout texte visible (titre, consigne, feedback, boutons, messages d'erreur)
  **doit être en français**, vocabulaire adapté à des enfants de primaire.
- Préfixer chaque commande shell par `rtk`.
- Respecter les directives de `AGENTS.md` en toutes circonstances.

---

## Étape 1 — Créer le composant React

Créer le fichier `frontend/src/activities/<NomActivite>Activity.jsx`.

### Structure obligatoire du composant

```jsx
import React, { useState, useCallback, useMemo } from "react";
import ActivityHero from "../components/ActivityHero";
import ActivityActionsBar from "../components/ActivityActionsBar";
import ActivityStatus from "../components/ActivityStatus";
import ActivitySummaryCard from "../components/ActivitySummaryCard";
import { parseActivityContent } from "../utils/activityUtils";

// --- Configuration par défaut exportée ---
export const default<NomActivite>ActivityContent = {
  title: "Titre de l'activité",
  instruction: "Consigne claire et simple pour l'élève.",
  // ... paramètres spécifiques
};

const <NomActivite>Activity = ({ student, content, onComplete }) => {
  // ...
};

export default <NomActivite>Activity;
```

### Contrat de robustesse

- Le composant **doit fonctionner** même si `content` est `{}` ou `undefined`.
  Utiliser `parseActivityContent(content, default<NomActivite>ActivityContent)`
  pour fusionner la configuration reçue avec les valeurs par défaut.
- Ajouter des attributs `id` clairs sur les éléments de structure pour faciliter
  le débogage et les tests.

### Comportement des boutons (niveaux et actions) selon les 3 modes

L'application prend en charge 3 modes d'exécution qui déterminent les règles d'activation des boutons de niveaux, du bouton **Valider** et du bouton **Recommencer** :

| Mode | Condition | Boutons Niveaux | Bouton Recommencer | Bouton Valider | Enregistrement score |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mode Démo** (Enseignant) | `!student` | Toujours actifs | Toujours actif | Actif quand réponse prête (`isAnswerReady`) | Aucun (mode démo sans persistance) |
| **Mode Élève Groupe** | `Boolean(student) && !isFocusedMode` | Actifs au début. Désactivés dès le démarrage (`isLevelStarted`) et **restent désactivés à la fin** (`finished`) en attente de l'élève suivant. | Désactivé au départ et pendant l'activité. Reste désactivé en fin de tour sauf si `allStudentsCompleted === true` (réinitialisation globale du groupe). | Actif quand niveau démarré et réponse prête (`isAnswerReady`). | Oui (`onComplete` lors de la fin de l'activité). |
| **Mode Focus** (Élève individuel) | `Boolean(isFocusedMode)` | Actifs au début. Désactivés pendant le niveau (`isLevelStarted && !finished`). **Réactivés à la fin** pour rejouer ou changer de niveau. | Désactivé pendant le niveau. **Réactivé à la fin** (`finished`) pour recommencer à volonté. | Actif quand niveau démarré et réponse prête (`isAnswerReady`). | Oui (`onComplete` lors de la fin de l'activité). |

#### 1. Props requises sur le composant
L'activité doit déclarer et recevoir ces props :
```jsx
const MonActiviteActivity = ({
  student,
  content,
  onComplete,
  allStudentsCompleted = false,
  onResetStudentRound,
  isFocusedMode = false,
}) => {
```

#### 2. Variables de mode et de verrouillage recommandées
```jsx
const isDemoMode = !student;
const isFocusMode = Boolean(isFocusedMode);
const isGroupStudentMode = Boolean(student) && !isFocusMode;

// Indique si le niveau actuel a débuté (au moins une interaction ou progression)
const isLevelStarted = currentStepIndex > 0 || hasInteracted || finished;

// Verrouillage des boutons de sélection de niveau
const isLevelLocked = isDemoMode
  ? false
  : isGroupStudentMode
    ? isLevelStarted || finished  // En mode groupe : verrouillé dès qu'on a commencé ET à la fin
    : !finished && isLevelStarted; // En mode focus : verrouillé uniquement pendant le cours du niveau

// Verrouillage du bouton Recommencer
let isRestartDisabled = false;
if (loading) {
  isRestartDisabled = true;
} else if (isDemoMode) {
  isRestartDisabled = false; // L'enseignant a toute liberté
} else if (isGroupStudentMode) {
  isRestartDisabled = !allStudentsCompleted; // Verrouillé jusqu'à ce que tous les élèves aient fini
} else if (isFocusMode) {
  isRestartDisabled = !finished; // L'élève peut recommencer une fois la série achevée
}

// Titre / infobulle du bouton Recommencer
const restartTitle = isGroupStudentMode && finished && !allStudentsCompleted
  ? "En attente que tous les élèves terminent..."
  : allStudentsCompleted && student
    ? "Recommencer et réinitialiser la liste des élèves"
    : "Recommencer avec d'autres exercices";
```

#### 3. Logique du bouton Recommencer (`handleRestart`)
La fonction utilitaire `handleRoundRestart` attend **deux arguments positionnels** `(allStudentsCompleted, onResetStudentRound)`. Ne jamais lui passer d'objet d'options :
```jsx
const handleRestart = () => {
  if (isRestartDisabled) {
    return;
  }
  // Si tous les élèves ont terminé leur tour en mode groupe, réinitialiser la ronde globale
  if (handleRoundRestart(allStudentsCompleted, onResetStudentRound)) {
    return;
  }
  // Sinon, recharger localement l'exercice pour le niveau courant
  loadExerciseForLevel(currentLevel);
};
```

#### 4. Protection contre le rechargement intempestif en fin d'activité
En mode groupe, l'appel de `onComplete` met à jour les scores dans le parent (`StudentView`), ce qui modifie la référence de la prop `content`. Pour éviter que cette mise à jour ne recharge l'activité et n'efface prématurément le score de l'élève :
- Vérifier `if (finished) return;` dans vos `useEffect` de chargement / réinitialisation.
- Utiliser une référence de signature (`useRef` ou `useMemo`) pour ne recharger que si la configuration change réellement hors de l'état `finished`.
```jsx
useEffect(() => {
  if (finished) {
    return; // Conserver l'affichage du résumé / score final tant que l'élève suivant n'est pas sélectionné
  }
  if (lastLoadSignatureRef.current === currentLoadSignature) {
    return;
  }
  lastLoadSignatureRef.current = currentLoadSignature;
  loadExerciseForLevel(currentLevel);
}, [currentLevel, currentLoadSignature, loadExerciseForLevel, finished]);
```

#### 5. Mode Démo (student === null)
- Ne tenter **aucun appel d'enregistrement** de résultat (`onComplete` ne doit être appelé qu'avec `student`).
- Les scores ne sont pas sauvegardés en base.

#### 6. Gestion des niveaux (si applicable)
- Définir les niveaux dans la configuration par défaut sous une clé `levels`.
- Garantir que `onComplete` renvoie bien `levelKey` et `levelLabel` :
```jsx
if (student) {
  onComplete({
    success: calculatedScore >= passingScore,
    score: calculatedScore,
    levelKey: currentLevel,
    levelLabel: currentLevelRule.label,
  });
}
```

### Structure visuelle conventionnelle

Le rendu doit suivre strictement cet ordre vertical :

1. **`<ActivityHero>`** — Titre + consigne + badges de compétence + boutons de niveaux
2. **`<ActivityStatus>`** — Barre de progression (affichée sous le Hero tant que l'exercice n'est pas soumis)
3. **Contenu manipulable** — Zone interactive principale de l'exercice
4. **`<ActivitySummaryCard>`** — Résumé final et score (affiché après soumission/validation)
5. **`<ActivityActionsBar>`** — **Toujours en dernier tout en bas** (Boutons d'action : Valider, Recommencer…)

> [!IMPORTANT]
> `ActivityActionsBar` doit toujours être le **dernier élément interactif** en bas du conteneur principal. Il prend un tableau `actions` :
> ```jsx
> <ActivityActionsBar
>   id="mon-activite-actions"
>   className="flex flex-wrap justify-center gap-3"
>   actions={[
>     {
>       id: "mon-activite-validate-button",
>       onClick: handleValidate,
>       disabled: finished || !allAnswered,
>       ariaLabel: "Valider",
>       title: "Valider",
>       icon: "✓",
>       srText: "Valider",
>       variant: "validate",
>     },
>     {
>       id: "mon-activite-restart-button",
>       onClick: handleRestart,
>       disabled: restartLocked || (Boolean(student) && !finished),
>       ariaLabel: "Recommencer",
>       title: "Recommencer",
>       icon: "↻",
>       srText: "Recommencer",
>       variant: allStudentsCompleted ? "warning" : "restart",
>     },
>   ]}
> />
> ```

### Composants et hooks réutilisables disponibles

| Composant / Hook                   | Rôle                                                  |
| :--------------------------------- | :---------------------------------------------------- |
| `ActivityHero`                     | En-tête avec titre et consigne                        |
| `ActivityActionsBar`               | Barre de boutons d'actions en bas                     |
| `ActivityStatus`                   | Affichage du feedback (succès/échec)                  |
| `ActivitySummaryCard`              | Carte de résumé après complétion                      |
| `ActivityIconButton`               | Bouton avec icône                                     |
| `PlacementDropZone`                | Zone de dépôt pour le drag & drop                     |
| `PlacementTileButton`              | Tuile déplaçable/cliquable                            |
| `useHybridPlacementInteraction`    | Hook pour le drag & drop + clic combinés              |
| `useSlotPoolPlacement`             | Hook pour la gestion de placement par pools           |

### Utilitaires disponibles (`activityUtils.js`)

- `parseActivityContent(content, defaults)` — Fusion robuste config + défauts
- `handleRoundRestart(...)` — Reset d'un round
- `getSafeDisplayText(text)` — Affichage sécurisé
- `parsePositiveInt(val, fallback)` — Parse entier positif
- `parseIntWithFallback(val, fallback)` — Parse entier avec fallback
- `randomRotation(min, max)` — Rotation aléatoire pour les tuiles
- `formatNumberWithThousandsSpace(n)` — Formatage nombre avec espaces

---

## Étape 2 — Enregistrer dans ActivityContainer

Modifier [`frontend/src/activities/ActivityContainer.jsx`](file:///h:/ProjetsCODE/ActivitesClasse/frontend/src/activities/ActivityContainer.jsx) :

1. **Ajouter l'import** en haut du fichier :

```jsx
import <NomActivite>Activity from "./<NomActivite>Activity";
```

2. **Ajouter les 3 entrées** dans `componentRegistry` (respecter le pattern
   existant) :

```jsx
"src/activities/<NomActivite>Activity.js": <NomActivite>Activity,
"<NomActivite>Activity": <NomActivite>Activity,
"<NomActivite>Activity.js": <NomActivite>Activity,
```

> [!WARNING]
> Les clés du registre utilisent l'extension `.js` (et non `.jsx`) pour la
> compatibilité avec la base de données existante.

---

## Étape 3 — Enregistrer dans le registre activityManagement

Modifier [`frontend/src/utils/activityManagement.js`](file:///h:/ProjetsCODE/ActivitesClasse/frontend/src/utils/activityManagement.js) :

1. **Ajouter l'import** de la configuration par défaut :

```jsx
import { default<NomActivite>ActivityContent } from "../activities/<NomActivite>Activity";
```

2. **Ajouter l'entrée** dans le tableau `ACTIVITY_FILES` :

```jsx
"src/activities/<NomActivite>Activity.js",
```

3. **Ajouter le mapping** dans `DEFAULT_ACTIVITY_CONTENT_BY_FILE` :

```jsx
"src/activities/<NomActivite>Activity.js": default<NomActivite>ActivityContent,
```

4. **Déclarer la discipline** dans [`frontend/src/utils/activityDiscipline.js`](file:///h:/ProjetsCODE/ActivitesClasse/frontend/src/utils/activityDiscipline.js) :
Ajouter l'activité dans l'objet `KNOWN_ACTIVITY_DISCIPLINES` sous sa matière (`"Français"`, `"Mathématiques"` ou `"Outils"`) :

```jsx
<NomActivite>Activity: "Mathématiques",
```

---

## Étape 4 — Documentation

Mettre à jour la documentation du projet :

1. Ajouter une section détaillée dans [`frontend/src/activities/README.md`](file:///h:/ProjetsCODE/ActivitesClasse/frontend/src/activities/README.md) (description, format JSON, options, capture/règles).
2. Ajouter l'activité dans le tableau récapitulatif du [`README.md`](file:///h:/ProjetsCODE/ActivitesClasse/README.md) principal.

---

## Étape 5 — Vérification

### 5.1 Vérifier la cohérence des enregistrements

```powershell
rtk powershell -Command "Select-String -Path 'frontend/src/activities/ActivityContainer.jsx' -Pattern '<NomActivite>'"
rtk powershell -Command "Select-String -Path 'frontend/src/utils/activityManagement.js' -Pattern '<NomActivite>'"
rtk powershell -Command "Select-String -Path 'frontend/src/utils/activityDiscipline.js' -Pattern '<NomActivite>'"
```

Confirmer que :
- L'import est présent dans les fichiers requis.
- Les 3 clés du `componentRegistry` existent dans `ActivityContainer.jsx`.
- L'entrée dans `ACTIVITY_FILES` et le mapping dans `DEFAULT_ACTIVITY_CONTENT_BY_FILE` existent dans `activityManagement.js`.
- La discipline est bien déclarée dans `activityDiscipline.js`.

### 5.2 Tester le build

```powershell
rtk docker compose up -d --build
```

Vérifier dans les logs que le frontend compile sans erreur.

### 5.3 Créer un test unitaire (recommandé)

Créer `frontend/src/activities/<NomActivite>Activity.test.jsx` couvrant
au minimum :
- Le rendu avec une configuration vide `{}` (contrat de robustesse).
- Le rendu en mode démo (`student={null}`).
- Le bon fonctionnement du flux de validation.

---

## Checklist finale

- [ ] Composant créé dans `frontend/src/activities/`
- [ ] Export nommé `default<NomActivite>ActivityContent` présent
- [ ] Export par défaut du composant présent
- [ ] Ordre des sections respecté (`Hero` -> `Progression` -> `Manipulable` -> `Résumé` -> `Actions en dernier`)
- [ ] `content = {}` ne cause aucune erreur
- [ ] Mode démo (`student === null`) fonctionne sans appel réseau et avec Recommencer toujours actif
- [ ] Textes en français, vocabulaire adapté aux enfants
- [ ] Attributs `id` sur les éléments de structure
- [ ] Import + 3 clés dans `ActivityContainer.jsx`
- [ ] Import + entrée `ACTIVITY_FILES` + mapping dans `activityManagement.js`
- [ ] Discipline déclarée dans `activityDiscipline.js`
- [ ] Documentation ajoutée dans `frontend/src/activities/README.md` et `README.md`
- [ ] Build Docker réussi
- [ ] Test unitaire créé et exécuté avec succès

