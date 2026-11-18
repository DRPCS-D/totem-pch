import { callApi, conCredenciales } from './appsScript'

export const MAX_AUDIO_MB = 8

/** Un sonido se guarda como «enlace de Drive|nombre original». */
export interface Sonido {
  url: string
  nombre: string
}

export function leerSonido(valor: string): Sonido | null {
  if (!valor) return null
  const [url, ...resto] = valor.split('|')
  return url ? { url, nombre: resto.join('|') || 'sonido' } : null
}

export const armarSonido = (url: string, nombre: string) => `${url}|${nombre.replace(/\|/g, '-').slice(0, 80)}`

const idDrive = (url: string) => /(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]{10,})/.exec(url)?.[1] ?? null

const MIME_POR_EXT: Record<string, string> = {
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/x-m4a', aac: 'audio/aac', webm: 'audio/webm',
}

function tipoDeAudio(f: File): string | null {
  if (f.type.startsWith('audio/')) return f.type
  return MIME_POR_EXT[f.name.split('.').pop()?.toLowerCase() ?? ''] ?? null
}

function aBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    r.readAsDataURL(f)
  })
}

/** Sube el audio a Drive (vía Apps Script) y devuelve el valor a guardar («enlace|nombre»). */
export async function subirSonido(archivo: File): Promise<string> {
  const mime = tipoDeAudio(archivo)
  if (!mime) throw new Error('El archivo no es de audio. Usa MP3, WAV, OGG o M4A.')
  if (archivo.size > MAX_AUDIO_MB * 1024 * 1024) throw new Error(`El audio pesa más de ${MAX_AUDIO_MB} MB.`)
  const r = await callApi<{ url: string }>('subirSonido', conCredenciales({ mime, base64: await aBase64(archivo) }))
  return armarSonido(r.url, archivo.name)
}

let sonando: HTMLAudioElement | null = null

export function detenerPrueba() {
  sonando?.pause()
  sonando = null
}

/** Reproduce un sonido ya guardado (lo pide al Apps Script igual que el totem). Devuelve el elemento de audio. */
export async function probarSonido(valor: string, alTerminar?: () => void): Promise<void> {
  detenerPrueba()
  const s = leerSonido(valor)
  const id = s ? idDrive(s.url) : null
  if (!id) throw new Error('Sonido inválido.')
  const r = await callApi<{ mime: string; base64: string }>('totemAudio', { id })
  const bin = atob(r.base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const a = new Audio(URL.createObjectURL(new Blob([bytes], { type: r.mime || 'audio/mpeg' })))
  sonando = a
  a.onended = () => {
    if (sonando === a) sonando = null
    alTerminar?.()
  }
  await a.play()
}
