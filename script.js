const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map;
let markers = [];
let eventsData = []; // Alle geladenen Events zwischenspeichern

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await loadEvents();

  // Session prüfen und UI ggf. anpassen
  const { data: { session } } = await supabase.auth.getSession();
  updateAuthUI(session);

  // Eventlistener für Filter
  document.getElementById('categoryFilter').addEventListener('change', filterEvents);
  document.getElementById('cityFilter').addEventListener('change', filterEvents);
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  const bounds = L.latLngBounds(L.latLng(47.5, 7.5), L.latLng(49.0, 9.5));
  map.setMaxBounds(bounds);
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Fehler beim Laden:', error);
    return;
  }
  eventsData = data;
  updateCityFilterOptions();
  displayEvents(eventsData);
}

function updateCityFilterOptions() {
  const cityFilter = document.getElementById('cityFilter');
  // Alle eindeutigen Orte extrahieren
  const cities = [...new Set(eventsData.map(ev => ev.ort).filter(Boolean))].sort();

  cityFilter.innerHTML = '<option value="Alle">Alle</option>';
  cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    cityFilter.appendChild(option);
  });
}

function displayEvents(events) {
  // Marker entfernen
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  // Liste leeren
  const eventList = document.getElementById('eventList');
  eventList.innerHTML = '';

  events.forEach(ev => {
    // Liste befüllen
    const li = document.createElement('li');
    li.innerHTML = `<strong>${ev.titel}</strong> (${ev.kategorie})<br>${ev.beschreibung}<br><em>${ev.ort || ''}</em>`;
    eventList.appendChild(li);

    // Marker setzen
    if (ev.lat && ev.lng) {
      const marker = L.marker([ev.lat, ev.lng])
        .addTo(map)
        .bindPopup(`<strong>${ev.titel}</strong><br>${ev.beschreibung}<br><em>${ev.ort || ''}</em>`);
      markers.push(marker);
    }
  });
}

function filterEvents() {
  const category = document.getElementById('categoryFilter').value;
  const city = document.getElementById('cityFilter').value;

  let filtered = eventsData;

  if (category !== 'Alle') {
    filtered = filtered.filter(ev => ev.kategorie
