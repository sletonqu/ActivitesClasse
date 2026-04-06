# Documentation des activités

Ce dossier contient les activités interactives affichées dans la vue élève via `ActivityContainer.js`.

---

## 🧱 Contrat commun des activités

Chaque activité React reçoit généralement les props suivantes :

- `content` : configuration JSON de l'activité ;
- `student` : élève courant, ou `null` en **mode démo** ;
- `onComplete(scoreOrPayload, completionMeta)` : callback appelé à la validation.

### Bonnes pratiques actuelles

- une activité doit fonctionner même avec un `content` vide (`{}`) en retombant sur ses valeurs par défaut ;
- si l'activité gère des niveaux, elle doit transmettre :
  - `levelKey`
  - `levelLabel`
- en mode démo, aucun résultat n'est enregistré côté application ;
- le bouton `Recommencer` doit rester utilisable en mode démo, même après validation ;
- `student` ne doit jamais être supposé obligatoire.

Exemple de validation avec niveau :

```js
onComplete(score, {
  levelKey: currentLevel,
  levelLabel: configuredLevels[currentLevel]?.label || currentLevel,
});
```

---

## ➕ Ajouter une activité

Pour brancher une nouvelle activité dans l'application :

1. créer le composant dans ce dossier ;
2. exporter une configuration par défaut nommée ;
3. prévoir des valeurs de repli si `content` vaut `{}` ;
4. l'enregistrer dans `ActivityContainer.js` ;
5. l'ajouter au registre partagé dans `frontend/src/utils/activityManagement.js` ;
6. compléter dans ce même fichier `ACTIVITY_FILES` et `getDefaultActivityContentText()` ;
7. si l'activité utilise des niveaux, renvoyer aussi `levelKey` / `levelLabel` dans `onComplete(...)`.

> `ActivityContainer.js` ajoute aussi un bouton d'impression PDF commun à toutes les activités.

---

## Activités existantes

### 1. `SortNumbersActivity.js`

**But** : ranger des nombres dans l'ordre croissant.

Exemple de configuration :

```json
{
  "defaultLevel": "level1",
  "levels": {
    "level1": { "label": "Niveau 1", "count": 5, "min": 1, "max": 99 },
    "level2": { "label": "Niveau 2", "count": 7, "min": 1, "max": 999 },
    "level3": { "label": "Niveau 3", "count": 9, "min": 1, "max": 9999 }
  }
}
```

Options utiles :

- `defaultLevel`
- `levels.levelX.label`
- `levels.levelX.count`
- `levels.levelX.min`
- `levels.levelX.max`
- `numbersByLevel.levelX` pour imposer une série précise

Comportement :

- score enregistré sur 20 ;
- niveau sélectionnable ;
- renvoi du niveau au moment du `onComplete(...)`.

---

### 2. `MatchAdditionsActivity.js`

**But** : associer chaque addition à son bon résultat.

Exemple de configuration :

```json
{
  "defaultLevel": "level2",
  "levels": {
    "level1": { "label": "Niveau 1", "count": 6, "min": 1, "max": 20 },
    "level2": { "label": "Niveau 2", "count": 5, "min": 10, "max": 99 },
    "level3": { "label": "Niveau 3", "count": 4, "min": 10, "max": 999 }
  }
}
```

Personnalisation avancée possible via :

- `challenges`
- `challengesByLevel.level1|2|3`

Chaque défi suit le format :

```json
{ "id": 1, "left": 12, "right": 7, "result": 19 }
```

Comportement :

- score calculé automatiquement ;
- niveau transmis au backend ;
- `Recommencer` reste actif en mode démo.

---

### 3. `CountPencilsByTensActivity.js`

**But** : manipuler les unités, dizaines et centaines à partir de crayons groupés.

Exemple de configuration :

```json
{
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "Niveau 1",
      "exerciseCount": 4,
      "minCartons": 0,
      "maxCartons": 0,
      "minPouches": 1,
      "maxPouches": 5,
      "minUnits": 0,
      "maxUnits": 9
    }
  }
}
```

Paramètres disponibles par niveau :

- `exerciseCount`
- `minCartons` / `maxCartons`
- `minPouches` / `maxPouches`
- `minUnits` / `maxUnits`

Interaction actuelle :

- **clic gauche sur 10 crayons** → regroupe en **1 pochette** ;
- **clic gauche sur 10 pochettes** → regroupe en **1 carton** ;
- **double-clic sur 1 pochette** → sépare en **10 crayons** ;
- **double-clic sur 1 carton** → sépare en **10 pochettes**.

Comportement :

- score enregistré avec le niveau courant ;
- niveaux 1, 2 et 3 configurables ;
- `Recommencer` reste actif en mode démo.

---

### 4. `InteractiveWhiteboardActivity.js`

**But** : offrir un tableau blanc interactif pour écrire, dessiner, insérer une image puis exporter le résultat.

Fonctions principales :

- dessin libre ;
- ajout de texte ;
- import d'image ;
- export JSON ;
- export PNG avec le nom de l'élève ;
- barre d'outils flottante ;
- fond configurable.

Exemple de configuration :

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

Valeurs de `paperStyle` :

- `blank` : fond blanc
- `seyes` : lignage Seyès pour l'écriture
- `grid` : quadrillage pour géométrie

Notes :

- `width` / `height` définissent la taille utile du tableau ;
- `storageKey` sert à la sauvegarde `localStorage` ;
- le `student` prop permet de personnaliser les exports ;
- cette activité peut être utilisée avec ou sans élève sélectionné selon le contexte.
