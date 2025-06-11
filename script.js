const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map, markers = [], radiusCircle;

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadEvents();
  await checkUser();

  document.getElementById('findEventsBtn')?.addEventListener('click', () => loadEvents());
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  map.setMaxBounds(L.latLngBounds([47.5,7.5],[49.0,9.5]));
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) return console.error(error);
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
        ${e.uhrzeit ? `🕒 ${e.uhrzeit}<br>` : ''}
        ${e.ticketpreis ? `💶 ${e.ticketpreis}<br>` : ''}
        ${e.webseite ? `<a href="${e.webseite}" target="_blank">🌐 Webseite</a><br>` : ''}
        ${e.flyer_url ? `<img src="${e.flyer_url}" style="width:100px;">` : ''}
        <br><button onclick="likeEvent('${e.id}')">❤️ Like</button>
      `;
      const m = L.marker([e.lat, e.lng])
        .addTo(map)
        .bindPopup(popupContent);
      markers.push(m);
    }
  });
}

async function filterEvents() {
  const cat = document.getElementById('categoryFilter').value;
  const loc = document.getElementById('locationFilter').value.trim();
  const radius = parseFloat(document.getElementById('radiusFilter').value);

  const { data: events, error } = await supabase.from('events').select('*');
  if (error) return console.error(error);
  let filtered = events;

  if (cat !== 'Alle')
    filtered = filtered.filter(e => e.kategorie === cat);

  if (loc)
    filtered = filtered.filter(e => e.ort.toLowerCase().includes(loc.toLowerCase()));

  if (loc && radius > 0) {
    const coords = await getCoordinatesFromAddress(loc);
    if (coords) {
      if (radiusCircle) map.removeLayer(radiusCircle);
      radiusCircle = L.circle([coords.lat, coords.lng], {
        radius: radius * 1000,
        color: '#6b5531',
        fillColor: '#6b5531',
        fillOpacity: 0.1
      }).addTo(map);

      filtered = filtered.filter(e =>
        e.lat && e.lng && getDistance(coords.lat, coords.lng, e.lat, e.lng) <= radius
      );

      map.setView([coords.lat, coords.lng], 12);
    }
  } else if (radiusCircle) {
    map.removeLayer(radiusCircle);
  }

  displayEvents(filtered);
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI/180;
  const dLon = (lon2 - lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getCoordinatesFromAddress(adresse) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}`);
    const d = await res.json();
    return d[0] ? { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) } : null;
  } catch (e) { console.error(e); return null; }
}

async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  const addEventBtn = document.getElementById('addEventBtn');
  const authBtn = document.getElementById('authBtn');

  if (user) {
    addEventBtn.classList.remove('hidden');
    authBtn.textContent = 'Abmelden';
    authBtn.onclick = logout;
  } else {
    addEventBtn.classList.add('hidden');
    authBtn.textContent = 'Login / Registrieren';
    authBtn.onclick = openLoginModal;
  }

  return user;
}

async function login() {
  const email = document.getElementById('authEmail').value;
  const pw = document.getElementById('authPassword').value;
  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password: pw });
  if (error) return alert('Login fehlgeschlagen: ' + error.message);
  alert('Login erfolgreich!');
  closeLoginModal();
  await checkUser();
  await loadEvents();
}

async function signup() {
  const email = document.getElementById('authEmail').value;
  const pw = document.getElementById('authPassword').value;
  const { data: { user }, error } = await supabase.auth.signUp({ email, password: pw });
  if (error) return alert('Registrierung fehlgeschlagen: ' + error.message);
  alert('Registrierung erfolgreich! Bitte E‑Mail verifizieren.');
  closeLoginModal();
  await checkUser();
}

async function logout() {
  await supabase.auth.signOut();
  alert('Du wurdest abgemeldet.');
  await checkUser();
  await loadEvents();
}

async function likeEvent(eventId) {
  const user = await checkUser();
  if (!user) return alert('Bitte einloggen, um zu liken.');

  const { data: existing, error: selErr } = await supabase
    .from('likes')
    .select('*')
    .eq('user_id', user.id)
    .eq('event_id', eventId);

  if (selErr) return alert('Fehler beim Prüfen: ' + selErr.message);
  if (existing.length > 0) return alert('Du hast dieses Event bereits geliked.');

  const { error } = await supabase.from('likes').insert({ user_id: user.id, event_id: eventId });
  if (error) return alert('Fehler beim Liken: ' + error.message);
  alert('Event geliked!');
}

async function showFavorites() {
  const user = await checkUser();
  if (!user) return alert('Einloggen erforderlich.');

  const { data: likes, error: likesErr } = await supabase
    .from('likes')
    .select('event_id')
    .eq('user_id', user.id);

  if (likesErr) return alert('Fehler beim Abruf: ' + likesErr.message);

  const eventIds = likes.map(l => l.event_id);
  if (eventIds.length === 0) return alert('Du hast noch keine Favoriten.');

  const { data: events, error: eventsErr } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds);

  if (eventsErr) return alert('Fehler beim Abruf der Events: ' + eventsErr.message);

  displayEvents(events);
}

function openLoginModal() {
  document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
}
