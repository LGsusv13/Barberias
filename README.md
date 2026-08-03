# Barbería Elite - Sistema de Citas

## Qué cambió respecto a la versión original

1. **Estructura de carpetas**: el frontend (`index.html`, `dashboard.html`, `script.js`, `dashboard.js`, `styles.css`) ahora vive en `/public`. El servidor solo expone esa carpeta — así nunca se sirve por accidente `server.js`, `package.json` o tu `.env`.
2. **Se eliminó `admin.html`**, que era un duplicado casi exacto de `dashboard.html`. Ahora solo existe un panel de administración (`dashboard.html` + `dashboard.js`). La ruta `/admin` sigue funcionando como redirección a `/dashboard`.
3. **El panel `/dashboard` ahora requiere usuario y contraseña** (autenticación básica HTTP), configurables con `ADMIN_USER` y `ADMIN_PASSWORD` en el `.env`. Antes cualquiera con el link veía y cancelaba citas.
4. **Credenciales de Google Calendar aptas para Render**: además del `credentials.json` local, el servidor ahora también acepta el contenido completo de ese archivo pegado en la variable `GOOGLE_CREDENTIALS_JSON` (necesario porque Render no permite subir archivos persistentes).
5. **Validaciones nuevas**: no se puede reservar una fecha/hora que ya pasó, y se verifica que el horario no se haya ocupado justo antes de guardar (evita choques de doble reserva).
6. **Diseño responsive**: se agregaron media queries para que tanto la web de reservas como el panel admin se vean bien en celular (antes no existía ninguna).
7. Se agregó el script `"start": "node server.js"` en `package.json`, que Render necesita para arrancar la app.

## Variables de entorno (`.env`)

Copia `.env.example` a `.env` y completa tus valores reales. **Nunca subas el `.env` a GitHub ni lo compartas en texto plano.**

- `EMAIL_USER` / `EMAIL_PASS`: correo Gmail y contraseña de aplicación (no tu clave normal).
- `BARBER_EMAIL`: correo del dueño/barbero que recibe copia de cada cita.
- `CALENDAR_ID` / `TIMEZONE`: tu Google Calendar y zona horaria.
- `GOOGLE_CREDENTIALS_JSON`: en Render, pega aquí el JSON completo de tu cuenta de servicio. En local, puedes dejarlo vacío si tienes el archivo `credentials.json` en la raíz.
- `ADMIN_USER` / `ADMIN_PASSWORD`: usuario y clave para entrar a `/dashboard`. **Sin esto el panel queda público**, así que configúralo antes de publicar.

## Correr en local

```bash
npm install
cp .env.example .env   # y completa tus valores
node server.js
```

Luego abre `http://localhost:3000` (reservas) y `http://localhost:3000/dashboard` (panel admin, te pedirá usuario/clave).

## Desplegar en Render

1. Sube este proyecto a un repo de GitHub (el `.env` y `credentials.json` NO se suben, ya están en `.gitignore`).
2. En Render, crea un "Web Service" apuntando a tu repo.
3. Build command: `npm install` — Start command: `npm start`.
4. En la sección de variables de entorno de Render, agrega todas las del `.env.example` con tus valores reales, incluyendo `GOOGLE_CREDENTIALS_JSON` con el JSON completo de la cuenta de servicio.
5. El dueño de la barbería puede revisar las citas del día entrando a `https://tu-app.onrender.com/dashboard` desde el celular o la computadora (le pedirá el usuario/clave configurados).

## Sobre la revisión de citas por correo

Actualmente el sistema ya envía un correo de confirmación al cliente y al barbero (`BARBER_EMAIL`) cada vez que se agenda una cita — así el dueño puede ver las citas del día directamente en su bandeja de entrada, sin necesidad de entrar al panel. El panel `/dashboard` es para una vista consolidada con filtros y cancelación.
