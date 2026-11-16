import { ejecutar } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import type { Premio } from '@/lib/tipos'
import { useTabla } from './useTabla'

export type DatosPremio = Omit<Premio, 'id' | 'ruletaId'>

/** Premios de UNA ruleta. Con `ruletaId = null` no se pide nada. */
export function usePremios(ruletaId: string | null) {
  const lista = useTabla<Premio>(TABLAS.premios, { ruletaId: ruletaId ?? '' }, ruletaId !== null)
  return {
    ...lista,
    crear: (d: DatosPremio) => ejecutar('createPremio', { ...d, ruletaId }, 'No se pudo crear el premio.'),
    editar: (id: string, d: DatosPremio) => ejecutar('updatePremio', { id, ...d }, 'No se pudo guardar el premio.'),
    eliminar: (id: string) => ejecutar('deletePremio', { id }, 'No se pudo borrar el premio.'),
  }
}
