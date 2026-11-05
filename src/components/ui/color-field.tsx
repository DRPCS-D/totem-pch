import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from './field'

/** Colores de la marca a un clic. */
const MARCA = [
  { nombre: 'Celeste', hex: '#008fca' },
  { nombre: 'Magenta', hex: '#d91571' },
  { nombre: 'Azul noche', hex: '#0a021c' },
  { nombre: 'Gris', hex: '#4c5a67' },
  { nombre: 'Naranja', hex: '#f5a43b' },
  { nombre: 'Verde', hex: '#22c55e' },
  { nombre: 'Rojo', hex: '#ef4444' },
  { nombre: 'Blanco', hex: '#ffffff' },
]

const HEX = /^#[0-9a-f]{6}$/i

/** Acepta "d91571" o "#d91571" (y la forma corta "#f0a"); devuelve "#rrggbb" o null. */
function normalizar(texto: string): string | null {
  let t = texto.trim().toLowerCase()
  if (!t.startsWith('#')) t = '#' + t
  if (/^#[0-9a-f]{3}$/.test(t)) t = '#' + [...t.slice(1)].map((c) => c + c).join('')
  return HEX.test(t) ? t : null
}

/**
 * Selector de color: cuadro para ver/elegir, campo donde escribir o pegar el código (#d91571)
 * y los colores de la marca como atajos. El selector nativo del navegador muestra RGB y esconde el código.
 */
export function ColorField({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [texto, setTexto] = useState(value)
  useEffect(() => setTexto(value), [value])

  const valido = normalizar(texto) !== null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Elegir color"
          className="h-9.5 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1"
        />
        <Input
          value={texto}
          maxLength={7}
          spellCheck={false}
          placeholder="#d91571"
          aria-invalid={!valido}
          className={cn('font-mono uppercase', !valido && 'border-destructive')}
          onChange={(e) => {
            setTexto(e.target.value)
            const n = normalizar(e.target.value)
            if (n) onChange(n)
          }}
          onBlur={() => setTexto(value)}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MARCA.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={`${c.nombre} ${c.hex}`}
            aria-label={`${c.nombre} ${c.hex}`}
            onClick={() => onChange(c.hex)}
            className={cn(
              'size-6 rounded-full border border-border transition-transform hover:scale-110',
              value.toLowerCase() === c.hex && 'ring-2 ring-ring ring-offset-2 ring-offset-card',
            )}
            style={{ background: c.hex }}
          />
        ))}
      </div>
    </div>
  )
}
