/* =========================================================================
   EXAD — script commun à toutes les pages
   - Menu mobile + sous-menu Services
   - Slider du hero (page d'accueil)
   - Apparition des sections au défilement
   - Formulaire de contact
   - Assistant (chatbot)
   ========================================================================= */
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
    menuBtn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
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
    const slides = [
      { html: "Votre partenaire pour une <span>infrastructure IT</span> de niveau entreprise.", img: "hero_datacenter_new.webp", alt: "Data center EXAD" },
      { html: "Optimisez votre flotte avec nos solutions de <span>tracking intelligent</span>.", img: "slider_fleet_new.webp", alt: "Suivi de flotte EXAD" },
      { html: "Protégez vos données avec une <span>cybersécurité</span> de nouvelle génération.", img: "slider_cyber_new.webp", alt: "Cybersécurité EXAD" },
    ];
    // Précharge les images suivantes pour éviter un flash blanc
    slides.slice(1).forEach((s) => { const i = new Image(); i.src = s.img; });

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
      const s = slides[index];
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
    const els = document.querySelectorAll(".card, .panel, .section-head, .cta-box, .split > div");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => {
      // Ce qui est déjà visible au chargement reste affiché tel quel
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add("reveal");
      io.observe(el);
    });
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
      if (invalid.length) {
        invalid.forEach((f) => f.setAttribute("aria-invalid", "true"));
        status.textContent = "Merci de compléter les champs marqués d'un * (avec une adresse email valide).";
        invalid[0].focus();
        return;
      }
      status.textContent = "";
      const d = Object.fromEntries(new FormData(form));
      const subject = `Demande de devis${d.service ? " — " + d.service : ""} (${d.nom})`;
      const lines = [
        `Nom : ${d.nom}`,
        d.entreprise && `Entreprise : ${d.entreprise}`,
        `Email : ${d.email}`,
        d.telephone && `Téléphone : ${d.telephone}`,
        d.service && `Service : ${d.service}`,
      ].filter(Boolean);
      const body = lines.join("\n") + "\n\n" + d.message;
      window.location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (done) { done.hidden = false; done.querySelector("button")?.focus(); }
    });
    done?.querySelector("button")?.addEventListener("click", () => {
      done.hidden = true;
      form.reset();
    });
  }

  /* ---------- Assistant (chatbot) -------------------------------------- */
  initChatbot();
});

function initChatbot() {
  if (document.querySelector(".chatbot-widget")) return;
  const w = document.createElement("div");
  w.className = "chatbot-widget";
  w.innerHTML = `
    <div class="chatbot-window" id="chatbot-window" role="dialog" aria-label="Assistant EXAD" hidden>
      <div class="chatbot-header">
        <h4>Assistant EXAD</h4>
        <button type="button" class="close-btn" aria-label="Fermer l'assistant">&times;</button>
      </div>
      <div class="chatbot-messages" id="chatbot-messages" aria-live="polite">
        <div class="message bot">Bonjour ! Je peux vous renseigner sur nos services, nos références ou nos coordonnées.</div>
        <div class="chat-suggestions">
          <button type="button">Vos services</button>
          <button type="button">Demander un devis</button>
          <button type="button">Vos références</button>
        </div>
      </div>
      <form class="chatbot-input">
        <label for="chat-input" class="sr-only">Votre message</label>
        <input type="text" id="chat-input" placeholder="Écrivez votre message…" autocomplete="off">
        <button type="submit">Envoyer</button>
      </form>
    </div>
    <button type="button" class="chatbot-toggle" aria-controls="chatbot-window" aria-expanded="false" aria-label="Ouvrir l'assistant">
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
    toggle.setAttribute("aria-label", open ? "Fermer l'assistant" : "Ouvrir l'assistant");
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
    const typing = add("bot", "L'assistant écrit…", false);
    typing.classList.add("typing");
    setTimeout(() => { typing.classList.remove("typing"); typing.innerHTML = reply(text); msgs.scrollTop = msgs.scrollHeight; }, 700);
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
