// GET /api/conversations?line=gsi
// Lista los chats de una línea, ordenados por actividad reciente.
import { lineById } from "../lib/config.js";
import { authorized } from "../lib/auth.js";
import { listConversations } from "../lib/store.js";

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "No autorizado" });

  const lineId = req.query.line;
  const line = lineById(lineId);
  if (!line) return res.status(400).json({ error: "Línea inválida" });

  try {
    const conversations = await listConversations(lineId);
    return res.status(200).json({ conversations });
  } catch (err) {
    console.error("conversations error", err);
    return res.status(500).json({ error: "Error al listar conversaciones" });
  }
}
