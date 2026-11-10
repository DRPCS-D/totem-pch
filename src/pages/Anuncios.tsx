import { ArrowDown, ArrowUp, Film, ImageIcon, Plus, Type } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AnuncioFormModal } from '@/components/anuncios/AnuncioFormModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { ConfirmModal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnuncios } from '@/hooks/useAnuncios'
import { imagenesDe } from '@/lib/imagen'
import { TIPO_ANUNCIO_LABEL, type Anuncio } from '@/lib/tipos'

const ICONO = { texto: Type, imagen: ImageIcon, video: Film }

function Miniatura({ a }: { a: Anuncio }) {
  const Icono = ICONO[a.tipo]
  const imgs = imagenesDe(a.src)
  if (a.tipo === 'imagen' && imgs.length)
    return (
      <div className="relative shrink-0">
        <img src={imgs[0]} alt="" className="h-20 w-11 rounded-md object-cover" />
        {imgs.length > 1 && <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] text-white">{imgs.length}</span>}
      </div>
    )
  return (
    <div
      className="flex h-20 w-11 shrink-0 items-center justify-center rounded-md text-white"
      style={{ background: a.tipo === 'texto' ? `linear-gradient(160deg, ${a.color}, #000 140%)` : '#111' }}
    >
      <Icono className="size-4" />
    </div>
  )
}

function vigencia(a: Anuncio): string {
  if (a.desde && a.hasta) return `${a.desde} → ${a.hasta}`
  if (a.desde) return `Desde ${a.desde}`
  if (a.hasta) return `Hasta ${a.hasta}`
  return 'Siempre'
}

export default function Anuncios() {
  const { data, loading, error, refetch, crear, editar, eliminar, reordenar } = useAnuncios()
  const [modal, setModal] = useState<'nuevo' | Anuncio | null>(null)
  const [borrar, setBorrar] = useState<Anuncio | null>(null)
  const [borrando, setBorrando] = useState(false)

  async function mover(i: number, d: number) {
    const ids = data.map((a) => a.id)
    ;[ids[i], ids[i + d]] = [ids[i + d], ids[i]]
    const { error: err } = await reordenar(ids)
    if (err) toast.error(err)
    else refetch()
  }

  async function alternar(a: Anuncio) {
    const { id: _id, orden: _orden, ...datos } = a
    const { error: err } = await editar(a.id, { ...datos, activo: !a.activo })
    if (err) toast.error(err)
    else refetch()
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Anuncios</h1>
          <p className="text-sm text-muted-foreground">Se muestran en el totem en este orden. El totem se actualiza cada hora (o al instante con el gesto oculto).</p>
        </div>
        <Button onClick={() => setModal('nuevo')}><Plus /> Nuevo anuncio</Button>
      </div>

      {data.length > 0 && !('nombre' in data[0]) && (
        <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Tu Apps Script está desactualizado y no guarda el nombre de los anuncios. Pega el Code.gs nuevo y publica una nueva versión
          (Implementar → Administrar implementaciones → editar → Nueva versión).
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio icono={ImageIcon} titulo="Sin anuncios todavía" descripcion="Crea el primero para que el totem tenga qué mostrar." />
      ) : (
        <ul className="space-y-3">
          {data.map((a, i) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
              <Miniatura a={a} />
              <button type="button" onClick={() => setModal(a)} className="min-w-0 flex-1 basis-40 text-left">
                <p className="truncate text-sm font-medium text-foreground">{a.nombre || a.titulo || TIPO_ANUNCIO_LABEL[a.tipo]}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.tipo === 'imagen' ? `${imagenesDe(a.src).length} imagen(es) × ${a.duracion} s` : `${TIPO_ANUNCIO_LABEL[a.tipo]} · ${a.duracion ? `${a.duracion} s` : 'hasta terminar'}`} · {vigencia(a)}
                </p>
              </button>
              <Badge tono={a.activo ? 'success' : 'neutral'}>{a.activo ? 'Activo' : 'Pausado'}</Badge>
              <Button variant="outline" size="sm" onClick={() => alternar(a)}>{a.activo ? 'Pausar' : 'Activar'}</Button>
              <div className="flex">
                <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir"><ArrowUp /></Button>
                <Button variant="ghost" size="icon" disabled={i === data.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar"><ArrowDown /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnuncioFormModal
        abierto={modal !== null}
        anuncio={modal === 'nuevo' ? null : modal}
        onCerrar={() => setModal(null)}
        onGuardado={() => { setModal(null); refetch() }}
        onBorrar={() => { setBorrar(modal === 'nuevo' ? null : modal); setModal(null) }}
        crear={crear}
        editar={editar}
      />

      <ConfirmModal
        abierto={borrar !== null}
        titulo="Borrar anuncio"
        textoConfirmar="Borrar"
        procesando={borrando}
        mensaje={<>¿Borrar <strong>{borrar?.nombre || borrar?.titulo || 'este anuncio'}</strong>? Si solo quieres ocultarlo, usa «Pausar».</>}
        onCancelar={() => setBorrar(null)}
        onConfirmar={async () => {
          if (!borrar) return
          setBorrando(true)
          const { error: err } = await eliminar(borrar.id)
          setBorrando(false)
          if (err) toast.error(err)
          else { toast.success('Anuncio borrado.'); refetch() }
          setBorrar(null)
        }}
      />
    </div>
  )
}
