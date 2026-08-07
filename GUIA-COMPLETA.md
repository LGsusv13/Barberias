# Guía Completa: Cómo Replicar Este Sistema de Citas para un Cliente Nuevo

Esta guía cubre TODO el proceso de principio a fin: Visual Studio Code, GitHub, Google Cloud
(Calendar), Telegram, Resend (correo) y Render (hosting). Sigue el orden exacto.

---

## PARTE 1 — Preparar el proyecto en tu computadora

### 1.1 Instalar las herramientas (solo la primera vez)

| Herramienta | Para qué sirve | Enlace |
|---|---|---|
| Visual Studio Code | Editar el código | https://code.visualstudio.com |
| Node.js | Correr el proyecto en tu compu | https://nodejs.org (descarga la version "LTS") |
| Git | Subir el código a GitHub | https://git-scm.com/downloads |

### 1.2 Duplicar el proyecto para el cliente nuevo

1. Copia la carpeta completa del proyecto base a una carpeta nueva en tu Escritorio, con un
   nombre distinto (ej. `barberia-cliente2`).
2. Abre esa carpeta con Visual Studio Code: `Archivo > Abrir Carpeta`.
3. Abre `public/config.js` y edita: nombre del negocio, colores, logo, servicios, barberos e
   imágenes (ver `CUSTOMIZACION.md` dentro del proyecto para el detalle de cada campo).

---

## PARTE 2 — Google Cloud (para sincronizar con Google Calendar)

### 2.1 Crear el proyecto de Google Cloud

1. Entra a **https://console.cloud.google.com** con la cuenta de Google del cliente (o la tuya).
2. Arriba, clic en el selector de proyectos > **"Proyecto nuevo"**.
3. Ponle un nombre (ej. `proyecto-barberia-cliente2`) y créalo.

### 2.2 Activar la API de Google Calendar

1. Con el proyecto nuevo seleccionado, ve a **"APIs y servicios" > "Biblioteca"**
   (menú de tres líneas a la izquierda).
2. Busca **"Google Calendar API"** y dale **"Habilitar"**.

### 2.3 Crear la cuenta de servicio (las "credenciales")

1. Ve a **"APIs y servicios" > "Credenciales"**.
2. Clic en **"Crear credenciales" > "Cuenta de servicio"**.
3. Ponle un nombre (ej. `barberia-bot`), dale **"Crear y continuar"**, luego **"Listo"**
   (los permisos opcionales los puedes saltar).
4. En la lista de credenciales, haz clic en la cuenta de servicio que acabas de crear.
5. Ve a la pestaña **"Claves"** > **"Agregar clave"** > **"Crear clave nueva"** > formato
   **JSON** > **"Crear"**. Esto descarga un archivo `.json` — este es tu `credentials.json`.
6. Copia el correo de la cuenta de servicio (algo como
   `barberia-bot@proyecto-barberia-cliente2.iam.gserviceaccount.com`), lo necesitas en el
   siguiente paso.

### 2.4 Compartir el calendario del cliente con la cuenta de servicio

1. Abre **Google Calendar** con la cuenta del cliente/barbero:
   **https://calendar.google.com**
2. En el calendario que quieres usar, ve a **Configuración > Compartir con determinadas
   personas** > **Agregar personas**.
3. Pega el correo de la cuenta de servicio (paso 2.3.6) y dale permiso
   **"Realizar cambios en los eventos"**.
4. Copia el **ID del calendario** (en la misma pantalla de configuración, sección
   "Integrar calendario" — normalmente es el mismo correo de Gmail del cliente).

Guarda: el archivo `credentials.json` y el ID del calendario — los necesitas más adelante en Render.

---

## PARTE 3 — GitHub (guardar y versionar el código)

### 3.1 Crear el repositorio

1. Entra a **https://github.com/new** (con tu cuenta iniciada).
2. Ponle un nombre (ej. `barberia-cliente2`), Privado o Público, y **NO marques** ninguna
   casilla de README/.gitignore/license.
3. **"Create repository"**.

### 3.2 Subir el código desde tu computadora

Abre una terminal en Visual Studio Code (`Terminal > Nueva Terminal`) dentro de la carpeta del
proyecto, y ejecuta en orden:

```
git init
git add .
git commit -m "Primera version - Cliente nuevo"
git branch -M deploy
git remote add origin https://github.com/tu-usuario/nombre-del-repo.git
git push -u origin deploy
```
(reemplaza la URL por la real que te da GitHub al crear el repositorio)

**Para subir cambios futuros**, siempre usa:
```
git add .
git commit -m "Descripcion del cambio"
git push origin deploy
```

---

## PARTE 4 — Telegram (notificación instantánea al barbero)

1. Abre Telegram y busca **@BotFather**.
2. Envíale: `/newbot`
3. Dale un nombre al bot y un usuario que termine en "bot" (ej. `BarberiaCliente2Bot`).
4. BotFather te da un **TOKEN** — cópialo, es tu `TELEGRAM_BOT_TOKEN`.
5. Abre un chat con tu bot nuevo (búscalo por su usuario) y escríbele cualquier mensaje.
6. En tu navegador, entra a (reemplazando TU_TOKEN):
   `https://api.telegram.org/botTU_TOKEN/getUpdates`
7. Busca el número junto a `"chat":{"id":` — ese es tu `TELEGRAM_CHAT_ID`.

Más información oficial: **https://core.telegram.org/bots#how-do-i-create-a-bot**

---

## PARTE 5 — Resend (envío de correos de confirmación)

1. Entra a **https://resend.com** y crea una cuenta con el correo del negocio o el tuyo.
2. Ve a **"API Keys"** y crea una nueva. Cópiala — es tu `RESEND_API_KEY`.
3. Mientras no verifiques un dominio propio, solo puedes enviar correos a la MISMA dirección
   con la que creaste la cuenta (limitación de la cuenta gratuita/prueba).
4. Si el cliente tiene un dominio propio, ve a **"Domains" > "Add Domain"** en Resend y sigue
   las instrucciones para verificarlo (agregar registros DNS) — así podrás enviar a cualquier
   cliente real.

---

## PARTE 6 — Render (donde vive la app, público en internet)

### 6.1 Crear el servicio

1. Entra a **https://dashboard.render.com** y conecta tu cuenta de GitHub si no lo has hecho.
2. Clic en **"New +" > "Web Service"**.
3. Elige el repositorio de GitHub que creaste en la Parte 3.
4. Configura:
   - **Branch:** `deploy`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Clic en **"Create Web Service"**.

### 6.2 Configurar las variables de entorno

En el servicio, ve a la pestaña **"Environment"** y agrega estas variables una por una
(botón "Add Environment Variable"):

| Variable | Valor |
|---|---|
| `CALENDAR_ID` | El correo/ID del calendario (Parte 2.4) |
| `TIMEZONE` | `America/Guayaquil` (o la zona horaria del cliente) |
| `BARBER_EMAIL` | Correo del barbero/dueño |
| `RESEND_API_KEY` | Tu API key de Resend (Parte 5) |
| `FROM_EMAIL` | `onboarding@resend.dev` (o tu dominio verificado) |
| `TELEGRAM_BOT_TOKEN` | El token de tu bot (Parte 4) |
| `TELEGRAM_CHAT_ID` | El chat ID (Parte 4) |
| `ADMIN_USER` | Usuario para entrar al panel `/dashboard` |
| `ADMIN_PASSWORD` | Contraseña para el panel `/dashboard` |

### 6.3 Subir las credenciales de Google (Secret File)

1. En la misma pestaña **"Environment"**, busca la sección **"Secret Files"**
   (es distinta a las variables normales).
2. Clic en **"Add Secret File"**.
3. **Filename:** `credentials.json`
4. **Contenido:** pega el contenido completo del archivo `.json` que descargaste en la Parte 2.3.
5. Guarda.

### 6.4 Confirmar que todo funcione

1. Ve a la pestaña **"Logs"** y espera a que aparezca `Your service is live 🎉`.
2. Abre la URL de tu servicio (algo como `https://tu-app.onrender.com`).
3. Agenda una cita de prueba y confirma que:
   - Se guarda la cita.
   - Llega la notificación a Telegram.
   - Se sincroniza con Google Calendar.
   - (Si usas tu propio correo) llega el correo de confirmación.
4. Entra a `https://tu-app.onrender.com/dashboard` y confirma que te pida usuario/contraseña.

---

## Resumen ultra-rápido (una vez que ya sabes el proceso)

1. Duplicar carpeta → editar `config.js`.
2. Google Cloud: nuevo proyecto → habilitar Calendar API → cuenta de servicio → descargar JSON → compartir calendario.
3. GitHub: crear repo → `git init/add/commit/branch/remote/push`.
4. Telegram: `/newbot` con BotFather → token + chat ID.
5. Resend: crear cuenta → API key.
6. Render: nuevo Web Service → variables de entorno → Secret File `credentials.json` → probar.
