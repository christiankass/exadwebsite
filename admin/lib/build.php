<?php
/*
 * Reconstruit le site à partir de data/content.json, directement sur le serveur.
 * C'est la traduction en PHP de tools/build_content.py puis tools/build_en.py :
 * les deux donnent exactement les mêmes fichiers.
 *
 * Utilisation : require ce fichier puis exad_build($racine_du_site);
 * Les zones remplacées sont entourées de <!-- cms:nom --> ... <!-- /cms:nom -->
 * dans les pages françaises : ne pas les supprimer.
 */

// compatibilité avec les anciennes versions de PHP (7.4 et 8.0)
if (!function_exists("str_contains")) { function str_contains($h, $n) { return $n === "" || strpos($h, $n) !== false; } }
if (!function_exists("str_starts_with")) { function str_starts_with($h, $n) { return strncmp($h, $n, strlen($n)) === 0; } }
if (!function_exists("array_is_list")) { function array_is_list(array $a) { return $a === [] || array_keys($a) === range(0, count($a) - 1); } }
if (!defined("JSON_UNESCAPED_LINE_TERMINATORS")) define("JSON_UNESCAPED_LINE_TERMINATORS", 0);

const EXAD_PAGES = ["index.html", "about.html", "services.html", "datacenter.html",
    "cybersecurity.html", "fleet.html", "achievements.html", "news.html", "contact.html", "cgu.html"];

/* ---------- Équivalents des fonctions Python utilisées ---------- */
const PY_WS = '[\s\x{85}\x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{1c}-\x{1f}]';

function py_split_join($s) {            // " ".join(s.split())
    $parts = preg_split('/' . PY_WS . '+/u', (string)$s, -1, PREG_SPLIT_NO_EMPTY);
    return implode(" ", $parts);
}
function py_lstrip($s) { return preg_replace('/^' . PY_WS . '+/u', '', $s); }
function py_rstrip($s) { return preg_replace('/' . PY_WS . '+$/u', '', $s); }
function py_strip($s) { return py_rstrip(py_lstrip((string)$s)); }

function py_escape($s, $quote = true) { // html.escape
    $s = str_replace(["&", "<", ">"], ["&amp;", "&lt;", "&gt;"], (string)$s);
    return $quote ? str_replace(['"', "'"], ["&quot;", "&#x27;"], $s) : $s;
}
function py_unescape($s) {              // html.unescape
    return html_entity_decode((string)$s, ENT_QUOTES | ENT_HTML5, "UTF-8");
}

/* json.dumps : indent (null ou nombre d'espaces), ascii = ensure_ascii */
function py_json($v, $indent = null, $ascii = false, $level = 0) {
    $flags = JSON_UNESCAPED_SLASHES | ($ascii ? 0 : JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_LINE_TERMINATORS);
    if (is_string($v)) return json_encode($v, $flags);
    if ($v === null) return "null";
    if ($v === true) return "true";
    if ($v === false) return "false";
    if (is_int($v)) return (string)$v;
    if (is_float($v)) return json_encode($v);
    $isList = array_is_list($v);
    $open = $isList ? "[" : "{"; $close = $isList ? "]" : "}";
    if (!$v) return $open . $close;
    $items = [];
    foreach ($v as $k => $x) {
        $val = py_json($x, $indent, $ascii, $level + 1);
        $items[] = $isList ? $val : json_encode((string)$k, $flags) . ": " . $val;
    }
    if ($indent === null) return $open . implode(", ", $items) . $close;
    $pad = "\n" . str_repeat(" ", $indent * ($level + 1));
    return $open . $pad . implode("," . $pad, $items) . "\n" . str_repeat(" ", $indent * $level) . $close;
}

function rd($f) { return file_get_contents($f); }
function wr($f, $s) {
    // écriture atomique : un visiteur ne voit jamais une page à moitié écrite
    $tmp = $f . ".tmp-" . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $s) === false || !rename($tmp, $f)) {
        @unlink($tmp);
        throw new RuntimeException("Impossible d'écrire " . basename($f));
    }
}

/* ====================================================================
   1. Contenu (build_content.py)
   ==================================================================== */
class ExadContent {
    public $root, $data, $en_pairs = [];
    const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
        "septembre", "octobre", "novembre", "décembre"];
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
        "September", "October", "November", "December"];
    const TYPES = ["atelier" => ["Ateliers", "Workshops"], "evenement" => ["Événements", "Events"],
        "annonce" => ["Annonces", "Announcements"], "projet" => ["Projets", "Projects"]];
    const PIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
        . 'aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';

    function __construct($root) {
        $this->root = $root;
        $this->data = json_decode(rd("$root/data/content.json"), true);
        if (!is_array($this->data)) throw new RuntimeException("data/content.json illisible");
    }
    static function falsy($s) { return $s === null || $s === false || $s === 0 || $s === 0.0 || $s === "" || $s === []; }
    static function e($s) { return py_escape(self::falsy($s) ? "" : self::str($s), true); }
    static function g($a, $k, $d = null) { return (is_array($a) && array_key_exists($k, $a) && $a[$k] !== null) ? $a[$k] : $d; }
    static function str($v) { return is_bool($v) ? ($v ? "True" : "False") : (string)$v; }

    function pair($fr, $en) {
        $fr = py_split_join(self::falsy($fr) ? "" : self::str($fr)); $en = py_split_join(self::falsy($en) ? "" : self::str($en));
        if ($fr !== "" && $en !== "" && $fr !== $en) $this->en_pairs[$fr] = $en;
    }
    static function highlight($text) {
        $t = self::e($text);
        return str_contains($t, "[") ? preg_replace('/\[(.+?)\]/u', '<span>$1</span>', $t) : $t;
    }
    function date_fr($d) {
        [$y, $m, $j] = array_map('intval', explode("-", $d));
        $txt = $j . ($j == 1 ? "er" : "") . " " . self::MOIS[$m - 1] . " $y";
        $this->pair($txt, self::MONTHS[$m - 1] . " $j, $y");
        return $txt;
    }
    static function replace_zone($s, $name, $content) {
        $q = preg_quote($name, '/');
        $pat = "/(<!-- cms:$q -->).*?(<!-- \\/cms:$q -->)/s";
        if (!preg_match($pat, $s)) throw new RuntimeException("Zone cms:$name introuvable");
        return preg_replace_callback($pat, fn($m) => $m[1] . $content . $m[2], $s, 1);
    }
    function img_tag($p, $lazy = true) {
        $this->pair(self::g($p, "alt"), self::g($p, "alt_en"));
        $w = self::g($p, "w") ?: 1200; $h = self::g($p, "h") ?: 700;
        return '<img src="' . self::e($p["src"]) . '" alt="' . self::e(self::g($p, "alt")) . "\" width=\"$w\" height=\"$h\""
            . ($lazy ? ' loading="lazy"' : "") . ">";
    }
    static function news_id($n) {
        $t = mb_strtolower(py_unescape(self::g($n, "title", "")), "UTF-8");
        $t = strtr($t, ["à" => "a", "â" => "a", "ä" => "a", "é" => "e", "è" => "e", "ê" => "e", "ë" => "e",
            "î" => "i", "ï" => "i", "ô" => "o", "ö" => "o", "ù" => "u", "û" => "u", "ü" => "u", "ç" => "c"]);
        $slug = substr(trim(preg_replace('/[^a-z0-9]+/u', "-", $t), "-"), 0, 40);
        return rtrim("actu-{$n['date']}-$slug", "-");
    }
    function build_ticker($s, $news) {
        $tk = self::g($this->data, "ticker", []);
        $items = [];
        foreach (self::g($tk, "flash", []) as $f) {
            if (!self::g($f, "fr")) continue;
            $this->pair($f["fr"], self::g($f, "en"));
            $txt = self::e($f["fr"]);
            $inner = self::g($f, "link") ? '<a href="' . self::e($f["link"]) . "\">$txt</a>" : $txt;
            $items[] = "<li><span class=\"ticker-flash\">FLASH</span>$inner</li>";
        }
        if (self::g($tk, "show_news", true)) {
            foreach (array_slice($news, 0, (int)self::g($tk, "max_news", 6)) as $n) {
                $items[] = '<li><time datetime="' . self::e($n["date"]) . '">' . $this->date_fr($n["date"]) . '</time>'
                    . '<a href="#' . self::news_id($n) . '">' . self::e(self::g($n, "title")) . '</a></li>';
            }
        }
        if (!$items) return self::replace_zone($s, "ticker", "");
        $label = self::e(self::g($tk, "label") ?: "ACTUALITÉS");
        $this->pair(self::g($tk, "label") ?: "ACTUALITÉS", self::g($tk, "label_en") ?: "NEWS");
        $track = implode("", $items);
        $dup = str_replace("<a ", '<a tabindex="-1" ', str_replace("<li>", '<li aria-hidden="true">', $track));
        return self::replace_zone($s, "ticker",
            '<section class="news-ticker" aria-label="Flash infos"><div class="ticker-label"><span class="live-dot" aria-hidden="true"></span>' . $label . '</div>'
            . "<div class=\"ticker-viewport\"><ul class=\"ticker-track\">$track$dup</ul></div></section>");
    }
    function news_article($n, $featured) {
        foreach (["tag", "title", "text", "place"] as $k) $this->pair(self::g($n, $k), self::g($n, $k . "_en"));
        $photos = array_slice(array_values(array_filter(self::g($n, "photos", []), fn($p) => self::g($p, "src"))), 0, 2);
        $lazy = !$featured;
        if (count($photos) == 2) {
            $fig = '<figure class="news-media news-duo">'
                . '<button type="button" class="zoom" data-full="' . self::e($photos[0]["src"]) . '" aria-label="Agrandir la photo">' . $this->img_tag($photos[0], $lazy) . '</button>'
                . '<button type="button" class="zoom zoom-small" data-full="' . self::e($photos[1]["src"]) . '" aria-label="Agrandir la photo">' . $this->img_tag($photos[1], $lazy) . '</button></figure>';
        } elseif ($photos) {
            $fig = '<figure class="news-media"><button type="button" class="zoom" data-full="' . self::e($photos[0]["src"]) . '" '
                . 'aria-label="Agrandir la photo">' . $this->img_tag($photos[0], $lazy) . '</button></figure>';
        } else $fig = "";
        $tag_cls = self::g($n, "type") === "atelier" ? "news-tag" : "news-tag news-tag-alt";
        $place = self::g($n, "place") ? '<p class="news-place">' . self::PIN . self::e($n["place"]) . '</p>' : "";
        $cls = $featured ? "news-featured" : "news-card";
        return "<article class=\"$cls\" id=\"" . self::news_id($n) . '" data-type="' . self::e(self::g($n, "type", "evenement")) . "\">\n  $fig\n"
            . "  <div class=\"news-body\">\n    <div class=\"news-meta\"><span class=\"$tag_cls\">" . self::e(self::g($n, "tag")) . '</span>'
            . '<time datetime="' . self::e($n["date"]) . '">' . $this->date_fr($n["date"]) . "</time></div>\n"
            . '    <h2>' . self::e(self::g($n, "title")) . "</h2>\n    <p>" . self::e(self::g($n, "text")) . "</p>\n    $place\n  </div>\n</article>";
    }
    function build_news($s) {
        $news = array_values(array_filter($this->data["news"], fn($n) => !self::g($n, "hidden")));
        // tri stable par date décroissante (comme sorted(..., reverse=True) en Python)
        $idx = array_keys($news);
        usort($idx, fn($a, $b) => strcmp($news[$b]["date"], $news[$a]["date"]) ?: $a <=> $b);
        $news = array_map(fn($i) => $news[$i], $idx);
        if ($news) {
            $first = $this->news_article($news[0], true);
            $rest = array_map(fn($n) => $this->news_article($n, false), array_slice($news, 1));
            $body = $first . "\n\n<div class=\"news-grid\">\n" . implode("\n", $rest) . "\n</div>";
        } else $body = "";
        $s = self::replace_zone($s, "news", $body);
        $s = $this->build_ticker($s, $news);
        $used = array_values(array_filter(array_keys(self::TYPES), function ($t) use ($news) {
            foreach ($news as $n) if (self::g($n, "type") === $t) return true;
            return false;
        }));
        $chips = '<button type="button" class="chip is-active" data-filter="all" aria-pressed="true">Tout</button>';
        foreach ($used as $t) $chips .= "\n  <button type=\"button\" class=\"chip\" data-filter=\"$t\" aria-pressed=\"false\">" . self::TYPES[$t][0] . '</button>';
        foreach ($used as $t) $this->pair(...self::TYPES[$t]);
        return self::replace_zone($s, "news-filters",
            "<div class=\"news-filters\" role=\"group\" aria-label=\"Filtrer les actualités\">\n  $chips\n</div>");
    }
    function build_team($s) {
        $team = array_values(array_filter($this->data["team"], fn($t) => self::g($t, "src")));
        $cards = "";
        foreach ($team as $i => $t) {
            $cards .= "<li class=\"cf-card\" data-i=\"$i\"><button type=\"button\" class=\"zoom\" aria-label=\"Agrandir la photo\">"
                . '<img src="' . self::e($t["src"]) . '" alt="' . self::e(self::g($t, "alt")) . '" width="600" height="800" loading="lazy" '
                . 'style="object-position:' . self::e(self::g($t, "position") ?: "50% 40%") . '"></button></li>';
        }
        foreach ($team as $t) $this->pair(self::g($t, "alt"), self::g($t, "alt_en"));
        $s = self::replace_zone($s, "team", "<ul class=\"cf-stage\">$cards</ul>");
        $s = self::replace_zone($s, "team-count", '<span class="cf-count" aria-live="polite"><strong>01</strong> / ' . sprintf("%02d", count($team)) . '</span>');
        $dots = "";
        for ($i = 0; $i < count($team); $i++)
            $dots .= '<button type="button" class="cf-dot' . ($i == 0 ? " is-active" : "") . '" aria-label="Afficher la photo ' . ($i + 1) . '"></button>';
        for ($i = 0; $i < count($team); $i++) $this->pair("Afficher la photo " . ($i + 1), "Show photo " . ($i + 1));
        return self::replace_zone($s, "team-dots", "<div class=\"cf-dots\">$dots</div>");
    }
    function build_logos($s, $page) {
        $e = fn($x) => self::e($x);
        if ($page === "index.html") {
            $ps = array_filter($this->data["partners"], fn($p) => self::g($p, "src"));
            $li = "";
            foreach ($ps as $p) $li .= '<li class="partner"><img src="' . $e($p["src"]) . '" alt="' . $e(self::g($p, "name")) . '" loading="lazy"></li>';
            foreach ($ps as $p) $li .= '<li class="partner" aria-hidden="true"><img src="' . $e($p["src"]) . '" alt="" loading="lazy"></li>';
            $s = self::replace_zone($s, "partners", "<ul class=\"marquee-track\">$li</ul>");
            $cs = array_filter($this->data["clients"], fn($c) => self::g($c, "src") && self::g($c, "home", true));
            $s = self::replace_zone($s, "clients", '<ul class="client-wall">' . implode("", array_map(
                fn($c) => '<li><img src="' . $e($c["src"]) . '" alt="' . $e(self::g($c, "name")) . '" loading="lazy"></li>', $cs)) . "</ul>");
        }
        if ($page === "achievements.html") {
            $cs = array_filter($this->data["clients"], fn($c) => self::g($c, "src"));
            $s = self::replace_zone($s, "clients-lg", '<ul class="client-wall client-wall-lg">' . implode("", array_map(
                fn($c) => '<li><img src="' . $e($c["src"]) . '" alt="' . $e(self::g($c, "name")) . '" loading="lazy"></li>', $cs)) . "</ul>");
        }
        return $s;
    }
    function build_stats($s) {
        $st = $this->data["stats"];
        foreach ([["Clients accompagnés", "clients"], ["Projets réalisés", "projects"], ["Domaines d'expertise", "domains"]] as [$label, $key]) {
            $v = (int)$st[$key];
            $s = preg_replace_callback('/data-count="\d+"( data-suffix="\+")?>\d+\+?(<\/strong><span>' . preg_quote($label, '/') . ')/u',
                fn($m) => "data-count=\"$v\"" . ($m[1] ?? "") . ">$v" . (($m[1] ?? "") !== "" ? "+" : "") . $m[2], $s);
        }
        return $s;
    }
    function slides_html() {
        $out = [];
        foreach ($this->data["slides"] as $sl) {
            $fr = self::highlight($sl["fr"]); $en = self::highlight($sl["en"]);
            $this->pair(self::g($sl, "alt"), self::g($sl, "alt_en"));
            $out[] = [$fr, $en, $sl["img"], self::g($sl, "alt", ""), self::g($sl, "alt_en", "")];
        }
        return $out;
    }
    function build_hero($s) {
        $fr = $this->slides_html()[0][0];
        return self::replace_zone($s, "hero-title", "<h1 aria-live=\"off\">$fr</h1>");
    }
    function build_script() {
        $p = "$this->root/script.js";
        $js = rd($p);
        $sl = $this->slides_html();
        $q = fn($x) => py_json(py_unescape($x));
        $en_l = implode(",\n", array_map(fn($x) => "      { html: " . $q($x[1]) . ", img: " . $q($x[2]) . ", alt: " . $q($x[4] ?: $x[3]) . " }", $sl));
        $fr_l = implode(",\n", array_map(fn($x) => "      { html: " . $q($x[0]) . ", img: " . $q($x[2]) . ", alt: " . $q($x[3]) . " }", $sl));
        $block = "    const allSlides = (en) => en ? [\n$en_l,\n    ] : [\n$fr_l,\n    ];\n";
        $js = preg_replace_callback('/(    \/\* cms:slides \*\/\n).*?(    \/\* \/cms:slides \*\/)/s', fn($m) => $m[1] . $block . $m[2], $js);
        wr($p, $js);
        wr("$this->root/tools/cms_blocks.json", py_json([py_unescape($sl[0][0]) => py_unescape($sl[0][1])], 1));
    }
    static function contact_values($c) {
        $phone = py_strip($c["phone"]);
        return ["phone" => $phone, "tel" => preg_replace('/[^\d+]/', "", $phone), "email" => py_strip($c["email"]),
            "address" => py_strip($c["address"]), "wa" => preg_replace('/\D/', "", self::g($c, "whatsapp", "")),
            "linkedin" => py_strip(self::g($c, "linkedin", ""))];
    }
    function apply_contact(&$texts) {
        $state = "$this->root/tools/cms_state.json";
        $new = self::contact_values($this->data["contact"]);
        $old = is_file($state) ? json_decode(rd($state), true) : $new;
        foreach ($new as $k => $v) {
            if (self::g($old, $k) && $v !== "" && $old[$k] !== $v)
                foreach ($texts as $f => $t) $texts[$f] = str_replace($old[$k], $v, $t);
        }
        wr($state, py_json($new, 1));
    }
    function build_config() {
        $chat = self::g($this->data, "chat", []);
        $tawk = py_strip(self::g($chat, "tawk_property", ""));
        $w = py_strip(self::g($chat, "tawk_widget", "default")) ?: "default";
        wr("$this->root/site-config.js",
            "/* Fichier généré par tools/build_content.py à partir de data/content.json — ne pas modifier à la main */\n"
            . "window.EXAD_CONFIG = " . py_json(["tawk" => $tawk, "tawkWidget" => $w], null, true) . ";\n");
    }
    function run() {
        $R = $this->root;
        $files = array_merge(EXAD_PAGES, ["script.js", "tools/en.json"]);
        $texts = [];
        foreach ($files as $f) $texts[$f] = rd("$R/$f");
        $this->apply_contact($texts);
        foreach ($files as $f) wr("$R/$f", $texts[$f]);
        foreach (EXAD_PAGES as $f) {
            $s = rd("$R/$f");
            if ($f === "news.html") $s = $this->build_news($s);
            if ($f === "about.html") $s = $this->build_team($s);
            if ($f === "index.html") $s = $this->build_hero($s);
            $s = $this->build_logos($s, $f);
            $s = $this->build_stats($s);
            wr("$R/$f", $s);
        }
        $this->build_script();
        $this->build_config();
        // nouveau numéro de version des fichiers css/js pour que les navigateurs voient les changements
        foreach (EXAD_PAGES as $f) {
            $t = rd("$R/$f");
            preg_match_all('/\?v=(\d+)/', $t, $m);
            $cur = $m[1] ? max(array_map('intval', $m[1])) : 0;
            wr("$R/$f", preg_replace('/\?v=\d+/', "?v=" . ($cur + 1), $t));
        }
        wr("$R/tools/en_cms.json", py_json($this->en_pairs, 1));
    }
}

/* ====================================================================
   2. Version anglaise (build_en.py)
   ==================================================================== */
class ExadEnglish {
    const SITE = "https://www.exadgroup.org/";
    const ATTRS = ["alt", "placeholder", "aria-label", "title", "content"];
    const FR_FLAG = '<svg class="flag" width="26" height="18" viewBox="0 0 60 40" aria-hidden="true"><clipPath id="fr-c"><rect width="60" height="40" rx="4"/></clipPath><g clip-path="url(#fr-c)"><rect width="20" height="40" fill="#002654"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#CE1126"/></g></svg>';
    public $root, $TR, $BLOCKS, $missing = [];

    function __construct($root) {
        $this->root = $root;
        $this->TR = json_decode(rd("$root/tools/en.json"), true);
        if (is_file("$root/tools/en_cms.json"))
            foreach (json_decode(rd("$root/tools/en_cms.json"), true) as $k => $v) $this->TR[$k] = $v;
        $this->BLOCKS = [
            'Votre partenaire pour une <span>infrastructure IT</span> de niveau entreprise.' =>
                'Your partner for <span>enterprise-grade IT infrastructure</span>.',
            'Vos équipes comptent sur leur informatique. <span>EXAD la conçoit, la déploie et la maintient pour qu\'elle ne les lâche pas.</span>' =>
                'Your teams depend on their IT. <span>EXAD designs, deploys and maintains it so it never lets them down.</span>',
        ];
        if (is_file("$root/tools/cms_blocks.json"))
            foreach (json_decode(rd("$root/tools/cms_blocks.json"), true) as $k => $v) $this->BLOCKS[$k] = $v;
    }
    function tr($text) {
        $core = py_split_join(py_unescape($text));
        if ($core === "" || !preg_match('/[A-Za-zÀ-ÿ]{2}/u', $core)) return $text;
        if (array_key_exists($core, $this->TR)) {
            $lead = substr($text, 0, strlen($text) - strlen(py_lstrip($text)));
            $trail = substr($text, strlen(py_rstrip($text)));
            return $lead . py_escape($this->TR[$core], false) . $trail;
        }
        if (preg_match('/(*UCP)[À-ÿ]|\b(le|la|les|des|du|vos|votre|nos|notre|et|pour)\b/u', $core)) $this->missing[$core] = 1;
        return $text;
    }
    function translate($s) {
        foreach ($this->BLOCKS as $fr => $en) $s = str_replace((string)$fr, $en, $s);
        $parts = preg_split('/(<script\b.*?<\/script>|<style\b.*?<\/style>)/s', $s, -1, PREG_SPLIT_DELIM_CAPTURE);
        $attrs = implode("|", self::ATTRS);
        for ($i = 0; $i < count($parts); $i += 2) {
            $parts[$i] = preg_replace_callback('/>([^<>]+)</u', fn($m) => ">" . $this->tr($m[1]) . "<", $parts[$i]);
            $parts[$i] = preg_replace_callback("/\\b($attrs)=\"([^\"]*)\"/u", function ($m) {
                if ($m[2] !== "" && !str_starts_with($m[2], "http") && !str_starts_with($m[2], "width"))
                    return $m[1] . '="' . py_escape(py_unescape($this->tr($m[2])), true) . '"';
                return $m[0];
            }, $parts[$i]);
        }
        return implode("", $parts);
    }
    function relocate($s, $page) {
        $s = preg_replace('/<html lang="fr">/', '<html lang="en">', $s, 1);
        $s = preg_replace('/\b(src|href)="(?!https?:|mailto:|tel:|#|[a-z]+\.html)([^"]+)"/', '$1="../$2"', $s);
        $s = str_replace('og:locale" content="fr_FR"', 'og:locale" content="en_US"', $s);
        $slug = $page === "index.html" ? "" : $page;
        $S = self::SITE;
        $s = str_replace("<link rel=\"canonical\" href=\"$S$slug\">", "<link rel=\"canonical\" href=\"{$S}en/$slug\">", $s);
        $s = str_replace("<meta property=\"og:url\" content=\"$S$slug\">", "<meta property=\"og:url\" content=\"{$S}en/$slug\">", $s);
        return preg_replace_callback('/<a class="lang-switch"[^>]*>.*?<\/a>/s',
            fn($m) => "<a class=\"lang-switch\" href=\"../$page\" hreflang=\"fr\" lang=\"fr\" aria-label=\"Version française\" title=\"Français\">" . self::FR_FLAG . '</a>', $s);
    }
    function run() {
        $R = $this->root;
        if (!is_dir("$R/en")) mkdir("$R/en");
        foreach (EXAD_PAGES as $page) wr("$R/en/$page", $this->relocate($this->translate(rd("$R/$page")), $page));
        $blocks = [];
        foreach ($this->BLOCKS as $k => $v) $blocks[] = [(string)$k, $v];
        wr("$R/i18n.js", "/* Fichier généré par tools/build_en.py — ne pas modifier à la main */\n"
            . "window.EXAD_I18N = " . py_json(["fr2en" => $this->TR, "blocks" => $blocks]) . ";\n");
        return array_keys($this->missing);
    }
}

/* Reconstruit tout le site. Renvoie la liste des textes sans traduction anglaise. */
function exad_build($root) {
    (new ExadContent($root))->run();
    return (new ExadEnglish($root))->run();
}

if (PHP_SAPI === "cli" && realpath($argv[0] ?? "") === __FILE__) {
    $missing = exad_build($argv[1] ?? dirname(__DIR__, 2));
    echo "Site reconstruit\n";
    foreach ($missing as $m) fwrite(STDERR, "  - $m\n");
}
