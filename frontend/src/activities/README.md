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
- le composant partagé `ActivitySummaryCard` célèbre automatiquement tout score parfait de `20 / 20` avec une animation de confettis.
- pour régler la durée de cette célébration, modifier la durée en millisecondes (`2900ms` actuellement) dans la déclaration `animation` de `.activity-summary-confetti-piece`, dans `frontend/src/index.css`.

### Compétence affichée dans les réglages

Les activités qui utilisent le bandeau `ActivityHero` peuvent recevoir une compétence dans leur contenu JSON. Le badge est visible dans l'aperçu de l'activité et masqué pendant la réalisation par un élève.

- `skill` à la racine du contenu définit la compétence générale de l'activité ;
- `levels.levelX.skill` définit une compétence propre au niveau et est prioritaire pour ce niveau ; si elle est absente ou vide, la compétence générale est utilisée ;
- la compétence peut être une chaîne ou un objet. Pour un objet, le badge affiche la première valeur textuelle non vide parmi `description`, `label` et `name`.

Exemple :

```json
{
  "skill": {
    "id": "math.addition",
    "description": "Calculer une addition"
  },
  "levels": {
    "level1": {
      "label": "Sans retenue",
      "skill": "Additionner sans retenue"
    },
    "level2": {
      "label": "Avec retenue",
      "skill": {
        "id": "math.addition.retenue",
        "description": "Additionner avec retenue"
      }
    }
  }
}
```

Le badge est mis à jour automatiquement lors d'un changement de niveau. Les activités sans compétence configurée n'affichent aucun badge supplémentaire.

### Standard interactions de placement

Pour les activités de placement (tri, association, classement), le comportement cible est désormais **hybride** :

- Drag&Drop (souris) ;
- Select&Point (sélection d'une tuile puis clic sur la cible), utile sur tablette.

Base partagée recommandée :

- `frontend/src/hooks/useHybridPlacementInteraction.js` : interaction hybride item -> cible ;
- `frontend/src/hooks/useSlotPoolPlacement.js` : logique pool/slots avec swap, retour au pool et sélection ;
- `frontend/src/components/PlacementTileButton.js` : primitive de tuile sélectionnable/drag ;
- `frontend/src/components/PlacementDropZone.js` : primitive de zone cible drop/click.

Objectif : réduire la duplication des handlers de drag/click entre activités et garder un comportement cohérent sur desktop et tactile.

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

Les activités sont organisées par **discipline** (ex: Mathématiques, Français) et **catégorie** (ex: Nombres, Calcul, Grammaire). Cette classification peut être modifiée depuis l'espace Administration pour faciliter le filtrage dans les vues Enseignant et Élève.

### 1. `SortNumbersActivity.js`

**But** : ranger des nombres dans l'ordre croissant ou décroissant.

Exemple de configuration :

```json
{
  "defaultLevel": "level1",
  "levels": {
    "level1": { "label": "Niveau 1", "count": 5, "min": 1, "max": 99, "order": "asc" },
    "level2": { "label": "Niveau 2", "count": 7, "min": 1, "max": 999, "order": "asc" },
    "level3": { "label": "Niveau 3", "count": 9, "min": 1, "max": 9999, "order": "desc" }
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
- `levels.levelX.order` avec `asc`/`croissant` ou `desc`/`décroissant` ; les alias `sortOrder` et `direction` sont aussi acceptés
- `numbersByLevel.levelX` pour imposer une série précise

Comportement :

- interface en glisser-déposer avec en-tête, barre de progression, réserve de tuiles et zone `? < ? < ?` ou `? > ? > ?` selon l'ordre configuré ;
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

Quatre niveaux (`level1` à `level4`) sont prévus par défaut ; l'exemple ci-dessus n'en configure que trois.

Comportement :

- section `hero` avec le titre, l'instruction et les niveaux disponibles ;
- une seule tuile centrale dans la section `pool` ;
- aucun glisser-déposer, aucune zone de dépôt, aucune validation et aucun score ;
- bouton `Recommencer` pour afficher un nouveau nombre du niveau courant.

---

### 3. `MatchAdditionsActivity.js`

**But** : associer chaque addition à son bon résultat.

Exemple de configuration à trois niveaux :

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

Champs globaux : `title`, `instruction`, `defaultLevel`, `fake` (tuile imposteur) et `skill` (compétence affichée dans les réglages).

Paramètres disponibles par niveau :

- `label` : libellé affiché pour le niveau.
- `count` : nombre de paires à associer.
- `min` : borne minimale pour le tirage aléatoire des termes.
- `max` : borne maximale pour le tirage aléatoire des termes.
- `step` *(défaut : `1`)* : pas de progression du tirage aléatoire, équivalent à `range(min, max+1, step)` en Python. Par exemple, `step: 5` avec `min: 20, max: 50` génère uniquement les valeurs 20, 25, 30, 35, 40, 45, 50.
- `mode` *(défaut : `"addition"`)* : définit le type d'addition générée.
  - `"addition"` : les deux termes sont tirés indépendamment dans `[min, max]` avec le pas `step`.
  - `"double"` : les deux termes sont identiques (`a + a = résultat`), permettant d'associer un nombre et son double.
  - `"moitie"` : demande de trouver la moitié d'un nombre généré. Le nombre généré sera toujours rendu pair pour garantir un résultat entier. La question s'affichera sous la forme `la moitié de X`.
- `fake` *(défaut : `false`)* : si activé, ajoute une tuile imposteur (un résultat plausible mais erroné) dans la réserve pour augmenter la difficulté. Peut être défini globalement ou spécifiquement par niveau.

L'activité supporte jusqu'à **4 niveaux** (`level1` à `level4`). Les niveaux affichés sont déduits dynamiquement de ceux présents dans la configuration JSON.

---

#### Cas particulier : Associer un nombre et son double

Avec `"mode": "double"`, les deux termes de l'addition sont toujours égaux (`a + a`). Le paramètre `step` permet de contraindre les valeurs tirées.

Exemples :

```json
{
  "title": "Associe chaque nombre à son double",
  "instruction": "Fais glisser chaque résultat vers la bonne addition, puis valide.",
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "Doubles de 1 à 15",
      "count": 5,
      "min": 1,
      "max": 15,
      "step": 1,
      "mode": "double"
    },
    "level2": {
      "label": "Doubles de 20 à 50 (multiples de 5)",
      "count": 5,
      "min": 20,
      "max": 50,
      "step": 5,
      "mode": "double"
    },
    "level3": {
      "label": "Doubles de 100 à 150 (pas de 50)",
      "count": 3,
      "min": 100,
      "max": 150,
      "step": 50,
      "mode": "double"
    },
    "level4": {
      "label": "Doubles de 26 à 99",
      "count": 6,
      "min": 26,
      "max": 99,
      "step": 1,
      "mode": "double"
    }
  }
}
```

Résultats produits par chaque niveau :
- **Niveau 1** (`min=1, max=15, step=1`) → 1+1=2, 2+2=4, … jusqu'à 15+15=30
- **Niveau 2** (`min=20, max=50, step=5`) → 20+20=40, 25+25=50, … jusqu'à 50+50=100
- **Niveau 3** (`min=100, max=150, step=50`) → 100+100=200, 150+150=300
- **Niveau 4** (`min=26, max=99, step=1`) → 26+26=52, 27+27=54, … jusqu'à 99+99=198

---

#### Cas particulier : Trouver la moitié d'un nombre

Avec `"mode": "moitie"`, le système génère un nombre cible (rendu pair automatiquement) et demande de glisser le résultat correspondant à sa moitié. On utilise souvent l'attribut `"fake": true` pour ajouter un intrus parmi les réponses proposées.

Exemple :

```json
{
  "title": "Associe chaque nombre à sa moitié",
  "instruction": "Fais glisser la bonne moitié vers le nombre correspondant.",
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "Moitiés simples",
      "count": 4,
      "min": 10,
      "max": 50,
      "step": 2,
      "mode": "moitie",
      "fake": true
    }
  }
}
```

---

Personnalisation avancée possible via :

- `challenges`
- `challengesByLevel.level1|2|3|4`

Chaque défi suit le format :

```json
{ "id": 1, "left": 12, "right": 7, "result": 19 }
```

`id` est facultatif et `result` peut être omis : il est alors calculé comme `left + right`.

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

Paramètres disponibles au niveau de l'activité :

- `title`, `instruction` et `defaultLevel` ;
- `inputType` : `"NumberPad"` (par défaut), `"OCR"` pour utiliser Tesseract.js ou `"MyScript"` pour la reconnaissance d'écriture manuscrite MyScript.

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

- `title`, `instruction` et `defaultLevel` ;
- `levels.levelX.min` / `levels.levelX.max`
- `levels.levelX.allowEquality`
- `levels.levelX.equalityChance` : probabilité d'obtenir une égalité, entre `0` et `1`
- `levels.levelX.decompositionMode` : `none`, `left`, `right` ou `random`
- `levels.levelX.decompositionStyle` : `strict`/`stricte` ou `medium`/`moyenne` (ignoré si `decompositionMode` vaut `none`)
- `pairsByLevel.levelX` pour imposer des couples précis
- `pairsByLevel.levelX[].left` et `right` pour définir les deux nombres à comparer
- `pairsByLevel.levelX[].decompositionMode` pour surcharger le côté décomposé sur une paire donnée
- `pairsByLevel.levelX[].decompositionStyle` pour imposer un style précis sur une paire

Comportement :

- comparaison avec les signes `<`, `=` et `>` ;
- un des deux nombres peut être affiché sous forme de tuiles de centaines, dizaines et unités ;
- `stricte` : `763 = 700 + 60 + 3` ;
- `moyenne` : seule la partie `unités` peut dépasser 9, par exemple `752 = 700 + 40 + 12` ;
- les centaines et les dizaines restent strictement décomposées ;
- score enregistré sur 20 avec le niveau courant.

Quatre niveaux (`level1` à `level4`) sont disponibles par défaut.

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
  "defaultZoom": 2.0,
  "storageKey": "TBTS_INTERACTIVE_WHITEBOARD"
}
```

Valeurs de `paperStyle` :

- `blank` : fond blanc
- `seyes` : lignage Seyès pour l'écriture
- `grid` : quadrillage pour géométrie
- `millimeter` : papier millimétré

Paramètres de contenu :

- `defaultTitle` : titre initial du tableau ;
- `width` / `height` : dimensions du tableau ;
- `backgroundColor` : couleur de fond ;
- `paperStyle` : type de papier parmi les valeurs ci-dessus ; l'ancien booléen `showGrid: true` active aussi le quadrillage si `paperStyle` n'est pas défini ;
- `fontFamily` : police du texte (`Cursif`, `Cursive Standard` ou `Inter, Arial, sans-serif`) ;
- `defaultZoom` : zoom initial (valeur de la configuration par défaut : `2.0`) ;
- `storageKey` : clé de sauvegarde dans `localStorage`.

Notes :

- `width` / `height` définissent la taille utile du tableau ;
- `storageKey` sert à la sauvegarde `localStorage` ;
- la prop `student` permet de personnaliser les exports ;
- cette activité peut être utilisée avec ou sans élève sélectionné selon le contexte.
- Utilise la dépendance npm `fabric` en version `7.4.0`.

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

Paramètres :

- `title`, `instruction` et `defaultLevel` ;
- `levels.levelX.label` : libellé du niveau ;
- `totalWords`
- `wordsPerRound`
- `maxWordLevel`
- `classifications`

Natures grammaticales disponibles (valeurs recommandées pour `classifications`) :

- `nom` mais aussi `Nom masculin`, `Nom féminin`, `nom commun`
- `verbe` mais aussi `verbe 3eme groupe`, etc.
- `adverbe`
- `adjectif`
- `pronom`
- `determinant`
- `preposition`, `conjonction`, `interjection`

Comportement :

- chargement dynamique de mots depuis l'API selon le niveau et les catégories demandées ;
- classement possible par **glisser-déposer** ou par **clic** (sélection d'un mot puis d'une catégorie) ;
- tuiles de mots avec **rotation aléatoire** pour un rendu plus vivant ;
- bilan final par catégorie avec affichage des erreurs et symbole `✓` lorsqu'il n'y a aucune erreur ;
- score enregistré sur 20 avec renvoi du `levelKey` et du `levelLabel` via `onComplete(...)`.

---

### 8. `SentenceWordClassificationActivity.js`

**But** : analyser une ou plusieurs phrases issues de la base, puis classer uniquement certains mots dans la bonne catégorie grammaticale.

Exemple de configuration :

```json
{
  "title": "Classification des mots d'une phrase",
  "instruction": "Lis chaque phrase puis classe les mots demandés dans la bonne catégorie grammaticale.",
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "Niveau 1",
      "sentenceCount": 1,
      "sourceLevel": "CE1",
      "sourceTheme": "animaux",
      "requiredNatures": ["nom", "verbe"]
    },
    "level2": {
      "label": "Niveau 2",
      "sentenceCount": 2,
      "sourceLevel": "CE1",
      "sourceTheme": "école",
      "requiredNatures": ["nom", "verbe", "determinant"]
    }
  }
}
```

Paramètres utiles :

- `title`, `instruction` et `defaultLevel` ;
- `levels[].sentenceCount`
- `levels[].sourceLevel`
- `levels[].sourceTheme`
- `levels[].requiredNatures`

Comportement :

- sélection aléatoire de phrases stockées en base avec priorité aux compteurs les plus bas ;
- filtrage optionnel par niveau, thème et natures de mots attendues ;
- affichage de la phrase en cours avec les mots à classer sous forme de petites tuiles ;
- classement par glisser-déposer ou par clic, puis passage automatique à la phrase suivante ;
- bilan final avec score sur 20 et affichage des erreurs par catégorie.

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

- `title`, `instruction` et `defaultLevel` ;
- `levels.levelX.label` : libellé du niveau ;
- `levels.levelX.answerCount` : nombre de choix de réponse ;
- `levels.levelX.fractions[]` : fractions proposées, chacune avec `numerator` et `denominator` ;
- `levels.levelX.minDenominator`, `maxDenominator` et `maxNumerator` : bornes de génération automatique si aucune liste de fractions n'est fournie ;
- `levels.levelX.visualTypes` : figures autorisées (`circle`, `bar`, `square`, ou leurs alias français `cercle`, `barre`, `carre`/`carré`).

Comportement :

- visuel affiché à gauche et réponses sur tuiles cliquables à droite ;
- fractions toujours **strictement inférieures à 1** ;
- une seule réponse correcte par série ;
- score sur 20 avec renvoi du niveau courant dans `onComplete(...)`.

---

### 10. `HomophonesActivity.js`

**But** : compléter des phrases à trou avec le bon homophone (mot au même son) parmi plusieurs propositions.

Exemple de configuration :

```json
{
  "title": "Homophones",
  "instruction": "Sélectionne le mot correct pour compléter la phrase.",
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "es / est / et",
      "sentenceCount": 10,
      "sounds": ["es", "est", "et"]
    },
    "level2": {
      "label": "à / a / as",
      "sentenceCount": 10,
      "sounds": ["à", "a", "as"]
    },
    "level3": {
      "label": "on / ont",
      "sentenceCount": 10,
      "sounds": ["on", "ont"]
    }
  }
}
```

Paramètres :

- `title`, `instruction` et `defaultLevel` ;
- `levels.levelX.label` : libellé du niveau ;
- `sentenceCount` : nombre de phrases à compléter pour ce niveau (au moins 1) ;
- `sounds` : liste des mots/homophones proposés comme boutons (ex: `["à", "a", "as"]`).

Interaction :

- **Premier clic** : sélectionne un homophone et le **prévisualise** dans le blanc de la phrase ;
- **Deuxième clic** sur le même bouton : **valide** la réponse ;
- Si juste : message d'encouragement "Bravo ! Bonne réponse." ;
- Si faux : affichage de la bonne réponse "Erreur. La bonne réponse était : [son]".

Comportement :

- **Chargement dynamique** : les phrases sont récupérées via l'API `/api/ai/sentences-by-word` en fonction du niveau et des sons demandés ;
- **Sélection intelligente** : les phrases les moins utilisées sont prioritaires (compteur bas) pour favoriser la diversité ;
- **Gestion multi-niveaux** : le changement de niveau charge automatiquement de nouvelles phrases ;
- Score enregistré sur 20 avec renvoi du `levelKey` et du `levelLabel` via `onComplete(...)` ;
- En mode démo (`student=null`), aucun résultat n'est enregistré et le bouton "Recommencer" reste actif.

---

### 11. `MakeChangeActivity.js`

**But** : préparer la somme exacte demandée en manipulant des pièces et des billets.

Exemple de configuration :

```json
{
  "title": "Le Jeu de la Monnaie",
  "instruction": "Prépare la somme demandée en utilisant le moins de pièces et billets possible.",
  "mode": "deposer",
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "Euros uniquement",
      "min": 1,
      "max": 10,
      "useCents": false
    },
    "level2": {
      "label": "Euros et centimes (pas de 5)",
      "min": 11,
      "max": 40,
      "useCents": true,
      "centsStep": 5
    },
    "level3": {
      "label": "Euros et centimes (pas de 1)",
      "min": 41,
      "max": 100,
      "useCents": true,
      "centsStep": 1
    }
  }
}
```

Paramètres :

- `title`, `instruction` et `defaultLevel` ;
- `levels.levelX.label` : libellé du niveau ;
- `min` : valeur minimale de la somme à générer (en euros).
- `max` : valeur maximale de la somme à générer (en euros).
- `useCents` : `true` pour activer les centimes, `false` pour rester sur des sommes rondes en euros.
- `centsStep` : définit le multiple des centimes (`1` pour tous les centimes, `5` pour des multiples de 0,05 €).

Paramètres globaux utiles :

- `mode` : `deposer` (mode classique) ou `calculer` (mode inversé).

Comportement :

- **Rendu réaliste** : Les pièces de centimes utilisent des couleurs distinctes (cuivré pour 1c/2c/5c, doré pour 10c/20c/50c).
- **Précision** : La logique interne utilise des calculs en centimes entiers pour éviter les erreurs de virgule flottante.
- **Mode `deposer`** : L'élève reçoit un montant cible et ajoute/retire des pièces et billets depuis la réserve.
- **Mode `calculer`** : L'élève voit directement des pièces et billets déposés, puis saisit la somme via `FloatingNumberPad`.
- **Saisie décimale** : La touche `,` est affichée sur le pavé numérique uniquement si le niveau courant active `useCents`.
- **Validation** : Le bouton "Valider" compare la réponse saisie (mode `calculer`) ou la somme déposée (mode `deposer`).
- **Réinitialisation** : Le bouton "Vider" permet de retirer tout l'argent déposé pour recommencer.
- **Score** : Enregistré avec le niveau courant via `onComplete(...)`.

---

### 12. `EvenOddClassificationActivity.js`

**But** : classer des nombres aléatoires dans la bonne catégorie (Pair ou Impair).

Exemple de configuration :

```json
{
  "title": "Tri de nombres pairs ou impairs",
  "instruction": "Fais glisser chaque nombre dans la bonne colonne (Pair ou Impair).",
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "Niveau 1",
      "totalNumbers": 10,
      "numbersPerRound": 1,
      "min": 0,
      "max": 20,
      "classifications": [
        "Pair",
        "Impair"
      ]
    },
    "level2": {
      "label": "Niveau 2",
      "totalNumbers": 12,
      "numbersPerRound": 2,
      "min": 20,
      "max": 99,
      "classifications": [
        "Pair",
        "Impair"
      ]
    },
    "level3": {
      "label": "Niveau 3",
      "totalNumbers": 15,
      "numbersPerRound": 4,
      "min": 100,
      "max": 999,
      "classifications": [
        "Pair",
        "Impair"
      ]
    }
  }
}
```

Paramètres :

- `title`, `instruction` et `defaultLevel` ;
- `levels.levelX.label` : libellé du niveau ;
- `totalNumbers` : Nombre total de nombres à trier pour le niveau.
- `numbersPerRound` : Nombre maximum de tuiles affichées simultanément dans le pool.
- `min` : Borne minimale pour la génération des nombres.
- `max` : Borne maximale pour la génération des nombres.
- `classifications` : Catégories à afficher (par défaut `["Pair", "Impair"]`).

Comportement :

- **Génération dynamique** : Les nombres sont tirés de manière aléatoire côté client selon le range `[min, max]`.
- **Rounds de jeu** : Le pool affiche `numbersPerRound` tuiles. Dès qu'un nombre est placé, il est remplacé par un nombre restant.
- **Interactions hybrides** : Support du glisser-déposer ainsi que de la sélection au clic tactile (tuile puis catégorie).
- **Affichage des erreurs** : Bilan final avec score sur 20 et affichage pour chaque catégorie des nombres mal classés ainsi que de leur catégorie attendue.
- **Mode Démo** : Si aucun élève n'est actif, l'activité tourne en mode démo et le bouton "Recommencer" est toujours accessible.

---

### 13. `NumberLineActivity.js`

**But** : Compléter les nombres manquants placés aléatoirement sous une droite graduée en s'aidant des repères déjà affichés au-dessus.

Exemple de configuration :

```json
{
  "title": "Droite graduée",
  "instruction": "Complète les nombres manquants placés en dessous de la droite graduée.",
  "defaultLevel": "level1",
  "levels": {
    "level1": {
      "label": "Pas de 1 (10 à 100)",
      "min": 10,
      "max": 100,
      "step": 1,
      "ticksCount": 20,
      "readonlyCount": 3,
      "inputsCount": 5
    }
  }
}
```

Paramètres :

- `title`, `instruction` et `defaultLevel` ;
- `levels.levelX.label` : libellé du niveau ;
- `min` : Borne minimale de valeur autorisée pour le tirage de la première graduation à gauche.
- `max` : Borne maximale de valeur autorisée pour la droite graduée.
- `step` : Le pas de graduation (ex: `1`, `2`, `5`, `10`, `100`).
- `ticksCount` : Nombre total de graduations affichées (défaut : `20`).
- `readonlyCount` : Nombre de repères déjà placés et visibles au-dessus de la droite (défaut : `3`).
- `inputsCount` : Nombre de repères vides à compléter en dessous de la droite (défaut : `5`).

Quatre niveaux (`level1` à `level4`) sont préconfigurés ; chaque niveau peut redéfinir ces paramètres.

Comportement :

- **Calcul de plage et contraintes** : La première graduation de gauche $V_0$ est tirée aléatoirement de sorte que $V_0 \ge \text{min}$, que $V_0$ soit un multiple de `step`, et que la dernière graduation à droite $V_{N-1} = V_0 + (ticksCount - 1) \times step \le \text{max}$. Si ces contraintes ne sont pas applicables, un message d'erreur en français s'affiche à la place de la droite graduée.
- **Tirage des repères** : Les index des repères affichés au-dessus et des repères à compléter en dessous sont tirés de manière aléatoire et sont strictement disjoints.
- **Saisie et validation** : Au clic sur une zone "?", un pavé numérique s'ouvre. Le bouton "Valider" apparaît lorsque toutes les cases sont complétées. Après validation, les réponses correctes sont affichées en vert, les incorrectes en rouge avec la bonne réponse affichée en noir sous la case.

---

### 14. `AlphabeticalSortActivity.js`

**But** : ranger une série de mots dans l'ordre alphabétique, en comparant les lettres selon le niveau choisi.

Exemple de configuration :

```json
{
  "title": "Classe les mots dans l'ordre alphabétique",
  "instruction": "Fais glisser chaque étiquette dans la bonne case numérotée pour ranger les mots de A à Z.",
  "defaultLevel": "level1",
  "levels": {
    "level1": { "label": "Niveau 1", "description": "Première lettre différente", "wordCount": 4 },
    "level2": { "label": "Niveau 2", "description": "Même première lettre", "wordCount": 5 },
    "level3": { "label": "Niveau 3", "description": "Mêmes deux premières lettres", "wordCount": 5 },
    "level4": { "label": "Niveau 4", "description": "Mélange des niveaux", "wordCount": 6 }
  }
}
```

Paramètres :

- `title`, `instruction` et `defaultLevel` ;
- `levels.levelX.label` : nom du niveau ;
- `levels.levelX.description` : règle de comparaison affichée ;
- `levels.levelX.wordCount` : nombre de mots à ordonner.

Les mots sont chargés depuis l'API. L'activité propose quatre niveaux et enregistre le score avec le niveau courant.

---

### 15. `ClassSoundMeterActivity.js`

**But** : visualiser le niveau sonore ambiant et aider la classe à respecter une durée de travail calme.

Exemple de configuration :

```json
{
  "title": "Sonomètre de Classe",
  "subtitle": "Outil visuel pour garder une ambiance de travail calme.",
  "timerMinutes": 3,
  "paletteName": "Ocean",
  "sensitivityMultiplier": 1,
  "sensitivityMin": 0.5,
  "sensitivityMax": 5
}
```

Paramètres :

- `title` et `subtitle` : titre et texte descriptif ;
- `timerMinutes` : durée du minuteur, limitée de 1 à 60 minutes ;
- `paletteName` : palette `Classique`, `Ocean` ou `Crépuscule` ;
- `sensitivityMin` et `sensitivityMax` : limites de sensibilité ;
- `sensitivityMultiplier` : sensibilité utilisée, bornée par les limites configurées.

L'activité mesure le son avec le microphone ; le navigateur doit autoriser son accès.

---

### 16. `CodeJuniorActivity.js`

**But** : proposer un jeu interactif pour découvrir la programmation et suivre la progression de l'élève.

Exemple de configuration :

```json
{
  "title": "Code Junior",
  "description": "Découvre la programmation en t'amusant !"
}
```

Paramètres :

- `title` : titre affiché au-dessus du jeu ;
- `description` : texte descriptif affiché sous le titre.

Ces champs sont facultatifs et reprennent leurs valeurs par défaut s'ils sont absents.

---

### 17. `VerbEndingCompletionActivity.js`

**But** : choisir la terminaison correcte d'un verbe en `-er` pour compléter une phrase.

Exemple de configuration :

```json
{
  "title": "Verbes finissant par 'er'",
  "instruction": "Sélectionne la terminaison correcte pour compléter le verbe dans la phrase.",
  "defaultLevel": "level1",
  "levels": {
    "level1": { "label": "Niveau 1", "sentenceCount": 4, "endings": ["es", "ent"] },
    "level2": { "label": "Niveau 2", "sentenceCount": 6, "endings": ["e", "es", "ent"] },
    "level3": { "label": "Niveau 3", "sentenceCount": 8, "endings": ["e", "es", "ez", "ent"] }
  }
}
```

Paramètres :

- `title`, `instruction` et `defaultLevel` ;
- `levels.levelX.label` : nom du niveau ;
- `levels.levelX.sentenceCount` : nombre de phrases de la série ;
- `levels.levelX.endings` : terminaisons proposées.

Les phrases sont chargées depuis la base selon les terminaisons demandées. Le score est enregistré sur 20 avec le niveau courant.
