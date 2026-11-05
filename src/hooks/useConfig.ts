import { useMemo } from 'react'
import { callApi, conCredenciales } from '@/lib/appsScript'
import { ejecutar } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import { CONFIG_DEFECTO, type ConfigTotem } from '@/lib/tipos'
import { useTabla } from './useTabla'

export function useConfig() {
  const lista = useTabla<ConfigTotem>(TABLAS.config)
  const config = useMemo<ConfigTotem>(() => ({ ...CONFIG_DEFECTO, ...(lista.data[0] ?? {}) }), [lista.data])

  /**
   * Guarda y verifica: si el Apps Script publicado es más viejo que el panel, ignora en silencio los ajustes
   * nuevos y el panel los mostraría con su valor por defecto. Aquí se detecta y se avisa con claridad.
   */
  async function guardar(c: Partial<ConfigTotem>) {
    const r = await ejecutar('saveConfig', { config: c }, 'No se pudo guardar la configuración.')
    if (r.error) return r
    try {
      const resp = await callApi<{ config: Partial<ConfigTotem>[] }>('getConfig', conCredenciales())
      const guardada = resp.config?.[0] ?? {}
      const faltan = Object.keys(c).filter((k) => !(k in guardada))
      if (faltan.length) {
        return {
          error: `Tu Apps Script está desactualizado y no reconoce: ${faltan.join(', ')}. Pega el Code.gs nuevo y publica una nueva versión (Implementar → Administrar implementaciones → editar → Nueva versión).`,
        }
      }
    } catch {
      // Si la verificación falla, el guardado ya se hizo: no se reporta como error.
    }
    return r
  }

  return { config, loading: lista.loading, error: lista.error, refetch: lista.refetch, guardar }
}
