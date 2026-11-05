import { Loader2, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import type { DatosAnuncio } from '@/hooks/useAnuncios'
import { subirImagen } from '@/lib/imagen'
import { TIPO_ANUNCIO_LABEL, type Anuncio, type TipoAnuncio } from '@/lib/tipos'

const VACIO: DatosAnuncio = {
  tipo: 'texto', titulo: '', subtitulo: '', precio: '', color: '#1d4ed8', src: '',
  duracion: 8, activo: true, desde: '', hasta: '',
}

export function AnuncioFormModal({
  abierto, anuncio, onCerrar, onGuardado, onBorrar, crear, editar,
}: {
  abierto: boolean
  anuncio: Anuncio | null
  onCerrar: () => void
  onGuardado: () => void
  onBorrar: () => void
  crear: (d: DatosAnuncio) => Promise<{ error: string | null }>
  editar: (id: string, d: DatosAnuncio) => Promise<{ error: string | null }>
}) {
  const [d, setD] = useState<DatosAnuncio>(VACIO)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!abierto) return
    setD(anuncio ? { ...anuncio } : VACIO)
    setError(null)
  }, [abierto, anuncio])

  const set = <K extends keyof DatosAnuncio>(k: K, v: DatosAnuncio[K]) => setD((x) => ({ ...x, [k]: v }))

  async function onArchivo(f: File | undefined) {
    if (!f) return
    setSubiendo(true)
    setError(null)
    try {
      set('src', await subirImagen(f))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.')
    }
    setSubiendo(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onGuardar() {
    setGuardando(true)
    setError(null)
    const { id: _id, orden: _orden, ...datos } = { id: '', orden: 0, ...d }
    const { error: err } = anuncio ? await editar(anuncio.id, datos) : await crear(datos)
    setGuardando(false)
    if (err) return setError(err)
    toast.success(anuncio ? 'Anuncio actualizado.' : 'Anuncio creado.')
    onGuardado()
  }

  const ocupado = guardando || subiendo

  return (
    <Modal
      abierto={abierto}
      titulo={anuncio ? 'Editar anuncio' : 'Nuevo anuncio'}
      onCerrar={onCerrar}
      ancho="max-w-xl"
      footer={
        <>
          {anuncio && (
            <Button variant="outline" onClick={onBorrar} disabled={ocupado}>
              <Trash2 className="text-destructive" /> Borrar
            </Button>
          )}
          <Button variant="outline" onClick={onCerrar} disabled={ocupado}>Cancelar</Button>
          <Button onClick={onGuardar} disabled={ocupado}>{guardando ? 'Guardando…' : anuncio ? 'Guardar' : 'Crear'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tipo">
          <Select value={d.tipo} onChange={(e) => set('tipo', e.target.value as TipoAnuncio)} disabled={!!anuncio}>
            {(Object.keys(TIPO_ANUNCIO_LABEL) as TipoAnuncio[]).map((t) => (
              <option key={t} value={t}>{TIPO_ANUNCIO_LABEL[t]}</option>
            ))}
          </Select>
        </Field>

        {d.tipo === 'texto' && (
          <>
            <Field label="Título *"><Input value={d.titulo} onChange={(e) => set('titulo', e.target.value)} maxLength={120} autoFocus /></Field>
            <Field label="Subtítulo"><Input value={d.subtitulo} onChange={(e) => set('subtitulo', e.target.value)} maxLength={200} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Precio / etiqueta" hint="Ej.: 45.000 Gs."><Input value={d.precio} onChange={(e) => set('precio', e.target.value)} maxLength={40} /></Field>
              <Field label="Color de fondo">
                <input type="color" value={d.color} onChange={(e) => set('color', e.target.value)} className="h-9.5 w-full cursor-pointer rounded-md border border-input bg-card p-1" />
              </Field>
            </div>
          </>
        )}

        {d.tipo === 'imagen' && (
          <>
            <Field label="Imagen *" hint="Ideal vertical 1080×1920. Se comprime y se guarda en Google Drive.">
              <div className="flex items-center gap-3">
                {d.src && <img src={d.src} alt="" className="h-28 w-16 rounded-md border border-border object-cover" />}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onArchivo(e.target.files?.[0])} />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={subiendo}>
                  {subiendo ? <Loader2 className="animate-spin" /> : <Upload />} {d.src ? 'Cambiar' : 'Subir imagen'}
                </Button>
              </div>
            </Field>
            <Field label="Leyenda (opcional)"><Input value={d.titulo} onChange={(e) => set('titulo', e.target.value)} maxLength={120} /></Field>
          </>
        )}

        {d.tipo === 'video' && (
          <Field label="URL del video (.mp4) *" hint="Enlace directo a un archivo de video que permita reproducirse desde otro sitio.">
            <Input value={d.src} onChange={(e) => set('src', e.target.value)} placeholder="https://…/video.mp4" />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Segundos en pantalla" hint={d.tipo === 'video' ? '0 = hasta que termine' : undefined}>
            <Input type="number" min={0} value={d.duracion} onChange={(e) => set('duracion', Number(e.target.value))} />
          </Field>
          <Field label="Desde"><Input type="date" value={d.desde} onChange={(e) => set('desde', e.target.value)} /></Field>
          <Field label="Hasta"><Input type="date" value={d.hasta} onChange={(e) => set('hasta', e.target.value)} /></Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={d.activo} onChange={(e) => set('activo', e.target.checked)} />
          Activo (se muestra en el totem)
        </label>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
