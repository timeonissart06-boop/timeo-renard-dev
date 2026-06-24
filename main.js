// =========================================================
// Timeo Renard — Développement Web
// Thème + animations (reveal mot à mot, tracé, compteurs, parallaxe)
// =========================================================
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Thème : le site est verrouillé en sombre (fond WebGL) ---
  root.setAttribute("data-theme", "dark");

  // --- Header : bordure au scroll ---
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // --- Menu mobile (hamburger) ---
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  if (navToggle && header) {
    const closeNav = () => {
      header.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Ouvrir le menu");
    };
    navToggle.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
    if (mainNav) mainNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });
    document.addEventListener("click", (e) => {
      if (header.classList.contains("nav-open") && !header.contains(e.target)) closeNav();
    });
  }

  // --- Révélation mot à mot du titre ---
  document.querySelectorAll("[data-reveal-words]").forEach((title) => {
    if (reduce) { title.classList.add("go"); return; }
    let i = 0;
    const wrap = (txt) => {
      const frag = document.createDocumentFragment();
      txt.split(/(\s+)/).forEach((chunk) => {
        if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
        if (chunk === "") return;
        const s = document.createElement("span");
        s.className = "word"; s.textContent = chunk;
        s.style.animationDelay = (i++ * 0.07) + "s";
        frag.appendChild(s);
      });
      return frag;
    };
    // Parcourt les noeuds : texte découpé en mots, éléments gardés entiers
    Array.from(title.childNodes).forEach((node) => {
      if (node.nodeType === 3) {
        title.replaceChild(wrap(node.textContent), node);
      } else if (node.nodeType === 1) {
        node.classList.add("word");
        node.style.animationDelay = (i++ * 0.07) + "s";
      }
    });
    requestAnimationFrame(() => title.classList.add("go"));
  });

  // --- Compteur animé ---
  const runCount = (el) => {
    const to = parseFloat(el.dataset.to || "0");
    const suffix = el.dataset.suffix || "";
    if (reduce) { el.textContent = to + suffix; return; }
    const dur = 1400; const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // --- Reveal au scroll + déclencheurs (tracé, surligneur, compteur) ---
  const targets = document.querySelectorAll(
    ".section-head, .pack, .work-card, .why-row, .why-head, .cta-inner, .svc-row, .faq-item, .about-text, .contact-form, .contact-info, .hero-sub, .step"
  );
  targets.forEach((el, idx) => {
    el.classList.add("reveal");
    el.style.transitionDelay = ((idx % 4) * 0.07) + "s";
  });

  const lazies = document.querySelectorAll(".hand-underline, .marker, .count");

  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    targets.forEach((el) => io.observe(el));

    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        if (el.classList.contains("hand-underline")) el.classList.add("draw");
        if (el.classList.contains("marker")) el.classList.add("lit");
        if (el.classList.contains("count")) runCount(el);
        io2.unobserve(el);
      });
    }, { threshold: 0.6 });
    lazies.forEach((el) => io2.observe(el));
  } else {
    targets.forEach((el) => el.classList.add("in"));
    lazies.forEach((el) => {
      el.classList.add("draw", "lit");
      if (el.classList.contains("count")) runCount(el);
    });
  }

  // --- Parallaxe à la souris (visuel hero) ---
  const parallax = document.querySelectorAll(".parallax");
  const visual = document.querySelector(".hero-visual");
  if (visual && parallax.length && !reduce && window.matchMedia("(pointer:fine)").matches) {
    visual.addEventListener("mousemove", (e) => {
      const r = visual.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      parallax.forEach((el) => {
        const d = parseFloat(el.dataset.depth || "20");
        el.style.setProperty("--px", (x * d).toFixed(1) + "px");
        el.style.setProperty("--py", (y * d).toFixed(1) + "px");
      });
    });
    visual.addEventListener("mouseleave", () => {
      parallax.forEach((el) => { el.style.setProperty("--px", "0px"); el.style.setProperty("--py", "0px"); });
    });
  }

  // --- FAQ accordéon ---
  document.querySelectorAll(".faq-q").forEach((q) => {
    q.addEventListener("click", () => q.closest(".faq-item").classList.toggle("open"));
  });

  // --- Formulaire de contact (envoi réel via /api/contact) ---
  const form = document.getElementById("contactForm");
  if (form) {
    const success = document.getElementById("formSuccess");
    const errorBox = document.getElementById("formError");
    const btn = form.querySelector('button[type="submit"]');
    const btnLabel = btn ? btn.textContent : "";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorBox) errorBox.classList.remove("show");

      // --- Consentement RGPD obligatoire ---
      const consentBox = form.querySelector("#consent");
      if (consentBox && !consentBox.checked) {
        if (errorBox) {
          errorBox.textContent = "Merci de cocher la case de consentement pour envoyer votre demande.";
          errorBox.classList.add("show");
        }
        consentBox.focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());

      if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const out = await res.json().catch(() => ({}));
        if (res.ok && out.ok) {
          form.reset();
          if (success) { success.classList.add("show"); success.scrollIntoView({ behavior: "smooth", block: "center" }); }
        } else {
          throw new Error(out.error || "Envoi impossible.");
        }
      } catch (err) {
        if (errorBox) {
          const isNetwork = err instanceof TypeError; // fetch a échoué (serveur injoignable)
          if (isNetwork) {
            const subject = encodeURIComponent("Demande de devis depuis le site");
            const body = encodeURIComponent(
              `Nom : ${data.nom || ""}\nPack souhaité : ${data.pack || "—"}\n\n${data.message || ""}`
            );
            errorBox.innerHTML =
              "L'envoi automatique est indisponible. " +
              `<a href="mailto:renard.timeo06@gmail.com?subject=${subject}&body=${body}" style="color:inherit;text-decoration:underline;font-weight:600">Cliquez ici pour m'écrire directement</a>.`;
          } else {
            errorBox.textContent = (err && err.message) || "Une erreur est survenue.";
          }
          errorBox.classList.add("show");
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
      }
    });
  }
})();
