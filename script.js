// Supabase-Setup
const supabase = supabase.createClient('https://dein-projekt.supabase.co', 'public-anon-key');

// Karte initialisieren
const map = L.map('map').setView([48.5, 9.0], 7); // Süddeutschland
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let markers = [];

// Event laden
loadEvents();

// Login-Funktionen
async function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login fehlgeschlagen');
  closeLoginModal();
  openAddEventModal();
}

async function signup() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert('Registrierung fehlgeschlagen');
  alert('Registrierung erfolgreich. Bitte einloggen.');
}

function handleAddEventClick() {
  supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      openAddEventModal();
    } else {
      openLoginModal();
    }
  });
}

function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}
function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}
function openAddEventModal() {
  document.getElementById('addEventModal').classList.remove('hidden');
}
function closeAddEventModal() {
  document.getElementById('addEventModal').classList.add('hidden');
}

// Event hinzufügen
async function submitEvent() {
  const title = document.getElementById('eventTitle').value;
  const description = document.getElementById('eventDescription').value;
  const category = document.getElementById('eventCategory').value;
  const address = document.getElementById('eventAddress').value;

  if (!title || !address || !category) return alert('Bitte alle Pflichtfelder ausfüllen.');

  const coords = await geocodeAddress(address);
  if (!coords) return alert('Adresse nicht gefunden.');

  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from('events').insert([{
    title,
    description,
    category,
    address,
    latitude: coords.lat,
    longitude: coords.lon,
    user_id: userData.user.id
  }]);

  if (error) return alert('Fehler beim Speichern.');

  closeAddEventModal();
  loadEvents();
}

// Geocoding mit Nominatim
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (e) {
    return null;
  }
}

// Events laden
async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (error) return;

  updateEventList(data);
  updateMapMarkers(data);
}

// Liste aktualisieren
function updateEventList(events) {
  const list = document.getElementById('eventList');
  list.innerHTML = '';
  events.forEach(event => {
    const li = document.createElement('li');
    li.textContent = `${event.title} – ${event.address}`;
    list.appendChild(li);
  });
}

// Marker aktualisieren
function updateMapMarkers(events) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  events.forEach(event => {
    if (event.latitude && event.longitude) {
      const marker = L.marker([event.latitude, event.longitude])
        .addTo(map)
        .bindPopup(`<b>${event.title}</b><br>${event.address}`);
      markers.push(marker);
    }
  });
}

// Filterfunktion
async function filterEvents() {
  const location = document.getElementById('locationFilter').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const radius = parseFloat(document.getElementById('radiusFilter').value);

  let { data: events, error } = await supabase.from('events').select('*');
  if (error || !events) return;

  if (category !== 'Alle') {
    events = events.filter(e => e.category === category);
  }

  if (location) {
    const coords = await geocodeAddress(location);
    if (!coords) return alert('Ort nicht gefunden.');
    if (!isNaN(radius)) {
      events = events.filter(e => {
        const d = getDistanceFromLatLonInKm(coords.lat, coords.lon, e.latitude, e.longitude);
        return d <= radius;
      });
    }
  }

  updateEventList(events);
  updateMapMarkers(events);
}

// Hilfsfunktion zur Distanzberechnung
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Erdradius
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

