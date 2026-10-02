"""
Génère la version anglaise du site (dossier en/) à partir des pages françaises.

Utilisation (depuis le dossier du site) :
    python tools/build_en.py

- Les traductions sont dans tools/en.json (texte français -> texte anglais).
- Un texte français absent de en.json reste en français et est signalé à la fin :
  il suffit de l'ajouter dans en.json puis de relancer le script.
- Ne jamais modifier les fichiers du dossier en/ à la main : ils sont écrasés
  à chaque génération.
"""
import html, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "en"
SITE = "https://www.exadgroup.org/"
PAGES = ["index.html", "about.html", "services.html", "datacenter.html",
         "cybersecurity.html", "fleet.html", "achievements.html", "contact.html"]
TR = json.loads((ROOT / "tools" / "en.json").read_text(encoding="utf-8"))
ATTRS = ("alt", "placeholder", "aria-label", "title", "content")
missing = set()

FR_FLAG = '<svg class="flag" width="26" height="18" viewBox="0 0 60 40" aria-hidden="true"><clipPath id="fr-c"><rect width="60" height="40" rx="4"/></clipPath><g clip-path="url(#fr-c)"><rect width="20" height="40" fill="#002654"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#CE1126"/></g></svg>'

# Remplacements de blocs entiers, quand une phrase est coupée par du HTML
BLOCKS = {
    'Votre partenaire pour une <span>infrastructure IT</span> de niveau entreprise.':
        'Your partner for <span>enterprise-grade IT infrastructure</span>.',
    'Vos équipes comptent sur leur informatique. <span>EXAD la conçoit, la déploie et la maintient pour qu\'elle ne les lâche pas.</span>':
        'Your teams depend on their IT. <span>EXAD designs, deploys and maintains it so it never lets them down.</span>',
}

def tr(text):
    """Traduit un texte (espaces normalisés), en conservant les espaces autour."""
    core = " ".join(html.unescape(text).split())
    if not core or not re.search(r"[A-Za-zÀ-ÿ]{2}", core):
        return text
    if core in TR:
        lead = text[: len(text) - len(text.lstrip())]
        trail = text[len(text.rstrip()):]
        return lead + html.escape(TR[core], quote=False) + trail
    if re.search(r"[À-ÿ]|\b(le|la|les|des|du|vos|votre|nos|notre|et|pour)\b", core):
        missing.add(core)
    return text

def translate(s):
    for fr, en in BLOCKS.items():
        s = s.replace(fr, en)
    # textes entre balises, hors <script> et <style>
    parts = re.split(r"(<script\b.*?</script>|<style\b.*?</style>)", s, flags=re.S)
    for i in range(0, len(parts), 2):
        parts[i] = re.sub(r">([^<>]+)<", lambda m: ">" + tr(m.group(1)) + "<", parts[i])
        parts[i] = re.sub(r'\b(%s)="([^"]*)"' % "|".join(ATTRS),
                          lambda m: f'{m.group(1)}="{html.escape(html.unescape(tr(m.group(2))), quote=True)}"'
                          if m.group(2) and not m.group(2).startswith(("http", "width")) else m.group(0), parts[i])
    return "".join(parts)

def relocate(s, page):
    """Adapte les chemins pour le sous-dossier en/ et les métadonnées de langue."""
    s = s.replace('<html lang="fr">', '<html lang="en">', 1)
    # fichiers du site (images, css, js) : un niveau au-dessus
    s = re.sub(r'\b(src|href)="(?!https?:|mailto:|tel:|#|[a-z]+\.html)([^"]+)"', r'\1="../\2"', s)
    s = s.replace('og:locale" content="fr_FR"', 'og:locale" content="en_US"')
    slug = "" if page == "index.html" else page
    # adresse canonique et og:url (les liens hreflang restent inchangés)
    s = s.replace(f'<link rel="canonical" href="{SITE}{slug}">', f'<link rel="canonical" href="{SITE}en/{slug}">')
    s = s.replace(f'<meta property="og:url" content="{SITE}{slug}">', f'<meta property="og:url" content="{SITE}en/{slug}">')
    # sélecteur de langue : vers la page française
    s = re.sub(r'<a class="lang-switch"[^>]*>.*?</a>',
               f'<a class="lang-switch" href="../{page}" hreflang="fr" lang="fr" aria-label="Version française" title="Français">'+FR_FLAG+'</a>', s, flags=re.S)
    return s

OUT.mkdir(exist_ok=True)
for page in PAGES:
    fr = (ROOT / page).read_text(encoding="utf-8")
    (OUT / page).write_text(relocate(translate(fr), page), encoding="utf-8")
    print("en/" + page)

if missing:
    print("\nTextes sans traduction (à ajouter dans tools/en.json) :", file=sys.stderr)
    for m in sorted(missing):
        print("  -", m, file=sys.stderr)
