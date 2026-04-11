# Documentation des activités

Ce dossier contient les activités interactives affichées dans la vue élève via `ActivityContainer.js`.

---

## 🧱 Contrat commun des activités

Chaque activité React reçoit généralement les props suivantes :

- `content` : configuration JSON de l'activité ;
- `student` : élève courant, ou `null` en **mode démo** ;
- `onComplete(scoreOrPayload, completionMeta)` : callback **optionnel**, appelé seulement si l'activité comporte une validation ou un score.

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

- `title`
- `instruction`
- `defaultLevel`
- `levels.levelX.label`
- `levels.levelX.count`
- `levels.levelX.min`
- `levels.levelX.max`
- `numbersByLevel.levelX` pour imposer une série précise

Comportement :

- interface en glisser-déposer avec en-tête, barre de progression, réserve de tuiles et zone `? < ? < ?` ;
- tuiles légèrement inclinées grâce à une rotation aléatoire ;
- affichage des nombres avec espace comme séparateur des milliers pour les valeurs supérieures à `999` ;
- score enregistré sur 20 ;
- niveau sélectionnable ;
- renvoi du niveau au moment du `onComplete(...)`.

---

### 2. `ReadNumbersActivity.js`

**But** : afficher un nombre à lire à voix haute ou à observer selon le niveau choisi.

Exemple de configuration :

```json
{
  "title": "Lecture de nombres",
  "instruction": "",
  "defaultLevel": "level1",
  "levels": {
    "level1": { "label": "Niveau 1", "min": 1, "max": 99 },
    "level2": { "label": "Niveau 2", "min": 100, "max": 999 },
    "level3": { "label": "Niveau 3", "min": 1000, "max": 9999 }
  },
  "numbersByLevel": {
    "level1": [12, 45, 87],
    "level2": [124, 508],
    "level3": [1234, 4567]
  }
}
```

Options utiles :

- `title`
- `instruction`
- `defaultLevel`
- `levels.levelX.label`
- `levels.levelX.min`
- `levels.levelX.max`
- `numbersByLevel.levelX` pour proposer une liste précise de nombres

Comportement :

- section `hero` avec le titre, l'instruction et les niveaux disponibles ;
- une seule tuile centrale dans la section `pool` ;
- aucun glisser-déposer, aucune zone de dépôt, aucune validation et aucun score ;
- bouton `Recommencer` pour afficher un nouveau nombre du niveau courant.

---

### 3. `MatchAdditionsActivity.js`

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

### 4. `CountPencilsByTensActivity.js`

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

### 5. `CompareNumbersActivity.js`

**But** : comparer deux nombres et, si besoin, afficher l'un des deux en écriture décomposée.

Exemple de configuration :

```json
{
  "title": "Comparaison de nombres",
  "instruction": "Observe les deux écritures puis choisis le bon signe.",
  "defaultLevel": "level3",
  "levels": {
    "level1": {
      "label": "Niveau 1",
      "min": 0,
      "max": 20,
      "allowEquality": true,
      "equalityChance": 0.2,
      "decompositionMode": "none"
    },
    "level3": {
      "label": "Niveau 3",
      "min": 100,
      "max": 999,
      "allowEquality": true,
      "equalityChance": 0.2,
      "decompositionMode": "random",
      "decompositionStyle": "moyenne"
    }
  },
  "pairsByLevel": {
    "level3": [
      { "left": 764, "right": 768, "decompositionMode": "left" },
      { "left": 493, "right": 500, "decompositionMode": "left" }
    ]
  }
}
```

Paramètres utiles :

- `levels.levelX.min` / `levels.levelX.max`
- `levels.levelX.allowEquality`
- `levels.levelX.equalityChance`
- `levels.levelX.decompositionMode` : `none`, `left`, `right` ou `random`
- `levels.levelX.decompositionStyle` : `strict`/`stricte` ou `medium`/`moyenne` (ignoré si `decompositionMode` vaut `none`)
- `pairsByLevel.levelX` pour imposer des couples précis
- `pairsByLevel.levelX[].decompositionMode` pour surcharger le côté décomposé sur une paire donnée
- `pairsByLevel.levelX[].decompositionStyle` pour imposer un style précis sur une paire

Comportement :

- comparaison avec les signes `<`, `=` et `>` ;
- un des deux nombres peut être affiché sous forme de tuiles de centaines, dizaines et unités ;
- `stricte` : `763 = 700 + 60 + 3` ;
- `moyenne` : seule la partie `unités` peut dépasser 9, par exemple `752 = 700 + 40 + 12` ;
- les centaines et les dizaines restent strictement décomposées ;
- score enregistré sur 20 avec le niveau courant.

---

### 6. `InteractiveWhiteboardActivity.js`

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

---

### 7. `WordClassificationActivity.js`

**But** : classer des mots dans la bonne catégorie grammaticale.

Exemple de configuration :

```json
{
  "title": "Classe les mots dans la bonne catégorie",
  "instruction": "Fais glisser chaque mot dans la bonne catégorie.",
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "Niveau 1",
      "totalWords": 10,
      "wordsPerRound": 3,
      "maxWordLevel": 2,
      "classifications": ["nom", "verbe"]
    }
  }
}
```

Paramètres disponibles par niveau :

- `totalWords`
- `wordsPerRound`
- `maxWordLevel`
- `classifications`

Comportement :

- chargement dynamique de mots depuis l'API selon le niveau et les catégories demandées ;
- classement possible par **glisser-déposer** ou par **clic** (sélection d'un mot puis d'une catégorie) ;
- tuiles de mots avec **rotation aléatoire** pour un rendu plus vivant ;
- bilan final par catégorie avec affichage des erreurs et symbole `✓` lorsqu'il n'y a aucune erreur ;
- score enregistré sur 20 avec renvoi du `levelKey` et du `levelLabel` via `onComplete(...)`. 

---

### 8. `FillInTheBlanksActivity.js`

**But** : compléter une ou plusieurs phrases à trous, avec saisie libre et éventuellement une banque de mots.

Exemple de configuration :

```json
{
  "title": "Complète la phrase",
  "instruction": "Lis la phrase puis écris les mots manquants dans les cases.",
  "showWordBank": true,
  "sourceLevel": "CE1",
  "sourceTheme": "animaux",
  "sentences": [
    {
      "id": "phrase-1",
      "prompt": "Complète avec les bons mots.",
      "wordBank": ["petit", "chat"],
      "tokens": [
        { "type": "text", "value": "Le" },
        { "type": "blank", "answer": "petit", "placeholder": "..." },
        { "type": "blank", "answer": "chat", "placeholder": "..." },
        { "type": "text", "value": "dort" },
        { "type": "punctuation", "value": "." }
      ]
    }
  ]
}
```

Paramètres utiles :

- `title`
- `instruction`
- `showWordBank`
- `sourceLevel`
- `sourceTheme`
- `sentences[]`
- `sentences[].tokens[]` avec `text`, `blank` et `punctuation`

Comportement :

- activité sans glisser-déposer ;
- validation mot par mot avec score sur 20 ;
- comparaison tolérante sur les accents et apostrophes ;
- `Recommencer` réinitialise toutes les réponses en mode démo.

---

### 9. `FractionsVisualSelectionActivity.js`

**But** : reconnaître la bonne fraction à partir d'un visuel découpé en parts égales.

Exemple de configuration :

```json
{
  "title": "Reconnais la bonne fraction",
  "instruction": "Observe la figure colorée à gauche puis clique sur la fraction qui lui correspond.",
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "Niveau 1",
      "answerCount": 3,
      "fractions": [
        { "numerator": 1, "denominator": 2 },
        { "numerator": 1, "denominator": 3 },
        { "numerator": 1, "denominator": 4 }
      ],
      "visualTypes": ["circle", "bar", "square"]
    },
    "level2": {
      "label": "Niveau 2",
      "answerCount": 6,
      "fractions": [
        { "numerator": 1, "denominator": 2 },
        { "numerator": 1, "denominator": 3 },
        { "numerator": 1, "denominator": 4 },
        { "numerator": 1, "denominator": 5 }
      ]
    },
    "level3": {
      "label": "Niveau 3",
      "answerCount": 6,
      "minDenominator": 2,
      "maxDenominator": 10,
      "maxNumerator": 9,
      "visualTypes": ["circle", "bar", "square"]
    }
  }
}
```

Paramètres utiles :

- `title`
- `instruction`
- `defaultLevel`
- `levels.levelX.label`
- `levels.levelX.answerCount`
- `levels.levelX.fractions[]` pour imposer une liste précise
- `levels.levelX.minDenominator` / `maxDenominator` / `maxNumerator` pour la génération automatique
- `levels.levelX.visualTypes` avec `circle`, `bar` ou `square`

Comportement :

- visuel affiché à gauche et réponses sur tuiles cliquables à droite ;
- fractions toujours **strictement inférieures à 1** ;
- une seule réponse correcte par série ;
- score sur 20 avec renvoi du niveau courant dans `onComplete(...)`.

