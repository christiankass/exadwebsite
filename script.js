document.addEventListener("DOMContentLoaded", () => {
  // --- Menu mobile ---------------------------------------------------------
  const menu = document.querySelector(".menu");
  const nav = document.getElementById("menu-principal");
  const header = document.querySelector(".site-header");

  const setMenu = (open) => {
    if (!menu || !header) return;
    header.classList.toggle("is-open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    document.body.classList.toggle("no-scroll", open);
  };

  if (menu && nav) {
    menu.addEventListener("click", () => setMenu(!header.classList.contains("is-open")));
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        setMenu(false);
        menu.focus();
      }
    });
    // Referme le menu si on repasse en affichage bureau
    window.matchMedia("(min-width: 851px)").addEventListener("change", (e) => {
      if (e.matches) setMenu(false);
    });
  }

  // --- Ombre de l'en-tête au défilement -------------------------------------
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // --- Ancres internes -------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const el = id.length > 1 && document.querySelector(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      }
    })
  );

  // --- Année du copyright ----------------------------------------------------
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // --- Apparition progressive des cartes -------------------------------------
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = document.querySelectorAll(".card, .panel, .kpi, .cta-box");
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach((el) => {
      // Les éléments déjà visibles au chargement restent affichés tels quels
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  // --- Formulaire de contact -------------------------------------------------
  // Sans backend : ouvre la messagerie de l'utilisateur avec la demande pré-remplie.
  // Pour un envoi direct, remplacez ce bloc par un appel fetch() vers votre API
  // ou un service comme Formspree.
  const form = document.getElementById("contact-form");
  if (form) {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.querySelectorAll("[aria-invalid]").forEach((f) => f.removeAttribute("aria-invalid"));
      const invalid = [...form.elements].filter((f) => f.willValidate && !f.checkValidity());
      if (invalid.length) {
        invalid.forEach((f) => f.setAttribute("aria-invalid", "true"));
        status.textContent = "Merci de compléter les champs obligatoires (*) avec une adresse email valide.";
        status.className = "form-status error";
        invalid[0].focus();
        return;
      }
      const d = Object.fromEntries(new FormData(form));
      const subject = `Demande de contact${d.service ? " — " + d.service : ""} (${d.nom})`;
      const body = [
        `Nom : ${d.nom}`,
        `Email : ${d.email}`,
        d.telephone && `Téléphone : ${d.telephone}`,
        d.organisation && `Organisation : ${d.organisation}`,
        d.service && `Service : ${d.service}`,
      ].filter(Boolean).join("\n") + "\n\n" + d.message;
      window.location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = "Votre messagerie va s'ouvrir avec la demande pré-remplie. Il ne reste qu'à l'envoyer.";
      status.className = "form-status success";
    });
  }
});
