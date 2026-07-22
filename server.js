const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const path = require('path'); // <-- Añadido para asegurar que encuentre el dashboard
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/calendar'],
});
const calendar = google.calendar({ version: 'v3', auth });

// 3. Configuración del servicio de correo con Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 4. Ruta GET para consultar los horarios reservados
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

// 5. Ruta principal para agendar citas (CORREGIDA PARA NO CONGELARSE)
app.post('/api/agendar', async (req, res) => {
  const { name, email, service, date, time, barber, clientPhone } = req.body;

  if (!name || !email || !service || !date || !time) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para la reserva.' });
  }

  const emailFinal = email || 'No especificado';
  const barberName = (barber === 'Cualquiera' || !barber) ? 'Carlos Silva' : barber;
  const calendarId = process.env.CALENDAR_ID;
  const timeZone = process.env.TIMEZONE || 'America/Guayaquil';

  try {
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

        // 🚀 ¡AQUÍ ESTÁ LA MAGIA! Respondemos al cliente INMEDIATAMENTE.
        res.json({ success: true, message: '¡Cita agendada con éxito!' });

        // ✉️ El correo se envía en segundo plano (sin 'await').
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

// 6. Dashboard: Rutas del panel de administración (RUTAS BLINDADAS)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/admin/appointments', (req, res) => {
  db.all(`SELECT * FROM appointments ORDER BY date DESC, time DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 7. Dashboard: Cancelar cita
app.delete('/api/admin/cancel/:id', (req, res) => {
  db.run(`DELETE FROM appointments WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));