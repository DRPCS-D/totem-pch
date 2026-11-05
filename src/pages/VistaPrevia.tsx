import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

/** El totem real (/totem) dentro de un marco vertical, escalado a 1/3 de 1080×1920. */
export default function VistaPrevia() {
  const [clave, setClave] = useState(0)
  const escala = 0.36
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Vista previa</h1>
          <p className="text-sm text-muted-foreground">Así se ve el totem (puedes tocar el botón de jugar). Los giros de prueba quedan registrados.</p>
        </div>
        <Button variant="outline" onClick={() => setClave((c) => c + 1)}><RefreshCw /> Recargar</Button>
      </div>
      <div
        className="mx-auto overflow-hidden rounded-2xl border-4 border-foreground/80 bg-black shadow-lg"
        style={{ width: 1080 * escala, height: 1920 * escala }}
      >
        <iframe
          key={clave}
          title="Vista previa del totem"
          src="/totem/"
          style={{ width: 1080, height: 1920, border: 0, transform: `scale(${escala})`, transformOrigin: '0 0' }}
        />
      </div>
    </div>
  )
}
