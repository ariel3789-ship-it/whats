// -----------------------------------------------------------------------------
// Almacenamiento sobre Vercel KV
// -----------------------------------------------------------------------------
// Modelo de datos (claves):
//
//   conv:{lineId}                 -> Sorted Set. member = número del contacto,
//                                    score = timestamp del último mensaje.
//                                    Sirve para listar chats ordenados por
//                                    actividad reciente.
//
//   meta:{lineId}:{contact}       -> Hash con datos del chat:
//                                    { name, lastText, lastTs, unread, lastInboundTs }
//
//   msgs:{lineId}:{contact}       -> List (JSON strings). Historial de mensajes.
//                                    Cada item: { id, dir, type, text, ts, status }
//                                    dir = "in" (recibido) | "out" (enviado)
// -----------------------------------------------------------------------------

import { kv } from "@vercel/kv";

const MAX_MSGS = 500; // recorte de historial por chat

const convKey = (lineId) => `conv:${lineId}`;
const metaKey = (lineId, contact) => `meta:${lineId}:${contact}`;
const msgsKey = (lineId, contact) => `msgs:${lineId}:${contact}`;

// Guarda un mensaje entrante o saliente y actualiza los índices.
export async function saveMessage(lineId, contact, msg) {
  const ts = msg.ts || Date.now();
  const record = { ...msg, ts };

  await kv.rpush(msgsKey(lineId, contact), JSON.stringify(record));
  await kv.ltrim(msgsKey(lineId, contact), -MAX_MSGS, -1);
  await kv.zadd(convKey(lineId), { score: ts, member: contact });

  const patch = { lastText: previewText(record), lastTs: ts };
  if (msg.dir === "in") {
    // incrementá no leídos y marcá última entrada (para ventana de 24 hs)
    const meta = (await kv.hgetall(metaKey(lineId, contact))) || {};
    patch.unread = (Number(meta.unread) || 0) + 1;
    patch.lastInboundTs = ts;
    if (msg.name && !meta.name) patch.name = msg.name;
  } else {
    patch.unread = 0;
  }
  await kv.hset(metaKey(lineId, contact), patch);
  return record;
}

// Lista de chats de una línea, ordenados por actividad (más reciente primero).
export async function listConversations(lineId, limit = 50) {
  const contacts = await kv.zrange(convKey(lineId), 0, limit - 1, {
    rev: true,
  });
  if (!contacts.length) return [];
  const out = [];
  for (const contact of contacts) {
    const meta = (await kv.hgetall(metaKey(lineId, contact))) || {};
    out.push({
      contact,
      name: meta.name || null,
      lastText: meta.lastText || "",
      lastTs: Number(meta.lastTs) || 0,
      unread: Number(meta.unread) || 0,
      lastInboundTs: Number(meta.lastInboundTs) || 0,
    });
  }
  return out;
}

// Historial completo de un chat.
export async function getMessages(lineId, contact) {
  const raw = await kv.lrange(msgsKey(lineId, contact), 0, -1);
  return raw
    .map((r) => {
      try {
        return typeof r === "string" ? JSON.parse(r) : r;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Marca un chat como leído.
export async function markRead(lineId, contact) {
  await kv.hset(metaKey(lineId, contact), { unread: 0 });
}

// ¿Estamos dentro de la ventana de 24 hs para responder con texto libre?
export async function withinWindow(lineId, contact) {
  const meta = (await kv.hgetall(metaKey(lineId, contact))) || {};
  const last = Number(meta.lastInboundTs) || 0;
  return Date.now() - last < 24 * 60 * 60 * 1000;
}

function previewText(msg) {
  if (msg.type === "text") return (msg.text || "").slice(0, 120);
  return `[${msg.type || "mensaje"}]`;
}
