const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const supabase = supabase.createClient(
  'https://bddofzmczzoiyausrdzb.supabase.co',
  'eyJhbGciOiJIUz...<dein Schlüssel hier>...'
);

let map;
let markers = [];
let currentCoords = null;

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await loadEvents();
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  map.setMaxBounds(L.latLngBounds([47.5, 7.5], [49.0, 9.5]));
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

async function filterEvents() {
  const ort = document.getElementById('locationFilter').value.toLowerCase();
  const kategorie = document.getElementById('categoryFilter').value;
  const dist = parseFloat(document.getElementById('distanceFilter').value);

  const { data, error } = await supabase.from('events').select('*');
  if (error) return console.error(error);

  let filtered = data;

  if (ort) {
    filtered = filtered.filter(e => e.ort?.toLowerCase().includes(ort));
  }

  if (kategorie) {
    filtered = filtered.filter(e => e.kategorie === kategorie);
  }

  if (dist && currentCoords) {
    filtered = filtered.filter(e => {
      if (!e.lat || !e.lng) return false;
      const d = getDistanceFromLatLonInKm(currentCoords.lat, currentCoords.lng, e.lat, e.lng);
      return d <= dist;
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
  if (user) {
    document.getElementById('addEventModal').classList.remove('hidden');
  } else {
    document.getElementById('authModal').classList.remove('hidden');
  }
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

function closeAddEventModal() {
  document.getElementById('addEventModal').classList.add('hidden');
}

function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  supabase.auth.signInWithPassword({ email, password }).then(({ error }) => {
    if (error) alert("Login fehlgeschlagen");
    else {
      alert("Login erfolgreich!");
      closeAuthModal();
      document.getElement
