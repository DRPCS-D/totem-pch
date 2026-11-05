import { ejecutar } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import type { Premio } from '@/lib/tipos'
import { useTabla } from './useTabla'

export type DatosPremio = Omit<Premio, 'id'>

export function usePremios() {
  const lista = useTabla<Premio>(TABLAS.premios)
  return {
    ...lista,
    crear: (d: DatosPremio) => ejecutar('createPremio', { ...d }, 'No se pudo crear el premio.'),
    editar: (id: string, d: DatosPremio) => ejecutar('updatePremio', { id, ...d }, 'No se pudo guardar el premio.'),
    eliminar: (id: string) => ejecutar('deletePremio', { id }, 'No se pudo borrar el premio.'),
  }
}
