const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let map;
let markers = [];

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadEvents();
  await checkUser();
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Begrenze Karte auf Schwarzwald-Region
  map.setMaxBounds(L.latLngBounds(L.latLng(47.5, 7.5), L.latLng(49.0, 9.5)));
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
  // Marker entfernen
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

// Filter Events nach Ort, Kategorie und Umkreis
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

  if (locationInput && !isNaN(radiusInput) && radiusInput > 0) {
    const coords = await getCoordinatesFromAddress(locationInput);
    if (coords) {
      filtered = filtered.filter((e) => {
        if (!e.lat || !e.lng) return false;
        const dist = getDistanceFromLatLonInKm(
          coords.lat,
          coords.lng,
          e.lat,
          e.lng
        );
        return dist <= radiusInput;
      });
    }
  }

  updateEventList(filtered);
}

// Entfernung in km zwischen zwei Punkten (Haversine)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Erdradius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Adresse in Koordinaten umwandeln (OpenStreetMap Nominatim API)
async function getCoordinatesFromAddress(address) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (err) {
    console.error('Fehler bei Geokodierung:', err);
  }
  return null;
}

// Login Modal anzeigen
function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

// Login Modal schließen
function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

// Add Event Modal öffnen
function openAddEventModal() {
  document.getElementById('addEventModal').classList.remove('hidden');
}

// Add Event Modal schließen
function closeAddEventModal() {
  document.getElementById('addEventModal').classList.add('hidden');
}

// Prüfen, ob User angemeldet ist
async function checkUser() {
  const user = supabase.auth.user();
  if (user) {
    console.log('Angemeldet als', user.email);
  } else {
    console.log('Nicht angemeldet');
  }
  return user;
}

// Login Funktion
async function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { user, error } = await supabase.auth.signIn({ email, password });
  if (error) {
    alert('Login fehlgeschlagen: ' + error.message);
    return;
  }
  alert('Login erfolgreich: ' + user.email);
  closeLoginModal();
  openAddEventModal();
}

// Registrierung Funktion
async function signup() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { user, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert('Registrierung fehlgeschlagen: ' + error.message);
    return;
  }
  alert('Registrierung erfolgreich. Bitte überprüfe deine E-Mails für Verifizierung.');
  closeLoginModal();
  openAddEventModal();
}

// Event hinzufügen
async function submitEvent() {
  const user = await checkUser();
  if (!user) {
    alert('Bitte zuerst anmelden.');
    closeAddEventModal();
    openLoginModal();
    return;
  }

  const titel = document.getElementById('eventTitle').value.trim();
  const beschreibung = document.getElementById('eventDescription').value.trim();
  const kategorie = document.getElementById('eventCategory').value;
  const adresse = document.getElementById('eventAddress').value.trim();

  if (!titel || !beschreibung || !adresse) {
    alert('Bitte alle Felder ausfüllen!');
    return;
  }

  const coords = await getCoordinatesFromAddress(adresse);
  if (!coords) {
    alert('Adresse konnte nicht gefunden werden.');
    return;
  }

  // Für Ort nehmen wir aus Adresse den Ortsnamen (z.B. letzter Teil nach Komma)
  let ort = adresse;
  if (adresse.includes(',')) {
    ort = adresse.split(',').pop().trim();
  }

  const { data, error } = await supabase.from('events').insert([
    {
      titel,
      beschreibung,
      kategorie,
      adresse,
      ort,
      lat: coords.lat,
      lng: coords.lng,
      user_id: user.id,
    },
  ]);

  if (error) {
    alert('Fehler beim Speichern: ' + error.message);
    return;
  }

  alert('Veranstaltung hinzugefügt!');
  closeAddEventModal();
  clearEventForm();
  await loadEvents();
}

// Formularfelder zurücksetzen
function clearEventForm() {
  document.getElementById('eventTitle').value = '';
  document.getElementById('eventDescription').value = '';
  document.getElementById('eventCategory').value = 'Konzert';
  document.getElementById('eventAddress').value = '';
}

// Wenn „Veranstaltung hinzufügen“ geklickt wird
async function handleAddEventClick() {
  const user = await checkUser();
  if (!user) {
    openLoginModal();
  } else {
    openAddEventModal();
  }
}

function scrollToEvents() {
  document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
}
 
