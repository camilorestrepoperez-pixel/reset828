// Configuración pública de conexiones (los SECRETS nunca van aquí — viven en
// el Cloudflare Worker). Estos valores se llenan al completar la Fase 2 y 3:
//   STRAVA_CLIENT_ID  → strava.com/settings/api (es público)
//   TOKEN_PROXY_URL   → URL del worker reset828-auth (ej: https://reset828-auth.usuario.workers.dev)
// También pueden venir de variables de entorno VITE_* si se prefiere.

export const CONFIG = {
  STRAVA_CLIENT_ID: import.meta.env.VITE_STRAVA_CLIENT_ID ?? '',
  TOKEN_PROXY_URL: import.meta.env.VITE_STRAVA_TOKEN_PROXY ?? '',
}
