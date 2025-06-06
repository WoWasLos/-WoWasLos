const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elemente
const loginBtn = document.getElementById('loginBtn');
const showAddEventBtn = document.getElementById('showAddEventBtn');
const showEventsBtn = document.getElementById('showEventsBtn');

const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

const addEventModal = document.getElementById('addEventModal');
const closeAddEventModal = document.getElementById('closeAddEventModal');
const addEventSubmitBtn = document.getElementById('addEventSubmitBtn');
const eventNameInput = document.getElementById('eventNameInput');
const eventOrtInput = document.getElementById('eventOrtInput');
const eventKategorieInput = document.getElementById('eventKategorieInput');
const addEventError = document.getElementById('addEventError');

const filterOrt = document.getElementById('filterOrt');
const filterKategorie = document.getElementById('filterKategorie');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const eventList = document.getElementById('eventList');

// Leaflet Map initialisieren
const map = L.map('map').setView([48.7758, 9.1829], 10); // Stuttgart als Beispiel

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 16,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let markers = [];

// Hilfsfunktion: Marker entfernen
function clearMarkers() {
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];
}

// Events laden und auf Karte + Liste anzeigen
async function loadEvents(filter = {}) {
  clearMarkers();
  eventList.innerHTML = '';

  let query = supabase.from('events').select();

  if (filter.ort) {
    query = query.ilike('ort', `%${filter.ort}%`);
  }

  if (filter.kategorie && filter.kategorie.length > 0) {
    query = query.in('kategorie', filter.kategorie);
  }

  const { data, error } = await query;

  if (error) {
    alert('Fehler beim Laden der Veranstaltungen: ' + error.message);
    return;
  }

  if (!data || data.length === 0) {
    eventList.innerHTML = '<li>Keine Veranstaltungen gefunden.</li>';
    return;
  }

  for (const event of data) {
    // Marker setzen
    if (event.latitude && event.longitude) {
      const marker = L.marker([event.latitude, event.longitude])
        .addTo(map)
        .bindPopup(
          `<b>${event.name}</b><br>${event.ort}<br>Kategorie: ${event.kategorie}`
        );
      markers.push(marker);
    }

    // Liste befüllen
    const li = document.createElement('li');
    li.textContent = `${event.name} — ${event.ort} — ${event.kategorie}`;
    eventList.appendChild(li);
  }

  if (markers.length > 0) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.5));
  }
}

// Modal Steuerung
function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

// Login
loginBtn.addEventListener('click', () => openModal(loginModal));
closeLoginModal.addEventListener('click', () => closeModal(loginModal));

loginSubmitBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    loginError.textContent = 'Bitte E-Mail und Passwort eingeben.';
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginError.textContent = 'Login fehlgeschlagen: ' + error.message;
    return;
  }

  // Login erfolgreich
  closeModal(loginModal);
  loginBtn.textContent = 'Logout';
  showAddEventBtn.disabled = false;

  // Event hinzufügen Button zeigt Modal
  showAddEventBtn.addEventListener('click', () => openModal(addEventModal));
});

// Add Event Modal Steuerung
closeAddEventModal.addEventListener('click', () => closeModal(addEventModal));

addEventSubmitBtn.addEventListener('click', async () => {
  addEventError.textContent = '';
  const name = eventNameInput.value.trim();
  const ort = eventOrtInput.value.trim();
  const kategorie = eventKategorieInput.value;

  if (!name || !ort || !kategorie) {
    addEventError.textContent = 'Bitte alle Felder ausfüllen.';
    return;
  }

  // Adresse in Koordinaten umwandeln (Nominatim API)
  const coords = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      ort
    )}`
  )
    .then((res) => res.json())
    .catch(() => []);

  if (!coords || coords.length === 0) {
    addEventError.textContent = 'Ort konnte nicht gefunden werden.';
    return;
  }

  const latitude = parseFloat(coords[0].lat);
  const longitude = parseFloat(coords[0].lon);

  // Event in Supabase einfügen
  const { error } = await supabase.from('events').insert([
    {
      name,
      ort,
      kategorie,
      latitude,
      longitude,
    },
  ]);

  if (error) {
    addEventError.textContent = 'Fehler beim Speichern: ' + error.message;
    return;
  }

  // Event hinzugefügt, Modal schließen, Felder leeren, Events neu laden
  closeModal(addEventModal);
  eventNameInput.value = '';
  eventOrtInput.value = '';
  eventKategorieInput.value = 'Musik';
  loadEvents();
});

// Filter Button
applyFilterBtn.addEventListener('click', () => {
  const ort = filterOrt.value.trim();
  const kategorie = Array.from(filterKategorie.selectedOptions).map(
    (opt) => opt.value
  );

  loadEvents({ ort, kategorie });
});

// Veranstaltungen anzeigen Button lädt alle Events (ohne Filter)
showEventsBtn.addEventListener('click', () => {
  filterOrt.value = '';
  Array.from(filterKategorie.options).forEach((opt) => (opt.selected = false));
  loadEvents();
});

// Initial Events laden
loadEvents();
