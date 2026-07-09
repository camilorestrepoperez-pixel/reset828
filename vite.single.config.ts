// Build alternativo: TODO (JS + CSS) incrustado en un solo index.html.
// Uso: npm run build:single → dist-single/index.html
// Ese archivo funciona con doble clic (file://) porque no carga nada externo.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { outDir: 'dist-single' },
})
