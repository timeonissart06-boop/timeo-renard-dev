// =========================================================
// Timeo Renard — petit serveur : sert le site + envoie les
// emails du formulaire de contact via Resend.
// La clé API reste côté serveur (.env), jamais exposée au navigateur.
// Lancement : node server.js   (puis http://localhost:4399)
// =========================================================
const http = require("http");
const fs = require("fs");
const path = require("path");

// --- Charge .env (sans dépendance) ---
try {
  const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  env.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
} catch (_) { /* pas de .env : variables d'environnement système utilisées */ }

const PORT = process.env.PORT || 4399;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO = process.env.CONTACT_TO || "renard.timeo06@gmail.com";
const FROM = process.env.CONTACT_FROM || "Site Timeo Renard <onboarding@resend.dev>";

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
};

// En-têtes de sécurité appliqués à toutes les réponses
const setSecurityHeaders = (res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
    "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; "));
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);

  // ---- API : envoi du formulaire ----
  if (req.url === "/api/contact" && req.method === "POST") {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 100000) req.destroy(); });
    req.on("end", async () => {
      try {
        const { nom, email, pack, message, website, consent } = JSON.parse(raw || "{}");
        if (website) return json(res, 200, { ok: true });           // anti-spam (honeypot)
        if (!consent) return json(res, 400, { ok: false, error: "Consentement requis pour traiter votre demande." });
        if (!nom || !email || !message) return json(res, 400, { ok: false, error: "Merci de remplir tous les champs." });
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { ok: false, error: "Adresse email invalide." });
        if (!RESEND_API_KEY) { console.error("RESEND_API_KEY manquante dans .env"); return json(res, 500, { ok: false, error: "Configuration email manquante." }); }

        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM,
            to: [TO],
            reply_to: email,
            subject: `Nouveau message du site — ${nom}`,
            html:
              `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1a1a1e">` +
              `<h2 style="color:#1b40d8">Nouvelle demande depuis le site</h2>` +
              `<p><strong>Nom :</strong> ${escapeHtml(nom)}</p>` +
              `<p><strong>Email :</strong> ${escapeHtml(email)}</p>` +
              `<p><strong>Pack souhaité :</strong> ${escapeHtml(pack || "Non précisé")}</p>` +
              `<p><strong>Message :</strong></p>` +
              `<p style="white-space:pre-wrap;border-left:3px solid #1b40d8;padding-left:12px">${escapeHtml(message)}</p>` +
              `</div>`,
          }),
        });

        if (!r.ok) { console.error("Erreur Resend:", r.status, await r.text()); return json(res, 502, { ok: false, error: "L'envoi a échoué, réessayez plus tard." }); }
        return json(res, 200, { ok: true });
      } catch (e) {
        console.error(e);
        return json(res, 500, { ok: false, error: "Erreur serveur." });
      }
    });
    return;
  }

  // ---- Fichiers statiques ----
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const safe = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(__dirname, safe);
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); return res.end("403"); }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return res.end("<h1>404</h1>"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`\n  ✦ Site + API en ligne : http://localhost:${PORT}\n`));
