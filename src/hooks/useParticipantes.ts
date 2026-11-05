import { ejecutar } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import type { Participante } from '@/lib/tipos'
import { useTabla } from './useTabla'

export function useParticipantes() {
  const lista = useTabla<Participante>(TABLAS.participantes)
  return {
    ...lista,
    marcarEntregado: (id: string, entregado: boolean) =>
      ejecutar('marcarEntregado', { id, entregado }, 'No se pudo actualizar el registro.'),
    borrarTodos: () => ejecutar('clearParticipantes', {}, 'No se pudieron borrar los registros.'),
  }
}
