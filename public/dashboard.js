let allAppointments = [];

const servicePrices = {
  'Corte de Cabello': 20,
  'Corte Clasico & Peinado': 20,
  'Corte y Barba': 15,
  'Ritual de Barba Tradicional': 15,
  'Experiencia Elite': 30
};

async function cargarCitasDashboard() {
  const tableBody = document.getElementById('appointments-list');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/appointments?t=' + new Date().getTime());
    allAppointments = await res.json();

    calcularMetricas(allAppointments);
    filtrarCitas();

  } catch (err) {
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#ef4444; padding: 20px;">Error al conectar con la base de datos.</td></tr>';
    }
  }
}

function calcularMetricas(citas) {
  // Total Citas
  document.getElementById('metric-total').textContent = citas.length;

  // Citas de Hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const citasHoy = citas.filter(c => c.date === todayStr);
  document.getElementById('metric-today').textContent = citasHoy.length;

  // Ingresos Estimados
  let totalRevenue = 0;
  const barberCounts = {};
  const serviceCounts = {};

  citas.forEach(cita => {
    const price = servicePrices[cita.service] || 20;
    totalRevenue += price;

    if (cita.barber) {
      barberCounts[cita.barber] = (barberCounts[cita.barber] || 0) + 1;
    }

    if (cita.service) {
      serviceCounts[cita.service] = (serviceCounts[cita.service] || 0) + 1;
    }
  });

  document.getElementById('metric-revenue').textContent = `$${totalRevenue.toFixed(2)}`;

  // Barbero Top
  const topBarber = Object.keys(barberCounts).reduce((a, b) => barberCounts[a] > barberCounts[b] ? a : b, '-');
  document.getElementById('metric-barber').textContent = topBarber !== '-' ? topBarber : 'N/A';

  // Servicio Top
  const topService = Object.keys(serviceCounts).reduce((a, b) => serviceCounts[a] > serviceCounts[b] ? a : b, '-');
  document.getElementById('metric-service').textContent = topService !== '-' ? topService : 'N/A';
}

function renderizarTabla(citas) {
  const tableBody = document.getElementById('appointments-list');

  if (!citas || citas.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888; padding: 25px;">No se encontraron citas con los filtros aplicados.</td></tr>';
    return;
  }

  tableBody.innerHTML = citas.map(app => `
    <tr>
      <td class="time-col">${app.date || 'N/A'}<br><span style="color:#c5a059;">${app.time || ''} hs</span></td>
      <td>
        <span class="client-name">${app.client_name || 'Sin nombre'}</span><br>
        <span class="client-email">${app.client_email || ''}</span>
      </td>
      <td>${app.client_phone || 'Sin teléfono'}</td>
      <td>${app.barber || 'Cualquiera'}</td>
      <td><span class="badge-service">${app.service || 'Servicio Estándar'}</span></td>
      <td>
        <button class="btn-action btn-cancel" onclick="cancelarCita(${app.id})">Cancelar</button>
      </td>
    </tr>
  `).join('');
}

function filtrarCitas() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const barberFilter = document.getElementById('filter-barber').value;
  const dateFilter = document.getElementById('filter-date').value;

  const filtradas = allAppointments.filter(app => {
    const coincideNombre = (app.client_name || '').toLowerCase().includes(query) || (app.client_phone || '').includes(query);
    const coincideBarbero = barberFilter === '' || app.barber === barberFilter;
    const coincideFecha = dateFilter === '' || app.date === dateFilter;

    return coincideNombre && coincideBarbero && coincideFecha;
  });

  renderizarTabla(filtradas);
}

function limpiarFiltros() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-barber').value = '';
  document.getElementById('filter-date').value = '';
  filtrarCitas();
}

async function cancelarCita(id) {
  if (!confirm('¿Deseas cancelar esta cita?')) return;
  try {
    const res = await fetch(`/api/admin/cancel/${id}`, { method: 'DELETE' });
    if (res.ok) cargarCitasDashboard();
  } catch (err) {
    alert('Error al cancelar la cita.');
  }
}

document.addEventListener('DOMContentLoaded', cargarCitasDashboard);