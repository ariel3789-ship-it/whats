// -----------------------------------------------------------------------------
// Configuración de líneas de WhatsApp (multi-línea / multi-tenant)
// -----------------------------------------------------------------------------
// Cada línea es un número dado de alta en la Cloud API de Meta. Se identifican
// por su phone_number_id (te lo da Meta al registrar el número).
//
// Los datos sensibles (tokens) viven en variables de entorno de Vercel, NO acá.
// Este archivo solo mapea IDs -> etiqueta visible + qué env var usar.
//
// En Vercel definí, por cada línea:
//   WABA_TOKEN_GSI          -> token de acceso permanente de esa línea
//   WABA_PHONE_ID_GSI       -> phone_number_id de esa línea
// (repetí para NIVEX y PP). Después sumás la línea al array de abajo.
// -----------------------------------------------------------------------------

export const LINES = [
  {
    id: "gsi",
    label: "GSI",
    color: "#e07b39", // naranja
    phoneNumberId: process.env.WABA_PHONE_ID_GSI || "",
    token: process.env.WABA_TOKEN_GSI || "",
  },
  {
    id: "nivex",
    label: "Nivex",
    color: "#1a3a5c", // navy
    phoneNumberId: process.env.WABA_PHONE_ID_NIVEX || "",
    token: process.env.WABA_TOKEN_NIVEX || "",
  },
  {
    id: "pp",
    label: "PP",
    color: "#2e7d5b", // verde
    phoneNumberId: process.env.WABA_PHONE_ID_PP || "",
    token: process.env.WABA_TOKEN_PP || "",
  },
];

// Token que definís vos para verificar el webhook con Meta (cualquier string).
export const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "cambiar-esto";

// Clave para proteger los endpoints del panel (envío, listado, etc.).
// El frontend la manda en el header x-panel-key.
export const PANEL_KEY = process.env.PANEL_KEY || "";

// Versión de la Graph API.
export const GRAPH_VERSION = "v21.0";

// Devuelve la línea que corresponde a un phone_number_id entrante.
export function lineByPhoneId(phoneNumberId) {
  return LINES.find((l) => l.phoneNumberId === phoneNumberId) || null;
}

// Devuelve la línea por su id interno (gsi / nivex / pp).
export function lineById(id) {
  return LINES.find((l) => l.id === id) || null;
}

// Metadata pública (sin tokens) para mandar al frontend.
export function publicLines() {
  return LINES.map(({ id, label, color, phoneNumberId }) => ({
    id,
    label,
    color,
    configured: Boolean(phoneNumberId),
  }));
}
