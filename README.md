# Totem PCH

Pantalla publicitaria con ruleta de sorteos para el totem **Joog SV55L** (55", Android 14, táctil, 2160×3840 vertical), con panel de administración online.

| Parte | Dónde | Tecnología |
|---|---|---|
| Panel de administración (PWA) | `/` | React 19 + Vite + Tailwind 4 (misma interfaz y sistema de usuarios que `gestor-tareas`) |
| Pantalla del totem (PWA, kiosco) | `/totem` | HTML/JS estático (`public/totem/`), funciona sin internet con lo último descargado |
| Base de datos y API | Google Sheets + Apps Script | `apps-script/Code.gs` |
| Imágenes de anuncios | Google Drive (carpeta «Totem PCH») | subidas desde el panel |

## Cómo funciona

1. Quien administra entra al panel, cambia anuncios, premios o colores y se guarda en la hoja de Google.
2. El totem pregunta cada minuto si hubo cambios (`totemRev`, una consulta barata) y se actualiza solo.
3. El sorteo lo decide **el servidor** (acción `girar`): respeta pesos, stock y el límite de giros por teléfono, y registra al participante. El navegador del totem solo anima la ruleta.

Roles: **admin** (todo, incluye usuarios) y **editor** (anuncios, ruleta, participantes, apariencia).

## 1. Backend (Google Sheets + Apps Script)

1. Crea una hoja de cálculo nueva en Google Sheets.
2. Extensiones → Apps Script. Pega `apps-script/Code.gs`. En Configuración del proyecto activa «Mostrar el archivo appsscript.json» y pega `apps-script/appsscript.json` (incluye el permiso de Drive para las imágenes).
3. Ejecuta la función **`instalar`** y acepta los permisos. Crea las pestañas, datos de ejemplo y un usuario `ADMIN` con contraseña aleatoria (se ve en la pestaña `Usuarios`; cámbiala al entrar).
4. Implementar → Aplicación web → Ejecutar como: **Yo** · Acceso: **Cualquier usuario**. Copia la URL `/exec`.

Tras cambiar `Code.gs` hay que publicar una **nueva versión** (Implementar → Administrar implementaciones → editar → Nueva versión).

## 2. Frontend (local)

```bash
cp .env.example .env      # pega la URL /exec en VITE_APPS_SCRIPT_URL
npm install
npm run dev               # panel en http://localhost:5173 · totem en /totem/
```

Sin backend real puedes probar con el simulador en memoria: `node scripts/mock-api.mjs` y `VITE_APPS_SCRIPT_URL=http://localhost:8787` (usuario `ADMIN` / contraseña `admin`).

## 3. Despliegue (GitHub + Vercel)

```bash
git remote add origin https://github.com/DRPCS-D/totem-pch.git
git push -u origin main
```

En Vercel: importar el repositorio y definir la variable de entorno **`VITE_APPS_SCRIPT_URL`** (la URL `/exec`). Vercel detecta Vite; `vercel.json` ya enruta `/totem`.

## 4. Instalar en el totem (Android)

1. Abre Chrome en el equipo y entra a `https://TU-DOMINIO.vercel.app/totem`.
2. Menú ⋮ → «Instalar app» / «Agregar a la pantalla de inicio». Abre desde el ícono: va a pantalla completa y vertical.
3. Ajustes de Android recomendados: pantalla siempre encendida, y fijar la app (pinning) o modo kiosco para que los clientes no salgan.
4. Acceso al panel desde el totem: 5 toques seguidos sobre el logo (pide usuario y contraseña).

## Limitaciones conocidas

- **Seguridad de contraseñas**: se guardan en texto plano en la hoja y viajan en cada llamada (heredado de `gestor-tareas`; aceptable para uso interno, no reutilices contraseñas personales).
- La acción pública `girar` puede ser invocada por cualquiera que conozca la URL del backend; el límite por teléfono mitiga el abuso pero no lo impide del todo.
- Videos: solo por URL directa (.mp4). Las imágenes sí se suben a Drive.
- Un solo totem por ahora (un único conjunto de anuncios y premios).
- Cuota de Apps Script: muchos totems o consultas muy frecuentes pueden toparse con los límites diarios de cuentas gmail.com.

`prototipo/` contiene la primera versión (HTML suelto con localStorage); está ignorada por git.
