const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let map;
let markers = [];

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await loadEvents();
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
  map.setMaxBounds(L.latLngBounds(L.latLng(47.5, 7.5), L.latLng(49.0, 9.5)));
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) return console.error(error);
  updateEventList(data);
}

function updateEventList(events) {
  const list = document.getElementById('eventList');
  list.innerHTML = '';
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  events.forEach(event => {
    const li = document.createElement('li');
    li.textContent = `${event.titel} (${event.kategorie}) - ${event.ort}`;
    list.appendChild(li);

    if (event.lat && event.lng) {
      const marker = L.marker([event.lat, event.lng])
        .addTo(map)
        .bindPopup(`<strong>${event.titel}</strong><br>${event.beschreibung}`);
      markers.push(marker);
    }
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function filterEvents() {
  const location = document.getElementById('locationFilter').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  const radius = parseFloat(document.getElementById('radiusFilter').value);

  const { data, error } = await supabase.from('events').select('*');
  if (error) return console.error(error);
  let filtered = data;

  if (category !== 'Alle') {
    filtered = filtered.filter(e => e.kategorie === category);
  }

  if (location) {
    filtered = filtered.filter(e => e.ort && e.ort.toLowerCase().includes(location));
  }

  if (radius && location) {
    const locCoords = await getCoordinatesFromAddress(location);
    if (locCoords) {
      filtered = filtered.filter(e =>
        e.lat && e.lng && haversine(locCoords.lat, locCoords.lng, e.lat, e.lng) <= radius
      );
    }
  }

  updateEventList(filtered);
}

async function handleAddEventClick() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    showAddEventForm();
  } else {
    document.getElementById('loginModal').classList.remove('hidden');
  }
}

function showAddEventForm() {
  document.getElementById('addEventModal').classList.remove('hidden');
}

function closeAddEventModal() {
  document.getElementById('addEventModal').classList.add('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

async function getCoordinatesFromAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  const results = await res.json();
  if (results.length === 0) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

async function submitEvent() {
  const titel = document.getElementById('eventTitle').value;
  const beschreibung = document.getElementById('eventDescription').value;
  const kategorie = document.getElementById('eventCategory').value;
  const adresse = document.getElementById('eventAddress').value;

  if (!titel || !adresse) return alert("Bitte alle Pflichtfelder ausfüllen.");

  const coords = await getCoordinatesFromAddress(adresse);
  if (!coords) return alert("Adresse konnte nicht gefunden werden.");

  const { error } = await supabase.from('events').insert([{
    titel,
    beschreibung,
    kategorie,
    ort: adresse,
    lat: coords.lat,
    lng: coords.lng
  }]);

  if (error) return alert("Fehler: " + error.message);

  alert("Veranstaltung hinzugefügt!");
  closeAddEventModal();
  await loadEvents();
}

function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  supabase.auth.signInWithPassword({ email, password }).then(({ error }) => {
    if (error) alert("Login fehlgeschlagen");
    else {
      alert("Eingeloggt");
      closeLoginModal();
      showAddEventForm();
    }
  });
}

function signup() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  supabase.auth.signUp({ email, password }).then(({ error }) => {
    if (error) alert("Registrierung fehlgeschlagen");
    else alert("Registrierung erfolgreich. Jetzt einloggen.");
  });
}

function scrollToEvents() {
  document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
}
