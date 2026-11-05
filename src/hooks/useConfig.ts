import { useMemo } from 'react'
import { ejecutar } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import { CONFIG_DEFECTO, type ConfigTotem } from '@/lib/tipos'
import { useTabla } from './useTabla'

export function useConfig() {
  const lista = useTabla<ConfigTotem>(TABLAS.config)
  const config = useMemo<ConfigTotem>(() => ({ ...CONFIG_DEFECTO, ...(lista.data[0] ?? {}) }), [lista.data])
  return {
    config,
    loading: lista.loading,
    error: lista.error,
    refetch: lista.refetch,
    guardar: (c: Partial<ConfigTotem>) => ejecutar('saveConfig', { config: c }, 'No se pudo guardar la configuración.'),
  }
}
