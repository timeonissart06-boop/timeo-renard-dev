// =========================================================
// Fonction serverless Vercel — envoi du formulaire de contact via Resend.
// Reçue sur POST /api/contact. La clé API reste côté serveur (variables
// d'environnement Vercel), jamais exposée au navigateur.
// (Même logique que server.js, mais au format serverless.)
// =========================================================
const TO = process.env.CONTACT_TO || "renard.timeo06@gmail.com";
const FROM = process.env.CONTACT_FROM || "Site Timeo Renard <onboarding@resend.dev>";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Méthode non autorisée." });
  }

  try {
    // Vercel parse déjà le JSON, mais on gère aussi le cas chaîne / vide.
    let data = req.body;
    if (typeof data === "string") { try { data = JSON.parse(data || "{}"); } catch (_) { data = {}; } }
    if (!data || typeof data !== "object") data = {};

    const { nom, email, pack, message, website, consent } = data;

    if (website) return res.status(200).json({ ok: true });            // anti-spam (honeypot)
    if (!consent) return res.status(400).json({ ok: false, error: "Consentement requis pour traiter votre demande." });
    if (!nom || !email || !message) return res.status(400).json({ ok: false, error: "Merci de remplir tous les champs." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ ok: false, error: "Adresse email invalide." });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY manquante dans les variables d'environnement Vercel");
      return res.status(500).json({ ok: false, error: "Configuration email manquante." });
    }

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

    if (!r.ok) {
      console.error("Erreur Resend:", r.status, await r.text());
      return res.status(502).json({ ok: false, error: "L'envoi a échoué, réessayez plus tard." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Erreur serveur." });
  }
};
