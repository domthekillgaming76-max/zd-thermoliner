Placez ici l'image du salon "Feuille de route".

Nom de fichier attendu par l'application : `road-sheet-salon.jpg`

Pour ajouter la photo fournie via la discussion, copiez le fichier image ici avec ce nom :

Windows (PowerShell):

  Copy-Item -Path "C:\chemin\vers\votre\image.jpg" -Destination "public\images\road-sheet-salon.jpg"

macOS / Linux:

  cp /chemin/vers/image.jpg public/images/road-sheet-salon.jpg

Après cela, rebuild (`npm run build`) si vous déployez depuis les artefacts, ou rafraîchissez la page si vous servez en `vite dev`.
