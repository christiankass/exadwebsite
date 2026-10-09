<?php
/*
 * API de la page d'administration (admin/index.html), hébergée avec le site chez LWS.
 * - Les comptes (mot de passe chiffré) et les sauvegardes sont rangés dans admin/private/,
 *   inaccessible depuis le web.
 * - Chaque enregistrement sauvegarde l'ancien contenu, écrit data/content.json et les photos,
 *   puis reconstruit les pages (admin/lib/build.php) : le site est à jour immédiatement.
 */
declare(strict_types=1);
require __DIR__ . "/lib/build.php";

const ROOT = __DIR__ . "/..";
const PRIV = __DIR__ . "/private";
const CONTENT = ROOT . "/data/content.json";
const MAX_BACKUPS = 60;
const GUARD = "<?php exit; ?>\n";   // les fichiers privés sont des .php : jamais lisibles depuis le web

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");

function out($data, int $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fail(string $msg, int $code = 400) { out(["error" => $msg], $code); }

/* ---------- Fichiers privés ---------- */
function priv_init(): void {
    foreach ([PRIV, PRIV . "/backups"] as $d) if (!is_dir($d) && !mkdir($d, 0750, true)) fail("Le dossier admin/private ne peut pas être créé sur le serveur.", 500);
    if (!is_dir(PRIV . "/sessions")) mkdir(PRIV . "/sessions", 0750);
    if (!is_file(PRIV . "/.htaccess")) file_put_contents(PRIV . "/.htaccess",
        "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
    if (!is_file(PRIV . "/index.html")) file_put_contents(PRIV . "/index.html", "");
}
function priv_read(string $name, $default) {
    $f = PRIV . "/$name.php";
    if (!is_file($f)) return $default;
    $v = json_decode(substr(file_get_contents($f), strlen(GUARD)), true);
    return $v ?? $default;
}
function priv_write(string $name, $value): void {
    wr(PRIV . "/$name.php", GUARD . json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
}
/* Un seul enregistrement à la fois */
function with_lock(callable $fn) {
    $h = fopen(PRIV . "/lock", "c");
    flock($h, LOCK_EX);
    try { return $fn(); } finally { flock($h, LOCK_UN); fclose($h); }
}

/* ---------- Session ---------- */
function start_session(bool $remember = false): void {
    $https = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") || ($_SERVER["HTTP_X_FORWARDED_PROTO"] ?? "") === "https";
    session_name("exad_admin");
    session_set_cookie_params(["lifetime" => $remember ? 60 * 60 * 24 * 30 : 0, "path" => dirname($_SERVER["SCRIPT_NAME"]) . "/",
        "secure" => $https, "httponly" => true, "samesite" => "Strict"]);
    // sessions rangées à part pour que l'hébergeur ne les efface pas au bout de quelques minutes
    session_save_path(PRIV . "/sessions");
    ini_set("session.gc_maxlifetime", (string)(60 * 60 * 24 * 30));
    session_start();
}
function current_user(): ?array {
    $id = $_SESSION["uid"] ?? null;
    if (!$id) return null;
    foreach (priv_read("users", []) as $u) if ($u["id"] === $id) return $u;
    return null;
}
function need_user(): array { $u = current_user(); if (!$u) fail("Session expirée : reconnectez-vous.", 401); return $u; }
function public_user(array $u): array { return ["id" => $u["id"], "name" => $u["name"], "email" => $u["email"], "created" => $u["created"]]; }
function norm_email($e): string { return mb_strtolower(trim((string)$e)); }
function check_pass($p): string {
    $p = (string)$p;
    if (mb_strlen($p) < 12) fail("Le mot de passe doit contenir au moins 12 caractères.");
    return password_hash($p, PASSWORD_DEFAULT);
}

/* Limite les essais de mot de passe : 8 échecs par quart d'heure et par adresse IP */
function throttle(bool $failed = false): void {
    $ip = hash("sha256", $_SERVER["REMOTE_ADDR"] ?? "?");
    $t = array_filter(priv_read("attempts", []), fn($a) => $a["t"] > time() - 900);
    if ($failed) $t[] = ["ip" => $ip, "t" => time()];
    priv_write("attempts", array_values($t));
    if (!$failed && count(array_filter($t, fn($a) => $a["ip"] === $ip)) >= 8)
        fail("Trop d'essais. Réessayez dans un quart d'heure.", 429);
}

/* ---------- Contenu ---------- */
function content_version(string $raw): string { return substr(hash("sha256", $raw), 0, 16); }
function check_content($c): void {
    if (!is_array($c)) fail("Contenu invalide.");
    foreach (["contact", "stats", "slides", "news", "team", "partners", "clients"] as $k)
        if (!isset($c[$k]) || !is_array($c[$k])) fail("Contenu invalide (partie « $k » manquante).");
    if (!$c["slides"]) fail("Il faut au moins un titre dans le slider.");
    foreach ($c["news"] as $n) if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($n["date"] ?? ""))) fail("Une actualité n'a pas de date valide.");
}
/* Photos envoyées depuis l'admin : uniquement des images, dans uploads/ */
function save_images(array $images, string $json): array {
    $written = [];
    foreach ($images as $img) {
        $path = (string)($img["path"] ?? "");
        if (!preg_match('#^uploads/(news|team|logos)/[a-z0-9-]{1,60}\.(webp|jpg|png)$#', $path)) fail("Nom de photo refusé : $path");
        if (!str_contains($json, $path)) continue;     // photo ajoutée puis retirée
        $bin = base64_decode((string)($img["b64"] ?? ""), true);
        if ($bin === false || strlen($bin) > 8 * 1024 * 1024) fail("Photo illisible ou trop lourde : $path");
        $info = @getimagesizefromstring($bin);
        $ext = pathinfo($path, PATHINFO_EXTENSION);
        $mime = ["webp" => "image/webp", "jpg" => "image/jpeg", "png" => "image/png"][$ext];
        if (!$info || $info["mime"] !== $mime) fail("Ce fichier n'est pas une image valide : $path");
        $dir = ROOT . "/" . dirname($path);
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        wr(ROOT . "/$path", $bin);
        $written[] = $path;
    }
    return $written;
}
/* Fichiers réécrits par la reconstruction : copiés avant, remis en place si elle échoue */
function snapshot(): array {
    $files = array_merge(EXAD_PAGES, array_map(fn($p) => "en/$p", EXAD_PAGES),
        ["script.js", "site-config.js", "i18n.js", "data/content.json", "tools/en.json", "tools/en_cms.json", "tools/cms_state.json", "tools/cms_blocks.json"]);
    $snap = [];
    foreach ($files as $f) $snap[$f] = is_file(ROOT . "/$f") ? file_get_contents(ROOT . "/$f") : null;
    return $snap;
}
function restore_snapshot(array $snap): void {
    foreach ($snap as $f => $s) if ($s !== null) file_put_contents(ROOT . "/$f", $s);
}
function backup(string $raw, string $who, string $summary): void {
    $id = date("Ymd-His") . "-" . bin2hex(random_bytes(2));
    priv_write("backups/$id", ["date" => date("c"), "who" => $who, "summary" => $summary, "content" => $raw]);
    $all = glob(PRIV . "/backups/*.php");
    sort($all);
    foreach (array_slice($all, 0, max(0, count($all) - MAX_BACKUPS)) as $old) @unlink($old);
}
function history_entry(array $h): void {
    $log = priv_read("history", []);
    array_unshift($log, $h);
    priv_write("history", array_slice($log, 0, 100));
}
/* Écrit le nouveau contenu puis reconstruit tout le site */
function publish(array $content, string $who, string $summary, array $images = []): array {
    $json = json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_PRETTY_PRINT) . "\n";
    $json = preg_replace_callback('/^( +)/m', fn($m) => str_repeat(" ", intdiv(strlen($m[1]), 2)), $json); // retrait de 2 espaces
    $snap = snapshot();
    try {
        save_images($images, $json);
        backup($snap["data/content.json"] ?? "", $who, $summary);
        wr(CONTENT, $json);
        $missing = exad_build(ROOT);
    } catch (Throwable $e) {
        restore_snapshot($snap);
        fail("La mise à jour du site a échoué, rien n'a été modifié. Détail : " . $e->getMessage(), 500);
    }
    history_entry(["date" => date("c"), "who" => $who, "summary" => $summary]);
    return ["version" => content_version($json), "missing" => $missing];
}

/* ====================================================================
   Requêtes
   ==================================================================== */
if ($_SERVER["REQUEST_METHOD"] !== "POST") fail("Méthode non autorisée.", 405);
// protection contre les requêtes venant d'un autre site
if (($_SERVER["HTTP_X_EXAD_ADMIN"] ?? "") !== "1") fail("Requête refusée.", 403);
$in = json_decode(file_get_contents("php://input") ?: "{}", true) ?? [];
$action = (string)($in["action"] ?? "");

priv_init();
start_session(!empty($in["remember"]));
date_default_timezone_set("Africa/Kinshasa");

switch ($action) {
case "state":
    $u = current_user();
    out(["setup" => !priv_read("users", []), "user" => $u ? public_user($u) : null]);

case "setup":   // premier compte : possible seulement tant qu'aucun compte n'existe
    with_lock(function () use ($in) {
        if (priv_read("users", [])) fail("Le compte administrateur existe déjà : connectez-vous.", 403);
        $name = trim((string)($in["name"] ?? "")); $email = norm_email($in["email"] ?? "");
        if ($name === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail("Indiquez votre nom et une adresse e-mail valide.");
        $u = ["id" => bin2hex(random_bytes(8)), "name" => $name, "email" => $email, "hash" => check_pass($in["pass"] ?? ""), "created" => date("Y-m-d")];
        priv_write("users", [$u]);
        session_regenerate_id(true);
        $_SESSION["uid"] = $u["id"];
        out(["user" => public_user($u)]);
    });

case "login":
    throttle();
    $email = norm_email($in["email"] ?? "");
    foreach (priv_read("users", []) as $u) {
        if ($u["email"] === $email && password_verify((string)($in["pass"] ?? ""), $u["hash"])) {
            session_regenerate_id(true);
            $_SESSION["uid"] = $u["id"];
            out(["user" => public_user($u)]);
        }
    }
    throttle(true);
    usleep(800000);
    fail("E-mail ou mot de passe incorrect.", 401);

case "logout":
    $_SESSION = [];
    session_destroy();
    out(["ok" => true]);

case "load":
    need_user();
    $raw = file_get_contents(CONTENT);
    out(["content" => json_decode($raw, true), "version" => content_version($raw)]);

case "save":
    $u = need_user();
    out(with_lock(function () use ($in, $u) {
        check_content($in["content"] ?? null);
        $cur = file_get_contents(CONTENT);
        if (empty($in["force"]) && ($in["version"] ?? "") !== content_version($cur))
            out(["conflict" => true], 409);
        $summary = mb_substr(trim((string)($in["summary"] ?? "contenu")), 0, 120);
        return publish($in["content"], $u["name"], $summary, is_array($in["images"] ?? null) ? $in["images"] : []);
    }));

case "history":
    need_user();
    $backups = array_map(function ($f) {
        $b = priv_read("backups/" . basename($f, ".php"), []);
        return ["id" => basename($f, ".php"), "date" => $b["date"] ?? "", "who" => $b["who"] ?? "", "summary" => $b["summary"] ?? ""];
    }, array_reverse(glob(PRIV . "/backups/*.php")));
    out(["history" => array_slice(priv_read("history", []), 0, 20), "backups" => array_slice($backups, 0, 20)]);

case "restore":   // remet le contenu tel qu'il était avant une modification
    $u = need_user();
    out(with_lock(function () use ($in, $u) {
        $id = (string)($in["id"] ?? "");
        if (!preg_match('/^\d{8}-\d{6}-[0-9a-f]{4}$/', $id) || !is_file(PRIV . "/backups/$id.php")) fail("Sauvegarde introuvable.", 404);
        $b = priv_read("backups/$id", []);
        $c = json_decode($b["content"] ?? "", true);
        check_content($c);
        return publish($c, $u["name"], "retour à la version du " . date("d/m/Y à H:i", strtotime($b["date"])));
    }));

case "users":
    need_user();
    out(["users" => array_map("public_user", priv_read("users", []))]);

case "add_user":
    $me = need_user();
    out(with_lock(function () use ($in) {
        $users = priv_read("users", []);
        $name = trim((string)($in["name"] ?? "")); $email = norm_email($in["email"] ?? "");
        if ($name === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail("Indiquez un nom et une adresse e-mail valide.");
        foreach ($users as $x) if ($x["email"] === $email) fail("Cet e-mail a déjà un accès.");
        $users[] = ["id" => bin2hex(random_bytes(8)), "name" => $name, "email" => $email, "hash" => check_pass($in["pass"] ?? ""), "created" => date("Y-m-d")];
        priv_write("users", $users);
        return ["users" => array_map("public_user", $users)];
    }));

case "remove_user":
    $me = need_user();
    out(with_lock(function () use ($in, $me) {
        if (($in["id"] ?? "") === $me["id"]) fail("Vous ne pouvez pas retirer votre propre accès.");
        $users = array_values(array_filter(priv_read("users", []), fn($x) => $x["id"] !== ($in["id"] ?? "")));
        priv_write("users", $users);
        return ["users" => array_map("public_user", $users)];
    }));

case "change_password":
    $me = need_user();
    out(with_lock(function () use ($in, $me) {
        $users = priv_read("users", []);
        foreach ($users as &$x) {
            if ($x["id"] !== $me["id"]) continue;
            if (!password_verify((string)($in["old"] ?? ""), $x["hash"])) fail("Le mot de passe actuel est incorrect.");
            $x["hash"] = check_pass($in["pass"] ?? "");
        }
        priv_write("users", $users);
        return ["ok" => true];
    }));

default:
    fail("Action inconnue.", 404);
}
