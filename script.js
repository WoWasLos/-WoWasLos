const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map;
let markers = [];

window.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadEvents();

  document.getElementById('btn-filter').addEventListener('click', filterEvents);
  document.getElementById('btn-add-event').addEventListener('click', () => {
    window.location.href = 'login.html'; // Login-Seite für Event hinzufügen
  });
  document.getElementById('btn-find-events').addEventListener('click', () => {
    document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
  });
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Begrenze auf Süddeutschland
  map.setMaxBounds(
    L.latLngBounds(L.latLng(47.5, 7.5), L.latLng(49.0, 9.5))
  );
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Fehler beim Laden der Events:', error);
    return;
  }
  updateEventList(data);
}

function updateEventList(events) {
  const list = document.getElementById('eventList');
  list.innerHTML = '';
  markers.forEach((m) => map.removeLayer(m));
  markers = [];

  events.forEach((event) => {
    const li = document.createElement('li');
    li.textContent = `${event.titel} (${event.kategorie}) - ${event.ort}`;
    li.onclick = () => {
      if (event.lat && event.lng) {
        map.setView([event.lat, event.lng], 14);
      }
    };
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
  const category = document.getElementById('categoryFilter').value;
  const locationInput = document.getElementById('locationFilter').value.trim().toLowerCase();
  const radiusInput = parseFloat(document.getElementById('radiusFilter').value);

  const { data: events, error } = await supabase.from('events').select('*');
  if (error) {
    console.error(error);
    return;
  }

  let filtered = events;

  if (category !== 'Alle') {
    filtered = filtered.filter((e) => e.kategorie === category);
  }

  if (locationInput) {
    filtered = filtered.filter(
      (e) => e.ort && e.ort.toLowerCase().includes(locationInput)
    );
  }

  // Umkreisfilter (Radius) funktioniert nur, wenn Events lat/lng haben und Ort eingegeben wurde
  if (locationInput && !isNaN(radiusInput)) {
    const coords = await geocode(locationInput);
    if (coords) {
      filtered = filtered.filter((e) => {
        if (!e.lat || !e.lng) return false;
        const dist = getDistanceFromLatLonInKm(coords.lat, coords.lon, e.lat, e.lng);
        return dist <= radiusInput;
      });
    }
  }

  updateEventList(filtered);
}

async function geocode(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.error('Geocode-Fehler:', e);
  }
  return null;
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat
