import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Anuncios from '@/pages/Anuncios'
import Apariencia from '@/pages/Apariencia'
import Inicio from '@/pages/Inicio'
import Login from '@/pages/Login'
import NoEncontrado from '@/pages/NoEncontrado'
import Participantes from '@/pages/Participantes'
import Ruleta from '@/pages/Ruleta'
import Usuarios from '@/pages/Usuarios'
import VistaPrevia from '@/pages/VistaPrevia'

/** `/login` pública; todo lo demás dentro de `AppLayout` (exige sesión). Usuarios solo para admin. */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Inicio />} />
        <Route path="anuncios" element={<Anuncios />} />
        <Route path="ruleta" element={<Ruleta />} />
        <Route path="participantes" element={<Participantes />} />
        <Route path="apariencia" element={<Apariencia />} />
        <Route path="vista-previa" element={<VistaPrevia />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  )
}
