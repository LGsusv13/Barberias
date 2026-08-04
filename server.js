const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { google } = require('googleapis');
const { Resend } = require('resend');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Servimos SOLO la carpeta public (nunca la raíz, que contiene .env, server.js, etc.)
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// El panel de administración vive en una carpeta APARTE que NO se sirve como
// estática, así nadie puede llegar a él escribiendo la URL del archivo directamente
// (antes /dashboard.html se veía sin pedir usuario/clave porque estaba en public/).
const PRIVATE_DIR = path.join(__dirname, 'private');

// 1. Almacenamiento de citas en un archivo JSON.
// Se usa esto (en vez de sqlite3) porque el paquete sqlite3 necesita compilar
// código nativo en C, y en Render la imagen donde se compila no siempre coincide
// con la imagen donde se ejecuta, causando errores de "GLIBC_2.38 not found"
// que no se pueden arreglar con configuración. Un archivo JSON es JavaScript
// puro: nunca tiene ese problema.
//
// IMPORTANTE: el disco de Render (plan gratuito) es efímero — el archivo se
// borra en cada nuevo deploy. Para conservar las citas de forma permanente entre
// deploys, hay que agregar un "Persistent Disk" en Render (tiene costo) o migrar
// a una base de datos administrada como Render Postgres (tiene un plan gratis).
const DB_FILE = path.join(__dirname, 'appointments.json');

function leerCitas() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error leyendo appointments.json:', err.message);
    return [];
  }
}

function guardarCitas(citas) {
  fs.writeFileSync(DB_FILE, JSON.stringify(citas, null, 2), 'utf-8');
}

console.log('>>> Almacenamiento de citas (JSON) listo.');

// 2. Configuración de Google Calendar API con Cuenta de Servicio
// En Render no se puede subir credentials.json como archivo persistente, así que
// soportamos dos formas: variable de entorno GOOGLE_CREDENTIALS_JSON (recomendado
// para producción/Render) o archivo local credentials.json (para desarrollo local).
let googleAuthConfig = { scopes: ['https://www.googleapis.com/auth/calendar'] };

if (process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    googleAuthConfig.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    console.log('>>> Credenciales de Google cargadas desde variable de entorno.');
  } catch (e) {
    console.error('❌ GOOGLE_CREDENTIALS_JSON no es un JSON válido:', e.message);
  }
} else {
  // Render monta los "Secret Files" en /etc/secrets/<nombre>. Si existe ahí, se
  // usa esa ruta; si no, se busca credentials.json en la raíz del proyecto
  // (para desarrollo local).
  const secretFilePath = '/etc/secrets/credentials.json';
  if (require('fs').existsSync(secretFilePath)) {
    googleAuthConfig.keyFile = secretFilePath;
    console.log('>>> Credenciales de Google cargadas desde Secret File de Render.');
  } else {
    googleAuthConfig.keyFile = 'credentials.json';
    console.log('>>> Usando credentials.json local (modo desarrollo).');
  }
}

const auth = new google.auth.GoogleAuth(googleAuthConfig);
const calendar = google.calendar({ version: 'v3', auth });

// 3. Configuración del servicio de correo con Resend.
// Se usa una API HTTPS (no SMTP) porque Render bloquea las conexiones SMTP
// salientes (puertos 465/587), causando "Connection timeout" sin importar la
// configuración. Resend usa el puerto 443 (HTTPS), como cualquier página web
// normal, así que nunca queda bloqueado.
const resend = new Resend(process.env.RESEND_API_KEY);

// Mientras no verifiques tu propio dominio en resend.com, solo puedes enviar
// desde esta dirección de prueba. Una vez verifiques tu dominio, cambia
// FROM_EMAIL en el .env a algo como "citas@tudominio.com".
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

async function enviarCorreo({ to, subject, html }) {
  const { error } = await resend.emails.send({
    from: `Barbería & Peluquería Elite <${FROM_EMAIL}>`,
    to: to.filter(Boolean),
    subject,
    html,
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
}

// Notificación al barbero por Telegram: vía HTTPS (nunca bloqueado en Render),
// gratis, sin necesitar dominio verificado ni aprobación de nadie.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function notificarBarberoPorTelegram(texto) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en las variables de entorno.');
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: texto,
      parse_mode: 'HTML',
    }),
  });

  const data = await respuesta.json();
  if (!data.ok) {
    throw new Error(`Telegram respondió con error: ${data.description || JSON.stringify(data)}`);
  }
}

// 4. Autenticación básica para proteger el panel de administración.
// Definir ADMIN_USER y ADMIN_PASSWORD en el .env (nunca en el código).
function requireAdminAuth(req, res, next) {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    console.warn('⚠️ ADMIN_USER/ADMIN_PASSWORD no configurados: el panel admin queda SIN PROTECCIÓN.');
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Panel Administrador"');
    return res.status(401).send('Autenticación requerida.');
  }

  const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  if (user === adminUser && pass === adminPass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Panel Administrador"');
  return res.status(401).send('Credenciales inválidas.');
}

// 5. Ruta GET para consultar los horarios reservados
app.get('/api/booked-slots', async (req, res) => {
  const { date, barber } = req.query;
  if (!date) return res.status(400).json({ error: 'Falta la fecha.' });

  try {
    const citas = leerCitas();
    let bookedTimes = citas
      .filter(c => c.date === date && (!barber || barber === 'Cualquiera' || barber.trim() === '' || c.barber === barber))
      .map(c => c.time);

    const calendarId = process.env.CALENDAR_ID;
    if (calendarId) {
      try {
        const timeMin = new Date(`${date}T00:00:00`).toISOString();
        const timeMax = new Date(`${date}T23:59:59`).toISOString();

        const freeBusyCheck = await calendar.freebusy.query({
          requestBody: { timeMin, timeMax, items: [{ id: calendarId }] },
        });

        const busySlots = freeBusyCheck.data.calendars[calendarId].busy || [];
        busySlots.forEach(busy => {
          const horaStr = new Date(busy.start).toTimeString().substring(0, 5);
          if (!bookedTimes.includes(horaStr)) bookedTimes.push(horaStr);
        });
      } catch (calErr) {
        console.warn('⚠️ Error Calendar:', calErr.message);
      }
    }

    res.json({ bookedSlots: bookedTimes });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar horarios reservados.' });
  }
});

// 6. Ruta principal para agendar citas
app.post('/api/agendar', async (req, res) => {
  const { name, email, service, date, time, barber, clientPhone } = req.body;

  if (!name || !email || !service || !date || !time) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para la reserva.' });
  }

  // Validar que la fecha/hora no sea en el pasado
  const requestedDateTime = new Date(`${date}T${time}:00`);
  if (isNaN(requestedDateTime.getTime())) {
    return res.status(400).json({ error: 'Fecha u hora inválida.' });
  }
  if (requestedDateTime.getTime() < Date.now()) {
    return res.status(400).json({ error: 'No se puede reservar una fecha u hora que ya pasó.' });
  }

  const emailFinal = email || 'No especificado';
  const barberName = (barber === 'Cualquiera' || !barber) ? 'Carlos Silva' : barber;
  const calendarId = process.env.CALENDAR_ID;
  const timeZone = process.env.TIMEZONE || 'America/Guayaquil';

  try {
    // Verificar que el horario no esté ya ocupado (evita doble reserva por carrera)
    const citas = leerCitas();
    const yaOcupado = citas.some(c => c.date === date && c.time === time && c.barber === barberName);

    if (yaOcupado) {
      return res.status(409).json({ error: 'Ese horario ya fue reservado. Por favor elige otro.' });
    }

    if (calendarId) {
      try {
        const startString = `${date}T${time}:00`;
        const [hours, minutes] = time.split(':').map(Number);
        const totalMinutesEnd = hours * 60 + minutes + 45;
        const endHours = String(Math.floor(totalMinutesEnd / 60)).padStart(2, '0');
        const endMins = String(totalMinutesEnd % 60).padStart(2, '0');
        const endString = `${date}T${endHours}:${endMins}:00`;

        await calendar.events.insert({
          calendarId: calendarId,
          requestBody: {
            summary: `✂️ Cita: ${service} - ${name} (${barberName})`,
            description: `Cliente: ${name}\nTeléfono: ${clientPhone || 'Sin teléfono'}\nCorreo: ${emailFinal}\nServicio: ${service}\nBarbero: ${barberName}`,
            start: { dateTime: startString, timeZone: timeZone },
            end: { dateTime: endString, timeZone: timeZone },
          },
        });
      } catch (calError) {
        console.warn('⚠️ No se pudo sincronizar Calendar:', calError.message);
      }
    }

    const nuevaCita = {
      id: citas.length > 0 ? Math.max(...citas.map(c => c.id)) + 1 : 1,
      barber: barberName,
      service,
      date,
      time,
      client_name: name,
      client_phone: clientPhone || '',
      client_email: emailFinal,
      created_at: new Date().toISOString(),
    };

    citas.push(nuevaCita);
    guardarCitas(citas);

    // Respondemos al cliente INMEDIATAMENTE.
    res.json({ success: true, message: '¡Cita agendada con éxito!' });

    // Notificación al barbero por Telegram (en segundo plano).
    const mensajeTelegram =
      `✂️ <b>Nueva cita agendada</b>\n` +
      `Cliente: ${name}\n` +
      `Teléfono: ${clientPhone || 'No especificado'}\n` +
      `Servicio: ${service}\n` +
      `Barbero: ${barberName}\n` +
      `Fecha: ${date} a las ${time}`;

    notificarBarberoPorTelegram(mensajeTelegram)
      .then(() => console.log('📩 Notificación enviada al barbero por Telegram.'))
      .catch(tgErr => console.error('❌ Error notificando por Telegram:', tgErr.message));

    // El correo se envía en segundo plano, vía Resend (API/HTTPS).
    const targetBarberEmail = process.env.BARBER_EMAIL || process.env.EMAIL_USER;

    enviarCorreo({
      to: [emailFinal, targetBarberEmail],
      subject: '¡Confirmación de tu Cita!',
      html: `<p>Hola ${name}, tu cita para ${service} el ${date} a las ${time} ha sido reservada.</p>`,
    })
      .then(() => console.log('✉️ Correo enviado en segundo plano (Resend).'))
      .catch(mailErr => console.error('❌ Error enviando correo (Resend):', mailErr.message));
  } catch (err) {
    res.status(500).json({ error: 'Ocurrió un problema al procesar la cita.' });
  }
});

// 7. Dashboard: Rutas del panel de administración (PROTEGIDAS con auth básica)
app.get('/dashboard', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(PRIVATE_DIR, 'dashboard.html'));
});

// Alias por compatibilidad: /admin apunta al mismo panel (ya no hay archivo duplicado)
app.get('/admin', (req, res) => res.redirect('/dashboard'));

app.get('/api/admin/appointments', requireAdminAuth, (req, res) => {
  try {
    const citas = leerCitas().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.time < b.time ? 1 : -1;
    });
    res.json(citas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Dashboard: Cancelar cita (PROTEGIDA, y ahora verifica que sí existía)
app.delete('/api/admin/cancel/:id', requireAdminAuth, (req, res) => {
  try {
    const idBuscado = Number(req.params.id);
    const citas = leerCitas();
    const nuevasCitas = citas.filter(c => c.id !== idBuscado);

    if (nuevasCitas.length === citas.length) {
      return res.status(404).json({ error: 'La cita no existe o ya fue cancelada.' });
    }

    guardarCitas(nuevasCitas);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
