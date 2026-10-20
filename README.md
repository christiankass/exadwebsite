# Site web EXAD

Site vitrine multi-pages d'EXAD SARL (Kinshasa, RDC).

## Pages
`index.html`, `about.html`, `services.html`, `datacenter.html`, `cybersecurity.html`, `fleet.html`, `achievements.html`, `contact.html`

## Structure
- `styles.css` : tous les styles. La section « AMÉLIORATIONS v2 » en fin de fichier gère le menu mobile, le formulaire, les partenaires et l'assistant.
- `script.js` : script commun à toutes les pages (menu mobile, sous-menu Services, slider du hero, animations, formulaire, assistant).
- L'en-tête et le pied de page sont identiques sur toutes les pages : une modification doit être reportée sur chaque fichier HTML.
- Images : JPEG compressés (cartes 800 px, bandeaux 1000 px) et WebP pour le slider du hero.

## Version anglaise
Les pages anglaises sont dans le dossier `en/`. Elles sont **générées automatiquement** à partir des pages françaises : ne pas les modifier à la main.

Après toute modification d'une page française :
1. lancer `python tools/build_en.py` ;
2. si le script signale des « textes sans traduction », les ajouter dans `tools/en.json` (texte français → texte anglais) puis relancer.

Le script génère aussi `i18n.js`, le dictionnaire utilisé par le drapeau pour changer de langue **sans recharger la page** (le choix est mémorisé pour les pages suivantes).

Les textes de l'assistant, du formulaire et du slider sont traduits dans `script.js` (fonction `t()` et `replyEn()`).

## Tester en local
Double-cliquer sur `demarrer_serveur.bat`, puis ouvrir http://127.0.0.1:8001

## Formulaire de contact
Sans serveur, le formulaire valide les champs puis ouvre la messagerie du visiteur avec la demande pré-remplie vers `sales@exadgroup.org` (attribut `data-to` dans `contact.html`).

Pour un envoi direct (sans passer par la messagerie du visiteur), brancher un service de formulaires comme Formspree ou FormSubmit dans le bloc « Formulaire de contact » de `script.js`.

## Après une modification du CSS ou du JS
Augmenter le numéro `?v=40` dans les balises `<link>` et `<script>` de chaque page pour forcer les navigateurs à recharger les fichiers.

## Administration (page /admin)

La page `admin/index.html` permet de modifier le site sans toucher au code :
actualités, photos de l'équipe, logos partenaires et clients, titres animés,
chiffres clés, coordonnées et messagerie en direct (Tawk.to).

- **Fonctionnement** : l'admin parle à `admin/api.php`, hébergé avec le site chez LWS
  (PHP 7.4 ou plus récent). Chaque enregistrement écrit `data/content.json` et les photos
  dans `uploads/`, puis reconstruit aussitôt les pages françaises et anglaises
  (`admin/lib/build.php`, qui donne exactement le même résultat que
  `tools/build_content.py` puis `tools/build_en.py`). GitHub n'intervient plus.
- **Connexion** : e-mail et mot de passe. Juste après la mise en ligne, ouvrir `/admin`
  pour créer le compte administrateur principal (possible seulement tant qu'aucun compte
  n'existe). Les autres administrateurs s'ajoutent depuis « Accès administrateurs ».
- **Données privées** : comptes (mots de passe chiffrés), sessions et sauvegardes sont dans
  `admin/private/`, créé automatiquement et inaccessible depuis le web. Ce dossier
  n'est pas dans Git : ne pas le supprimer sur le serveur.
- **Sauvegardes** : une copie du contenu est gardée avant chaque enregistrement (les 60
  dernières). Le bouton « Annuler » du tableau de bord remet le site dans l'état d'avant.
- **Zones gérées** : dans les pages françaises, elles sont entourées de commentaires
  `<!-- cms:nom --> … <!-- /cms:nom -->`. Ne pas les supprimer ; le reste des pages
  se modifie normalement.
- **Avant de modifier le code à la main** : le contenu à jour est sur le serveur, pas
  sur GitHub. Récupérer d'abord `data/content.json`, `uploads/` et les pages depuis LWS,
  et ne jamais renvoyer ces fichiers par-dessus ceux du serveur sans les avoir récupérés.

## Mise en ligne chez LWS

Le site est hébergé chez LWS (sous-domaine `sitewebtest.exadgroup.org`, dossier
`htdocs/sitewebtest.exadgroup.org`). Les fichiers s'envoient depuis le gestionnaire de
fichiers de LWS ; le contenu, lui, se modifie directement en ligne depuis `/admin`.
Les dossiers `.github/` et les scripts `tools/*.py` ne servent pas sur le serveur,
mais `tools/*.json` est nécessaire à la reconstruction des pages.
