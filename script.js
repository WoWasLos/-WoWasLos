const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_KEY'; // bitte ersetzen
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map, markers = [], radiusCircle;

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
  const { data, error } = await supabase.from('events').select('*');
  if (error) return console.error(error);
  displayEvents(data);
}

function showAllEvents() {
  loadEvents();
  document.getElementById('locationFilter').value = '';
  document.getElementById('radiusFilter').value = '';
  document.getElementById('categoryFilter').value = 'Alle';
  scrollToEvents();
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
      const m = L.marker([e.lat, e.lng]).addTo(map).bindPopup(popupContent);
      markers.push(m);
    }
  });
}

// ... (Rest wie zuvor: filterEvents, getDistance, getCoordinatesFromAddress)

async function submitEvent() {
  const user = await checkUser();
  if (!user) return alert('Bitte einloggen.');

  const t = document.getElementById('eventTitle').value.trim();
  const b = document.getElementById('eventDescription').value.trim();
  const c = document.getElementById('eventCategory').value;
  const addr = document.getElementById('eventAddress').value.trim();
  const time = document.getElementById('eventTime').value;
  const price = document.getElementById('eventPrice').value.trim();
  const link = document.getElementById('eventLink').value.trim();
  const file = document.getElementById('eventImage').files[0];

  if (!t || !b || !addr || !time) return alert('Pflichtfelder fehlen.');

  const coords = await getCoordinatesFromAddress(addr);
  if (!coords) return alert('Adresse nicht gefunden.');

  let flyer_url = null;
  if (file) {
    const ext = file.name.split('.').pop();
    const fn = `${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('flyer').upload(fn, file);
    if (upErr) return alert('Upload fehlgeschlagen: ' + upErr.message);
    const { data: { publicUrl } } = supabase.storage.from('flyer').getPublicUrl(fn);
    flyer_url = publicUrl;
  }

  const { error } = await supabase.from('events').insert([{
    titel: t, beschreibung: b, kategorie: c,
    adresse: addr, ort: addr,
    uhrzeit: time, ticketpreis: price, webseite: link,
    lat: coords.lat, lng: coords.lng, flyer_url
  }]);

  if (error) return alert('Fehler beim Speichern: ' + error.message);

  alert('Event hinzugefügt!');
  closeAddEventModal();
  showAllEvents(); // lädt alle Events, scrollt nach oben
}
