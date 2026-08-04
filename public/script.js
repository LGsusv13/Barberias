document.addEventListener('DOMContentLoaded', () => {
    // Menú hamburguesa (móvil)
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const navBackdrop = document.getElementById('nav-backdrop');

    function cerrarMenu() {
        navLinks.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        if (navBackdrop) navBackdrop.classList.remove('open');
    }

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            const abierto = navLinks.classList.toggle('open');
            menuToggle.classList.toggle('open', abierto);
            menuToggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
            if (navBackdrop) navBackdrop.classList.toggle('open', abierto);
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', cerrarMenu);
        });

        if (navBackdrop) {
            navBackdrop.addEventListener('click', cerrarMenu);
        }
    }

    const bookingForm = document.getElementById('bookingForm');
    
    // Pasos y Botones de Navegación
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    
    const indicator1 = document.getElementById('step-indicator-1');
    const indicator2 = document.getElementById('step-indicator-2');
    const indicator3 = document.getElementById('step-indicator-3');
    
    const btnToStep2 = document.getElementById('btn-to-step-2');
    const btnBackTo1 = document.getElementById('btn-back-to-1');
    const btnToStep3 = document.getElementById('btn-to-step-3');
    const btnBackTo2 = document.getElementById('btn-back-to-2');

    // Campos del formulario
    const barberSelect = document.getElementById('barber');
    const serviceSelect = document.getElementById('service');
    const dateInput = document.getElementById('date');
    const timeSlotsContainer = document.getElementById('time-slots');
    
    const clientNameInput = document.getElementById('clientName');
    const clientPhoneInput = document.getElementById('clientPhone');
    const clientEmailInput = document.getElementById('clientEmail');
    
    const bookingResult = document.getElementById('booking-result');
    const resultDetails = document.getElementById('result-details');

    let selectedTime = null;
    const allSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    // Control de Pasos (Wizard)
    btnToStep2.addEventListener('click', () => {
        step1.classList.remove('active-step');
        step2.classList.add('active-step');
        indicator1.classList.remove('active');
        indicator2.classList.add('active');
    });

    btnBackTo1.addEventListener('click', () => {
        step2.classList.remove('active-step');
        step1.classList.add('active-step');
        indicator2.classList.remove('active');
        indicator1.classList.add('active');
    });

    btnToStep3.addEventListener('click', () => {
        if (!selectedTime) {
            alert('Por favor selecciona un horario disponible.');
            return;
        }
        step2.classList.remove('active-step');
        step3.classList.add('active-step');
        indicator2.classList.remove('active');
        indicator3.classList.add('active');
    });

    btnBackTo2.addEventListener('click', () => {
        step3.classList.remove('active-step');
        step2.classList.add('active-step');
        indicator3.classList.remove('active');
        indicator2.classList.add('active');
    });

    // Cargar Horarios Disponibles / Ocupados (Línea 77)
    async function cargarHorariosDisponibles() {
        const date = dateInput.value;
        const barber = barberSelect.value;

        if (!date) return;

        timeSlotsContainer.innerHTML = '<p class="placeholder-text">Cargando horarios...</p>';

        try {
            const response = await fetch(`/api/booked-slots?date=${date}&barber=${encodeURIComponent(barber)}`);
            
            if (!response.ok) {
                throw new Error('Error al consultar disponibilidad en el servidor.');
            }

            const data = await response.json();
            const bookedSlots = data.bookedSlots || [];

            timeSlotsContainer.innerHTML = '';

            allSlots.forEach(slot => {
                const isBooked = bookedSlots.includes(slot);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = slot;
                btn.className = `slot-btn ${isBooked ? 'booked' : 'available'}`;
                
                if (isBooked) {
                    btn.disabled = true;
                    btn.title = 'Horario Ocupado';
                } else {
                    if (selectedTime === slot) {
                        btn.classList.add('selected');
                    }
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selectedTime = slot;
                        btnToStep3.disabled = false;
                    });
                }

                timeSlotsContainer.appendChild(btn);
            });

        } catch (error) {
            console.error('Error al cargar disponibilidad:', error);
            timeSlotsContainer.innerHTML = '<p class="placeholder-text" style="color: #ff4d4d;">Error al consultar disponibilidad.</p>';
        }
    }

    if (dateInput) {
        const hoy = new Date().toISOString().split('T')[0];
        dateInput.min = hoy;

        dateInput.addEventListener('change', () => {
            selectedTime = null;
            btnToStep3.disabled = true;
            cargarHorariosDisponibles();
        });
    }

    if (barberSelect) {
        barberSelect.addEventListener('change', () => {
            if (dateInput.value) {
                cargarHorariosDisponibles();
            }
        });
    }

    // Enviar Formulario de Reserva
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const appointmentData = {
            name: clientNameInput.value,
            email: clientEmailInput.value,
            clientPhone: clientPhoneInput.value,
            service: serviceSelect.value,
            barber: barberSelect.value,
            date: dateInput.value,
            time: selectedTime
        };

        try {
            const res = await fetch('/api/agendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });

            const result = await res.json();

            if (res.ok) {
                bookingForm.style.display = 'none';
                document.querySelector('.step-progress').style.display = 'none';
                bookingResult.classList.remove('hidden');

                resultDetails.innerHTML = `
                    <p><strong>Cliente:</strong> ${appointmentData.name}</p>
                    <p><strong>Servicio:</strong> ${appointmentData.service}</p>
                    <p><strong>Barbero:</strong> ${appointmentData.barber}</p>
                    <p><strong>Fecha:</strong> ${appointmentData.date}</p>
                    <p><strong>Hora:</strong> ${appointmentData.time}</p>
                `;
            } else if (res.status === 409) {
                alert('Ese horario acaba de ser reservado por otra persona. Por favor elige otro horario.');
                selectedTime = null;
                btnToStep3.disabled = true;
                step3.classList.remove('active-step');
                step2.classList.add('active-step');
                indicator3.classList.remove('active');
                indicator2.classList.add('active');
                cargarHorariosDisponibles();
            } else {
                alert('Error: ' + (result.error || 'No se pudo agendar la cita.'));
            }
        } catch (err) {
            console.error('Error al enviar la cita:', err);
            alert('Ocurrió un error al conectar con el servidor.');
        }
    });
});