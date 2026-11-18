import { ejecutar, ejecutarConDatos } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import type { Ruleta } from '@/lib/tipos'
import { useTabla } from './useTabla'

/** Ruletas = plantillas de premios con nombre; solo una está activa (la que ve el totem). */
export function useRuletas() {
  const lista = useTabla<Ruleta>(TABLAS.ruletas)
  return {
    ...lista,
    activa: lista.data.find((r) => r.activa) ?? null,
    crear: (nombre: string, copiarDe: string) =>
      ejecutarConDatos<{ id: string }>('createRuleta', { nombre, copiarDe }, 'No se pudo crear la ruleta.'),
    renombrar: (id: string, nombre: string) => ejecutar('updateRuleta', { id, nombre }, 'No se pudo renombrar la ruleta.'),
    eliminar: (id: string) => ejecutar('deleteRuleta', { id }, 'No se pudo borrar la ruleta.'),
    ajustes: (id: string, a: Pick<Ruleta, 'fondo' | 'sonidoFondo' | 'sonidoGana' | 'sonidoPierde'>) =>
      ejecutar('ajustesRuleta', { id, ...a }, 'No se pudieron guardar el fondo y los sonidos.'),
    activar: (id: string) => ejecutar('activarRuleta', { id }, 'No se pudo activar la ruleta.'),
  }
}
