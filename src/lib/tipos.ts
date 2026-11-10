/** Tipos del dominio (el backend es Apps Script sobre Google Sheets). */

export type Rol = 'admin' | 'editor'

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administrador',
  editor: 'Editor de contenido',
}

export type TipoAnuncio = 'texto' | 'imagen' | 'video'

export const TIPO_ANUNCIO_LABEL: Record<TipoAnuncio, string> = {
  texto: 'Tarjeta de texto',
  imagen: 'Imagen',
  video: 'Video (URL)',
}

export interface Anuncio {
  id: string
  /** Nombre interno para identificarlo en el panel (no se muestra en el totem). */
  nombre: string
  tipo: TipoAnuncio
  titulo: string
  subtitulo: string
  precio: string
  color: string
  /** URL de la imagen o del video. */
  src: string
  /** Segundos en pantalla (0 = hasta que termine el video). */
  duracion: number
  activo: boolean
  /** yyyy-MM-dd, vacío = sin límite. */
  desde: string
  hasta: string
  orden: number
}

export interface Premio {
  id: string
  etiqueta: string
  color: string
  peso: number
  /** -1 = ilimitado. */
  stock: number
  /** false = casilla sin premio ("Sigue intentando"). */
  gana: boolean
  activo: boolean
}

export interface Participante {
  id: string
  fecha: string
  nombre: string
  telefono: string
  premio: string
  gano: boolean
  entregado: boolean
}

export interface ConfigTotem {
  nombre: string
  logoText: string
  logoUrl: string
  primary: string
  accent: string
  showLogo: boolean
  showClock: boolean
  ctaText: string
  tickerEnabled: boolean
  tickerText: string
  idleSeconds: number
  videoSound: boolean
  videoVolume: number
  raffleEnabled: boolean
  raffleTitle: string
  raffleSubtitle: string
  maxSpins: number
  askName: boolean
  askPhone: boolean
  loseMessage: string
}

export const CONFIG_DEFECTO: ConfigTotem = {
  nombre: 'Patachoca',
  logoText: 'PATACHOCA',
  logoUrl: 'https://www.patachoca.com.py/assets/patachoca/images/logo.png',
  primary: '#008fca',
  accent: '#d91571',
  showLogo: true,
  showClock: true,
  ctaText: 'TOCA PARA JUGAR Y GANAR',
  tickerEnabled: true,
  tickerText: '¡Bienvenido! · Participá del sorteo y ganá premios increíbles',
  idleSeconds: 45,
  videoSound: true,
  videoVolume: 100,
  raffleEnabled: true,
  raffleTitle: '¡GIRÁ LA RULETA!',
  raffleSubtitle: 'Completá tus datos y probá tu suerte',
  maxSpins: 1,
  askName: true,
  askPhone: true,
  loseMessage: '¡Gracias por participar!',
}

export interface UsuarioApp {
  usuario: string
  nombre: string
  rol: Rol
  activo: boolean
}
