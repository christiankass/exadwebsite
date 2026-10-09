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

- **Connexion** : e-mail et mot de passe. À la toute première connexion, l'administrateur
  principal crée son compte en fournissant une fois une clé d'accès GitHub « fine-grained »
  limitée au dépôt `exadwebsite` (*Contents : Read and write*, *Actions : Read-only*).
  Cette clé est chiffrée avec le mot de passe de chaque administrateur (PBKDF2 + AES-GCM)
  et rangée dans `admin/users.json` (les e-mails n'y figurent pas en clair). Les autres
  administrateurs s'ajoutent depuis « Accès administrateurs ». Quand la clé GitHub expire,
  recréer le compte principal avec une nouvelle clé, puis réajouter les collègues.
- **Enregistrement** : l'admin modifie `data/content.json` (et envoie les photos dans
  `uploads/`). GitHub lance ensuite `.github/workflows/admin-build.yml`, qui exécute
  `tools/build_content.py` puis `tools/build_en.py` et enregistre les pages à jour
  (environ 2 minutes).
- **Zones gérées** : dans les pages françaises, elles sont entourées de commentaires
  `<!-- cms:nom --> … <!-- /cms:nom -->`. Ne pas les supprimer ; le reste des pages
  se modifie normalement.
- **Avant de modifier le code à la main** : faire `git pull`, car l'admin a pu
  enregistrer de nouvelles versions sur GitHub.

## Mise en ligne chez LWS

Le site est hébergé chez LWS (sous-domaine `sitewebtest.exadgroup.org`). Il est envoyé automatiquement par FTP :
- à chaque changement sur la branche `main` (`.github/workflows/deploy-lws.yml`) ;
- après chaque enregistrement depuis `/admin`, une fois les pages reconstruites (`.github/workflows/admin-build.yml`).

Les identifiants FTP sont à enregistrer une seule fois dans GitHub (Settings → Secrets and variables → Actions) : `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` et `FTP_DIR` (dossier du site, terminé par `/`). Sans eux, rien n'est envoyé.
