/* =========================================================================
   EXAD — script commun à toutes les pages
   - Menu mobile + sous-menu Services
   - Slider du hero (page d'accueil)
   - Apparition des sections au défilement
   - Formulaire de contact
   - Assistant (chatbot)
   ========================================================================= */
/* Langue de la page : les pages anglaises sont dans le dossier en/ */
const PAGE_LANG = document.documentElement.lang === "en" ? "en" : "fr";
let EN = PAGE_LANG === "en";            // langue affichée (peut changer sans recharger)
const ASSETS = PAGE_LANG === "en" ? "../" : "";
const t = (fr, en) => (EN ? en : fr);

/* ---------- Écran de chargement et transitions entre pages --------------- */
(() => {
  const html = document.documentElement;
  const loader = document.querySelector(".page-loader");
  const pctEl = loader && loader.querySelector(".loader-pct");
  // Durée minimale d'affichage : le logo et le pourcentage doivent être lisibles
  const minTime = html.classList.contains("is-quick") ? 400 : 800;
  const start = window.__exadStart || Date.now();
  let p = 0, loaded = document.readyState === "complete", done = false;
  const setP = (v) => {
    if (!loader) return;
    loader.style.setProperty("--p", v.toFixed(1));
    loader.querySelector(".loader-logo")?.style.setProperty("--p", v.toFixed(1));
    if (pctEl) pctEl.textContent = Math.round(v) + (EN ? "%" : " %");
  };
  const step = () => {
    const elapsed = Date.now() - start;
    // Avance régulièrement jusqu'à 90 % pendant le chargement, puis termine à 100 %
    const timeShare = Math.min(elapsed / minTime, 1) * 100;
    const target = loaded ? timeShare : Math.min(timeShare, 90);
    p += (target - p) * 0.2 + 0.4;
    p = Math.min(p, target);
    setP(p);
    if (loaded && p >= 99.5 && elapsed >= minTime) {
      setP(100);
      done = true;
      setTimeout(() => {
        html.classList.add("is-loaded");
        setTimeout(() => html.classList.remove("is-loading"), 100);
      }, 100);
      return;
    }
    requestAnimationFrame(step);
  };
  if (loader && html.classList.contains("is-loading")) requestAnimationFrame(step);
  else html.classList.add("is-loaded");
  window.addEventListener("load", () => { loaded = true; });

  // Retour arrière depuis le cache du navigateur : on retire le rideau
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) html.classList.remove("is-leaving", "is-loading");
  });

  // Quitter la page : le rideau redescend, puis on change de page
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || a.classList.contains("lang-switch") || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    setP(100);
    html.classList.add("is-leaving");
    setTimeout(() => { location.href = url.href; }, 350);
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Menu mobile ---------------------------------------------- */
  const header = document.querySelector("header");
  const menuBtn = document.querySelector(".menu");
  const nav = document.getElementById("menu-principal");
  const mobile = window.matchMedia("(max-width: 850px)");

  const setMenu = (open) => {
    if (!header || !menuBtn) return;
    header.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? t("Fermer le menu", "Close menu") : t("Ouvrir le menu", "Open menu"));
    document.body.classList.toggle("no-scroll", open);
  };

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => setMenu(!header.classList.contains("is-open")));
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    mobile.addEventListener("change", (e) => { if (!e.matches) setMenu(false); });
  }

  /* Sous-menu Services : ouvrable au clavier et au toucher */
  document.querySelectorAll(".dropdown").forEach((dd) => {
    const toggle = dd.querySelector(".dropdown-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      const open = !dd.classList.contains("open");
      dd.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    dd.addEventListener("focusout", (e) => {
      if (!dd.contains(e.relatedTarget) && !mobile.matches) {
        dd.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  /* Ombre de l'en-tête au défilement */
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Année du copyright */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- Slider du hero (accueil) --------------------------------- */
  const h1 = document.querySelector(".hero h1");
  const heroImg = document.querySelector(".static-hero img");
  if (h1 && heroImg) {
    /* cms:slides */
    const allSlides = (en) => en ? [
      { html: "Your partner for <span>enterprise-grade IT infrastructure</span>.", img: "hero_datacenter_new.webp", alt: "EXAD data center" },
      { html: "Optimize your fleet with <span>smart tracking</span> solutions.", img: "slider_fleet_new.webp", alt: "EXAD fleet tracking" },
      { html: "Protect your data with <span>next-generation cybersecurity</span>.", img: "slider_cyber_new.webp", alt: "EXAD cybersecurity" },
    ] : [
      { html: "Votre partenaire pour une <span>infrastructure IT</span> de niveau entreprise.", img: "hero_datacenter_new.webp", alt: "Data center EXAD" },
      { html: "Optimisez votre flotte avec nos solutions de <span>tracking intelligent</span>.", img: "slider_fleet_new.webp", alt: "Suivi de flotte EXAD" },
      { html: "Protégez vos données avec une <span>cybersécurité</span> de nouvelle génération.", img: "slider_cyber_new.webp", alt: "Cybersécurité EXAD" },
    ];
    /* /cms:slides */
    const slides = allSlides(false).map((sl, i) => ({ ...sl, img: ASSETS + sl.img }));
    const slideText = (i) => allSlides(EN)[i];
    let current = 0;
    window.__exadSlider = { refresh: () => { h1.innerHTML = slideText(current).html; } };
    // Précharge les images suivantes pour éviter un flash blanc
    slides.slice(1).forEach((s) => { const i = new Image(); i.src = s.img; });
    if (EN) h1.innerHTML = slideText(0).html;

    const typeInto = (html, done) => {
      if (reduceMotion) { h1.innerHTML = html; done(0); return; }
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const chars = [];
      const wrap = (node) => {
        if (node.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const c of node.nodeValue) {
            const span = document.createElement("span");
            span.className = "char";
            span.textContent = c;
            frag.appendChild(span);
            chars.push(span);
          }
          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          Array.from(node.childNodes).forEach(wrap);
        }
      };
      wrap(tmp);
      h1.innerHTML = "";
      while (tmp.firstChild) h1.appendChild(tmp.firstChild);
      chars.forEach((c, i) => setTimeout(() => c.classList.add("on"), 300 + i * 45));
      done(300 + chars.length * 45);
    };

    const show = (index) => {
      current = index;
      const s = { ...slides[index], html: slideText(index).html, alt: slideText(index).alt };
      if (!heroImg.src.endsWith(s.img)) {
        heroImg.classList.add("fading");
        setTimeout(() => { heroImg.src = s.img; heroImg.alt = s.alt; heroImg.classList.remove("fading"); }, 500);
      }
      typeInto(s.html, (duration) => {
        setTimeout(() => show((index + 1) % slides.length), duration + 6000);
      });
    };
    // Le premier titre est déjà dans le HTML : on attend avant de passer au suivant
    setTimeout(() => show(1), 7000);
  }

  /* ---------- Apparition au défilement --------------------------------- */
  if (!reduceMotion && "IntersectionObserver" in window) {
    const els = document.querySelectorAll(".card, .panel, .section-head, .cta-box, .split > div, .stat, .client-grid li, .step, .tech-grid li, .dark-note");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => {
      // Ce qui est déjà visible au chargement reste affiché tel quel
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      // Cascade : chaque élément d'un même groupe apparaît un peu après le précédent
      const siblings = [...el.parentElement.children].filter((c) => c.matches(".card, .stat, li"));
      const i = siblings.indexOf(el);
      if (i > 0) el.style.setProperty("--d", Math.min(i, 6) * 0.08 + "s");
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  /* ---------- Chiffres clés qui comptent -------------------------------- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && !reduceMotion && "IntersectionObserver" in window) {
    const run = (el) => {
      const target = +el.dataset.count, suffix = el.dataset.suffix || "";
      const from = "plain" in el.dataset ? target - 25 : 0;   // l'année part de 1990, pas de 0
      const t0 = performance.now(), dur = 1600;
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(from + (target - from) * e) + (p === 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const co = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { run(en.target); co.unobserve(en.target); }
    }), { threshold: 0.6 });
    counters.forEach((c) => {
      if (c.getBoundingClientRect().top < innerHeight) return; // déjà visible : on garde la valeur finale
      c.textContent = "plain" in c.dataset ? +c.dataset.count - 25 : 0;
      co.observe(c);
    });
  }

  /* ---------- Effets à la souris (ordinateur uniquement) ---------------- */
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    // Cartes : inclinaison 3D + reflet lumineux
    document.querySelectorAll(".bento-card, .card.case, .value-card, .vision-panel, .step").forEach((card) => {
      card.classList.add("tilt");
      const max = card.classList.contains("b-dc") ? 4 : 7;
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", x * 100 + "%");
        card.style.setProperty("--my", y * 100 + "%");
        card.style.transition = "transform .1s linear";
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateY(-4px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transition = "transform .6s cubic-bezier(.16,1,.3,1)";
        card.style.transform = "";
      });
    });

    // Boutons aimantés
    document.querySelectorAll("main .btn").forEach((btn) => {
      btn.classList.add("magnetic");
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------- Profondeur des grandes images au défilement --------------- */
  const layers = document.querySelectorAll(".page-hero-img, .static-hero img");
  if (layers.length && !reduceMotion && !mobile.matches) {
    layers.forEach((l) => l.classList.add("parallax"));
    let ticking = false;
    const update = () => {
      layers.forEach((l) => {
        const r = l.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        l.style.transform = `translateY(${Math.max(-40, Math.min(40, r.top * -0.08))}px)`;
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  }

  /* ---------- Formulaire de contact ------------------------------------ */
  // Sans serveur, le formulaire ouvre la messagerie du visiteur avec la demande
  // pré-remplie. Pour un envoi direct, voir README.md (Formspree / FormSubmit).
  const form = document.getElementById("exad-form");
  if (form) {
    const status = form.querySelector(".form-status");
    const done = document.getElementById("success-msg");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.querySelectorAll("[aria-invalid]").forEach((f) => f.removeAttribute("aria-invalid"));
      const invalid = [...form.elements].filter((f) => f.willValidate && !f.checkValidity());
      const svcGroup = form.querySelector(".svc-group");
      if (svcGroup) svcGroup.classList.toggle("is-invalid", invalid.some((f) => f.name === "service"));
      if (invalid.length) {
        invalid.forEach((f) => f.setAttribute("aria-invalid", "true"));
        status.textContent = t("Merci de compléter les champs marqués d'un * (avec une adresse email valide).", "Please fill in the fields marked * (with a valid email address).");
        invalid[0].focus();
        return;
      }
      status.textContent = "";
      const d = Object.fromEntries(new FormData(form));
      // Service choisi : on reprend le libellé affiché (traduit en anglais sur la version EN)
      const svc = form.querySelector('input[name="service"]:checked');
      if (svc) d.service = svc.closest("label").textContent.trim();
      const subject = `${t("Demande de devis", "Quote request")}${d.service ? " — " + d.service : ""} (${d.nom})`;
      const lines = [
        `${t("Nom", "Name")} : ${d.nom}`,
        d.entreprise && `${t("Entreprise", "Company")} : ${d.entreprise}`,
        `Email : ${d.email}`,
        d.telephone && `${t("Téléphone", "Phone")} : ${d.telephone}`,
        d.service && `Service : ${d.service}`,
      ].filter(Boolean);
      const body = lines.join("\n") + "\n\n" + d.message;
      window.location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (done) { done.hidden = false; done.querySelector("button")?.focus(); }
    });
    form.querySelectorAll('input[name="service"]').forEach((r) => r.addEventListener("change", () => form.querySelector(".svc-group")?.classList.remove("is-invalid")));
    done?.querySelector("button")?.addEventListener("click", () => {
      done.hidden = true;
      form.reset();
    });
  }

  /* ---------- Page contact : ouvert / fermé + plan d'accès ------------- */
  const openEl = document.querySelector("[data-open-status]");
  if (openEl) {
    const update = () => {
      // Heure de Kinshasa (UTC+1), lundi–vendredi 08:30–17:00
      const now = new Date(Date.now() + 3600 * 1000);
      const day = now.getUTCDay(), mins = now.getUTCHours() * 60 + now.getUTCMinutes();
      const open = day >= 1 && day <= 5 && mins >= 510 && mins < 1020;
      openEl.classList.toggle("is-open", open);
      let txt;
      if (open) txt = t("Ouvert maintenant · jusqu'à 17:00", "Open now · until 5:00 PM");
      else if (day >= 1 && day <= 5 && mins < 510) txt = t("Fermé · ouvre aujourd'hui à 08:30", "Closed · opens today at 8:30 AM");
      else if (day >= 1 && day <= 4) txt = t("Fermé · ouvre demain à 08:30", "Closed · opens tomorrow at 8:30 AM");
      else txt = t("Fermé · ouvre lundi à 08:30", "Closed · opens Monday at 8:30 AM");
      openEl.querySelector(".open-text").textContent = txt;
    };
    update(); setInterval(update, 60000);
    window.__exadOpen = update;
  }
  const mapFrame = document.querySelector("[data-map]");
  const mapAddr = document.querySelector("[data-map-address]");
  if (mapFrame && mapAddr) {
    const q = encodeURIComponent("EXAD SARL, " + mapAddr.textContent.trim() + ", RDC");
    mapFrame.src = "https://www.google.com/maps?q=" + q + "&z=15&output=embed";
    const link = document.querySelector("[data-map-link]");
    if (link) link.href = "https://www.google.com/maps/search/?api=1&query=" + q;
  }

  /* ---------- Onglets (accueil) ---------------------------------------- */
  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length];
        select(n); n.focus();
      });
    });
  });

  /* ---------- Actualités : filtres et visionneuse ---------------------- */
  const filters = document.querySelectorAll(".news-filters .chip");
  filters.forEach((chip) => chip.addEventListener("click", () => {
    filters.forEach((c) => { const on = c === chip; c.classList.toggle("is-active", on); c.setAttribute("aria-pressed", String(on)); });
    const f = chip.dataset.filter;
    let shown = 0;
    document.querySelectorAll(".news-section [data-type]").forEach((a) => {
      const show = f === "all" || a.dataset.type === f;
      a.hidden = !show; if (show) shown++;
    });
    const empty = document.querySelector(".news-empty"); if (empty) empty.hidden = shown > 0;
  }));
  const lb = document.querySelector(".lightbox");
  if (lb) {
    const img = lb.querySelector("img");
    let opener = null;
    const close = () => { lb.hidden = true; document.body.classList.remove("no-scroll"); opener?.focus(); };
    document.querySelectorAll(".zoom").forEach((z) => z.addEventListener("click", () => {
      opener = z;
      img.src = z.querySelector("img").src; img.alt = z.querySelector("img").alt;
      lb.hidden = false; document.body.classList.add("no-scroll");
      lb.querySelector(".lightbox-close").focus();
    }));
    lb.addEventListener("click", (e) => { if (e.target !== img) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) close(); });
  }

  /* ---------- Équipe : cartes en éventail (toucher sur mobile) ---------- */
  document.querySelectorAll(".team-stack, .team-folder, .team-desk").forEach((stack) => {
    if (window.matchMedia("(hover: hover)").matches) return;
    stack.addEventListener("click", (e) => {
      if (!stack.classList.contains("is-open")) { e.preventDefault(); e.stopPropagation(); stack.classList.add("is-open"); }
    }, true);
  });

  /* ---------- Galerie de l'équipe (coverflow) -------------------------- */
  document.querySelectorAll(".team-gallery").forEach((gal) => {
    const cards = [...gal.querySelectorAll(".cf-card")];
    const dots = [...gal.querySelectorAll(".cf-dot")];
    const count = gal.querySelector(".cf-count strong");
    const n = cards.length, DELAY = 4000;
    let index = 0, timer = null, hover = false, visible = false;

    const render = () => {
      cards.forEach((c, i) => {
        let o = i - index;
        if (o > n / 2) o -= n;
        if (o < -n / 2) o += n;
        const a = Math.abs(o);
        c.style.setProperty("--o", o);
        c.style.setProperty("--s", a === 0 ? 1 : a === 1 ? 0.82 : 0.66);
        c.style.setProperty("--a", a === 0 ? 1 : a === 1 ? 0.75 : a === 2 ? 0.35 : 0);
        c.style.setProperty("--sat", a === 0 ? 1 : 0.6);
        c.style.setProperty("--z", 10 - a);
        c.classList.toggle("is-active", a === 0);
        c.setAttribute("aria-hidden", String(a !== 0));
      });
      dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
      if (count) count.textContent = String(index + 1).padStart(2, "0");
    };
    const go = (i) => { index = (i + n) % n; render(); schedule(); };
    const schedule = () => {
      clearTimeout(timer);
      if (!reduceMotion && !hover && visible) timer = setTimeout(() => go(index + 1), DELAY);
    };

    gal.querySelector(".cf-prev").addEventListener("click", () => go(index - 1));
    gal.querySelector(".cf-next").addEventListener("click", () => go(index + 1));
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
    // Clic sur une photo voisine : elle passe au centre (au centre : agrandissement)
    cards.forEach((c, i) => c.querySelector(".zoom").addEventListener("click", (e) => {
      if (i !== index) { e.stopImmediatePropagation(); go(i); }
    }, true));
    const stage = gal.querySelector(".coverflow");
    stage.addEventListener("mouseenter", () => { hover = true; clearTimeout(timer); });
    stage.addEventListener("mouseleave", () => { hover = false; schedule(); });
    gal.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(index - 1); if (e.key === "ArrowRight") go(index + 1); });
    let x0 = null;
    stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; schedule(); }, { threshold: 0.3 }).observe(stage);
    } else { visible = true; }
    render(); schedule();
  });

  /* ---------- Messagerie : discussion en direct (Tawk.to) ou assistant ---- */
  const cfg = window.EXAD_CONFIG || {};
  if (cfg.tawk) {
    // Discussion en direct avec l'équipe EXAD (configurée depuis /admin)
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = "https://embed.tawk.to/" + encodeURIComponent(cfg.tawk) + "/" + encodeURIComponent(cfg.tawkWidget || "default");
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    document.body.appendChild(s1);
    document.querySelectorAll("[data-open-chat]").forEach((b) => b.addEventListener("click", () => {
      if (window.Tawk_API && typeof window.Tawk_API.maximize === "function") window.Tawk_API.maximize();
    }));
  } else {
    initChatbot();
    document.querySelectorAll("[data-open-chat]").forEach((b) => b.addEventListener("click", () => {
      const toggle = document.querySelector(".chatbot-toggle");
      if (toggle && toggle.getAttribute("aria-expanded") !== "true") toggle.click();
    }));
  }
});

function initChatbot() {
  if (document.querySelector(".chatbot-widget")) return;
  const w = document.createElement("div");
  w.className = "chatbot-widget";
  w.innerHTML = `
    <div class="chatbot-window" id="chatbot-window" role="dialog" aria-label="${t("Assistant EXAD", "EXAD assistant")}" hidden>
      <div class="chatbot-header">
        <h4>${t("Assistant EXAD", "EXAD assistant")}</h4>
        <button type="button" class="close-btn" aria-label="${t("Fermer l'assistant", "Close assistant")}">&times;</button>
      </div>
      <div class="chatbot-messages" id="chatbot-messages" aria-live="polite">
        <div class="message bot">${t("Bonjour ! Je peux vous renseigner sur nos services, nos références ou nos coordonnées.", "Hello! I can tell you about our services, our references or how to reach us.")}</div>
        <div class="chat-suggestions">
          <button type="button">${t("Vos services", "Your services")}</button>
          <button type="button">${t("Demander un devis", "Request a quote")}</button>
          <button type="button">${t("Vos références", "Your references")}</button>
        </div>
      </div>
      <form class="chatbot-input">
        <label for="chat-input" class="sr-only">${t("Votre message", "Your message")}</label>
        <input type="text" id="chat-input" placeholder="${t("Écrivez votre message…", "Type your message…")}" autocomplete="off">
        <button type="submit">${t("Envoyer", "Send")}</button>
      </form>
    </div>
    <button type="button" class="chatbot-toggle" aria-controls="chatbot-window" aria-expanded="false" aria-label="${t("Ouvrir l'assistant", "Open assistant")}">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>`;
  document.body.appendChild(w);

  const win = w.querySelector(".chatbot-window");
  const toggle = w.querySelector(".chatbot-toggle");
  const msgs = w.querySelector(".chatbot-messages");
  const input = w.querySelector("#chat-input");

  const setOpen = (open) => {
    win.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? t("Fermer l'assistant", "Close assistant") : t("Ouvrir l'assistant", "Open assistant"));
    if (open) input.focus();
  };
  toggle.addEventListener("click", () => setOpen(win.hidden));
  w.querySelector(".close-btn").addEventListener("click", () => { setOpen(false); toggle.focus(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !win.hidden) { setOpen(false); toggle.focus(); } });

  const add = (cls, content, isHtml) => {
    const div = document.createElement("div");
    div.className = "message " + cls;
    if (isHtml) div.innerHTML = content; else div.textContent = content;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  };

  const ask = (text) => {
    text = text.trim();
    if (!text) return;
    msgs.querySelector(".chat-suggestions")?.remove();
    add("user", text, false);           // texte du visiteur affiché tel quel, jamais interprété comme HTML
    const typing = add("bot", t("L'assistant écrit…", "The assistant is typing…"), false);
    typing.classList.add("typing");
    setTimeout(() => { typing.classList.remove("typing"); typing.innerHTML = EN ? replyEn(text) : reply(text); msgs.scrollTop = msgs.scrollHeight; }, 700);
  };

  w.querySelector(".chatbot-input").addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); input.value = ""; });
  w.querySelectorAll(".chat-suggestions button").forEach((b) => b.addEventListener("click", () => ask(b.textContent)));
}

/* Réponses de l'assistant (règles métier EXAD) */
function reply(message) {
  const t = message.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const has = (...words) => words.some((w) => t.includes(w));

  if (has("devis", "prix", "tarif", "cout", "rdv", "rendez")) {
    return "Pour un devis, le plus rapide est notre <a href='contact.html'>formulaire de contact</a>. Vous pouvez aussi nous écrire à <strong>sales@exadgroup.org</strong> ou appeler le <strong>+243 840 104 000</strong>.";
  }
  if (has("cyber", "securite", "piratage", "virus", "firewall", "pare-feu")) {
    return "Notre pôle <strong>Cybersécurité</strong> couvre les pare-feu nouvelle génération (Fortinet, Cisco, Palo Alto), la protection des postes et des emails, la segmentation réseau et la gestion des vulnérabilités. <a href='cybersecurity.html'>En savoir plus</a>.";
  }
  if (has("data", "serveur", "stockage", "cloud", "backup", "sauvegarde")) {
    return "Nous concevons et maintenons des <strong>data centers</strong> : serveurs, stockage SAN, virtualisation, sauvegarde, onduleurs et supervision. <a href='datacenter.html'>Voir la page Data Center</a>.";
  }
  if (has("flotte", "fleet", "gps", "vehicule", "carburant", "fuel", "tracking")) {
    return "Notre solution <strong>Flotte & Fuel</strong> : suivi GPS en temps réel, geofencing, identification conducteur et contrôle du carburant. <a href='fleet.html'>Découvrir la solution</a>.";
  }
  if (has("reseau", "fibre", "lan", "wan", "wifi", "connectivite")) {
    return "Nous déployons et maintenons vos <strong>réseaux</strong> : LAN/WAN, fibre, switching, routing, interconnexion de sites et liens de secours. <a href='services.html'>Tous nos services</a>.";
  }
  if (has("service", "offre", "propose", "faites", "solution")) {
    return "EXAD intervient sur :<br>• Réseaux & connectivité<br>• Data center & stockage<br>• Cybersécurité<br>• Infogérance<br>• Développement logiciel<br>• Gestion de flotte<br>Lequel vous intéresse ?";
  }
  if (has("client", "reference", "realisation", "projet")) {
    return "Depuis 2015, nous accompagnons notamment <strong>Ecobank, Vodacom, Orange, Puma Energy, Engen</strong> et <strong>FBNBank</strong>. <a href='achievements.html'>Voir nos réalisations</a>.";
  }
  if (has("contact", "telephone", "appel", "mail", "adresse", "ou etes", "horaire")) {
    return "📞 <strong>+243 840 104 000</strong><br>✉️ <strong>sales@exadgroup.org</strong><br>📍 25c, Avenue Dr Mankoyi, Ngaliema, Kinshasa<br>🕘 Lundi – vendredi, 8h30 – 17h00";
  }
  if (has("bonjour", "salut", "bonsoir", "hello")) {
    return "Bonjour ! Posez-moi une question sur nos services, nos références ou nos coordonnées.";
  }
  if (has("merci")) {
    return "Avec plaisir ! Bonne visite sur notre site.";
  }
  return "Je n'ai pas bien compris. Je peux vous renseigner sur nos <strong>services</strong> (réseaux, data center, cybersécurité, flotte), nos <strong>références</strong> ou nos <strong>coordonnées</strong>. Pour une question précise, <a href='contact.html'>écrivez à notre équipe</a>.";
}

/* Réponses de l'assistant en anglais (comprend aussi les mots-clés français) */
function replyEn(message) {
  const t = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const has = (...words) => words.some((w) => t.includes(w));

  if (has("quote", "price", "pricing", "cost", "meeting", "devis", "prix", "tarif")) {
    return "For a quote, the fastest way is our <a href='contact.html'>contact form</a>. You can also email <strong>sales@exadgroup.org</strong> or call <strong>+243 840 104 000</strong>.";
  }
  if (has("cyber", "security", "hack", "virus", "firewall", "securite")) {
    return "Our <strong>cybersecurity</strong> team covers next-generation firewalls (Fortinet, Cisco, Palo Alto), endpoint and email protection, network segmentation and vulnerability management. <a href='cybersecurity.html'>Learn more</a>.";
  }
  if (has("data", "server", "storage", "cloud", "backup", "serveur", "stockage")) {
    return "We design and maintain <strong>data centers</strong>: servers, SAN storage, virtualization, backup, UPS and monitoring. <a href='datacenter.html'>See the Data Center page</a>.";
  }
  if (has("fleet", "gps", "vehicle", "fuel", "tracking", "flotte", "vehicule", "carburant")) {
    return "Our <strong>Fleet & Fuel</strong> solution: real-time GPS tracking, geofencing, driver identification and fuel control. <a href='fleet.html'>Discover the solution</a>.";
  }
  if (has("network", "fiber", "fibre", "lan", "wan", "wifi", "connectivity", "reseau")) {
    return "We deploy and maintain your <strong>networks</strong>: LAN/WAN, fiber, switching, routing, site interconnection and backup links. <a href='services.html'>All our services</a>.";
  }
  if (has("service", "offer", "solution", "what do you")) {
    return "EXAD works on:<br>• Networking & connectivity<br>• Data center & storage<br>• Cybersecurity<br>• Managed IT<br>• Software development<br>• Fleet management<br>Which one interests you?";
  }
  if (has("client", "customer", "reference", "project", "realisation")) {
    return "Since 2015, we have worked with <strong>Ecobank, Vodacom, Orange, Puma Energy, Engen</strong> and <strong>FBNBank</strong>, among others. <a href='achievements.html'>See our projects</a>.";
  }
  if (has("contact", "phone", "call", "mail", "address", "where", "hours", "telephone", "adresse")) {
    return "📞 <strong>+243 840 104 000</strong><br>✉️ <strong>sales@exadgroup.org</strong><br>📍 25c, Avenue Dr Mankoyi, Ngaliema, Kinshasa<br>🕘 Monday – Friday, 8:30 am – 5:00 pm";
  }
  if (has("hello", "hi ", "hey", "good morning", "bonjour", "salut")) {
    return "Hello! Ask me about our services, our references or how to reach us.";
  }
  if (has("thank", "merci")) {
    return "You're welcome! Enjoy your visit.";
  }
  return "I'm not sure I understood. I can tell you about our <strong>services</strong> (networking, data center, cybersecurity, fleet), our <strong>references</strong> or our <strong>contact details</strong>. For a specific question, <a href='contact.html'>write to our team</a>.";
}

/* =========================================================================
   Changement de langue instantané (sans recharger la page)
   - Le drapeau traduit la page sur place grâce au dictionnaire i18n.js
   - Le choix est mémorisé : les pages suivantes s'ouvrent dans la même langue
   - Les pages en/ restent disponibles pour Google et les liens partagés
   ========================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const html = document.documentElement;
  const data = window.EXAD_I18N;
  const sw = document.querySelector(".lang-switch");
  if (!data || !sw) return;

  const fr2en = data.fr2en;
  const en2fr = {};
  Object.entries(fr2en).forEach(([fr, en]) => { if (!(en in en2fr) || fr !== en) en2fr[en] = fr; });
  const norm = (v) => v.replace(/\s+/g, " ").trim();
  const ATTRS = ["alt", "placeholder", "aria-label", "title"];
  const origText = new WeakMap();   // texte d'origine de chaque nœud
  const origAttr = new WeakMap();   // attributs d'origine
  const origHTML = new WeakMap();   // blocs traduits d'un seul tenant
  const FLAGS = {
    en: '<svg class="flag" width="26" height="18" viewBox="0 0 60 40" aria-hidden="true"><clipPath id="uk-c2"><rect width="60" height="40" rx="4"/></clipPath><g clip-path="url(#uk-c2)"><rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="3"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="12"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="7"/></g></svg>',
    fr: '<svg class="flag" width="26" height="18" viewBox="0 0 60 40" aria-hidden="true"><clipPath id="fr-c2"><rect width="60" height="40" rx="4"/></clipPath><g clip-path="url(#fr-c2)"><rect width="20" height="40" fill="#002654"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#CE1126"/></g></svg>',
  };
  const pageFile = location.pathname.split("/").pop() || "index.html";

  const translateText = (value, dict) => {
    const core = norm(value);
    if (!core || !(core in dict)) return null;
    let out = dict[core];
    const lead = /^\s/.test(value) && !/^[.,;:!?)]/.test(out) ? " " : "";
    const trail = /\s$/.test(value) ? " " : "";
    return lead + out + trail;
  };

  const blocks = data.blocks;
  const applyBlocks = (to) => {
    document.querySelectorAll(".statement").forEach((el) => {
      if (!origHTML.has(el)) origHTML.set(el, el.innerHTML);
      const orig = origHTML.get(el);
      if (to === PAGE_LANG) { el.innerHTML = orig; return; }
      const pair = blocks.find(([fr, en]) => norm(orig) === norm(PAGE_LANG === "fr" ? fr : en));
      if (pair) el.innerHTML = to === "en" ? pair[1] : pair[0];
    });
  };

  const apply = (to) => {
    const dict = PAGE_LANG === "fr" ? fr2en : en2fr;   // de la langue de la page vers l'autre
    const back = to === PAGE_LANG;
    const skip = (el) => el.closest("script, style, svg, .hero h1, .statement, .chatbot-messages .message ~ .message, .loader-pct");

    // Textes
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      if (!n.parentElement || skip(n.parentElement)) return;
      if (!origText.has(n)) origText.set(n, n.nodeValue);
      const orig = origText.get(n);
      if (back) { n.nodeValue = orig; return; }
      const tr = translateText(orig, dict);
      if (tr !== null) n.nodeValue = tr;
    });

    // Attributs (textes alternatifs, libellés, champs)
    document.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(",")).forEach((el) => {
      if (el.classList.contains("lang-switch") || el.closest("svg")) return;
      if (!origAttr.has(el)) origAttr.set(el, Object.fromEntries(ATTRS.filter((a) => el.hasAttribute(a)).map((a) => [a, el.getAttribute(a)])));
      Object.entries(origAttr.get(el)).forEach(([a, v]) => {
        if (back) { el.setAttribute(a, v); return; }
        const tr = translateText(v, dict);
        if (tr !== null) el.setAttribute(a, tr.trim());
      });
    });

    // Titre de l'onglet
    if (!html.dataset.title) html.dataset.title = document.title;
    document.title = back ? html.dataset.title : (translateText(html.dataset.title, dict) || html.dataset.title).trim();

    applyBlocks(to);
    EN = to === "en";
    html.lang = to;
    window.__exadSlider?.refresh();
    window.__exadOpen?.();

    // Drapeau : montre l'autre langue
    const other = to === "fr" ? "en" : "fr";
    sw.innerHTML = FLAGS[other];
    sw.setAttribute("aria-label", other === "en" ? "English version" : "Version française");
    sw.setAttribute("title", other === "en" ? "English" : "Français");
    sw.setAttribute("hreflang", other);
    sw.setAttribute("lang", other);
    sw.setAttribute("href", PAGE_LANG === "fr" ? (other === "en" ? "en/" + pageFile : pageFile) : (other === "fr" ? "../" + pageFile : pageFile));
  };

  let current = PAGE_LANG;
  const switchTo = (to, animate) => {
    if (to === current) return;
    current = to;
    try { localStorage.setItem("exad-lang", to); } catch (e) {}
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { apply(to); return; }
    html.classList.add("lang-fading");
    setTimeout(() => {
      apply(to);
      requestAnimationFrame(() => html.classList.remove("lang-fading"));
    }, 180);
  };

  sw.addEventListener("click", (e) => {
    e.preventDefault();
    switchTo(current === "fr" ? "en" : "fr", true);
  });

  // Langue choisie lors d'une visite précédente (appliquée pendant l'écran de chargement)
  let saved = null;
  try { saved = localStorage.getItem("exad-lang"); } catch (e) {}
  if (saved === "fr" || saved === "en") switchTo(saved, false);
});
