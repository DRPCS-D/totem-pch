import { ejecutar } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import type { Anuncio } from '@/lib/tipos'
import { useTabla } from './useTabla'

export type DatosAnuncio = Omit<Anuncio, 'id' | 'orden'>

export function useAnuncios() {
  const lista = useTabla<Anuncio>(TABLAS.anuncios)
  return {
    ...lista,
    crear: (d: DatosAnuncio) => ejecutar('createAnuncio', { ...d }, 'No se pudo crear el anuncio.'),
    editar: (id: string, d: DatosAnuncio) => ejecutar('updateAnuncio', { id, ...d }, 'No se pudo guardar el anuncio.'),
    eliminar: (id: string) => ejecutar('deleteAnuncio', { id }, 'No se pudo borrar el anuncio.'),
    reordenar: (ids: string[]) => ejecutar('reordenarAnuncios', { ids }, 'No se pudo reordenar.'),
  }
}
