// Genera el fragmento de artefacto de RESET 828 con los datos del usuario
// YA CARGADOS (snapshot privado para leer en iPad u otro dispositivo).
//
// Uso:  node scripts/make-snapshot.mjs <backup.json> <version> <salida.html>
//   <backup.json> = el JSON que Camilo exporta de la app (Perfil → Exportar)
//   <version>     = etiqueta única, normalmente la fecha del domingo (2026-07-13)
//   <salida.html> = ruta del fragmento a publicar como artefacto
//
// El fragmento inyecta un <script> que siembra localStorage con los datos ANTES
// de que arranque la app, y solo cuando la versión cambia (así cada domingo se
// actualiza el iPad al abrir). No toca el código fuente de la app.
import { readFileSync, writeFileSync } from 'node:fs'

const [, , jsonPath, version, outPath] = process.argv
if (!jsonPath || !version || !outPath) {
  console.error('Uso: node scripts/make-snapshot.mjs <backup.json> <version> <salida.html>')
  process.exit(1)
}

// El backup puede venir como { state, version } (formato zustand persist) o como state suelto.
const raw = JSON.parse(readFileSync(jsonPath, 'utf8'))
const store = raw.state ? raw : { state: raw, version: 3 }

const html = readFileSync('dist-single/index.html', 'utf8')
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n')
const scripts = [...html.matchAll(/<script type="module"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]).join('\n')
const body = html
  .match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/g, '')

// Script de siembra: corre antes del módulo de la app (script normal = síncrono).
const seed = `<script>
(function () {
  try {
    var SNAP = ${JSON.stringify({ version, store })};
    if (localStorage.getItem('reset78-snapshot-version') !== SNAP.version) {
      localStorage.setItem('reset78-store', JSON.stringify(SNAP.store));
      localStorage.setItem('reset78-snapshot-version', SNAP.version);
    }
  } catch (e) { /* modo privado o storage lleno: la app arranca vacía */ }
})();
</script>`

const out = `<title>RESET 828 — Mi progreso (${version})</title>\n${styles}\n${body.trim()}\n${seed}\n${scripts}`
writeFileSync(outPath, out)
console.log(`→ Snapshot ${version} listo: ${outPath} (${Math.round(out.length / 1024)} KB)`)
