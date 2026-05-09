# Screen Share Local (prep para Vercel + Supabase)

## 1) Variables de entorno (Vercel)
En tu proyecto de Vercel agrega:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_NAME` (opcional, ejemplo: `screen-share-local`)

Usa `.env.example` como referencia.

## 2) Ruta limpia
Se incluye `vercel.json` para usar:
- `/caster` -> `caster.html`

## 3) Importante
Tu app actual todavía usa signaling WebSocket local (`server.js`).
Para que funcione 100% en Vercel necesitas migrar signaling a Supabase Realtime.

Si quieres, el siguiente paso es refactor completo a Supabase (offer/answer/ice/presence) en este mismo repo.
