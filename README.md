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

Les textes de l'assistant, du formulaire et du slider sont traduits dans `script.js` (fonction `t()` et `replyEn()`).

## Tester en local
Double-cliquer sur `demarrer_serveur.bat`, puis ouvrir http://127.0.0.1:8001

## Formulaire de contact
Sans serveur, le formulaire valide les champs puis ouvre la messagerie du visiteur avec la demande pré-remplie vers `sales@exadgroup.org` (attribut `data-to` dans `contact.html`).

Pour un envoi direct (sans passer par la messagerie du visiteur), brancher un service de formulaires comme Formspree ou FormSubmit dans le bloc « Formulaire de contact » de `script.js`.

## Après une modification du CSS ou du JS
Augmenter le numéro `?v=40` dans les balises `<link>` et `<script>` de chaque page pour forcer les navigateurs à recharger les fichiers.
