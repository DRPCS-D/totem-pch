import { Download, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { ConfirmModal } from '@/components/ui/modal'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { TablaScroll } from '@/components/ui/tabla-scroll'
import { useAuth } from '@/hooks/useAuth'
import { useParticipantes } from '@/hooks/useParticipantes'
import { formatFechaHora } from '@/lib/format'

function csv(filas: string[][]): string {
  return '﻿' + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export default function Participantes() {
  const { esAdmin } = useAuth()
  const { data, loading, error, refetch, marcarEntregado, borrarTodos } = useParticipantes()
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [borrando, setBorrando] = useState(false)

  const filtrados = useMemo(() => (soloPendientes ? data.filter((p) => p.gano && !p.entregado) : data), [data, soloPendientes])
  const ganadores = data.filter((p) => p.gano).length
  const pendientes = data.filter((p) => p.gano && !p.entregado).length

  function exportar() {
    const filas = [
      ['fecha', 'nombre', 'telefono', 'resultado', 'gano', 'entregado'],
      ...data.map((p) => [p.fecha, p.nombre, p.telefono, p.premio, p.gano ? 'si' : 'no', p.entregado ? 'si' : 'no']),
    ]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv(filas)], { type: 'text/csv' }))
    a.download = 'participantes.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function alternar(id: string, entregado: boolean) {
    const { error: err } = await marcarEntregado(id, entregado)
    if (err) toast.error(err)
    else refetch()
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Participantes</h1>
          <p className="text-sm text-muted-foreground">
            {data.length} participaciones · {ganadores} con premio · {pendientes} por entregar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="size-4 accent-primary" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
            Solo premios por entregar
          </label>
          <Button variant="outline" onClick={exportar} disabled={data.length === 0}><Download /> CSV</Button>
          {esAdmin && (
            <Button variant="outline" onClick={() => setConfirmar(true)} disabled={data.length === 0}>
              <Trash2 className="text-destructive" /> Borrar todo
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <TableSkeleton columnas={[20, 25, 20, 20, 15]} />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : filtrados.length === 0 ? (
        <Vacio icono={Users} titulo="Sin registros" descripcion="Aquí aparecerá quién juega en el totem." />
      ) : (
        <TablaScroll total={filtrados.length} clave={String(soloPendientes)}>
          {(limite) => (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Nombre</th>
                  <th className="px-4 py-2.5 font-medium">Teléfono</th>
                  <th className="px-4 py-2.5 font-medium">Resultado</th>
                  <th className="px-4 py-2.5 font-medium">Entrega</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, limite).map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="tabular whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatFechaHora(p.fecha)}</td>
                    <td className="px-4 py-2.5 text-foreground">{p.nombre || '—'}</td>
                    <td className="tabular px-4 py-2.5 text-foreground">{p.telefono || '—'}</td>
                    <td className="px-4 py-2.5"><Badge tono={p.gano ? 'primary' : 'neutral'}>{p.premio}</Badge></td>
                    <td className="px-4 py-2.5">
                      {p.gano ? (
                        <Button size="sm" variant={p.entregado ? 'secondary' : 'outline'} onClick={() => alternar(p.id, !p.entregado)}>
                          {p.entregado ? 'Entregado ✓' : 'Marcar entregado'}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </TablaScroll>
      )}

      <ConfirmModal
        abierto={confirmar}
        titulo="Borrar todos los registros"
        textoConfirmar="Borrar todo"
        procesando={borrando}
        mensaje="Se eliminarán todos los participantes. No se puede deshacer; exporta el CSV antes si lo necesitas. Los límites por teléfono se reinician."
        onCancelar={() => setConfirmar(false)}
        onConfirmar={async () => {
          setBorrando(true)
          const { error: err } = await borrarTodos()
          setBorrando(false)
          if (err) toast.error(err)
          else { toast.success('Registros borrados.'); refetch() }
          setConfirmar(false)
        }}
      />
    </div>
  )
}
