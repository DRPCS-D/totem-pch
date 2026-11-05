import { ArrowLeft, ArrowRight, Loader2, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import type { DatosAnuncio } from '@/hooks/useAnuncios'
import { imagenesDe, subirImagen, unirImagenes } from '@/lib/imagen'
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

  const imagenes = imagenesDe(d.src)
  const setImagenes = (urls: string[]) => set('src', unirImagenes(urls))

  async function onArchivos(files: FileList | null) {
    if (!files?.length) return
    setSubiendo(true)
    setError(null)
    const nuevas: string[] = []
    try {
      for (const f of Array.from(files)) nuevas.push(await subirImagen(f))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.')
    }
    // Lo ya subido se conserva aunque falle una de las siguientes.
    if (nuevas.length) setD((x) => ({ ...x, src: unirImagenes([...imagenesDe(x.src), ...nuevas]) }))
    setSubiendo(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function mover(i: number, dir: number) {
    const u = [...imagenes]
    ;[u[i], u[i + dir]] = [u[i + dir], u[i]]
    setImagenes(u)
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
            <Field label={`Imágenes * (${imagenes.length})`} hint="Se muestran en este orden, cada una durante los «segundos por imagen»; al terminar pasa al siguiente anuncio. Ideal vertical 1080×1920; se guardan en Google Drive.">
              <div className="flex flex-wrap gap-3">
                {imagenes.map((u, i) => (
                  <div key={u} className="w-20">
                    <div className="relative">
                      <img src={u} alt="" className="h-36 w-20 rounded-md border border-border object-cover" />
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] text-white">{i + 1}</span>
                      <button
                        type="button"
                        aria-label="Quitar imagen"
                        onClick={() => setImagenes(imagenes.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white hover:bg-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <Button variant="ghost" size="icon" className="size-7" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Mover antes"><ArrowLeft /></Button>
                      <Button variant="ghost" size="icon" className="size-7" disabled={i === imagenes.length - 1} onClick={() => mover(i, 1)} aria-label="Mover después"><ArrowRight /></Button>
                    </div>
                  </div>
                ))}
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onArchivos(e.target.files)} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={subiendo}
                  className="flex h-36 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-xs text-muted-foreground hover:bg-accent disabled:opacity-60"
                >
                  {subiendo ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {subiendo ? 'Subiendo…' : 'Agregar'}
                </button>
              </div>
            </Field>
            <Field label="Leyenda (opcional)"><Input value={d.titulo} onChange={(e) => set('titulo', e.target.value)} maxLength={120} /></Field>
          </>
        )}

        {d.tipo === 'video' && (
          <Field label="Video: enlace de Google Drive o URL de un .mp4 *" hint="En Drive: clic derecho → Compartir → «Cualquier persona con el enlace» → Copiar enlace. Se reproduce sin sonido. Con Drive conviene indicar los segundos por si el video no se puede reproducir directo.">
            <Input value={d.src} onChange={(e) => set('src', e.target.value)} placeholder="https://drive.google.com/file/d/…/view" />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={d.tipo === 'imagen' ? 'Segundos por imagen' : 'Segundos en pantalla'} hint={d.tipo === 'video' ? '0 = hasta que termine' : undefined}>
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
