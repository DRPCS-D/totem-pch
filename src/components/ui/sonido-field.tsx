import { Loader2, Music, Play, Square, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { detenerPrueba, leerSonido, probarSonido, subirSonido, MAX_AUDIO_MB } from '@/lib/sonido'
import { Button } from './button'

/** Subir / probar / quitar un sonido (MP3, WAV, OGG, M4A; máx. 8 MB). El valor es «enlace de Drive|nombre». */
export function SonidoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const archivo = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [sonando, setSonando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sonido = leerSonido(value)

  useEffect(() => () => detenerPrueba(), [])

  async function onArchivo(f: File | undefined) {
    if (!f) return
    setSubiendo(true)
    setError(null)
    try {
      onChange(await subirSonido(f))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el audio.')
    }
    setSubiendo(false)
    if (archivo.current) archivo.current.value = ''
  }

  async function alternar() {
    if (sonando) {
      detenerPrueba()
      return setSonando(false)
    }
    setError(null)
    try {
      setSonando(true)
      await probarSonido(value, () => setSonando(false))
    } catch (e) {
      setSonando(false)
      setError(e instanceof Error ? e.message : 'No se pudo reproducir.')
    }
  }

  return (
    <div className="space-y-1.5">
      <input ref={archivo} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" hidden onChange={(e) => onArchivo(e.target.files?.[0])} />
      {sonido ? (
        <div className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5">
          <Music className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={sonido.nombre}>{sonido.nombre}</span>
          <Button variant="ghost" size="sm" onClick={alternar} disabled={subiendo}>
            {sonando ? <Square /> : <Play />} {sonando ? 'Detener' : 'Probar'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => archivo.current?.click()} disabled={subiendo}>
            {subiendo ? <Loader2 className="animate-spin" /> : <Upload />} Cambiar
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Quitar sonido" title="Quitar" onClick={() => { detenerPrueba(); setSonando(false); onChange('') }} disabled={subiendo}>
            <X />
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => archivo.current?.click()} disabled={subiendo}>
          {subiendo ? <Loader2 className="animate-spin" /> : <Upload />} {subiendo ? 'Subiendo…' : 'Subir audio'}
          <span className="text-xs font-normal text-muted-foreground">máx. {MAX_AUDIO_MB} MB</span>
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
