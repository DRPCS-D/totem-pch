// Backend de pruebas en memoria (imita apps-script/Code.gs). Solo para desarrollo local:
//   node scripts/mock-api.mjs   y   VITE_APPS_SCRIPT_URL=http://localhost:8787 en .env.local
import { createServer } from 'node:http'

const rev = { config: 1, anuncios: 1, premios: 1, participantes: 1, usuarios: 1 }
const config = {
  nombre: 'Patachoca', logoText: 'PATACHOCA', logoUrl: 'https://www.patachoca.com.py/assets/patachoca/images/logo.png', primary: '#008fca', accent: '#d91571', showClock: true,
  ctaText: 'TOCA PARA JUGAR Y GANAR', tickerEnabled: true, tickerText: '¡Bienvenido! · Participá y ganá premios',
  idleSeconds: 45, videoSound: true, videoVolume: 100, raffleEnabled: true, raffleTitle: '¡GIRÁ LA RULETA!', raffleSubtitle: 'Completá tus datos y probá tu suerte',
  maxSpins: 1, askName: true, askPhone: true, loseMessage: '¡Gracias por participar!',
}
let anuncios = [
  { id: 'a1', tipo: 'texto', titulo: 'CYBER DAY', subtitulo: 'Hasta 14% de descuento', precio: '', color: '#1d4ed8', src: '', duracion: 5, activo: true, desde: '', hasta: '', orden: 1 },
  { id: 'a2', tipo: 'texto', titulo: 'Combo Familiar', subtitulo: 'Llevá 2 y pagá 1', precio: '45.000 Gs.', color: '#be185d', src: '', duracion: 5, activo: true, desde: '', hasta: '', orden: 2 },
]
let premios = [
  { id: 'p1', etiqueta: 'Gift Card 50.000', color: '#f59e0b', peso: 5, stock: 5, gana: true, activo: true },
  { id: 'p2', etiqueta: 'Sigue intentando', color: '#475569', peso: 30, stock: -1, gana: false, activo: true },
  { id: 'p3', etiqueta: '10% de descuento', color: '#22c55e', peso: 25, stock: -1, gana: true, activo: true },
  { id: 'p4', etiqueta: 'Sigue intentando', color: '#334155', peso: 30, stock: -1, gana: false, activo: true },
  { id: 'p5', etiqueta: 'Café gratis', color: '#ec4899', peso: 15, stock: 20, gana: true, activo: true },
  { id: 'p6', etiqueta: 'Premio mayor', color: '#ef4444', peso: 1, stock: 1, gana: true, activo: true },
]
let participantes = []
let usuarios = [{ usuario: 'ADMIN', password: 'admin', rol: 'admin', activo: true, nombre: 'Administrador' }]
const videos = {}
const uid = () => Math.random().toString(36).slice(2, 10)

function handle(b) {
  const user = usuarios.find((u) => u.usuario.toUpperCase() === String(b.usuario || '').toUpperCase() && u.password === b.password && u.activo)
  const auth = () => { if (!user) throw Object.assign(new Error('Sesión no válida.'), { codigo: 'SESION' }); return user }
  switch (b.action) {
    case 'seedVideo': videos[b.id] = { mime: b.mime, base64: b.base64 }; return {}
    case 'totemVideo': if (!videos[b.id]) throw new Error('Video inválido.'); return videos[b.id]
    case 'totemRev': return { rev: `${rev.config}.${rev.anuncios}.${rev.premios}` }
    case 'totemConfig':
      return { rev: `${rev.config}.${rev.anuncios}.${rev.premios}`, config, anuncios: anuncios.filter((a) => a.activo), premios: premios.filter((p) => p.activo).map(({ id, etiqueta, color, gana }) => ({ id, etiqueta, color, gana })) }
    case 'girar': {
      const pool = premios.filter((p) => p.activo && p.stock !== 0 && p.peso > 0)
      let t = Math.random() * pool.reduce((s, p) => s + p.peso, 0), el = pool[pool.length - 1]
      for (const p of pool) { t -= p.peso; if (t <= 0) { el = p; break } }
      if (el.stock > 0) { el.stock--; rev.premios++ }
      participantes.push({ id: uid(), fecha: new Date().toISOString(), nombre: b.nombre, telefono: b.telefono, premio: el.etiqueta, gano: el.gana, entregado: false })
      rev.participantes++
      return { premioId: el.id, etiqueta: el.etiqueta, gano: el.gana }
    }
    case 'login': {
      if (!user) throw new Error('Usuario o contraseña incorrectos')
      return { usuario: user.usuario, nombre: user.nombre, rol: user.rol }
    }
    case 'getRevisions': auth(); return { revisiones: { ...rev } }
    case 'getConfig': auth(); return { config: [config] }
    case 'saveConfig': auth(); Object.assign(config, b.config); rev.config++; return {}
    case 'listAnuncios': auth(); return { anuncios }
    case 'createAnuncio': auth(); anuncios.push({ ...b, id: uid(), orden: anuncios.length + 1 }); rev.anuncios++; return {}
    case 'updateAnuncio': auth(); anuncios = anuncios.map((a) => (a.id === b.id ? { ...a, ...b, orden: a.orden } : a)); rev.anuncios++; return {}
    case 'deleteAnuncio': auth(); anuncios = anuncios.filter((a) => a.id !== b.id); rev.anuncios++; return {}
    case 'reordenarAnuncios': auth(); anuncios.sort((x, y) => b.ids.indexOf(x.id) - b.ids.indexOf(y.id)); rev.anuncios++; return {}
    case 'listPremios': auth(); return { premios }
    case 'createPremio': auth(); premios.push({ ...b, id: uid() }); rev.premios++; return {}
    case 'updatePremio': auth(); premios = premios.map((p) => (p.id === b.id ? { ...p, ...b } : p)); rev.premios++; return {}
    case 'deletePremio': auth(); premios = premios.filter((p) => p.id !== b.id); rev.premios++; return {}
    case 'listParticipantes': auth(); return { participantes: [...participantes].reverse() }
    case 'marcarEntregado': auth(); participantes.find((p) => p.id === b.id).entregado = b.entregado; rev.participantes++; return {}
    case 'clearParticipantes': auth(); participantes = []; rev.participantes++; return {}
    case 'listUsuarios': auth(); return { usuarios: usuarios.map(({ password, ...u }) => u) }
    default: throw new Error('Acción desconocida')
  }
}

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.end()
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json')
    try { res.end(JSON.stringify({ ok: true, ...handle(JSON.parse(raw || '{}')) })) }
    catch (e) { res.end(JSON.stringify({ ok: false, error: e.message, codigo: e.codigo || '' })) }
  })
}).listen(8787, () => console.log('Mock API en http://localhost:8787  (usuario ADMIN / contraseña admin)'))
