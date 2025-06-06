const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';Add commentMore actions
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const supabase = supabase.createClient(
  'https://bddofzmczzoiyausrdzb.supabase.co',
  'eyJhbGciOiJIUz...<dein Schlüssel hier>...'
);

let map;
let markers = [];
let currentCoords = null;

document.addEventListener("DOMContentLoaded", async () => {
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadEvents();
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  map.setMaxBounds(L.latLngBounds([47.5, 7.5], [49.0, 9.5]));
  map.setMaxBounds(L.latLngBounds(L.latLng(47.5, 7.5), L.latLng(49.0, 9.5)));
}

async function loadEvents() {
@@ -41,7 +35,6 @@ function updateEventList(events) {
    const li = document.createElement('li');
    li.textContent = `${event.titel} (${event.kategorie}) - ${event.ort}`;
    list.appendChild(li);

    if (event.lat && event.lng) {
      const marker = L.marker([event.lat, event.lng])
        .addTo(map)
@@ -54,76 +47,122 @@ function updateEventList(events) {
async function filterEvents() {
  const ort = document.getElementById('locationFilter').value.toLowerCase();
  const kategorie = document.getElementById('categoryFilter').value;
  const dist = parseFloat(document.getElementById('distanceFilter').value);
  const umkreis = parseInt(document.getElementById('radiusFilter').value);

  const { data, error } = await supabase.from('events').select('*');
  if (error) return console.error(error);

  let filtered = data;

  if (ort) {
    filtered = filtered.filter(e => e.ort?.toLowerCase().includes(ort));
  if (kategorie !== 'Alle') {
    filtered = filtered.filter(e => e.kategorie === kategorie);
  }

  if (kategorie) {
    filtered = filtered.filter(e => e.kategorie === kategorie);
  if (ort) {
    filtered = filtered.filter(e => e.ort && e.ort.toLowerCase().includes(ort));
  }

  if (dist && currentCoords) {
  if (ort && umkreis && !isNaN(umkreis)) {
    const coords = await getCoordinatesFromAddress(ort);
    if (!coords) return alert("Ort nicht gefunden");
    filtered = filtered.filter(e => {
      if (!e.lat || !e.lng) return false;
      const d = getDistanceFromLatLonInKm(currentCoords.lat, currentCoords.lng, e.lat, e.lng);
      return d <= dist;
      const dist = calcDistance(coords.lat, coords.lng, e.lat, e.lng);
      return dist <= umkreis;
    });
  }

  updateEventList(filtered);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function scrollToEvents() {
  document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
}

async function handleAddEventClick() {
  const { data: { user } } = await supabase.auth.getUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    document.getElementById('addEventModal').classList.remove('hidden');
  } else {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('loginModal').classList.remove('hidden');
  }
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

function closeAddEventModal() {
  document.getElementById('addEventModal').classList.add('hidden');
}
function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  supabase.auth.signInWithPassword({ email, password }).then(({ error }) => {
    if (error) alert("Login fehlgeschlagen");
    if (error) alert('Login fehlgeschlagen');
    else {
      alert("Login erfolgreich!");
      closeAuthModal();
      document.getElement
      alert('Erfolgreich eingeloggt');
      closeLoginModal();
      document.getElementById('addEventModal').classList.remove('hidden');
    }
  });
}

function register() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  supabase.auth.signUp({ email, password }).then(({ error }) => {
    if (error) alert('Registrierung fehlgeschlagen');
    else alert('Registrierung erfolgreich, bitte einloggen');
  });
}

async function submitEvent() {
  const titel = document.getElementById('eventTitle').value;
  const beschreibung = document.getElementById('eventDescription').value;
  const kategorie = document.getElementById('eventCategory').value;
  const adresse = document.getElementById('eventAddress').value;

  if (!titel || !adresse) return alert('Titel und Adresse erforderlich');

  const coords = await getCoordinatesFromAddress(adresse);
  if (!coords) return alert('Adresse konnte nicht gefunden werden');

  const { error } = await supabase.from('events').insert([
    {
      titel,
      beschreibung,
      kategorie,
      ort: adresse,
      lat: coords.lat,
      lng: coords.lng,
    },
  ]);

  if (error) return alert('Fehler beim Hinzufügen: ' + error.message);

  alert('Veranstaltung hinzugefügt!');
  closeAddEventModal();
  await loadEvents();
}

async function getCoordinatesFromAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  const results = await response.json();
  if (results.length === 0) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
