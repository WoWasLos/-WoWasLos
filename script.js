const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);Add commentMore actions


let map, markers = [];
let map;
let markers = [];

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
@@ -12,8 +13,10 @@ document.addEventListener("DOMContentLoaded", async () => {

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  map.setMaxBounds(L.latLngBounds([47.5, 7.5], [49.0, 9.5]));
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
  map.setMaxBounds(L.latLngBounds(L.latLng(47.5, 7.5), L.latLng(49.0, 9.5)));
}

async function loadEvents() {
@@ -32,6 +35,7 @@ function updateEventList(events) {
    const li = document.createElement('li');
    li.textContent = `${event.titel} (${event.kategorie}) - ${event.ort}`;
    list.appendChild(li);

    if (event.lat && event.lng) {
      const marker = L.marker([event.lat, event.lng])
        .addTo(map)
@@ -41,14 +45,14 @@ function updateEventList(events) {
  });
}

function getDistance(lat1, lng1, lat2, lng2) {
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@@ -59,28 +63,35 @@ async function filterEvents() {

  const { data, error } = await supabase.from('events').select('*');
  if (error) return console.error(error);

  let filtered = data;

  if (location) {
    const coords = await getCoordinatesFromAddress(location);
    if (!coords) return alert("Ort nicht gefunden");
  if (category !== 'Alle') {
    filtered = filtered.filter(e => e.kategorie === category);
  }

    filtered = filtered.filter(e => e.lat && e.lng &&
      getDistance(coords.lat, coords.lng, e.lat, e.lng) <= (radius || 999999));
  if (location) {
    filtered = filtered.filter(e => e.ort && e.ort.toLowerCase().includes(location));
  }

  if (category) {
    filtered = filtered.filter(e => e.kategorie === category);
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
  if (user) showAddEventForm();
  else document.getElementById('authModal').classList.remove('hidden');
  if (user) {
    showAddEventForm();
  } else {
    document.getElementById('loginModal').classList.remove('hidden');
  }
}

function showAddEventForm() {
@@ -91,8 +102,16 @@ function closeAddEventModal() {
  document.getElementById('addEventModal').classList.add('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
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
@@ -102,43 +121,44 @@ async function submitEvent() {
  const adresse = document.getElementById('eventAddress').value;

  if (!titel || !adresse) return alert("Bitte alle Pflichtfelder ausfüllen.");

  const coords = await getCoordinatesFromAddress(adresse);
  if (!coords) return alert("Adresse konnte nicht gefunden werden.");

  const { error } = await supabase.from('events').insert([{
    titel, beschreibung, kategorie, ort: adresse,
    lat: coords.lat, lng: coords.lng
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

async function getCoordinatesFromAddress(address) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
  const results = await response.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  supabase.auth.signInWithPassword({ email, password }).then(({ error }) => {
    if (error) alert("Login fehlgeschlagen");
    else {
      alert("Eingeloggt");
      closeAuthModal();
      closeLoginModal();
      showAddEventForm();
    }
  });
}

function signup() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  supabase.auth.signUp({ email, password }).then(({ error }) => {
    if (error) alert("Registrierung fehlgeschlagen");
    else alert("Registrierung erfolgreich. Jetzt einloggen.");
