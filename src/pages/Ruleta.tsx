import { Copy, ImagePlus, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ColorField } from '@/components/ui/color-field'
import { ErrorBox } from '@/components/ui/estado'
import { SonidoField } from '@/components/ui/sonido-field'
import { Field, Input, Select } from '@/components/ui/field'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfig } from '@/hooks/useConfig'
import { useForzarActualizacion } from '@/hooks/useTabla'
import { subirImagen } from '@/lib/imagen'
import { usePremios, type DatosPremio } from '@/hooks/usePremios'
import { useRuletas } from '@/hooks/useRuletas'
import { cn } from '@/lib/utils'
import { CONFIG_DEFECTO, type ConfigTotem, type Premio, type Ruleta } from '@/lib/tipos'

const PREMIO_VACIO: DatosPremio = { etiqueta: '', color: '#3b82f6', peso: 10, stock: -1, gana: true, activo: true, sonido: '' }

function Check({ label, valor, onCambiar }: { label: string; valor: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input type="checkbox" className="size-4 accent-primary" checked={valor} onChange={(e) => onCambiar(e.target.checked)} />
      {label}
    </label>
  )
}

/* ───────────────────────── Premio ───────────────────────── */

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
    setD(premio ? { etiqueta: premio.etiqueta, color: premio.color, peso: premio.peso, stock: premio.stock, gana: premio.gana, activo: premio.activo, sonido: premio.sonido ?? '' } : PREMIO_VACIO)
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Color" className="sm:col-span-2">
            <ColorField value={d.color} onChange={(v) => set('color', v)} />
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
        <Field label="Sonido propio (opcional)" hint="Suena cuando la ruleta cae en este premio. Si lo dejas vacío se usa el sonido de ganar o de perder de la ruleta.">
          <SonidoField value={d.sonido} onChange={(v) => set('sonido', v)} />
        </Field>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}

/* ───────────────────────── Ruleta (plantilla) ───────────────────────── */

type ModoRuleta = { tipo: 'nueva'; copiarDe: string; nombre: string } | { tipo: 'renombrar'; ruleta: Ruleta }

function RuletaModal({
  modo, ruletas, onCerrar, onHecho, crear, renombrar,
}: {
  modo: ModoRuleta | null
  ruletas: Ruleta[]
  onCerrar: () => void
  onHecho: (idNuevo?: string) => void
  crear: ReturnType<typeof useRuletas>['crear']
  renombrar: ReturnType<typeof useRuletas>['renombrar']
}) {
  const [nombre, setNombre] = useState('')
  const [copiarDe, setCopiarDe] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!modo) return
    setNombre(modo.tipo === 'nueva' ? modo.nombre : modo.ruleta.nombre)
    setCopiarDe(modo.tipo === 'nueva' ? modo.copiarDe : '')
    setError(null)
  }, [modo])

  async function onGuardar() {
    if (!modo) return
    const n = nombre.trim()
    if (!n) return setError('Ponle un nombre a la ruleta.')
    setGuardando(true)
    setError(null)
    if (modo.tipo === 'renombrar') {
      const { error: err } = await renombrar(modo.ruleta.id, n)
      setGuardando(false)
      if (err) return setError(err)
      toast.success('Ruleta renombrada.')
      onHecho()
    } else {
      const { error: err, data } = await crear(n, copiarDe)
      setGuardando(false)
      if (err) return setError(err)
      toast.success('Ruleta creada. Actívala cuando quieras usarla en el totem.')
      onHecho(data?.id)
    }
  }

  return (
    <Modal
      abierto={modo !== null}
      titulo={modo?.tipo === 'renombrar' ? 'Renombrar ruleta' : 'Nueva ruleta'}
      onCerrar={onCerrar}
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={onGuardar} disabled={guardando}>{guardando ? 'Guardando…' : modo?.tipo === 'renombrar' ? 'Guardar' : 'Crear ruleta'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre de la ruleta *" hint="Ej.: «Navidad», «Día del niño», «Liquidación».">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} autoFocus />
        </Field>
        {modo?.tipo === 'nueva' && (
          <Field label="Premios iniciales" hint="Puedes empezar desde cero o copiar los premios de otra ruleta y luego ajustarlos.">
            <Select value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)}>
              <option value="">Vacía (agregaré los premios después)</option>
              {ruletas.map((r) => (
                <option key={r.id} value={r.id}>Copiar de «{r.nombre}» ({r.premios} premios)</option>
              ))}
            </Select>
          </Field>
        )}
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}

/* ───────────────────────── Fondo y sonidos de una ruleta ───────────────────────── */

type Media = Pick<Ruleta, 'fondo' | 'sonidoFondo' | 'sonidoGana' | 'sonidoPierde'>

function AjustesMedia({ ruleta, guardarAjustes, alGuardar }: {
  ruleta: Ruleta
  guardarAjustes: ReturnType<typeof useRuletas>['ajustes']
  alGuardar: () => void
}) {
  const desdeServidor: Media = { fondo: ruleta.fondo ?? '', sonidoFondo: ruleta.sonidoFondo ?? '', sonidoGana: ruleta.sonidoGana ?? '', sonidoPierde: ruleta.sonidoPierde ?? '' }
  const [m, setM] = useState<Media>(desdeServidor)
  const [sucio, setSucio] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const firma = JSON.stringify(desdeServidor)

  useEffect(() => {
    if (!sucio) setM(JSON.parse(firma))
  }, [firma, sucio])

  const set = <K extends keyof Media>(k: K, v: string) => {
    setM((x) => ({ ...x, [k]: v }))
    setSucio(true)
  }

  async function onFondo(f: File | undefined) {
    if (!f) return
    setSubiendo(true)
    setError(null)
    try {
      set('fondo', await subirImagen(f))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.')
    }
    setSubiendo(false)
    if (archivo.current) archivo.current.value = ''
  }

  async function guardar() {
    setGuardando(true)
    const { error: err } = await guardarAjustes(ruleta.id, m)
    setGuardando(false)
    if (err) return toast.error(err)
    toast.success('Fondo y sonidos guardados.')
    setSucio(false)
    alGuardar()
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">Fondo y sonidos al ganar / perder de «{ruleta.nombre}»</h2>
        <Button size="sm" onClick={guardar} disabled={!sucio || guardando || subiendo}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[auto_1fr]">
        <Field label="Imagen de fondo" hint="Vertical 1080×1920 ideal. Se ve detrás del formulario y la ruleta.">
          <input ref={archivo} type="file" accept="image/*" hidden onChange={(e) => onFondo(e.target.files?.[0])} />
          <div className="flex items-end gap-3">
            {m.fondo ? (
              <img src={m.fondo} alt="" className="h-40 w-[90px] rounded-md border border-border object-cover" />
            ) : (
              <div className="flex h-40 w-[90px] items-center justify-center rounded-md border border-dashed border-input text-muted-foreground"><ImagePlus className="size-5" /></div>
            )}
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={() => archivo.current?.click()} disabled={subiendo}>{subiendo ? 'Subiendo…' : m.fondo ? 'Cambiar' : 'Subir imagen'}</Button>
              {m.fondo && <Button variant="ghost" size="sm" onClick={() => set('fondo', '')} disabled={subiendo}>Quitar</Button>}
            </div>
          </div>
        </Field>
        <div className="space-y-4">
          <Field label="Sonido al ganar" hint="Para los premios que no tienen sonido propio.">
            <SonidoField value={m.sonidoGana} onChange={(v) => set('sonidoGana', v)} />
          </Field>
          <Field label="Sonido al perder / «Sigue intentando»" hint="Para las casillas sin premio que no tienen sonido propio.">
            <SonidoField value={m.sonidoPierde} onChange={(v) => set('sonidoPierde', v)} />
          </Field>
        </div>
      </div>
      {error && <div className="px-5 pb-4"><ErrorBox mensaje={error} /></div>}
    </section>
  )
}

/* ───────────────────────── Página ───────────────────────── */

export default function RuletaPage() {
  const cfg = useConfig()
  const ruletas = useRuletas()
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const seleccionada = ruletas.data.find((r) => r.id === seleccion) ?? ruletas.activa ?? ruletas.data[0] ?? null
  const premios = usePremios(seleccionada?.id ?? null)

  const [draft, setDraft] = useState<ConfigTotem>(CONFIG_DEFECTO)
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modal, setModal] = useState<'nuevo' | Premio | null>(null)
  const [borrar, setBorrar] = useState<Premio | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [modalRuleta, setModalRuleta] = useState<ModoRuleta | null>(null)
  const [borrarRuleta, setBorrarRuleta] = useState<Ruleta | null>(null)
  const [activando, setActivando] = useState<string | null>(null)

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

  async function activar(r: Ruleta) {
    setActivando(r.id)
    const { error } = await ruletas.activar(r.id)
    setActivando(null)
    if (error) return toast.error(error)
    toast.success(`«${r.nombre}» es ahora la ruleta activa. El totem la mostrará en su próxima actualización (o al instante con los 5 toques arriba a la derecha).`, { duration: 8000 })
    ruletas.refetch()
  }

  async function cambiarElegible(r: Ruleta, v: boolean) {
    const { error } = await ruletas.elegible(r.id, v)
    if (error) return toast.error(error)
    ruletas.refetch()
  }

  async function guardar() {
    setGuardando(true)
    const { error } = await cfg.guardar({
      raffleEnabled: draft.raffleEnabled, raffleTitle: draft.raffleTitle, raffleSubtitle: draft.raffleSubtitle,
      maxSpins: draft.maxSpins, askName: draft.askName, askPhone: draft.askPhone, loseMessage: draft.loseMessage,
      gameSound: draft.gameSound, gameVolume: draft.gameVolume, ruletaSelector: draft.ruletaSelector, datosOpcionales: draft.datosOpcionales, sonidoFondo: draft.sonidoFondo,
    })
    setGuardando(false)
    if (error) return toast.error(error, { duration: 15000 })
    toast.success('Configuración del sorteo guardada.')
    setSucio(false)
    cfg.refetch()
  }

  const apsViejo = ruletas.error?.includes('Acción desconocida')

  // Los datos se guardan en el navegador y publicar un Code.gs nuevo no los invalida: si faltan los campos nuevos
  // se baja todo una vez antes de dar el backend por desactualizado.
  const { forzar } = useForzarActualizacion()
  const [verificado, setVerificado] = useState(false)
  const sinMedia = ruletas.data.length > 0 && !('fondo' in ruletas.data[0])
  useEffect(() => {
    if (sinMedia && !verificado) void forzar().finally(() => setVerificado(true))
  }, [sinMedia, verificado, forzar])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Ruleta de sorteos</h1>
        <p className="text-sm text-muted-foreground">
          Crea varias ruletas con sus propios premios y elige con un clic cuál está activa en el totem. El resultado lo decide el servidor, según el peso y el stock.
        </p>
      </div>

      {/* ── Mis ruletas ── */}
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Mis ruletas ({ruletas.data.length})</h2>
          <Button size="sm" onClick={() => setModalRuleta({ tipo: 'nueva', copiarDe: '', nombre: '' })}><Plus /> Nueva ruleta</Button>
        </div>
        <div className="p-5">
          {ruletas.loading ? (
            <Skeleton className="h-24" />
          ) : apsViejo ? (
            <ErrorBox mensaje="Tu Apps Script está desactualizado y no tiene ruletas. Pega el Code.gs nuevo y publica una nueva versión (Implementar → Administrar implementaciones → editar → Nueva versión)." />
          ) : ruletas.error ? (
            <ErrorBox mensaje={ruletas.error} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ruletas.data.map((r) => {
                const elegida = seleccionada?.id === r.id
                return (
                  <div
                    key={r.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-lg border bg-background p-3 transition-colors',
                      elegida ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                    )}
                  >
                    <button type="button" onClick={() => setSeleccion(r.id)} className="min-w-0 text-left" aria-pressed={elegida}>
                      <p className="truncate text-sm font-semibold text-foreground">{r.nombre}</p>
                      <p className="text-xs text-muted-foreground">{r.premios} premios activos{elegida ? ' · editando' : ''}</p>
                    </button>
                    {draft.ruletaSelector && (
                      r.activa ? (
                        <p className="text-xs text-muted-foreground">Siempre disponible para elegir en el totem.</p>
                      ) : (
                        <label className="flex items-center gap-2 text-xs text-foreground">
                          <input type="checkbox" className="size-4 accent-primary" checked={!!r.elegible} onChange={(e) => cambiarElegible(r, e.target.checked)} />
                          Disponible para elegir en el totem
                        </label>
                      )
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {r.activa ? (
                        <Badge tono="success">Activa en el totem</Badge>
                      ) : (
                        <Button size="sm" onClick={() => activar(r)} disabled={activando !== null}>
                          <Zap /> {activando === r.id ? 'Activando…' : 'Activar'}
                        </Button>
                      )}
                      <div className="ml-auto flex">
                        <Button variant="ghost" size="icon" className="size-8" title="Renombrar" aria-label="Renombrar" onClick={() => setModalRuleta({ tipo: 'renombrar', ruleta: r })}><Pencil /></Button>
                        <Button variant="ghost" size="icon" className="size-8" title="Duplicar" aria-label="Duplicar" onClick={() => setModalRuleta({ tipo: 'nueva', copiarDe: r.id, nombre: `${r.nombre} (copia)` })}><Copy /></Button>
                        <Button variant="ghost" size="icon" className="size-8" title={r.activa ? 'No se puede borrar la ruleta activa' : 'Borrar'} aria-label="Borrar" disabled={r.activa} onClick={() => setBorrarRuleta(r)}><Trash2 /></Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {sinMedia && verificado && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Tu Apps Script está desactualizado y no guarda el fondo ni los sonidos. Pega el Code.gs nuevo y publica una nueva versión
          (Implementar → Administrar implementaciones → editar → Nueva versión).
        </div>
      )}

      {seleccionada && !sinMedia && (
        <AjustesMedia key={seleccionada.id} ruleta={seleccionada} guardarAjustes={ruletas.ajustes} alGuardar={() => ruletas.refetch()} />
      )}

      {/* ── Premios de la ruleta elegida ── */}
      {seleccionada && (
        <section className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Premios de «{seleccionada.nombre}» ({premios.data.length})</h2>
              {seleccionada.activa && <Badge tono="success">Activa</Badge>}
            </div>
            <div className="flex gap-2">
              {!seleccionada.activa && (
                <Button size="sm" variant="outline" onClick={() => activar(seleccionada)} disabled={activando !== null}><Zap /> Activar esta ruleta</Button>
              )}
              <Button size="sm" onClick={() => setModal('nuevo')}><Plus /> Agregar premio</Button>
            </div>
          </div>
          {!seleccionada.activa && (
            <p className="border-b border-border bg-secondary/50 px-5 py-2 text-xs text-muted-foreground">
              Esta ruleta no está activa: puedes editarla con calma y el totem no la muestra hasta que la actives.
            </p>
          )}
          {premios.loading ? (
            <div className="p-5"><Skeleton className="h-32" /></div>
          ) : premios.error ? (
            <div className="p-5"><ErrorBox mensaje={premios.error} /></div>
          ) : premios.data.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Esta ruleta aún no tiene premios. Agrega al menos 2 para poder activarla.</p>
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
      )}

      {/* ── Ajustes del juego (valen para cualquier ruleta) ── */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Ajustes del juego <span className="font-normal text-muted-foreground">(valen para cualquier ruleta)</span></h2>
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
            <div className="space-y-1">
              <Check
                label="Jugar directo, sin pedir nombre ni teléfono"
                valor={!draft.askName && !draft.askPhone}
                onCambiar={(v) => { set('askName', !v); set('askPhone', !v) }}
              />
              <p className="pl-6 text-xs text-muted-foreground">
                La persona toca el ícono y va directo a la ruleta. Sin teléfono no se puede limitar los giros por persona ni contactar a los ganadores. También puedes pedir solo uno de los dos datos:
              </p>
            </div>
            <div className="flex flex-wrap gap-6">
              <Check label="Pedir nombre" valor={draft.askName} onCambiar={(v) => set('askName', v)} />
              <Check label="Pedir teléfono" valor={draft.askPhone} onCambiar={(v) => set('askPhone', v)} />
            </div>
            <div className="space-y-1">
              <Check label="Nombre y teléfono opcionales" valor={draft.datosOpcionales} onCambiar={(v) => set('datosOpcionales', v)} />
              <p className="pl-6 text-xs text-muted-foreground">
                El formulario se muestra igual, pero se puede tocar el botón sin escribir nada. Quien escribe sus datos queda registrado; quien no, aparece sin nombre en Participantes.
              </p>
            </div>
            <div className="space-y-1">
              <Check label="Dejar que la persona elija la ruleta en el totem" valor={draft.ruletaSelector} onCambiar={(v) => set('ruletaSelector', v)} />
              <p className="pl-6 text-xs text-muted-foreground">
                después de los datos, el totem muestra las ruletas marcadas como «Disponible para elegir en el totem» (más la activa). Si solo hay una, juega directo.
              </p>
            </div>
            <Field label="Música de fondo" hint="Una sola para todas las ruletas: suena en bucle mientras alguien juega (formulario y giro) y no se corta entre jugadas. Se detiene al cerrar el juego.">
              <SonidoField value={draft.sonidoFondo} onChange={(v) => set('sonidoFondo', v)} />
            </Field>
            <div className="flex flex-wrap items-end gap-6">
              <Check label="Sonidos del juego activados" valor={draft.gameSound} onCambiar={(v) => set('gameSound', v)} />
              <Field label="Volumen de los sonidos (0–100)" hint="Aplica al sonido de fondo y a los de ganar / perder.">
                <Input type="number" min={0} max={100} className="max-w-32" value={draft.gameVolume} onChange={(e) => set('gameVolume', Math.min(100, Math.max(0, Number(e.target.value))))} />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button onClick={guardar} disabled={!sucio || guardando}>{guardando ? 'Guardando…' : 'Guardar ajustes'}</Button>
            </div>
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
        mensaje={<>¿Borrar <strong>{borrar?.etiqueta}</strong> de «{seleccionada?.nombre}»?</>}
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

      <RuletaModal
        modo={modalRuleta}
        ruletas={ruletas.data}
        onCerrar={() => setModalRuleta(null)}
        onHecho={(idNuevo) => { setModalRuleta(null); if (idNuevo) setSeleccion(idNuevo); ruletas.refetch() }}
        crear={ruletas.crear}
        renombrar={ruletas.renombrar}
      />

      <ConfirmModal
        abierto={borrarRuleta !== null}
        titulo="Borrar ruleta"
        textoConfirmar="Borrar"
        procesando={borrando}
        mensaje={<>¿Borrar la ruleta <strong>{borrarRuleta?.nombre}</strong> y sus {borrarRuleta?.premios} premios? No se puede deshacer.</>}
        onCancelar={() => setBorrarRuleta(null)}
        onConfirmar={async () => {
          if (!borrarRuleta) return
          setBorrando(true)
          const { error } = await ruletas.eliminar(borrarRuleta.id)
          setBorrando(false)
          if (error) toast.error(error)
          else {
            toast.success('Ruleta borrada.')
            if (seleccion === borrarRuleta.id) setSeleccion(null)
            ruletas.refetch()
          }
          setBorrarRuleta(null)
        }}
      />
    </div>
  )
}
