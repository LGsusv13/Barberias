const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
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

// 1. Base de datos SQLite
const db = new sqlite3.Database('./appointments.db', (err) => {
  if (err) console.error('Error al conectar con SQLite:', err);
  else console.log('>>> Base de datos SQLite lista.');
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barber TEXT,
      service TEXT,
      date TEXT,
      time TEXT,
      client_name TEXT,
      client_phone TEXT,
      client_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

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
  googleAuthConfig.keyFile = 'credentials.json';
  console.log('>>> Usando credentials.json local (modo desarrollo).');
}

const auth = new google.auth.GoogleAuth(googleAuthConfig);
const calendar = google.calendar({ version: 'v3', auth });

// 3. Configuración del servicio de correo con Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
    let bookedTimes = [];

    await new Promise((resolve) => {
      let query = `SELECT time FROM appointments WHERE date = ?`;
      let params = [date];

      if (barber && barber !== 'Cualquiera' && barber.trim() !== '') {
        query += ` AND barber = ?`;
        params.push(barber);
      }

      db.all(query, params, (err, rows) => {
        if (!err && rows) bookedTimes = rows.map(r => r.time);
        resolve();
      });
    });

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
    const yaOcupado = await new Promise((resolve) => {
      db.get(
        `SELECT id FROM appointments WHERE date = ? AND time = ? AND barber = ?`,
        [date, time, barberName],
        (err, row) => resolve(!!row)
      );
    });

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

    db.run(
      `INSERT INTO appointments (barber, service, date, time, client_name, client_phone, client_email) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [barberName, service, date, time, name, clientPhone || '', emailFinal],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Error al guardar la cita.' });
        }

        // Respondemos al cliente INMEDIATAMENTE.
        res.json({ success: true, message: '¡Cita agendada con éxito!' });

        // El correo se envía en segundo plano (sin 'await').
        const targetBarberEmail = process.env.BARBER_EMAIL || process.env.EMAIL_USER;
        const mailOptions = {
          from: `"Barbería & Peluquería Elite" <${process.env.EMAIL_USER}>`,
          to: [emailFinal, targetBarberEmail],
          subject: '¡Confirmación de tu Cita!',
          html: `<p>Hola ${name}, tu cita para ${service} el ${date} a las ${time} ha sido reservada.</p>`,
        };

        transporter.sendMail(mailOptions)
          .then(() => console.log(`✉️ Correo enviado en segundo plano.`))
          .catch(mailErr => console.error('❌ Error enviando correo (fondo):', mailErr.message));
      }
    );
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
  db.all(`SELECT * FROM appointments ORDER BY date DESC, time DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 8. Dashboard: Cancelar cita (PROTEGIDA, y ahora verifica que sí existía)
app.delete('/api/admin/cancel/:id', requireAdminAuth, (req, res) => {
  db.run(`DELETE FROM appointments WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'La cita no existe o ya fue cancelada.' });
    }
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
