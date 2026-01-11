document.addEventListener('DOMContentLoaded', () => {

    // --- WEBHOOKS ---
    const WEBHOOK_GET_AGENDAS = 'https://n8n.zeuspro.fun/webhook/agenda-inmobiliaria';
    const WEBHOOK_POST_AGENDA = 'https://n8n.zeuspro.fun/webhook/agenda-inmobiliaria';

    // --- ELEMENTOS DEL DOM ---
    const propertyListings = document.getElementById('property-listings');
    const bookingModal = document.getElementById('booking-modal');
    const closeModalButton = document.querySelector('.close-button');
    const bookingForm = document.getElementById('booking-form');
    const propertyToBookSpan = document.getElementById('property-to-book');
    const selectedDateInput = document.getElementById('selected-date');
    const selectedPropertyIdInput = document.getElementById('selected-property-id');
    const formMessage = document.getElementById('form-message');
    const selectionFeedback = document.getElementById('selection-feedback');

    let propertiesData = [];
    let map;
    let calendar;
    let allAppointments = []; // TODAS las citas del backend


    // --- INFO AGENCIA ---
    function updateAgencyInfo(config) {
        document.title = `${config.agencyName} | ${config.agencySlogan}`;
        document.getElementById('main-title').textContent = config.agencyName;
        document.getElementById('footer-agency-name').textContent = config.agencyName;
    }

    // --- CARGA INICIAL ---
async function loadData() {
    try {
        // 1️⃣ Cargar SIEMPRE config y propiedades
        const [configRes, propertiesRes] = await Promise.all([
            fetch('config.json'),
            fetch('propiedades.json')
        ]);

        const configData = await configRes.json();
        propertiesData = await propertiesRes.json();

        updateAgencyInfo(configData);
        renderProperties(propertiesData);
        initializeMap(propertiesData);

        // 2️⃣ Cargar agenda SIN romper la app
        let appointmentsData = [];

       try {
    const agendaRes = await fetch(WEBHOOK_GET_AGENDAS);

    if (!agendaRes.ok) {
        throw new Error('Error al obtener agenda');
    }

    appointmentsData = await agendaRes.json();

    console.log('Citas recibidas:', appointmentsData);
    console.log('Cantidad de citas:', appointmentsData.length);

} catch (agendaError) {
    console.warn('Agenda no disponible, calendario vacío', agendaError);
}

        allAppointments = Array.isArray(appointmentsData)
    ? appointmentsData
    : [];

initializeCalendar(); // SIN pasar citas


    } catch (error) {
        console.error("Error crítico:", error);
        propertyListings.innerHTML =
            "<p>Error al cargar las propiedades.</p>";
    }
}



    // --- RENDER PROPIEDADES ---
    function renderProperties(properties) {
        propertyListings.innerHTML = '';
        properties.forEach(prop => {
            propertyListings.innerHTML += `
                <div class="property-card">
                    <img src="${prop.image}" alt="${prop.title}">
                    <div class="card-content">
                        <h3>${prop.title}</h3>
                        <p class="price">${prop.price}</p>
                        <div class="card-specs">
                            <div class="spec">${prop.specs.sqm} <span>Sup.</span></div>
                            <div class="spec">${prop.specs.bedrooms} <span>Hab.</span></div>
                            <div class="spec">${prop.specs.bathrooms} <span>Baños</span></div>
                        </div>
                        <button class="card-button book-visit-btn"
                            data-id="${prop.id}"
                            data-title="${prop.title}">
                            Agendar Visita
                        </button>
                    </div>
                </div>
            `;
        });
    }

    // --- MAPA (NO SE ROMPE) ---
    function initializeMap(properties) {
        map = L.map('map', { attributionControl: false })
            .setView([-33.45694, -70.64827], 12);

        const modoOscuro = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            { maxZoom: 20 }
        ).addTo(map);

        const satelite = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            { maxZoom: 20 }
        );

        const etiquetas = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'
        );

        const modoSatelite = L.layerGroup([satelite, etiquetas]);

        L.control.layers({
            "Modo Oscuro": modoOscuro,
            "Modo Satélite": modoSatelite
        }).addTo(map);

        properties.forEach(prop => {
            L.marker([prop.location.lat, prop.location.lng])
                .addTo(map)
                .bindPopup(`<b>${prop.title}</b><br>${prop.location.address}`);
        });
    }

    // --- CALENDARIO ---
function initializeCalendar() {
    
    calendar = new FullCalendar.Calendar(
        document.getElementById('calendar'), {
            initialView: 'timeGridWeek',
            locale: 'es',
            selectable: true,
            selectOverlap: false,
            eventOverlap: false,
            businessHours: {
                daysOfWeek: [1,2,3,4,5,6],
                startTime: '09:00',
                endTime: '18:00'
            },
            allDaySlot: false,
            slotMinTime: '09:00',
            slotMaxTime: '19:00',
            select(info) {
                selectedDateInput.value = info.startStr;
                selectionFeedback.textContent =
                    'Fecha seleccionada: ' +
                    info.start.toLocaleString('es-CL');
                selectionFeedback.classList.add('visible');
                setTimeout(() =>
                    selectionFeedback.classList.remove('visible'), 4000);
            }
        }
    );
    calendar.render();
}
function addMinutes(dateStr, minutes) {
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString();
}

function getEventsForProperty(propertyTitle) {
    return allAppointments
        .filter(app =>
            app.propiedad_titulo === propertyTitle &&
            app.estado === 'agendado'
        )
        .map(app => ({
            title: 'Ocupado',
            start: app.fecha_hora,
            end: addMinutes(app.fecha_hora, 30),
            display: 'background',
            overlap: false
        }));
}


    // --- MODAL ---
function openModal(id, title) {
    propertyToBookSpan.textContent = title;
    selectedPropertyIdInput.value = id;
    bookingModal.style.display = 'block';

    // 🔥 LIMPIAR EVENTOS ANTERIORES
    calendar.removeAllEvents();

    // 🔥 CARGAR HORAS OCUPADAS DE ESTA PROPIEDAD
    const events = getEventsForProperty(title);
    events.forEach(event => calendar.addEvent(event));

    calendar.render();
}



    function closeModal() {
        bookingModal.style.display = 'none';
        bookingForm.reset();
        formMessage.textContent = '';
    }

    // --- EVENTOS ---
    propertyListings.addEventListener('click', e => {
        if (e.target.classList.contains('book-visit-btn')) {
            openModal(e.target.dataset.id, e.target.dataset.title);
        }
    });

    closeModalButton.addEventListener('click', closeModal);
    window.addEventListener('click', e => {
        if (e.target === bookingModal) closeModal();
    });

    // --- SUBMIT ---
    bookingForm.addEventListener('submit', async e => {
        e.preventDefault();

        if (!selectedDateInput.value) {
            formMessage.textContent = 'Selecciona fecha y hora.';
            formMessage.style.color = 'red';
            return;
        }

        const property = propertiesData.find(
            p => p.id == selectedPropertyIdInput.value
        );

        const payload = {
            name: bookingForm.name.value,
            email: bookingForm.email.value,
            phone: bookingForm.phone.value,
            date: selectedDateInput.value,
            propertyTitle: property.title,
            propertyAddress: property.location.address,
            propertyLat: property.location.lat,
            propertyLng: property.location.lng
        };

        formMessage.textContent = 'Agendando...';

        try {
            const res = await fetch(WEBHOOK_POST_AGENDA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Horario ocupado');
            }

            calendar.addEvent({
                title: 'Ocupado',
                start: payload.date,
                end: new Date(
                    new Date(payload.date).getTime() + 60 * 60 * 1000
                )
            });

            formMessage.textContent = '✅ Visita agendada correctamente';
            formMessage.style.color = 'lightgreen';
            setTimeout(closeModal, 2500);

        } catch (err) {
            formMessage.textContent = err.message;
            formMessage.style.color = 'red';
        }
    });

    document.getElementById('ano-actual').textContent =
        new Date().getFullYear();

    loadData();
});
