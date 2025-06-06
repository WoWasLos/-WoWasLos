// Supabase Setup
const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Leaflet Map initialisieren
const map = L.map('map').setView([48.1351, 11.582], 8); // Anfangs z.B. München zentriert

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 16,
  attribution: '© OpenStreetMap-Mitwirkende'
}).addTo(map);

let markers = [];

// Modal-Steuerung
const loginModal = document.getElementById('loginModal');
const addEventModal = document.getElementById('addEventModal');

// Öffne Login Modal
function openLoginModal() {
  loginModal.classList.remove('hidden');
}

// Schließe Login Modal
function closeLoginModal() {
  loginModal.classList.add('hidden');
}

// Öffne Event hinzufügen Modal
function openAddEventModal() {
  addEventModal.classList.remove('hidden');
}

// Schließe Event hinzufügen Modal
function closeAddEventModal() {
  addEventModal.classList.add('hidden');
}

// Button Events
function handleAddEventClick() {
  // Prüfe, ob User eingeloggt ist
  const user = supabase.auth.user();
  if (!user) {
    openLoginModal();
  } else {
    openAddEventModal();
  }
}

// Login-Funktion
async function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  const { error } = await supabase.auth.signIn({ email, password });
  if (error) {
    alert('Login fehlgeschlagen: ' + error.message);
  } else {
    alert('Login erfolgreich');
    closeLoginModal();
    openAddEventModal();
  }
}

// Registrierung
async function signup() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert('Registrierung fehlgeschlagen: ' + error.message);
  } else {
    alert('Registrierung erfolgreich. Bitte überprüfe deine E-Mails zur Bestätigung.');
    closeLoginModal();
  }
}

// Event absenden
async function submitEvent() {
  const title = document.getElementById('eventTitle').value.trim();
  const description = document.getElementById('eventDescription').value.trim();
  const category = document.getElementById('eventCategory').value;
  const address = document.getElementById('eventAddress').value.trim();

  if (!title || !address) {
    alert('Bitte Titel und Adresse ausfüllen.');
    return;
  }

  // Adresse zu Koordinaten konvertieren (Nominatim API)
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
  const data = await response.json();

  if (!data.length) {
    alert('Adresse nicht gefunden.');
    return;
  }

  const { lat, lon } = data[0];

  // Event in Supabase speichern
  const user = supabase.auth.user();
  if (!user) {
    alert('Bitte erst einloggen.');
    closeAddEventModal();
    openLoginModal();
    return;
  }

  const { error } = await supabase
    .from('events')
    .insert([
      {
        title,
        description,
        category,
        address,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        user_id: user.id,
      }
    ]);

  if (error) {
    alert('Fehler beim Speichern: ' + error.message);
  } else {
    alert('Veranstaltung hinzugefügt!');
    closeAddEventModal();
    loadEvents(); // Liste aktualisieren
  }
}

// Events aus Supabase laden und auf Karte & Liste anzeigen
async function loadEvents() {
  const { data: events, error } = await supabase.from('events').select();

  if (error) {
    alert('Fehler beim Laden der Veranstaltungen: ' + error.message);
    return;
  }

  clearMarkers();
  const eventList = document.getElementById('eventList');
  eventList.innerHTML = '';

  events.forEach(event => {
    // Marker setzen
    const marker = L.marker([event.latitude, event.longitude]).addTo(map);
    marker.bindPopup(`<b>${event.title}</b><br>${event.description}`);
    markers.push(marker);

    // Event in Liste anzeigen
    const li = document.createElement('li');
    li.textContent = `${event.title} (${event.category}) - ${event.address}`;
    li.onclick = () => {
      map.setView([event.latitude, event.longitude], 14);
      marker.openPopup();
    };
    eventList.appendChild(li);
  });
}

function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

// Filterfunktion
async function filterEvents() {
  const locationFilter = document.getElementById('locationFilter').value.trim().toLowerCase();
  const categoryFilter = document.getElementById('categoryFilter').value;
  const radiusFilter = parseFloat(document.getElementById('radiusFilter').value);

  const { data: events, error } = await supabase.from('events').select();

  if (error) {
    alert('Fehler beim Laden der Veranstaltungen: ' + error.message);
    return;
  }

  clearMarkers();
  const eventList = document.getElementById('eventList');
  eventList.innerHTML = '';

  // Funktion zum Berechnen der Entfernung in km (Haversine-Formel)
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Erdradius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Für Umkreisfilter brauchen wir den Standort (von locationFilter)
  let centerCoords = null;
  if (locationFilter) {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationFilter)}`);
    const locData = await resp.json();
    if (locData.length) {
      centerCoords = {
        lat: parseFloat(locData[0].lat),
        lon: parseFloat(locData[0].lon)
      };
      map.setView([centerCoords.lat, centerCoords.lon], 11);
    }
  }

  events.forEach(event => {
    // Filter anwenden
    if (categoryFilter !== 'Alle' && event.category !== categoryFilter) return;

    if (locationFilter) {
      // Wenn Umkreis definiert ist, Entfernung prüfen
      if (radiusFilter && centerCoords) {
        const dist = getDistance(centerCoords.lat, centerCoords.lon, event.latitude, event.longitude);
        if (dist > radiusFilter) return;
      } else {
        // Ohne Radius: Einfach Adresse als String-Filter (grob)
        if (!event.address.toLowerCase().includes(locationFilter)) return;
      }
    }

    // Marker setzen
    const marker = L.marker([event.latitude, event.longitude]).addTo(map);
    marker.bindPopup(`<b>${event.title}</b><br>${event.description}`);
    markers.push(marker);

    // Event in Liste anzeigen
    const li = document.createElement('li');
    li.textContent = `${event.title} (${event.category}) - ${event.address}`;
    li.onclick = () => {
      map.setView([event.latitude, event.longitude], 14);
      marker.openPopup();
    };
    eventList.appendChild(li);
  });

  // Wenn kein Filter gesetzt, setze Karte auf Gesamtansicht
  if (!locationFilter) {
    map.setView([48.1351, 11.582], 8);
  }
}

// "Veranstaltung finden" Button scrollt zur Sidebar
function scrollToEvents() {
  document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
}

// Beim Laden Events anzeigen
window.addEventListener('load', async () => {
  await loadEvents();
});

// Event-Listener für Modal-Schließen (close-Kreuz)
document.querySelectorAll('.close').forEach(btn => {
  btn.addEventListener('click', () => {
    closeLoginModal();
    closeAddEventModal();
  });
});
