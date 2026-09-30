# EXAD Professional Website — Corporate Edition
Site vitrine multi-pages responsive pour EXAD SARL.

Pages:
- index.html
- about.html
- datacenter.html
- cybersecurity.html
- fleet.html
- achievements.html
- contact.html

Les contenus de référence ont été alignés avec les informations publiques EXAD et les éléments fournis pour le projet.
## Formulaire de contact
Le formulaire valide les champs puis ouvre la messagerie du visiteur avec la demande pré-remplie (adresse cible : attribut `data-to` du formulaire dans `contact.html`).
Pour un envoi direct sans passer par la messagerie, remplacer le bloc « Formulaire de contact » de `script.js` par un appel `fetch()` vers une API ou un service comme Formspree.

## Structure
- `styles.css` : styles communs (thème sombre, responsive, accessibilité)
- `script.js` : menu mobile, animations, formulaire, année du copyright
- `favicon.svg`, `sitemap.xml`, `robots.txt`
- L'en-tête et le pied de page sont identiques sur toutes les pages : toute modification doit être reportée sur chaque fichier HTML.
