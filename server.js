const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
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

// 3. Configuración del servicio de correo con Nodemailer (con Timeouts)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000
});

// 4. Ruta GET para consultar los horarios reservados (booked-slots)
app.get('/api/booked-slots', async (req, res) => {
  const { date, barber } = req.query;
  console.log(`🔍 Consultando slots reservados para fecha: ${date}, barbero: ${barber}`);

  if (!date) {
    return res.status(400).json({ error: 'Falta la fecha.' });
  }

  try {
    let bookedTimes = [];

    // A. Buscar en la base de datos SQLite local
    await new Promise((resolve) => {
      let query = `SELECT time FROM appointments WHERE date = ?`;
      let params = [date];
      
      if (barber && barber !== 'Cualquiera' && barber.trim() !== '') {
        query += ` AND barber = ?`;
        params.push(barber);
      }

      db.all(query, params, (err, rows) => {
        if (!err && rows) {
          bookedTimes = rows.map(r => r.time);
        }
        resolve();
      });
    });

    // B. Buscar también en Google Calendar si está configurado
    const calendarId = process.env.CALENDAR_ID;
    if (calendarId) {
      try {
        const timeMin = new Date(`${date}T00:00:00`).toISOString();
        const timeMax = new Date(`${date}T23:59:59`).toISOString();

        const freeBusyCheck = await calendar.freebusy.query({
          requestBody: {
            timeMin,
            timeMax,
            items: [{ id: calendarId }],
          },
        });

        const busySlots = freeBusyCheck.data.calendars[calendarId].busy || [];
        
        busySlots.forEach(busy => {
          const startDate = new Date(busy.start);
          const horaStr = startDate.toTimeString().substring(0, 5);
          if (!bookedTimes.includes(horaStr)) {
            bookedTimes.push(horaStr);
          }
        });
      } catch (calErr) {
        console.warn('⚠️ No se pudo consultar Google Calendar para los booked-slots:', calErr.message);
      }
    }

    res.json({ bookedSlots: bookedTimes });

  } catch (err) {
    console.error('❌ Error en /api/booked-slots:', err.message);
    res.status(500).json({ error: 'Error al consultar horarios reservados.' });
  }
});

// 5. Ruta principal para agendar citas
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
        console.log('📅 Evento creado exitosamente en Google Calendar.');
      } catch (calError) {
        console.warn('⚠️ No se pudo sincronizar con Google Calendar:', calError.message);
      }
    }

    db.run(
      `INSERT INTO appointments (barber, service, date, time, client_name, client_phone, client_email) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [barberName, service, date, time, name, clientPhone || '', emailFinal],
      async function (err) {
        if (err) {
          console.error('Error en la base de datos:', err);
          return res.status(500).json({ error: 'Error al guardar la cita en la base de datos.' });
        }

        console.log(`✅ Cita guardada en BD: ${name} - ${date} @ ${time}`);

        try {
          const targetBarberEmail = process.env.BARBER_EMAIL || process.env.EMAIL_USER;

          const mailOptions = {
            from: `"Barbería & Peluquería Elite" <${process.env.EMAIL_USER}>`,
            to: [emailFinal, targetBarberEmail],
            subject: '¡Confirmación de tu Cita!',
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #0b0b0b; color: #f5f5f5; padding: 25px; border-radius: 8px;">
                <h2 style="color: #c5a059; border-bottom: 1px solid #333; padding-bottom: 10px;">¡Hola ${name}!</h2>
                <p>Tu cita se ha reservado exitosamente. Aquí tienes los detalles:</p>
                <div style="background-color: #161616; padding: 15px; border-left: 4px solid #c5a059; margin: 15px 0; border-radius: 4px;">
                  <p style="margin: 5px 0;"><strong>Servicio:</strong> ${service}</p>
                  <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
                  <p style="margin: 5px 0;"><strong>Hora:</strong> ${time} hrs</p>
                  <p style="margin: 5px 0;"><strong>Barbero:</strong> ${barberName}</p>
                </div>
                <p style="color: #888; font-size: 0.85rem;">Te esperamos a tiempo. ¡Muchas gracias por elegirnos!</p>
              </div>
            `,
          };

          await transporter.sendMail(mailOptions);
          console.log(`✉️ Correo enviado con éxito a: ${emailFinal} y ${targetBarberEmail}`);

          res.json({ success: true, message: '¡Cita agendada con éxito!' });

        } catch (mailErr) {
          console.error('❌ Error enviando correo:', mailErr.message);
          res.status(500).json({ error: 'La cita se guardó pero ocurrió un error al enviar los correos.' });
        }
      }
    );

  } catch (err) {
    console.error('❌ Error general en la ruta agendar:', err.message || err);
    res.status(500).json({ error: 'Ocurrió un problema al procesar la cita.' });
  }
});

// 6. Dashboard: Rutas del panel (ambas apuntan a admin.html dentro de la carpeta public)
app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// Ruta API para obtener las citas en el dashboard
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
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});