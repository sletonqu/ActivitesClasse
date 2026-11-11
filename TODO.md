### TODO

# [FAIT] Optimiser le chargement initial du JavaScript
- Code-splitting des vues (Admin, Enseignant, Résultats, Élève) via React.lazy() et Suspense.
- Chargement asynchrone des 22 activités dans ActivityContainer via React.lazy().
- Chargement asynchrone à la demande des modales lourdes (Fabric.js ~359 Ko, MyScript/iink ~568 Ko, Tesseract/OCR).
- Chunks séparés et isolés (`vendor` React/Router mis en cache, bundle initial d'un élève réduit de 1,73 Mo / 459 Ko gzip à ~118 Ko gzip).


# Jeu du ticket de caisse
https://classeadeux.forge.apps.education.fr/mathematickets/eleve.html


# Se repérer sur un quadrillage
https://maitrelucas.b-cdn.net/wp-content/uploads/quadrillage-1-768x1093.png

# Copie cachée / Copie rapide
Catégorie OUtil
Paramètre avec la liste des 5 mots de la semaine à copier
affiche (assés haut, visible pour les élève) en grosse taille (paramètrable) les mots en bleu ou noir (dictée), aléatoirement pendant 3s (parmaètre) puis efface pendant 15s (paramètre)
à la fin affiche en vert (correction) la liste des mots qui sont passés
bouton 'pause' / 'continue'
