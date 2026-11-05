import { callApi, conCredenciales } from './appsScript'

/** Reduce la imagen a 1080×1920 como máximo y la devuelve como JPEG en base64 (sin prefijo). */
export function comprimirImagen(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, 1080 / img.width, 1920 / img.height)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.82).split(',')[1])
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}

/** Sube la imagen a Drive (vía Apps Script) y devuelve su URL pública. */
export async function subirImagen(archivo: File): Promise<string> {
  const base64 = await comprimirImagen(archivo)
  const r = await callApi<{ url: string }>('subirImagen', conCredenciales({ mime: 'image/jpeg', base64 }))
  return r.url
}

/** Un anuncio de imagen guarda varias URLs en `src`, una por línea. */
export const imagenesDe = (src: string): string[] => src.split('\n').map((u) => u.trim()).filter(Boolean)
export const unirImagenes = (urls: string[]): string => urls.join('\n')
