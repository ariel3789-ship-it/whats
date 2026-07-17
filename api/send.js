// POST /api/send
// Body: { line, contact, text }                    -> mensaje de texto libre
//       { line, contact, template, lang, components } -> plantilla aprobada
//
// El texto libre solo funciona dentro de la ventana de 24 hs desde el último
// mensaje entrante del contacto. Fuera de eso, Meta rechaza y hay que usar
// una plantilla preaprobada.

import { lineById, GRAPH_VERSION } from "../lib/config.js";
import { authorized } from "../lib/auth.js";
import { saveMessage, withinWindow } from "../lib/store.js";

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "No autorizado" });
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { line: lineId, contact, text, template, lang, components } =
    req.body || {};
  const line = lineById(lineId);
  if (!line) return res.status(400).json({ error: "Línea inválida" });
  if (!line.phoneNumberId || !line.token)
    return res.status(400).json({ error: "Línea sin credenciales cargadas" });
  if (!contact) return res.status(400).json({ error: "Falta el contacto" });

  // Construcción del payload según sea texto o plantilla
  let payload;
  let previewText;
  if (template) {
    payload = {
      messaging_product: "whatsapp",
      to: contact,
      type: "template",
      template: {
        name: template,
        language: { code: lang || "es_AR" },
        ...(components ? { components } : {}),
      },
    };
    previewText = `[plantilla: ${template}]`;
  } else {
    if (!text) return res.status(400).json({ error: "Falta el texto" });
    const open = await withinWindow(lineId, contact);
    if (!open) {
      return res.status(409).json({
        error:
          "Fuera de la ventana de 24 hs. Usá una plantilla aprobada para reabrir la conversación.",
        code: "OUT_OF_WINDOW",
      });
    }
    payload = {
      messaging_product: "whatsapp",
      to: contact,
      type: "text",
      text: { body: text, preview_url: true },
    };
    previewText = text;
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${line.phoneNumberId}/messages`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${line.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json();

    if (!r.ok) {
      console.error("graph error", data);
      return res.status(r.status).json({
        error: data?.error?.message || "Error de la Graph API",
        details: data?.error || null,
      });
    }

    const messageId = data?.messages?.[0]?.id || null;
    const record = await saveMessage(lineId, contact, {
      id: messageId,
      dir: "out",
      type: template ? "template" : "text",
      text: previewText,
      ts: Date.now(),
      status: "sent",
    });

    return res.status(200).json({ ok: true, message: record });
  } catch (err) {
    console.error("send error", err);
    return res.status(500).json({ error: "No se pudo enviar el mensaje" });
  }
}
