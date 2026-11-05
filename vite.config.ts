import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf-8'))
const APP_VERSION: string = pkg.version
const APP_NOMBRE: string = pkg.name

/**
 * Genera dist/sw.js a partir de scripts/sw-template.js con el nombre y la
 * version ya inyectados. El service worker NO vive en public/ a proposito:
 * si estuviera ahi, Vite lo copiaria tal cual (sin la version real) y el
 * nombre del cache podria no coincidir con lo publicado.
 */
function swVersionado(): Plugin {
  return {
    name: 'sw-versionado',
    closeBundle() {
      const plantilla = readFileSync(
        path.resolve(import.meta.dirname, 'scripts/sw-template.js'),
        'utf-8',
      )
      const contenido = plantilla
        .replaceAll('__APP_NOMBRE__', APP_NOMBRE)
        .replaceAll('__APP_VERSION__', APP_VERSION)
      writeFileSync(path.resolve(import.meta.dirname, 'dist/sw.js'), contenido)
    },
  }
}


/**
 * El totem (public/totem) es HTML estático sin bundler: no ve import.meta.env.
 * Este plugin le entrega la URL del backend como /totem/env.js (dev y build).
 */
function totemEnv(modo: string): Plugin {
  const url = loadEnv(modo, import.meta.dirname, 'VITE_').VITE_APPS_SCRIPT_URL ?? process.env.VITE_APPS_SCRIPT_URL ?? ''
  const js = `window.TOTEM_API=${JSON.stringify(url)};
`
  return {
    name: 'totem-env',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/totem/env.js') {
          res.setHeader('Content-Type', 'text/javascript')
          res.end(js)
        } else if (req.url === '/totem' || req.url === '/totem/') {
          req.url = '/totem/index.html'
          next()
        } else next()
      })
    },
    closeBundle() {
      mkdirSync(path.resolve(import.meta.dirname, 'dist/totem'), { recursive: true })
      writeFileSync(path.resolve(import.meta.dirname, 'dist/totem/env.js'), js)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), swVersionado(), totemEnv(mode)],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  build: {
    outDir: 'dist',
  },
}))
