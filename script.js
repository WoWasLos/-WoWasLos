const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let map;
let markers = [];

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await loadEvents();
  setupUI();
  await checkUser();
});

function setupUI() {
  document.getElementById('btnAddEvent').addEventListener('click', onAddEventClick);
  document.getElementById('btnFilter').addEventListener('click', filterEvents);
  document.getElementById('btnLogin').addEventListener('click', login);
  document.getElementById('btnRegister').addEventListener('click', register);
  document.getElementById('btnSubmitEvent').addEventListener('click', submitEvent);

  document.getElementById('loginClose').addEventListener('click', () => toggleModal('loginModal', true));
  document.getElementById('addEventClose').addEventListener('click', () => toggleModal('addEventModal', true));

  document.getElementById('btnLogout').addEventListener('click', logout);
}

function toggleModal(id, hide = false) {
  const el = document.getElementById(id);
  if (hide) el.classList.add('hidden');
  else el.classList.remove('hidden');
}

async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    document.getElementById('btnLogout').classList.remove('hidden');
    document.getElementById('btnAddEvent').textContent = 'Veranstaltung hinzufügen';
  } else {
    document.getElementById('btnLogout').classList.add('hidden');
    document.getElementById('btnAddEvent').textContent = 'Veranstaltung hinzufügen';
  }
}

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  map.setMaxBounds(L.latLngBounds(L.latLng(47.5, 7.5), L.latLng(49.0, 9.5)));
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) {
    console.error(error);
    return;
  }
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
        .bindPopup(`<strong>${event.titel}</strong><br>${event.beschreibung || ''}`);
      markers.push(marker);
    }
  });
}

async function filterEvents() {
  const category = document.getElementById('categoryFilter').value;
  const locationFilter = document.getElementById('locationFilter').value.trim().toLowerCase();
  const radiusKm = parseFloat(document.getElementById('radiusFilter').value);

  const { data, error } = await supabase.from('events').select('*');
  if (error) {
    console.error(error);
    return;
  }
  let filtered = data;

  if (category !== 'Alle') {
    filtered = filtered.filter(e => e.kategorie === category);
  }

  if (locationFilter) {
    filtered = filtered.filter(e => e.ort && e.ort.toLowerCase().includes(locationFilter));
  }

  if (!isNaN(radiusKm) && radiusKm > 0 && filtered.length > 0 && locationFilter) {
    // Koordinaten des Filter-Orts holen
    const coords = await getCoordinatesFromAddress(locationFilter);
    if (coords) {
      filtered = filtered.filter(e => {
        if (!e.lat || !e.lng) return false;
        const dist = distance(coords.lat, coords.lng, e.lat, e.lng);
        return dist <= radiusKm;
      });
    }
  }

  updateEventList(filtered);
}

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

async function onAddEventClick() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toggleModal('loginModal', false);
    return;
  }
  toggleModal('addEventModal', false);
}

async function submitEvent() {
  const titel = document.getElementById('eventTitle').value.trim();
  const beschreibung = document.getElementById('eventDescription').value.trim();
  const kategorie = document.getElementById('eventCategory').value;
  const adresse = document.getElementById('eventAddress').value.trim();

  if (!titel || !adresse) {
    alert("Bitte Titel und Adresse ausfüllen!");
    return;
  }

  const coords = await getCoordinatesFromAddress(adresse);
  if (!coords) {
    alert("Adresse konnte nicht gefunden werden.");
    return;
  }

  const { error } = await supabase.from('events').insert([{
    titel,
    beschreibung,
    kategorie,
    ort: adresse,
    lat: coords.lat,
    lng: coords.lng
  }]);

  if (error) {
    alert("Fehler beim Speichern: " + error.message);
    return;
  }

  alert("Veranstaltung hinzugefügt!");
  toggleModal('addEventModal', true);
  await loadEvents();
}

async function getCoordinatesFromAddress(address) {
  if (!address) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const response = await fetch(url);
    const results = await response.json();
    if (!results || results.length === 0) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

async function login() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  if (!email || !password) {
    alert("Bitte E-Mail und Passwort eingeben.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert("Login fehlgeschlagen: " + error.message);
  } else {
    alert("Erfolgreich eingeloggt!");
    toggleModal('loginModal', true);
    checkUser();
  }
}

async function register() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('



