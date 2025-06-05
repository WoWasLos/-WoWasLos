const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map;
let markers = [];
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await loadEvents();
  checkUser();
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 9);
  map.setMaxBounds(L.latLngBounds(L.latLng(47.5, 7.5), L.latLng(49.0, 9.5)));

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;
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

async function handleAddEventClick() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    document.getElementById('addEventModal').classList.remove('hidden');
  } else {
    document.getElementById('authModal').classList.remove('hidden');
  }
}

function closeAddEventModal() {
  document.getElementById('addEventModal').classList.add('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
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

async function getCoordinatesFromAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  const results = await response.json();
  if (results.length === 0) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  supabase.auth.signIn
