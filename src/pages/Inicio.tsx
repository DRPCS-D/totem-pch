import { Copy, ExternalLink, ImageIcon, Palette, Trophy, Users } from 'lucide-react'
import { useMemo, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnuncios } from '@/hooks/useAnuncios'
import { useAuth } from '@/hooks/useAuth'
import { useParticipantes } from '@/hooks/useParticipantes'
import { usePremios } from '@/hooks/usePremios'
import { ROL_LABEL } from '@/lib/tipos'

function Tarjeta({
  to, titulo, valor, detalle, icono: Icono, cargando,
}: {
  to: string
  titulo: string
  valor: string | number
  detalle: string
  icono: ComponentType<{ className?: string }>
  cargando: boolean
}) {
  return (
    <Link to={to} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/40">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{titulo}</span>
        <Icono className="size-4 text-muted-foreground" />
      </div>
      {cargando ? <Skeleton className="h-8 w-16" /> : <p className="tabular text-2xl font-semibold text-foreground">{valor}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
    </Link>
  )
}

export default function Inicio() {
  const { nombre, rol } = useAuth()
  const anuncios = useAnuncios()
  const premios = usePremios()
  const participantes = useParticipantes()

  const resumen = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    const p = participantes.data
    return {
      activos: anuncios.data.filter((a) => a.activo).length,
      premiosActivos: premios.data.filter((x) => x.activo).length,
      hoy: p.filter((x) => x.fecha.slice(0, 10) === hoy).length,
      porEntregar: p.filter((x) => x.gano && !x.entregado).length,
    }
  }, [anuncios.data, premios.data, participantes.data])

  const urlTotem = `${window.location.origin}/totem`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Hola, {nombre}</h1>
        <p className="text-sm text-muted-foreground">{rol ? ROL_LABEL[rol] : ''} · Panel del totem publicitario</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta to="/anuncios" titulo="Anuncios activos" valor={resumen.activos} detalle={`${anuncios.data.length} en total`} icono={ImageIcon} cargando={anuncios.loading} />
        <Tarjeta to="/ruleta" titulo="Premios en la ruleta" valor={resumen.premiosActivos} detalle="Casillas activas" icono={Trophy} cargando={premios.loading} />
        <Tarjeta to="/participantes" titulo="Jugaron hoy" valor={resumen.hoy} detalle={`${participantes.data.length} en total`} icono={Users} cargando={participantes.loading} />
        <Tarjeta to="/participantes" titulo="Premios por entregar" valor={resumen.porEntregar} detalle="Ganadores pendientes" icono={Palette} cargando={participantes.loading} />
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Dirección del totem</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Abre esta dirección en el navegador del equipo (Android) y usa «Instalar» / «Agregar a pantalla de inicio» para dejarla a pantalla completa.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-secondary px-3 py-2 text-sm text-foreground">{urlTotem}</code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(urlTotem).then(() => toast.success('Dirección copiada.'))}
          >
            <Copy /> Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(urlTotem, '_blank')}>
            <ExternalLink /> Abrir
          </Button>
        </div>
      </section>
    </div>
  )
}
