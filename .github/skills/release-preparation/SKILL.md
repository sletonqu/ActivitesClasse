---
name: release-preparation
description: Préparer une version, analyser les changements depuis le dernier tag, mettre à jour les métadonnées de version et créer un tag annoté avec une release GitHub après validation des notes.
---

# Préparer et taguer une release

Utilise ce skill quand on te demande de préparer une nouvelle version, d'analyser les changements depuis une version publiée, de créer un tag ou de publier une release GitHub pour ActivitesClasse.

## Règles impératives

- Réponds et rédige les notes de version en français.
- N'inclus dans l'analyse que les changements commités depuis le tag de départ. Ignore les modifications locales non commités, qu'elles soient suivies ou non suivies.
- Ne modifie, ne supprime, ne réinitialise et ne nettoie jamais les changements locaux sans rapport avec la release.
- N'ajoute au commit de release que les métadonnées de version explicitement concernées et les éventuels fichiers de notes de release demandés.
- Ne pousse jamais avec `--force` et ne déplace jamais un tag existant.
- Ne crée ni ne pousse le tag, et ne publie pas la release GitHub avant que l'utilisateur ait validé les notes de version et demandé explicitement l'exécution de ces actions. Une demande d'analyse ou de préparation seule ne vaut pas autorisation de publication.
- Ne révèle jamais de jeton, mot de passe ou contenu de fichier `.env`. Utilise l'authentification Git/GitHub déjà configurée; ne demande pas de secret dans le chat.
- Préfixe chaque commande shell par `rtk`, conformément aux consignes du dépôt.
- Suis les directives du dépôt dans `AGENTS.md` et `.github/copilot-instructions.md`.

## Procédure

### 1. Déterminer la plage de changements

1. Vérifie la branche courante, le dépôt distant, le statut Git et les tags existants.
2. Identifie le dernier tag de version pertinent et son commit. Si plusieurs tags peuvent raisonnablement être considérés comme la version de départ, ou si l'utilisateur indique une version précise, utilise celle-ci; sinon, demande une clarification avant de choisir.
3. Vérifie que le tag cible n'existe ni localement ni sur le dépôt distant. S'il existe déjà, arrête-toi et demande comment procéder. Ne le remplace pas.
4. Analyse les commits de `TAG_DÉPART..HEAD` et leurs changements de fichiers. N'utilise pas `git diff` non borné pour rédiger les notes lorsque le worktree est sale.
5. Inspecte le statut du worktree avant toute édition. Distingue les changements locaux préexistants des changements faits pour la release. Préserve-les.

Commandes utiles :

```powershell
rtk git status --short
rtk git remote -v
rtk git tag --list
rtk git log --oneline --decorate TAG_DÉPART..HEAD
rtk git diff --name-status TAG_DÉPART..HEAD
rtk git diff --stat TAG_DÉPART..HEAD
rtk git diff --name-status TAG_DÉPART..HEAD -- frontend/src/activities
rtk git diff --name-status TAG_DÉPART..HEAD -- frontend/src/views frontend/src/components
```

Lis les détails des commits ou les diffs ciblés si leurs sujets ne suffisent pas à confirmer une fonctionnalité. N'infère pas une fonctionnalité à partir du seul nom d'un commit.

### 2. Vérifier et mettre à jour les versions

Recherche dans les fichiers suivis les références exactes à la version applicative précédente. Distingue-les des versions de dépendances tierces, qui ne doivent pas être modifiées dans le cadre d'une simple release.

Pour ce projet, vérifie au minimum :

- `frontend/package.json`
- `frontend/package-lock.json`
- `backend/package.json`
- `backend/package-lock.json`

Vérifie aussi les autres emplacements de version gérés par le projet, le cas échéant. Mets à jour les métadonnées applicatives pertinentes vers la version cible et garde cohérents `version` et la version du paquet racine dans les lockfiles. Ne change pas les versions des dépendances et ne régénère pas tout un lockfile sans nécessité.

Si la convention de version ou les fichiers à modifier ne sont pas clairs, demande confirmation avant d'éditer.

Valide les fichiers JSON avec le parseur disponible, puis inspecte précisément le diff :

```powershell
rtk git diff --check
rtk git diff -- frontend/package.json frontend/package-lock.json backend/package.json backend/package-lock.json
rtk git status --short
```

### 3. Rédiger et faire valider les notes

Établis les notes à partir des changements vérifiés, en regroupant les éléments utiles et en évitant de répéter chaque commit. Pour les activités, consulte les fichiers d'activité et les registres pertinents au besoin.

Présente d'abord le texte complet des notes à l'utilisateur, en Markdown et avec des puces `-`. Pour ActivitesClasse, organise-le par défaut ainsi :

```markdown
## Nouvelles activités
- ...

## Activités modifiées
- ...

## Modifications générales des vues et de l’application
- ...
```

N'attribue pas à la release un changement local non commité, même s'il semble terminé. Mentionne les changements de déploiement, de données, de documentation ou d'infrastructure dans la dernière section lorsqu'ils sont pertinents.

Attends la validation des notes. Si l'utilisateur demande des ajustements, révise le texte et fais-le valider avant de poursuivre.

### 4. Commiter uniquement les changements de release

Après validation des notes et autorisation de créer le commit :

1. Ajoute explicitement les chemins de version concernés, un par un; n'utilise pas `git add -A` ni `git add .`.
2. Vérifie le contenu indexé avec `git diff --cached --name-status`, `git diff --cached` et `git diff --cached --check`.
3. Si un fichier local sans rapport apparaît dans l'index, arrête-toi et demande avant de continuer; ne le désindexe pas sans autorisation.
4. Crée un commit explicite de préparation de version. Ajoute le trailer de co-auteur standard du dépôt quand la consigne applicable le requiert.
5. Confirme le commit et vérifie que les changements locaux préexistants sont toujours présents et n'ont pas été inclus.

### 5. Créer et pousser le tag

Ne poursuis qu'après autorisation explicite de créer et pousser le tag.

1. Vérifie à nouveau que le nom de tag cible n'existe pas localement ou à distance.
2. Crée un tag **annoté** pointant sur le commit de version validé :

```powershell
rtk git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

3. Vérifie le commit cible et les métadonnées du tag.
4. Pousse la branche autorisée et le seul tag ciblé, sans force :

```powershell
rtk git push origin BRANCHE
rtk git push origin refs/tags/vX.Y.Z
```

Ne pousse pas d'autres branches ou tags par commodité. Si la branche distante a avancé ou si le push est refusé, arrête-toi; n'effectue pas de rebase, réécriture ou push forcé sans nouvelle autorisation.

### 6. Publier et vérifier la release GitHub

La création d'un tag et la publication d'une release GitHub sont deux actions distinctes. Ne publie la release qu'après demande explicite de l'utilisateur.

- Utilise l'intégration GitHub authentifiée disponible ou l'interface GitHub déjà connectée.
- Renseigne le tag confirmé, un titre clair et exactement les notes validées.
- Si aucune authentification n'est disponible, explique le blocage et fournis le lien de création de release pour le tag; ne prétends pas que la release a été publiée.
- Après publication, vérifie la page de release, le titre, le contenu des notes et la présence du tag.
- Rapporte le lien de release, le commit de version, le tag et les validations réalisées.

## Validation finale

Avant de déclarer le travail terminé :

- vérifie que le JSON des manifests concernés est valide et que les versions sont cohérentes;
- vérifie `rtk git diff --check` et le commit/tag attendu;
- vérifie que la branche et le tag distants correspondent au commit visé;
- confirme que les changements locaux hors périmètre sont toujours intacts et exclus du commit;
- si le projet ou ses directives l'exigent et que l'environnement le permet, exécute `rtk docker compose up --build -d`;
- indique clairement ce qui a été préparé, commité, tagué et effectivement publié. N'annonce comme publiée qu'une release visible sur GitHub.
