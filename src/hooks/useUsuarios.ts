import { callApi, conCredenciales } from '@/lib/appsScript'
import { TABLAS } from '@/lib/tablas'
import type { Rol, UsuarioApp } from '@/lib/tipos'
import { useTabla } from './useTabla'

export function useUsuarios() {
  const lista = useTabla<UsuarioApp>(TABLAS.usuarios)

  async function crear(p: { usuario: string; nombre: string; password: string; rol: Rol; activo: boolean }) {
    try {
      await callApi('createUsuario', conCredenciales({ nuevoUsuario: p.usuario, nombre: p.nombre, nuevaPassword: p.password, rol: p.rol, activo: p.activo }))
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'No se pudo crear el usuario.' }
    }
  }

  async function editar(usuario: string, p: { rol: Rol; activo: boolean; nombre: string; nuevoUsuario?: string; nuevaPassword?: string }) {
    try {
      const data = await callApi<{ usuario: string }>(
        'updateUsuario',
        conCredenciales({ targetUsuario: usuario, nuevoUsuario: p.nuevoUsuario || '', nombre: p.nombre, rol: p.rol, activo: p.activo, nuevaPassword: p.nuevaPassword || '' }),
      )
      return { error: null, usuario: data.usuario }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'No se pudo guardar el usuario.', usuario: null }
    }
  }

  async function eliminar(usuario: string) {
    try {
      await callApi('deleteUsuario', conCredenciales({ targetUsuario: usuario }))
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'No se pudo borrar el usuario.' }
    }
  }

  return { ...lista, crear, editar, eliminar }
}
