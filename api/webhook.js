// -----------------------------------------------------------------------------
// Webhook de WhatsApp Cloud API
// -----------------------------------------------------------------------------
// GET  -> verificación inicial que hace Meta al configurar el webhook.
// POST -> notificaciones entrantes (mensajes nuevos y cambios de estado).
//
// URL a cargar en Meta:  https://TU-APP.vercel.app/api/webhook
// -----------------------------------------------------------------------------

import { VERIFY_TOKEN, lineByPhoneId } from "../lib/config.js";
import { saveMessage } from "../lib/store.js";

export default async function handler(req, res) {
  // --- Verificación del webhook (Meta manda un challenge) ---
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Verification failed");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Recepción de eventos ---
  try {
    const body = req.body;
    const entries = body?.entry || [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const phoneNumberId = value?.metadata?.phone_number_id;
        const line = lineByPhoneId(phoneNumberId);
        if (!line) continue; // número que no manejamos

        // Mapa de nombres de contacto que viene en el payload
        const names = {};
        for (const c of value.contacts || []) {
          names[c.wa_id] = c?.profile?.name || null;
        }

        // Mensajes entrantes
        for (const m of value.messages || []) {
          const contact = m.from;
          const parsed = parseIncoming(m);
          await saveMessage(line.id, contact, {
            id: m.id,
            dir: "in",
            type: parsed.type,
            text: parsed.text,
            name: names[contact] || null,
            ts: Number(m.timestamp) * 1000 || Date.now(),
            status: "received",
          });
        }

        // (Opcional) actualizaciones de estado de mensajes salientes.
        // Se ignoran por ahora; el panel no depende de ellas.
      }
    }

    // Meta espera 200 rápido, si no reintenta.
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("webhook error", err);
    // Igual respondemos 200 para que Meta no reintente en loop.
    return res.status(200).json({ ok: false });
  }
}

// Normaliza los distintos tipos de mensaje a { type, text }.
function parseIncoming(m) {
  switch (m.type) {
    case "text":
      return { type: "text", text: m.text?.body || "" };
    case "image":
      return { type: "image", text: m.image?.caption || "[imagen]" };
    case "document":
      return { type: "document", text: m.document?.filename || "[documento]" };
    case "audio":
      return { type: "audio", text: "[audio]" };
    case "video":
      return { type: "video", text: m.video?.caption || "[video]" };
    case "sticker":
      return { type: "sticker", text: "[sticker]" };
    case "location":
      return { type: "location", text: "[ubicación]" };
    case "button":
      return { type: "text", text: m.button?.text || "[botón]" };
    case "interactive": {
      const i = m.interactive || {};
      const t =
        i?.button_reply?.title || i?.list_reply?.title || "[respuesta]";
      return { type: "text", text: t };
    }
    default:
      return { type: m.type || "unknown", text: `[${m.type || "mensaje"}]` };
  }
}
