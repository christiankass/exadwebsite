"""
Reconstruit les parties modifiables du site à partir de data/content.json
(le fichier que la page /admin enregistre sur GitHub).

Utilisation (depuis le dossier du site) :
    python tools/build_content.py
    python tools/build_en.py        # puis régénère la version anglaise

Sur GitHub, ces deux commandes sont lancées automatiquement après chaque
enregistrement depuis /admin (voir .github/workflows/admin-build.yml).

Les zones remplacées sont entourées de commentaires <!-- cms:nom --> ... <!-- /cms:nom -->
dans les pages françaises : ne pas les supprimer.
"""
import html, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data" / "content.json").read_text(encoding="utf-8"))
STATE = ROOT / "tools" / "cms_state.json"      # dernières coordonnées appliquées
EN_CMS = ROOT / "tools" / "en_cms.json"        # traductions des contenus de l'admin
BLOCKS_CMS = ROOT / "tools" / "cms_blocks.json"  # titres du slider (avec <span>)
PAGES = ["index.html", "about.html", "services.html", "datacenter.html",
         "cybersecurity.html", "fleet.html", "achievements.html", "news.html", "contact.html", "cgu.html"]

e = lambda s: html.escape(str(s or ""), quote=True)
en_pairs = {}

def pair(fr, en):
    """Mémorise la traduction anglaise d'un texte (utilisée par build_en.py)."""
    fr = " ".join(str(fr or "").split()); en = " ".join(str(en or "").split())
    if fr and en and fr != en:
        en_pairs[fr] = en

def highlight(text):
    """'Texte [mot en bleu] suite' -> 'Texte <span>mot en bleu</span> suite'."""
    t = e(text)
    return re.sub(r"\[(.+?)\]", r"<span>\1</span>", t) if "[" in t else t

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
        "septembre", "octobre", "novembre", "décembre"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]

def date_fr(d):
    y, m, j = (int(x) for x in d.split("-"))
    txt = f"{j}{'er' if j == 1 else ''} {MOIS[m-1]} {y}"
    pair(txt, f"{MONTHS[m-1]} {j}, {y}")
    return txt

def replace_zone(s, name, content):
    pat = re.compile(r"(<!-- cms:%s -->).*?(<!-- /cms:%s -->)" % (re.escape(name), re.escape(name)), re.S)
    if not pat.search(s):
        raise SystemExit(f"Zone cms:{name} introuvable")
    return pat.sub(lambda m: m.group(1) + content + m.group(2), s, count=1)

PIN = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
       'aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>')
TYPES = {"atelier": ("Ateliers", "Workshops"), "evenement": ("Événements", "Events"),
         "annonce": ("Annonces", "Announcements"), "projet": ("Projets", "Projects")}

def img_tag(p, lazy=True):
    pair(p.get("alt"), p.get("alt_en"))
    w, h = p.get("w") or 1200, p.get("h") or 700
    return (f'<img src="{e(p["src"])}" alt="{e(p.get("alt"))}" width="{w}" height="{h}"'
            + (' loading="lazy"' if lazy else "") + ">")

def news_id(n):
    """Ancre unique d'une actualité (utilisée par le bandeau défilant)."""
    slug = re.sub(r"[^a-z0-9]+", "-", html.unescape(n.get("title", "")).lower()
                  .translate(str.maketrans("àâäéèêëîïôöùûüç", "aaaeeeeiioouuuc"))).strip("-")[:40]
    return f"actu-{n['date']}-{slug}".rstrip("-")

def build_ticker(s, news):
    """Bandeau « En continu » : messages flash de l'admin + titres des actualités."""
    tk = DATA.get("ticker", {})
    items = []
    for f in tk.get("flash", []):
        if not f.get("fr"):
            continue
        pair(f["fr"], f.get("en"))
        txt = e(f["fr"])
        inner = f'<a href="{e(f["link"])}">{txt}</a>' if f.get("link") else txt
        items.append(f'<li><span class="ticker-flash">FLASH</span>{inner}</li>')
    if tk.get("show_news", True):
        for n in news[: int(tk.get("max_news", 6))]:
            items.append(f'<li><time datetime="{e(n["date"])}">{date_fr(n["date"])}</time>'
                         f'<a href="#{news_id(n)}">{e(n.get("title"))}</a></li>')
    if not items:
        return replace_zone(s, "ticker", "")
    label = e(tk.get("label") or "ACTUALITÉS")
    pair(tk.get("label") or "ACTUALITÉS", tk.get("label_en") or "NEWS")
    track = "".join(items)
    dup = track.replace("<li>", '<li aria-hidden="true">').replace("<a ", '<a tabindex="-1" ')
    return replace_zone(s, "ticker",
        f'<section class="news-ticker" aria-label="Flash infos"><div class="ticker-label"><span class="live-dot" aria-hidden="true"></span>{label}</div>'
        f'<div class="ticker-viewport"><ul class="ticker-track">{track}{dup}</ul></div></section>')

def news_article(n, featured):
    for k in ("tag", "title", "text", "place"):
        pair(n.get(k), n.get(k + "_en"))
    photos = [p for p in n.get("photos", []) if p.get("src")][:2]
    lazy = not featured
    if len(photos) == 2:
        fig = ('<figure class="news-media news-duo">'
               f'<button type="button" class="zoom" data-full="{e(photos[0]["src"])}" aria-label="Agrandir la photo">{img_tag(photos[0], lazy)}</button>'
               f'<button type="button" class="zoom zoom-small" data-full="{e(photos[1]["src"])}" aria-label="Agrandir la photo">{img_tag(photos[1], lazy)}</button></figure>')
    elif photos:
        fig = (f'<figure class="news-media"><button type="button" class="zoom" data-full="{e(photos[0]["src"])}" '
               f'aria-label="Agrandir la photo">{img_tag(photos[0], lazy)}</button></figure>')
    else:
        fig = ""
    tag_cls = "news-tag" if n.get("type") == "atelier" else "news-tag news-tag-alt"
    place = f'<p class="news-place">{PIN}{e(n["place"])}</p>' if n.get("place") else ""
    cls = "news-featured" if featured else "news-card"
    return (f'<article class="{cls}" id="{news_id(n)}" data-type="{e(n.get("type", "evenement"))}">\n  {fig}\n'
            f'  <div class="news-body">\n    <div class="news-meta"><span class="{tag_cls}">{e(n.get("tag"))}</span>'
            f'<time datetime="{e(n["date"])}">{date_fr(n["date"])}</time></div>\n'
            f'    <h2>{e(n.get("title"))}</h2>\n    <p>{e(n.get("text"))}</p>\n    {place}\n  </div>\n</article>')

def build_news(s):
    news = sorted([n for n in DATA["news"] if not n.get("hidden")], key=lambda n: n["date"], reverse=True)
    if news:
        body = news_article(news[0], True) + '\n\n<div class="news-grid">\n' + \
            "\n".join(news_article(n, False) for n in news[1:]) + "\n</div>"
    else:
        body = ""
    s = replace_zone(s, "news", body)
    s = build_ticker(s, news)
    used = [t for t in TYPES if any(n.get("type") == t for n in news)]
    chips = '<button type="button" class="chip is-active" data-filter="all" aria-pressed="true">Tout</button>' + "".join(
        f'\n  <button type="button" class="chip" data-filter="{t}" aria-pressed="false">{TYPES[t][0]}</button>' for t in used)
    for t in used:
        pair(*TYPES[t])
    return replace_zone(s, "news-filters",
                        f'<div class="news-filters" role="group" aria-label="Filtrer les actualités">\n  {chips}\n</div>')

def build_team(s):
    team = [t for t in DATA["team"] if t.get("src")]
    cards = "".join(
        f'<li class="cf-card" data-i="{i}"><button type="button" class="zoom" aria-label="Agrandir la photo">'
        f'<img src="{e(t["src"])}" alt="{e(t.get("alt"))}" width="600" height="800" loading="lazy" '
        f'style="object-position:{e(t.get("position") or "50% 40%")}"></button></li>' for i, t in enumerate(team))
    for t in team:
        pair(t.get("alt"), t.get("alt_en"))
    s = replace_zone(s, "team", f'<ul class="cf-stage">{cards}</ul>')
    s = replace_zone(s, "team-count", f'<span class="cf-count" aria-live="polite"><strong>01</strong> / {len(team):02d}</span>')
    dots = "".join(f'<button type="button" class="cf-dot{" is-active" if i == 0 else ""}" aria-label="Afficher la photo {i+1}"></button>'
                   for i in range(len(team)))
    for i in range(len(team)):
        pair(f"Afficher la photo {i+1}", f"Show photo {i+1}")
    return replace_zone(s, "team-dots", f'<div class="cf-dots">{dots}</div>')

def build_logos(s, page):
    if page == "index.html":
        ps = [p for p in DATA["partners"] if p.get("src")]
        li = "".join(f'<li class="partner"><img src="{e(p["src"])}" alt="{e(p["name"])}" loading="lazy"></li>' for p in ps)
        li += "".join(f'<li class="partner" aria-hidden="true"><img src="{e(p["src"])}" alt="" loading="lazy"></li>' for p in ps)
        s = replace_zone(s, "partners", f'<ul class="marquee-track">{li}</ul>')
        cs = [c for c in DATA["clients"] if c.get("src") and c.get("home", True)]
        s = replace_zone(s, "clients", '<ul class="client-wall">' + "".join(
            f'<li><img src="{e(c["src"])}" alt="{e(c["name"])}" loading="lazy"></li>' for c in cs) + "</ul>")
    if page == "achievements.html":
        cs = [c for c in DATA["clients"] if c.get("src")]
        s = replace_zone(s, "clients-lg", '<ul class="client-wall client-wall-lg">' + "".join(
            f'<li><img src="{e(c["src"])}" alt="{e(c["name"])}" loading="lazy"></li>' for c in cs) + "</ul>")
    return s

def build_stats(s):
    st = DATA["stats"]
    for label, key in (("Clients accompagnés", "clients"), ("Projets réalisés", "projects"), ("Domaines d'expertise", "domains")):
        v = int(st[key])
        s = re.sub(r'data-count="\d+"( data-suffix="\+")?>\d+\+?(</strong><span>%s)' % re.escape(label),
                   lambda m: f'data-count="{v}"{m.group(1) or ""}>{v}{"+" if m.group(1) else ""}{m.group(2)}', s)
    return s

def slides_html():
    out = []
    for sl in DATA["slides"]:
        fr, en = highlight(sl["fr"]), highlight(sl["en"])
        pair(sl.get("alt"), sl.get("alt_en"))
        out.append((fr, en, sl["img"], sl.get("alt", ""), sl.get("alt_en", "")))
    return out

def build_hero(s):
    fr, en, *_ = slides_html()[0]
    return replace_zone(s, "hero-title", f'<h1 aria-live="off">{fr}</h1>')

def build_script():
    p = ROOT / "script.js"
    js = p.read_text(encoding="utf-8")
    sl = slides_html()
    q = lambda x: json.dumps(html.unescape(x), ensure_ascii=False)
    en_l = ",\n".join(f'      {{ html: {q(en)}, img: {q(img)}, alt: {q(alt_en or alt)} }}' for fr, en, img, alt, alt_en in sl)
    fr_l = ",\n".join(f'      {{ html: {q(fr)}, img: {q(img)}, alt: {q(alt)} }}' for fr, en, img, alt, alt_en in sl)
    block = f"    const allSlides = (en) => en ? [\n{en_l},\n    ] : [\n{fr_l},\n    ];\n"
    js = re.sub(r"(    /\* cms:slides \*/\n).*?(    /\* /cms:slides \*/)", lambda m: m.group(1) + block + m.group(2), js, flags=re.S)
    p.write_text(js, encoding="utf-8")
    BLOCKS_CMS.write_text(json.dumps({html.unescape(sl[0][0]): html.unescape(sl[0][1])}, ensure_ascii=False, indent=1), encoding="utf-8")

def contact_values(c):
    phone = c["phone"].strip()
    return {"phone": phone, "tel": re.sub(r"[^\d+]", "", phone), "email": c["email"].strip(),
            "address": c["address"].strip(), "wa": re.sub(r"\D", "", c.get("whatsapp", "")),
            "linkedin": c.get("linkedin", "").strip()}

def apply_contact(texts):
    """Remplace les anciennes coordonnées par les nouvelles dans toutes les pages."""
    new = contact_values(DATA["contact"])
    old = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else new
    for k in new:
        if old.get(k) and new[k] and old[k] != new[k]:
            for f in texts:
                texts[f] = texts[f].replace(old[k], new[k])
    STATE.write_text(json.dumps(new, ensure_ascii=False, indent=1), encoding="utf-8")

def build_config():
    chat = DATA.get("chat", {})
    cfg = {"tawk": chat.get("tawk_property", "").strip(), "tawkWidget": chat.get("tawk_widget", "default").strip() or "default"}
    (ROOT / "site-config.js").write_text(
        "/* Fichier généré par tools/build_content.py à partir de data/content.json — ne pas modifier à la main */\n"
        "window.EXAD_CONFIG = " + json.dumps(cfg) + ";\n", encoding="utf-8")

# Les coordonnées sont aussi remplacées dans le dictionnaire anglais (phrases qui les contiennent)
TEXT_FILES = PAGES + ["script.js", "tools/en.json"]
texts = {f: (ROOT / f).read_text(encoding="utf-8") for f in TEXT_FILES}
apply_contact(texts)
for f in TEXT_FILES:
    (ROOT / f).write_text(texts[f], encoding="utf-8")
for f in PAGES:
    s = (ROOT / f).read_text(encoding="utf-8")
    if f == "news.html": s = build_news(s)
    if f == "about.html": s = build_team(s)
    if f == "index.html": s = build_hero(s)
    s = build_logos(s, f)
    s = build_stats(s)
    (ROOT / f).write_text(s, encoding="utf-8")
build_script()
build_config()
# Nouveau numéro de version des fichiers css/js pour que les navigateurs voient les changements
for f in PAGES:
    t = (ROOT / f).read_text(encoding="utf-8")
    cur = max([int(x) for x in re.findall(r"\?v=(\d+)", t)] or [0])
    (ROOT / f).write_text(re.sub(r"\?v=\d+", f"?v={cur + 1}", t), encoding="utf-8")
EN_CMS.write_text(json.dumps(en_pairs, ensure_ascii=False, indent=1), encoding="utf-8")
print("Contenu reconstruit depuis data/content.json")
