# Guide d'installation du projet avec Git

Ce dossier contient les scripts utiles pour **mettre à jour** l'application sur un poste Windows.

---

## 1. Installer Git

Télécharger **Git for Windows** :  
https://git-scm.com/download/win

Pendant l'installation, les options par défaut conviennent dans la majorité des cas.

---

## 2. Vérifier que Git fonctionne

Ouvrir **PowerShell** ou le terminal intégré de **Visual Studio Code**, puis exécuter :

```powershell
git --version
```

Si un numéro de version s'affiche, Git est installé correctement.

---

## Configuration initiale de Git (pour développeur)

Si vous comptez faire des **commits** sur ce PC, configurez une première fois votre identité Git :

```powershell
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

Vérifier la configuration :

```powershell
git config --global --list
```

> ℹ️ Si le PC sert uniquement à faire `git clone` et `git pull`, cette étape n'est pas obligatoire.

---

## 3. Cloner le projet

Dans le dossier où vous souhaitez installer l'application :

```powershell
git clone https://github.com/sletonqu/ActivitesClasse.git
cd ActivitesClasse
```

---

## 4. Ouvrir le projet dans Visual Studio Code

Depuis le dossier du projet :

```powershell
code .
```

Si la commande `code` n'est pas reconnue, vous pouvez simplement ouvrir le dossier `ActivitesClasse` manuellement dans VS Code.

---

## 5. Installer Docker Desktop

Le projet utilise **Docker Compose** pour lancer le frontend, le backend et la base de données.

Télécharger Docker Desktop :  
https://www.docker.com/products/docker-desktop/

Vérifier ensuite l'installation :

```powershell
docker --version
docker compose version
```

---

## 6. Lancer le projet

Depuis la racine du dépôt :

```powershell
docker compose up --build -d
```

Accès une fois démarré :

- **Application** : http://localhost:3000
- **API backend** : http://localhost:4000

---

## 7. Mettre à jour le projet plus tard

Une fois le projet installé, la méthode recommandée sur un PC de classe est d'utiliser le script suivant :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update-application.ps1
```

Ce script :

- sauvegarde la base existante ;
- récupère les dernières modifications avec `git pull --ff-only` ;
- vérifie si le script de mise à jour a lui-même changé ; si oui, il s'arrête et demande de le relancer ;
- reconstruit les images avec `docker compose build --pull`, puis redémarre les services avec `docker compose up -d`.

---

## 8. Mise à jour manuelle avec Git

Si vous préférez faire la mise à jour vous-même :

```powershell
git pull origin main
docker compose build --pull
docker compose up -d
```

---

## 9. Arrêter l'application

```powershell
docker compose down
```

Pour supprimer aussi les données locales :

```powershell
docker compose down -v
```

> ⚠️ `docker compose down -v` efface les données locales de l'application.

---

## 10. Scripts de maintenance et utilitaires

Le dossier `scripts/` regroupe plusieurs scripts facilitant l'exploitation et la maintenance du projet :

### `enrich_verb_tenses.ps1` (Enrichissement des verbes par IA)

Analyse par lot les phrases de la base SQLite et enrichit automatiquement chaque verbe avec son temps (`temps`) et son infinitif (`infinitif`) via l'IA.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\enrich_verb_tenses.ps1 [-Provider <gemini|openai|mistral>] [-Batch <20>] [-Limit <0>]
```

Paramètres :
- `-Provider` : Fournisseur IA (`gemini` par défaut, `openai` ou `mistral`)
- `-Batch` : Nombre de phrases traitées par lot (défaut : `20`)
- `-Limit` : Limite de phrases à traiter (`0` = toutes les phrases éligibles, défaut : `0`)

### `update-application.ps1` (Mise à jour sécurisée)

Sauvegarde la base SQLite locale, effectue un `git pull --ff-only`, reconstruit les conteneurs et redémarre l'application sans perte de données.

### `start-local-updater.ps1` (Service d'écoute pour l'espace Admin)

Lance un serveur local léger sous Windows permettant au bouton « Demander la mise à jour » de l'espace Admin de déclencher `update-application.ps1` hors conteneur.

### `generate_base10_blocks.py` (Générateur d'assets)

Script Python générant les représentations visuelles vectorielles (cubes, barres, plaques) pour l'activité de numération en base 10.

