# Documentation des activités

Ce dossier contient les activités interactives affichées dans la vue élève.

Chaque activité React reçoit généralement les props suivantes :

- `content` : configuration JSON de l'activité ;
- `onComplete(score)` : callback appelé à la validation ;
- `student` : élève courant, utile pour les exports personnalisés.

---

## Ajouter une activité

Pour brancher une nouvelle activité dans l'application :

1. créer le composant dans ce dossier ;
2. exporter une configuration par défaut nommée ;
3. l'enregistrer dans `ActivityContainer.js` ;
4. l'ajouter à `ACTIVITY_FILES` dans `AdminView.js` ;
5. prévoir un JSON par défaut dans `getDefaultActivityContentText()`.

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
- le `student` prop permet de personnaliser les exports.
