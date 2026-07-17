// Devuelve las líneas configuradas (sin exponer tokens).
import { publicLines } from "../lib/config.js";
import { authorized } from "../lib/auth.js";

export default function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "No autorizado" });
  return res.status(200).json({ lines: publicLines() });
}
