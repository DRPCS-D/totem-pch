import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input } from '@/components/ui/field'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfig } from '@/hooks/useConfig'
import { usePremios, type DatosPremio } from '@/hooks/usePremios'
import { CONFIG_DEFECTO, type ConfigTotem, type Premio } from '@/lib/tipos'

const PREMIO_VACIO: DatosPremio = { etiqueta: '', color: '#3b82f6', peso: 10, stock: -1, gana: true, activo: true }

function Check({ label, valor, onCambiar }: { label: string; valor: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input type="checkbox" className="size-4 accent-primary" checked={valor} onChange={(e) => onCambiar(e.target.checked)} />
      {label}
    </label>
  )
}

function PremioModal({
  premio, abierto, onCerrar, onGuardado, onBorrar, crear, editar,
}: {
  premio: Premio | null
  abierto: boolean
  onCerrar: () => void
  onGuardado: () => void
  onBorrar: () => void
  crear: (d: DatosPremio) => Promise<{ error: string | null }>
  editar: (id: string, d: DatosPremio) => Promise<{ error: string | null }>
}) {
  const [d, setD] = useState<DatosPremio>(PREMIO_VACIO)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setD(premio ? { etiqueta: premio.etiqueta, color: premio.color, peso: premio.peso, stock: premio.stock, gana: premio.gana, activo: premio.activo } : PREMIO_VACIO)
    setError(null)
  }, [abierto, premio])

  const set = <K extends keyof DatosPremio>(k: K, v: DatosPremio[K]) => setD((x) => ({ ...x, [k]: v }))

  async function onGuardar() {
    setGuardando(true)
    setError(null)
    const { error: err } = premio ? await editar(premio.id, d) : await crear(d)
    setGuardando(false)
    if (err) return setError(err)
    toast.success(premio ? 'Premio actualizado.' : 'Premio creado.')
    onGuardado()
  }

  return (
    <Modal
      abierto={abierto}
      titulo={premio ? 'Editar premio' : 'Nuevo premio'}
      onCerrar={onCerrar}
      footer={
        <>
          {premio && (
            <Button variant="outline" onClick={onBorrar} disabled={guardando}>
              <Trash2 className="text-destructive" /> Borrar
            </Button>
          )}
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={onGuardar} disabled={guardando}>{guardando ? 'Guardando…' : premio ? 'Guardar' : 'Crear'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Texto en la ruleta *"><Input value={d.etiqueta} onChange={(e) => set('etiqueta', e.target.value)} maxLength={40} autoFocus /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Color">
            <input type="color" value={d.color} onChange={(e) => set('color', e.target.value)} className="h-9.5 w-full cursor-pointer rounded-md border border-input bg-card p-1" />
          </Field>
          <Field label="Peso" hint="Probabilidad relativa.">
            <Input type="number" min={0} value={d.peso} onChange={(e) => set('peso', Number(e.target.value))} />
          </Field>
          <Field label="Stock" hint="-1 = ilimitado.">
            <Input type="number" min={-1} value={d.stock} onChange={(e) => set('stock', Number(e.target.value))} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <Check label="Es un premio (no «Sigue intentando»)" valor={d.gana} onCambiar={(v) => set('gana', v)} />
          <Check label="Activo" valor={d.activo} onCambiar={(v) => set('activo', v)} />
        </div>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}

export default function Ruleta() {
  const cfg = useConfig()
  const premios = usePremios()
  const [draft, setDraft] = useState<ConfigTotem>(CONFIG_DEFECTO)
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modal, setModal] = useState<'nuevo' | Premio | null>(null)
  const [borrar, setBorrar] = useState<Premio | null>(null)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    if (!sucio) setDraft(cfg.config)
  }, [cfg.config, sucio])

  const set = <K extends keyof ConfigTotem>(k: K, v: ConfigTotem[K]) => {
    setDraft((x) => ({ ...x, [k]: v }))
    setSucio(true)
  }

  const totalPeso = useMemo(
    () => premios.data.filter((p) => p.activo && p.stock !== 0).reduce((s, p) => s + p.peso, 0) || 1,
    [premios.data],
  )

  async function guardar() {
    setGuardando(true)
    const { error } = await cfg.guardar({
      raffleEnabled: draft.raffleEnabled, raffleTitle: draft.raffleTitle, raffleSubtitle: draft.raffleSubtitle,
      maxSpins: draft.maxSpins, askName: draft.askName, askPhone: draft.askPhone, loseMessage: draft.loseMessage,
    })
    setGuardando(false)
    if (error) return toast.error(error)
    toast.success('Configuración del sorteo guardada.')
    setSucio(false)
    cfg.refetch()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Ruleta de sorteos</h1>
        <p className="text-sm text-muted-foreground">El resultado lo decide el servidor, según el peso y el stock de cada premio.</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Ajustes del juego</h2>
        {cfg.loading ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="space-y-4">
            <Check label="Juego habilitado (muestra un pequeño ícono de regalo en la esquina inferior derecha del totem)" valor={draft.raffleEnabled} onCambiar={(v) => set('raffleEnabled', v)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título"><Input value={draft.raffleTitle} onChange={(e) => set('raffleTitle', e.target.value)} maxLength={60} /></Field>
              <Field label="Subtítulo"><Input value={draft.raffleSubtitle} onChange={(e) => set('raffleSubtitle', e.target.value)} maxLength={100} /></Field>
              <Field label="Mensaje cuando no gana"><Input value={draft.loseMessage} onChange={(e) => set('loseMessage', e.target.value)} maxLength={80} /></Field>
              <Field label="Giros máximos por teléfono" hint="0 = ilimitado."><Input type="number" min={0} value={draft.maxSpins} onChange={(e) => set('maxSpins', Number(e.target.value))} /></Field>
            </div>
            <div className="flex flex-wrap gap-6">
              <Check label="Pedir nombre" valor={draft.askName} onCambiar={(v) => set('askName', v)} />
              <Check label="Pedir teléfono" valor={draft.askPhone} onCambiar={(v) => set('askPhone', v)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={guardar} disabled={!sucio || guardando}>{guardando ? 'Guardando…' : 'Guardar ajustes'}</Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Premios ({premios.data.length})</h2>
          <Button size="sm" onClick={() => setModal('nuevo')}><Plus /> Agregar</Button>
        </div>
        {premios.loading ? (
          <div className="p-5"><Skeleton className="h-32" /></div>
        ) : premios.error ? (
          <div className="p-5"><ErrorBox mensaje={premios.error} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Premio</th>
                  <th className="px-4 py-2.5 font-medium">Probabilidad</th>
                  <th className="px-4 py-2.5 font-medium">Stock</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {premios.data.map((p) => (
                  <tr key={p.id} onClick={() => setModal(p)} className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <span className="mr-2 inline-block size-3 rounded-full align-middle" style={{ background: p.color }} />
                      {p.etiqueta}
                    </td>
                    <td className="tabular px-4 py-2.5 text-muted-foreground">
                      {p.activo && p.stock !== 0 ? `${((p.peso / totalPeso) * 100).toFixed(1)} %` : '—'}
                    </td>
                    <td className="tabular px-4 py-2.5 text-muted-foreground">{p.stock === -1 ? '∞' : p.stock === 0 ? 'Agotado' : p.stock}</td>
                    <td className="px-4 py-2.5"><Badge tono={p.gana ? 'primary' : 'neutral'}>{p.gana ? 'Premio' : 'Sin premio'}</Badge></td>
                    <td className="px-4 py-2.5"><Badge tono={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PremioModal
        abierto={modal !== null}
        premio={modal === 'nuevo' ? null : modal}
        onCerrar={() => setModal(null)}
        onGuardado={() => { setModal(null); premios.refetch() }}
        onBorrar={() => { setBorrar(modal === 'nuevo' ? null : modal); setModal(null) }}
        crear={premios.crear}
        editar={premios.editar}
      />

      <ConfirmModal
        abierto={borrar !== null}
        titulo="Borrar premio"
        textoConfirmar="Borrar"
        procesando={borrando}
        mensaje={<>¿Borrar <strong>{borrar?.etiqueta}</strong> de la ruleta?</>}
        onCancelar={() => setBorrar(null)}
        onConfirmar={async () => {
          if (!borrar) return
          setBorrando(true)
          const { error } = await premios.eliminar(borrar.id)
          setBorrando(false)
          if (error) toast.error(error)
          else { toast.success('Premio borrado.'); premios.refetch() }
          setBorrar(null)
        }}
      />
    </div>
  )
}
