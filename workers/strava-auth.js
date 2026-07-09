/**
 * RESET 828 — Proxy de tokens Strava (Cloudflare Worker)
 * ------------------------------------------------------
 * CÓMO USAR (Fase 3 de la guía):
 *  1. dash.cloudflare.com → Workers & Pages → Create Worker → nombre: reset828-auth → Deploy
 *  2. Edit code → borra todo → pega ESTE archivo → Save and deploy
 *  3. Settings → Variables and Secrets → agrega DOS secretos:
 *       STRAVA_CLIENT_ID     (el de strava.com/settings/api)
 *       STRAVA_CLIENT_SECRET (el secret — solo vive aquí, nunca en la app)
 *  4. Copia la URL del worker (https://reset828-auth.<usuario>.workers.dev) y pásala
 *     para cablearla en src/config.ts de la app.
 *
 * Qué hace: recibe el "code" del OAuth de Strava y lo intercambia por tokens,
 * o refresca tokens vencidos. El client_secret nunca sale de Cloudflare.
 */

const ALLOWED_ORIGINS = [
  'https://camilorestrepoperez-pixel.github.io',
  'http://localhost:5173', // desarrollo local
]

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const headers = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Solo POST' }), { status: 405, headers })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers })
    }

    if (body.provider !== 'strava') {
      return new Response(JSON.stringify({ error: 'Proveedor no soportado' }), { status: 400, headers })
    }

    const params = new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
    })

    if (body.grant === 'code' && body.code) {
      params.set('code', body.code)
      params.set('grant_type', 'authorization_code')
    } else if (body.grant === 'refresh' && body.refreshToken) {
      params.set('refresh_token', body.refreshToken)
      params.set('grant_type', 'refresh_token')
    } else {
      return new Response(JSON.stringify({ error: 'Falta code o refreshToken' }), { status: 400, headers })
    }

    try {
      const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      const data = await res.json()
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Strava rechazó el intercambio', detail: data }), { status: res.status, headers })
      }
      // Devolvemos solo lo necesario (sin datos del atleta)
      return new Response(
        JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
        }),
        { headers },
      )
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers })
    }
  },
}
