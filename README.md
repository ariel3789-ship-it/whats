# Consola de mensajes de WhatsApp (multi-línea)

Panel para **recibir y responder mensajes de WhatsApp fuera de la app**, usando la
**Cloud API de Meta**. Sin teléfono físico ni WhatsApp instalado: el número se
verifica una vez por SMS/llamada. Multi-línea (GSI / Nivex / PP), todo
en un solo proyecto listo para Vercel.

## Cómo funciona

```
WhatsApp del contacto
        │
        ▼
  Meta Cloud API  ──(webhook)──►  /api/webhook  ──►  Vercel KV
        ▲                                              │
        │                                              ▼
   /api/send  ◄──(respuesta)──  Frontend (index.html) ◄── /api/conversations, /api/messages
```

- **`/api/webhook`** recibe los mensajes entrantes y los guarda en KV, separados por línea (`phone_number_id`).
- **`/api/send`** manda tu respuesta a la Graph API.
- **Frontend** (un solo `public/index.html`, React por CDN, sin build) muestra las líneas, los chats y el hilo.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET/POST | `/api/webhook` | Verificación de Meta (GET) y recepción de mensajes (POST) |
| GET | `/api/lines` | Lista de líneas configuradas (sin tokens) |
| GET | `/api/conversations?line=gsi` | Chats de una línea, por actividad reciente |
| GET | `/api/messages?line=gsi&contact=549…` | Historial de un chat + si está abierta la ventana de 24 hs |
| POST | `/api/send` | Envía texto (dentro de 24 hs) o plantilla aprobada |

## Deploy (paso a paso)

1. **Subí el proyecto** a un repo (GitHub) y **importalo en Vercel**.
2. En Vercel → *Storage* → creá una base **KV** y conectala al proyecto. Se cargan solas las variables `KV_*`.
3. En Vercel → *Settings → Environment Variables*, cargá las de `.env.example`:
   - `WHATSAPP_VERIFY_TOKEN` (inventala vos)
   - `PANEL_KEY` (clave para entrar al panel)
   - Por cada línea: `WABA_PHONE_ID_*` y `WABA_TOKEN_*`
4. **Deploy**. Vas a tener una URL tipo `https://tu-app.vercel.app`.

## Alta de una línea en Meta (esto es lo del SMS)

1. Entrá a **developers.facebook.com** → creá una app tipo *Business* → agregá el producto **WhatsApp**.
2. En *WhatsApp → API Setup*, **registrá tu número**. Meta te manda el **código por SMS o llamada** → lo cargás → número verificado.
   - Importante: ese número **no puede estar usándose en la app de WhatsApp** al mismo tiempo.
3. Copiá el **`phone_number_id`** y generá un **token de acceso permanente** (System User Token recomendado) → esos dos van a `WABA_PHONE_ID_*` y `WABA_TOKEN_*`.
4. En *WhatsApp → Configuration → Webhook*:
   - **Callback URL**: `https://tu-app.vercel.app/api/webhook`
   - **Verify token**: el mismo valor de `WHATSAPP_VERIFY_TOKEN`
   - Suscribite al campo **`messages`**.
5. Repetí para cada línea. Si son WABAs distintas (una por empresa), cada una tiene su token; ya están contempladas en `lib/config.js`.

## La ventana de 24 horas (importante)

Meta solo deja mandar **texto libre** dentro de las 24 hs desde el último mensaje del contacto.
Pasado ese plazo, el panel bloquea el input y hay que **reabrir con una plantilla aprobada**.
El endpoint `/api/send` ya soporta plantillas:

```json
{ "line": "gsi", "contact": "549...", "template": "seguimiento", "lang": "es_AR" }
```

(Las plantillas se crean y aprueban desde el Business Manager de Meta.)

## Correr en local

```bash
npm install
vercel dev
```
En local podés dejar `PANEL_KEY` vacía para saltear el login.

## Agregar / quitar líneas

Editá el array `LINES` en `lib/config.js` (id, label, color y las env vars).
El frontend las toma automáticamente de `/api/lines`.
