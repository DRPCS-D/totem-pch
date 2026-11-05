import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfig } from '@/hooks/useConfig'
import { CONFIG_DEFECTO, type ConfigTotem } from '@/lib/tipos'

const COLOR = 'h-9.5 w-full cursor-pointer rounded-md border border-input bg-card p-1'

export default function Apariencia() {
  const { config, loading, error, guardar, refetch } = useConfig()
  const [d, setD] = useState<ConfigTotem>(CONFIG_DEFECTO)
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!sucio) setD(config)
  }, [config, sucio])

  const set = <K extends keyof ConfigTotem>(k: K, v: ConfigTotem[K]) => {
    setD((x) => ({ ...x, [k]: v }))
    setSucio(true)
  }

  async function onGuardar() {
    setGuardando(true)
    const { error: err } = await guardar({
      nombre: d.nombre, logoText: d.logoText, logoUrl: d.logoUrl, primary: d.primary, accent: d.accent, showClock: d.showClock,
      tickerEnabled: d.tickerEnabled, tickerText: d.tickerText, idleSeconds: d.idleSeconds,
    })
    setGuardando(false)
    if (err) return toast.error(err)
    toast.success('Apariencia guardada. El totem lo aplicará en su próxima actualización (cada hora).')
    setSucio(false)
    refetch()
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Apariencia y pantalla</h1>
          <p className="text-sm text-muted-foreground">Identidad, colores y comportamiento del totem.</p>
        </div>
        <Button onClick={onGuardar} disabled={!sucio || guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Button>
      </div>

      {error ? (
        <ErrorBox mensaje={error} />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Identidad</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del negocio"><Input value={d.nombre} onChange={(e) => set('nombre', e.target.value)} maxLength={60} /></Field>
              <Field label="Texto del logo (barra superior)"><Input value={d.logoText} onChange={(e) => set('logoText', e.target.value)} maxLength={40} /></Field>
              <Field label="URL del logo (imagen)" hint="Se muestra en la cabecera blanca del totem. Si queda vacío se usa el texto." className="sm:col-span-2">
                <Input value={d.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://…/logo.png" />
              </Field>
              <Field label="Color principal (celeste)">
                <input type="color" value={d.primary} onChange={(e) => set('primary', e.target.value)} className={COLOR} />
              </Field>
              <Field label="Color de acento (botones, ruleta)">
                <input type="color" value={d.accent} onChange={(e) => set('accent', e.target.value)} className={COLOR} />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Pantalla</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" className="size-4 accent-primary" checked={d.showClock} onChange={(e) => set('showClock', e.target.checked)} />
                  Mostrar reloj
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" className="size-4 accent-primary" checked={d.tickerEnabled} onChange={(e) => set('tickerEnabled', e.target.checked)} />
                  Mostrar cinta de texto
                </label>
              </div>
              <Field label="Texto de la cinta"><Textarea value={d.tickerText} onChange={(e) => set('tickerText', e.target.value)} maxLength={400} /></Field>
              <Field label="Segundos de inactividad en el juego" hint="Pasado este tiempo sin tocar, el totem vuelve a los anuncios.">
                <Input type="number" min={10} className="max-w-40" value={d.idleSeconds} onChange={(e) => set('idleSeconds', Number(e.target.value))} />
              </Field>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
