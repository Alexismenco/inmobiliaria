document.addEventListener('DOMContentLoaded', () => {

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

    // --- FUNCIÓN PARA ACTUALIZAR LA INFO DE LA AGENCIA ---
    function updateAgencyInfo(config) {
        const { agencyName, agencySlogan } = config;

        // 1. Actualizar el título de la página
        document.title = `${agencyName} | ${agencySlogan}`;

        // 2. Actualizar el h1 de la portada
        const mainTitle = document.getElementById('main-title');
        if (mainTitle) {
            mainTitle.textContent = agencyName;
        }

        // 3. Actualizar el nombre en el footer
        const footerAgencyName = document.getElementById('footer-agency-name');
        if (footerAgencyName) {
            footerAgencyName.textContent = agencyName;
        }
    }


    // --- CARGA DE DATOS INICIAL ---
      async function loadData() {
        try {
            // Ahora también pedimos 'config.json'
            const [configRes, propertiesRes, appointmentsRes] = await Promise.all([
                fetch('config.json'), // <--- AÑADIDO
                fetch('propiedades.json'),
                fetch('citas.json')
            ]);
            
            const configData = await configRes.json(); // <--- AÑADIDO
            propertiesData = await propertiesRes.json();
            const appointmentsData = await appointmentsRes.json();
            
            updateAgencyInfo(configData); // <--- LLAMAMOS A LA NUEVA FUNCIÓN
            renderProperties(propertiesData);
            initializeMap(propertiesData);
            initializeCalendar(appointmentsData);

        } catch (error) {
            console.error("Error al cargar los datos:", error);
            propertyListings.innerHTML = "<p>No se pudieron cargar los datos. Intente de nuevo más tarde.</p>";
        }
    }


    // --- RENDERIZAR PROPIEDADES ---
    function renderProperties(properties) {
        propertyListings.innerHTML = ''; // Limpiar antes de renderizar
        properties.forEach(prop => {
            const card = `
                <div class="property-card">
                    <img src="${prop.image}" alt="${prop.title}">
                    <div class="card-content">
                        <h3>${prop.title}</h3>
                        <p class="price">${prop.price}</p>
                        <div class="card-specs">
                            <div class="spec"> ${prop.specs.sqm} <span>Sup.</span></div>
                            <div class="spec"> ${prop.specs.bedrooms} <span>Hab.</span></div>
                            <div class="spec"> ${prop.specs.bathrooms} <span>Baños</span></div>
                        </div>
                        <button class="card-button book-visit-btn" data-id="${prop.id}" data-title="${prop.title}">Agendar Visita</button>
                    </div>
                </div>
            `;
            propertyListings.innerHTML += card;
        });
    }

// --- INICIALIZAR MAPA CON LEAFLET ---
function initializeMap(properties) {
    // Centrado en Santiago
    map = L.map('map', { attributionControl: false }).setView([-33.45694, -70.64827], 12);

    const modoOscuro = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');

    // Capa de Satélite (imagen de Esri)
    const sateliteBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    
    // Capa de etiquetas oscuras para el satélite
    const etiquetasOscuras = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        pane: 'shadowPane'
    });
    
    // Agrupamos la imagen de satélite y las etiquetas en una sola capa para el control
    const modoSatelite = L.layerGroup([sateliteBase, etiquetasOscuras]);

    // 3. CREAR EL OBJETO DE CONTROL
    const baseMaps = {
        "Modo Oscuro": modoOscuro,
        "Modo Satélite": modoSatelite
    };

    // 4. AÑADIR EL CONTROL DE CAPAS AL MAPA
    L.control.layers(baseMaps).addTo(map);

    // 5. ESTABLECER LA VISTA POR DEFECTO
    // Añadimos la capa 'modoOscuro' para que sea la que se vea al cargar la página.
    modoOscuro.addTo(map);

    // 6. AÑADIR MARCADORES (esto no cambia)
    properties.forEach(prop => {
        L.marker([prop.location.lat, prop.location.lng])
            .addTo(map)
            .bindPopup(`<b>${prop.title}</b><br>${prop.location.address}`);
    });
}

    // --- INICIALIZAR CALENDARIO CON FULLCALENDAR ---
function initializeCalendar(appointments) {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: appointments,
        selectable: true,
        selectOverlap: false,
        select: function(info) {
            // Guarda la fecha en el input
            selectedDateInput.value = info.startStr;

            // --- LÓGICA DE LA NUEVA NOTIFICACIÓN ---
            // 1. Formateamos la fecha para que se lea mejor
            const fechaFormateada = info.start.toLocaleString('es-CL', {
                dateStyle: 'full',
                timeStyle: 'short'
            });

            // 2. Mostramos el mensaje en nuestro nuevo elemento
            selectionFeedback.textContent = 'Fecha seleccionada: ' + fechaFormateada;
            selectionFeedback.classList.add('visible');

            // 3. Ocultamos el mensaje después de 4 segundos
            setTimeout(() => {
                selectionFeedback.classList.remove('visible');
            }, 4000);
        },
        businessHours: {
            daysOfWeek: [1, 2, 3, 4, 5, 6],
            startTime: '09:00',
            endTime: '18:00',
        },
        allDaySlot: false,
        slotMinTime: '09:00:00',
        slotMaxTime: '19:00:00',
    });
    calendar.render();
}

    // --- MANEJO DEL MODAL DE RESERVA ---
    function openModal(propertyId, propertyTitle) {
        propertyToBookSpan.textContent = propertyTitle;
        selectedPropertyIdInput.value = propertyId;
        bookingModal.style.display = 'block';
        // Es importante renderizar el calendario de nuevo cuando el modal se hace visible
        calendar.render(); 
    }

    function closeModal() {
        bookingModal.style.display = 'none';
        bookingForm.reset();
        formMessage.textContent = '';
    }

    // --- EVENT LISTENERS ---
    // Abrir modal al hacer clic en "Agendar Visita"
    propertyListings.addEventListener('click', (e) => {
        if (e.target.classList.contains('book-visit-btn')) {
            const propertyId = e.target.dataset.id;
            const propertyTitle = e.target.dataset.title;
            openModal(propertyId, propertyTitle);
        }
    });

    // Cerrar modal
    closeModalButton.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target == bookingModal) {
            closeModal();
        }
    });

    // --- ENVÍO DEL FORMULARIO (SIMULACIÓN DE WEBHOOK) ---
    // --- ENVÍO DEL FORMULARIO (SIMULACIÓN DE WEBHOOK) ---
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedDateInput.value) {
        formMessage.textContent = 'Por favor, selecciona una fecha y hora en el calendario.';
        formMessage.style.color = 'red';
        return;
    }

    // --- ¡NUEVO BLOQUE DE CÓDIGO! ---
    // Buscamos la información completa de la propiedad usando el ID.
    const propertyId = selectedPropertyIdInput.value;
    const property = propertiesData.find(p => p.id == propertyId);

    if (!property) {
        formMessage.textContent = 'Error: No se encontró la propiedad seleccionada.';
        formMessage.style.color = 'red';
        return;
    }
    // --- FIN DEL NUEVO BLOQUE ---

    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        date: selectedDateInput.value,
        // --- ¡NUEVOS DATOS AÑADIDOS! ---
        propertyTitle: property.title,
        propertyAddress: property.location.address,
        propertyLat: property.location.lat,
        propertyLng: property.location.lng
    };

    formMessage.textContent = 'Enviando tu solicitud...';
    formMessage.style.color = 'white';

    try {
        const webhookUrl = 'https://devwebhookn8n.zeuspro.fun/webhook/a9864dc7-df1c-45dd-b7cf-3832fb8097fb'; // ¡CAMBIA ESTA URL!

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            formMessage.textContent = '¡Visita agendada con éxito! Nos pondremos en contacto contigo pronto.';
            formMessage.style.color = 'lightgreen';
            
            calendar.addEvent({
                title: 'Ocupado',
                start: formData.date,
                allDay: false
            });

            setTimeout(closeModal, 3000);
        } else {
            throw new Error('Error en el servidor');
        }

    } catch (error) {
        console.error('Error al enviar el formulario:', error);
        formMessage.textContent = 'Hubo un error al agendar tu visita. Por favor, intenta de nuevo.';
        formMessage.style.color = 'red';
    }
});

    document.getElementById("ano-actual").innerHTML = new Date().getFullYear();

    // --- Iniciar la aplicación ---
    loadData();
});