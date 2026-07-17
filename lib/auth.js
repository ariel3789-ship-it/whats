// Autorización mínima para los endpoints del panel.
// El frontend manda la clave en el header x-panel-key.
// Si PANEL_KEY no está seteada en el entorno, no se exige (útil en local).

import { PANEL_KEY } from "./config.js";

export function authorized(req) {
  if (!PANEL_KEY) return true;
  const provided = req.headers["x-panel-key"];
  return provided === PANEL_KEY;
}
