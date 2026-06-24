// =========================================================
// Consentement cookies (RGPD) + Google Analytics 4
// GA4 ne se charge QUE si l'utilisateur a cliqué « Accepter ».
// Le choix est mémorisé 12 mois (localStorage), puis re-proposé.
// =========================================================
(function () {
  // ⚠️ REMPLACE par ton identifiant GA4 (format G-XXXXXXXXXX).
  // Tant qu'il vaut le placeholder, aucun script Google n'est chargé.
  var GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

  var KEY = "cookieConsent";          // "accepted" | "rejected"
  var KEY_AT = "cookieConsentAt";     // horodatage du choix
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 12 mois

  // ---- Lecture / écriture du consentement ----
  function getConsent() {
    try {
      var v = localStorage.getItem(KEY);
      var at = parseInt(localStorage.getItem(KEY_AT) || "0", 10);
      if (!v) return null;
      if (Date.now() - at > MAX_AGE) { // expiré → on re-demande
        localStorage.removeItem(KEY); localStorage.removeItem(KEY_AT);
        return null;
      }
      return v;
    } catch (e) { return null; }
  }
  function setConsent(v) {
    try { localStorage.setItem(KEY, v); localStorage.setItem(KEY_AT, String(Date.now())); } catch (e) {}
  }

  // ---- Chargement de Google Analytics (seulement si accepté) ----
  function loadGA() {
    if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID.indexOf("G-XXX") === 0) return; // ID non configuré
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    // IP anonymisée — conforme RGPD/CNIL
    gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  // ---- Bandeau ----
  function buildBanner() {
    var wrap = document.createElement("div");
    wrap.className = "cookie-banner";
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", "Bandeau de consentement aux cookies");
    wrap.innerHTML =
      '<div class="cookie-inner">' +
        '<div class="cookie-text">' +
          '<h2 id="cookieTitle">Nous utilisons des cookies</h2>' +
          '<p id="cookieDesc">Nous utilisons Google Analytics pour analyser votre visite sur notre site. ' +
          'Ces cookies ne contiennent pas vos données personnelles. ' +
          '<a href="politique-confidentialite.html">Politique de confidentialité</a>.</p>' +
        '</div>' +
        '<div class="cookie-actions">' +
          '<button type="button" class="btn btn-outline" id="cookieReject">Refuser</button>' +
          '<button type="button" class="btn btn-primary" id="cookieAccept">Accepter les cookies</button>' +
        '</div>' +
      '</div>';
    return wrap;
  }

  function showBanner() {
    var banner = buildBanner();
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add("show"); });

    function close() {
      banner.classList.remove("show");
      setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 300);
    }
    banner.querySelector("#cookieAccept").addEventListener("click", function () {
      setConsent("accepted"); loadGA(); close();
    });
    banner.querySelector("#cookieReject").addEventListener("click", function () {
      setConsent("rejected"); close();
    });
  }

  // ---- Au chargement ----
  function init() {
    var c = getConsent();
    if (c === "accepted") { loadGA(); return; }
    if (c === "rejected") { return; }
    showBanner(); // pas encore de choix
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
