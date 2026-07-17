// GET /api/messages?line=gsi&contact=549XXXXXXXXX
// Devuelve el historial de un chat y lo marca como leído.
import { lineById } from "../lib/config.js";
import { authorized } from "../lib/auth.js";
import { getMessages, markRead, withinWindow } from "../lib/store.js";

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "No autorizado" });

  const lineId = req.query.line;
  const contact = req.query.contact;
  const line = lineById(lineId);
  if (!line || !contact)
    return res.status(400).json({ error: "Parámetros inválidos" });

  try {
    const messages = await getMessages(lineId, contact);
    await markRead(lineId, contact);
    const canFreeText = await withinWindow(lineId, contact);
    return res.status(200).json({ messages, canFreeText });
  } catch (err) {
    console.error("messages error", err);
    return res.status(500).json({ error: "Error al traer mensajes" });
  }
}
