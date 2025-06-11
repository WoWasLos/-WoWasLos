const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map, markers = [], radiusCircle;
let showingFavorites = false; // Flag, um zu wissen, ob Favoriten angezeigt werden

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadEvents();
  await checkUser();
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  map.setMaxBounds(L.latLngBounds([47.5,7.5],[49.0,9.5]));
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*').order('datum', { ascending: true });
  if (error) return console.error(error);
  showingFavorites = false;
  displayEvents(data);
}

function displayEvents(events) {
  const list = document.getElementById('eventList');
  list.innerHTML = '';
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  events.forEach(e => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="li-content">
        <strong>${e.titel}</strong> (${e.kategorie}) – ${e.ort}<br>
        <em>Datum: ${e.datum ? e.datum : 'kein Datum'}</em><br>
        ${e.uhrzeit ? `🕒 ${e.uhrzeit} ` : ''}
        ${e.ticketpreis ? `💶 ${e.ticketpreis} ` : ''}
        ${e.webseite ? `<a href="${e.webseite}" target="_blank" onclick="event.stopPropagation()">🌐 Webseite</a>` : ''}
      </div>
      <button class="like-btn">❤️ Like</button>
    `;
    li.addEventListener('click', () => {
      if (e.lat && e.lng) map.setView([e.lat, e.lng], 14);
    });
    li.querySelector('.like-btn').addEventListener('click', ev => {
      ev.stopPropagation();
      likeEvent(e.id);
    });

    list.appendChild(li);

    if (e.lat && e.lng) {
      const popupContent = `
        <strong>${e.titel}</strong><br>
        ${e.beschreibung}<br>
        <strong>Datum:</strong> ${e.datum ? e.datum : 'kein Datum'}<br>
        ${e.uhrzeit ? `🕒 ${e.uhrzeit}<br>` : ''}
        ${e.ticketpreis ? `💶 ${e.ticketpreis}<br>` : ''}
        ${e.webseite ? `<a href="${e.webseite}" target="_blank">🌐 Webseite</a><br>` : ''}
        ${e.flyer_url ? `<img src="${e.flyer_url}" style="width:100px;"><br>` : ''}
        <button onclick="likeEvent('${e.id}')">❤️ Like</button>
      `;
      const marker = L.marker([e.lat, e.lng]).addTo(map);
      marker.bindPopup(popupContent);
      markers.push(marker);
    }
  });
}

async function likeEvent(eventId) {
  const user = await checkUser();
  if (!user) return alert('Bitte einloggen, um Veranstaltungen zu liken.');

  // Prüfen, ob schon geliked
  const { data: existing, error: existErr } = await supabase
    .from('likes')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', user.id);
  if (existErr) return alert('Fehler: ' + existErr.message);
  if (existing.length > 0) {
    alert('Du hast diese Veranstaltung bereits als Favorit markiert.');
    return;
  }

  const { error } = await supabase.from('likes').insert([{ event_id: eventId, user_id: user.id }]);
  if (error) alert('Fehler: ' + error.message);
  else alert('Veranstaltung zu deinen Favoriten hinzugefügt!');
}

async function showFavorites() {
  const user = await checkUser();
  if (!user) return alert('Bitte einloggen.');

  document.getElementById('showAllEventsBtn').style.display = 'inline-block';

  const { data: likes, error: likesErr } = await supabase
    .from('likes')
    .select('event_id')
    .eq('user_id', user.id);

  if (likesErr) return alert('Fehler beim Abruf: ' + likesErr.message);

  const eventIds = likes.map(l => l.event_id);
  if (eventIds.length === 0) {
    alert('Du hast noch keine Favoriten.');
    document.getElementById('showAllEventsBtn').style.display = 'none';
    return;
  }

  const { data: events, error: eventsErr } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds)
    .order('datum', { ascending: true });

  if (eventsErr) return alert('Fehler beim Laden: ' + eventsErr.message);

  showingFavorites = true;
  displayEvents(events);
}

function scrollToEvents() {
  document.getElementById('sidebar').scrollIntoView({ behavior: 'smooth' });
}

// Filterfunktion
async function filterEvents() {
  if (showingFavorites) return alert('Bitte zuerst Favoritenansicht verlassen.');

  const locFilter = document.getElementById('locationFilter').value.toLowerCase();
  const catFilter = document.getElementById('categoryFilter').value;
  const radiusFilter = parseFloat(document.getElementById('radiusFilter').value);
  const dateFilter = document.getElementById('dateFilter').value;

  // Alle Events laden
  const { data: allEvents, error } = await supabase.from('events').select('*');
  if (error) return console.error(error);

  let filtered = allEvents;

  if (locFilter) {
    filtered = filtered.filter(e => e.ort && e.ort.toLowerCase().includes(locFilter));
  }

  if (catFilter && catFilter !== 'Alle') {
    filtered = filtered.filter(e => e.kategorie === catFilter);
  }

  if (dateFilter) {
    filtered = filtered.filter(e => e.datum === dateFilter);
  }

  if (!isNaN(radiusFilter) && radiusFilter > 0 && filtered.length > 0) {
    // Radiusfilter mit Standortbestimmung
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      filtered = filtered.filter(e => {
        if (!e.lat || !e.lng) return false;
        const dist = getDistanceFromLatLonInKm(latitude, longitude, e.lat, e.lng);
        return dist <= radiusFilter;
      });
      displayEvents(filtered);
    }, err => {
      alert('Geolocation konnte nicht bestimmt werden.');
      displayEvents(filtered);
    });
  } else {
    displayEvents(filtered);
  }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Erdradius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Login / Registrierung
async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    document.getElementById('authBtn').textContent = 'Logout';
    document.getElementById('authBtn').onclick = logout;
    document.getElementById('addEventBtn').classList.remove('hidden');
  } else {
    document.getElementById('authBtn').textContent = 'Login / Registrieren';
    document.getElementById('authBtn').onclick = openLoginModal;
    document.getElementById('addEventBtn').classList.add('hidden');
  }
  return user;
}

function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

async function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert('Fehler: ' + error.message);
  else {
    closeLoginModal();
    await checkUser();
  }
}

async function signup() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert('Fehler: ' + error.message);
  else alert('Registrierung erfolgreich! Bitte bestätige deine E‑Mail.');
}

async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) alert('Fehler: ' + error.message);
  else {
    await checkUser();
    await loadEvents();
  }
}

// Event hinzufügen
function handleAddEventClick() {
  document.getElementById('addEventModal').classList.remove('hidden');
}

function closeAddEventModal() {
  document.getElementById('addEventModal').classList.add('hidden');
  clearAddEventForm();
}

function clearAddEventForm() {
  document.getElementById('eventTitle').value = '';
  document.getElementById('eventDescription').value = '';
  document.getElementById('eventCategory').value = 'Konzert';
  document.getElementById('eventAddress').value = '';
  document.getElementById('eventDate').value = '';
  document.getElementById('eventTime').value = '';
  document.getElementById('eventPrice').value = '';
  document.getElementById('eventLink').value = '';
  document.getElementById('eventImage').value = '';
}

async function submitEvent() {
  const t = document.getElementById('eventTitle').value.trim();
  const b = document.getElementById('eventDescription').value.trim();
  const c = document.getElementById('eventCategory').value;
  const addr = document.getElementById('eventAddress').value.trim();
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value;
  const price = document.getElementById('eventPrice').value.trim();
  const link = document.getElementById('eventLink').value.trim();
  const imageFile = document.getElementById('eventImage').files[0];

  if (!t || !b || !addr || !time || !date) {
    return alert('Bitte alle Pflichtfelder ausfüllen, inklusive Datum.');
  }

  // Geokodierung Adresse -> Koordinaten
  const coords = await getCoordinates(addr);
  if (!coords) {
    return alert('Adresse konnte nicht gefunden werden.');
  }

  // Bild hochladen (optional)
  let flyer_url = '';
  if (imageFile) {
    const { data, error } = await supabase.storage.from('event_images').upload('flyers/' + Date.now() + '_' + imageFile.name, imageFile);
    if (error) return alert('Fehler beim Hochladen: ' + error.message);
    flyer_url = supabase.storage.from('event_images').getPublicUrl(data.path).data.publicUrl;
  }

  const { error } = await supabase.from('events').insert([
    {
      titel: t, beschreibung: b, kategorie: c,
      adresse: addr, ort: addr,
      datum: date,
      uhrzeit: time,
      ticketpreis: price,
      webseite: link,
      lat: coords.lat, lng: coords.lng,
      flyer_url
    }
  ]);
  if (error) alert('Fehler: ' + error.message);
  else {
    alert('Veranstaltung hinzugefügt!');
    closeAddEventModal();
    await loadEvents();
  }
}

async function getCoordinates(address) {
  // Hier kann eine einfache Nominatim-API oder andere Geokodierung verwendet werden
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

// Button für Zurück zur Gesamtübersicht (für Favoriten-Ansicht)
const showAllEventsBtn = document.createElement('button');
showAllEventsBtn.id = 'showAllEventsBtn';
showAllEventsBtn.textContent = 'Zurück zur Gesamtübersicht';
showAllEventsBtn.style.display = 'none';
showAllEventsBtn.style.marginTop = '10px';
showAllEventsBtn.onclick = () => {
  showAllEventsBtn.style.display = 'none';
  loadEvents();
};
document.getElementById('sidebar').insertBefore(showAllEventsBtn, document.getElementById('eventList'));

