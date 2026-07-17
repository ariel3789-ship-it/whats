# Puesta en marcha — Consola de mensajes WhatsApp

Este documento sirve para dos cosas:

1. **Para Claude (en Cowork):** contexto del proyecto y qué puede automatizar.
2. **Para vos (Ariel):** el paso a paso de lo que solo podés hacer vos (Meta, SMS, variables).

Seguí las secciones en orden. Al final el panel queda operativo.

---

## Qué es esto

Panel para **recibir y responder mensajes de WhatsApp fuera de la app**, usando la
**Cloud API de Meta**. Multi-línea (GSI / Nivex / PP) en un solo proyecto.
Sin teléfono físico: el número se verifica una vez por **SMS o llamada**.

Stack: Vercel (funciones serverless en `/api`) + Vercel KV (almacenamiento) +
frontend en un solo `public/index.html` (React por CDN, sin build).

```
WhatsApp del contacto
        │
        ▼
  Meta Cloud API ──(webhook)──► /api/webhook ──► Vercel KV
        ▲                                          │
        │                                          ▼
   /api/send ◄──(respuesta)── Frontend index.html ◄── /api/conversations, /api/messages
```

---

## Estructura de archivos

```
wa-panel/
├── api/
│   ├── webhook.js         # recibe mensajes de Meta + verificación
│   ├── send.js            # envía respuestas (texto o plantilla)
│   ├── conversations.js   # lista chats de una línea
│   ├── messages.js        # historial de un chat
│   └── lines.js           # lista de líneas configuradas
├── lib/
│   ├── config.js          # mapeo de líneas (editar acá para sumar/quitar)
│   ├── store.js           # capa sobre Vercel KV
│   └── auth.js            # protección por clave del panel
├── public/
│   └── index.html         # el panel (frontend completo)
├── package.json
├── vercel.json
├── .env.example           # todas las variables necesarias
├── README.md
└── PUESTA-EN-MARCHA.md    # este archivo
```

---

## PARTE A — Lo que hacés vos en Meta (acá recibís el SMS)

> Esta parte no la puede hacer Claude: requiere tu cuenta de Meta y recibir el código.

### A1. Crear la app en Meta

1. Entrá a **https://developers.facebook.com** con tu cuenta.
2. **My Apps → Create App → tipo "Business" → Next.**
3. Ponele un nombre (ej. "Consola GSI") y creala.
4. En el panel de la app: **Add Product → WhatsApp → Set up.**

### A2. Registrar el número (el paso del SMS)

1. Andá a **WhatsApp → API Setup.**
2. En "From", tocá **Add phone number** y cargá tu número.
   - ⚠️ Ese número **NO puede estar activo en la app de WhatsApp** al mismo tiempo.
     Si ya lo usás en WhatsApp normal, primero borralo de ahí o usá un número nuevo.
3. Meta te manda el **código de verificación por SMS o llamada** → cargalo → verificado. ✅

### A3. Copiar credenciales de la línea

De la misma pantalla **API Setup**, anotá:

- **Phone number ID** (un número largo) → va a `WABA_PHONE_ID_GSI`
- **Token de acceso.** El temporal dura 24 hs; para producción generá uno permanente:
  - **Business Settings → System Users → Add** (rol Admin).
  - Asignale la app de WhatsApp y generá un token con permisos
    `whatsapp_business_messaging` y `whatsapp_business_management`.
  - Ese token permanente → va a `WABA_TOKEN_GSI`.

Repetí A1–A3 por cada empresa que quieras como línea separada (Nivex, PP).
Si preferís, arrancá con **una sola línea (GSI)** y sumás el resto después.

### A4. Datos que tenés que tener a mano al terminar

Por cada línea:
- Phone number ID
- Token permanente

Global:
- Un **Verify Token** que inventás vos (cualquier texto, ej. `gsi-webhook-2026`).

---

## PARTE B — Deploy en Vercel

> Buena parte de esto lo puede hacer Claude en Cowork si le das acceso; igual te
> dejo los pasos para que sepas qué está pasando. La conexión de la cuenta de
> Vercel y GitHub la autorizás vos.

### B1. Subir el proyecto

Opción rápida: **importar a Vercel desde GitHub.**
1. Creá un repo en GitHub y subí la carpeta `wa-panel`.
2. En **https://vercel.com** → **Add New → Project → Import** ese repo.
3. Framework preset: **Other**. Deploy.

(Alternativa sin GitHub: instalar Vercel CLI y correr `vercel` desde la carpeta.)

### B2. Crear la base de datos KV

1. En el proyecto de Vercel → pestaña **Storage → Create Database → KV.**
2. Conectala al proyecto. Esto carga solas las variables `KV_REST_API_URL`,
   `KV_REST_API_TOKEN`, etc. **No las toques.**

### B3. Cargar las variables de entorno

En Vercel → **Settings → Environment Variables**, cargá (de `.env.example`):

| Variable | Valor |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | el texto que inventaste en A4 (ej. `gsi-webhook-2026`) |
| `PANEL_KEY` | una clave para entrar al panel (elegila vos) |
| `WABA_PHONE_ID_GSI` | Phone number ID de GSI |
| `WABA_TOKEN_GSI` | token permanente de GSI |
| `WABA_PHONE_ID_NIVEX` | (si vas a usar Nivex) |
| `WABA_TOKEN_NIVEX` | (idem) |
| `WABA_PHONE_ID_PP` | (si vas a usar PP) |
| `WABA_TOKEN_PP` | (idem) |

> Si una línea no la vas a usar todavía, dejá sus dos variables vacías: en el
> panel aparece atenuada como "sin configurar" y no molesta.

### B4. Redeploy

Después de cargar variables, hacé **Redeploy** (Deployments → ⋯ → Redeploy) para
que tomen efecto. Vas a tener una URL tipo `https://tu-app.vercel.app`.

---

## PARTE C — Conectar el webhook (esto une todo)

> Volvés a Meta, ahora con la URL de Vercel ya publicada.

1. En Meta → **WhatsApp → Configuration → Webhook → Edit.**
2. **Callback URL:** `https://tu-app.vercel.app/api/webhook`
3. **Verify token:** exactamente el mismo valor de `WHATSAPP_VERIFY_TOKEN`.
4. Tocá **Verify and save.** Si da error, revisá que la URL sea exacta y que el
   deploy esté publicado.
5. En **Webhook fields**, suscribite a **`messages`** (botón Subscribe).

---

## PARTE D — Probar que funciona

1. Desde **otro teléfono** (uno que NO sea el número dado de alta), mandá un
   WhatsApp al número de la línea.
2. Abrí `https://tu-app.vercel.app`, ingresá tu `PANEL_KEY`.
3. Elegí la línea (GSI) → tiene que aparecer el chat con el mensaje entrante.
4. Respondé desde el panel → tiene que llegar al teléfono. ✅

Si el mensaje entra pero no podés responder, mirá el aviso de **ventana de 24 hs**
(sección siguiente).

---

## Cosas importantes para no frustrarte

- **Ventana de 24 horas:** Meta solo deja mandar **texto libre** dentro de las
  24 hs desde el último mensaje del contacto. Pasado ese plazo, el panel bloquea
  el input; hay que reabrir con una **plantilla aprobada** (se crean en el
  Business Manager de Meta y `/api/send` ya las soporta).
- **El número dado de alta no sirve en la app de WhatsApp** en paralelo.
- **Token temporal vs permanente:** si usaste el token de 24 hs para probar, el
  envío deja de andar al día siguiente. Cargá el permanente (A3).
- **Tiempo real:** el panel refresca por *polling* (cada pocos segundos). Alcanza
  para operar. Si querés push instantáneo, se le puede sumar SSE o Pusher después.

---

## Para sumar o quitar líneas más adelante

Editá el array `LINES` en `lib/config.js` (id, label, color y nombres de las env
vars), cargá las variables nuevas en Vercel y redeploy. El frontend las toma solo
de `/api/lines`.

---

## Checklist final

- [ ] App creada en Meta con producto WhatsApp
- [ ] Número registrado y verificado por SMS/llamada
- [ ] Phone number ID + token permanente anotados
- [ ] Proyecto en Vercel
- [ ] Base KV creada y conectada
- [ ] Variables de entorno cargadas
- [ ] Redeploy hecho
- [ ] Webhook configurado y suscripto a `messages`
- [ ] Prueba de mensaje entrante OK
- [ ] Prueba de respuesta saliente OK
