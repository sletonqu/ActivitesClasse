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

### Mode Démo (student === null)

- Ne tenter **aucun appel** d'enregistrement de résultat.
- Le bouton « Recommencer » reste actif même après une réussite.
- Condition type :

```jsx
if (student) {
  onComplete({ success: true, score, details });
}
```

### Gestion des niveaux (si applicable)

- Définir les niveaux dans la configuration par défaut sous une clé `levels`.
- Garantir que `onComplete` renvoie `levelKey` et `levelLabel`.

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

