const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
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

function displayEvents(events) {
  const list = document.getElementById('eventList');
  list.innerHTML = '';
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  events.forEach(e => {
    const li = document.createElement('li');
    li.textContent = `${e.titel} (${e.kategorie}) – ${e.ort}`;
    li.onclick = () => e.lat && e.lng && map.setView([e.lat,e.lng], 14);
    list.appendChild(li);

    if (e.lat && e.lng) {
      const m = L.marker([e.lat,e.lng])
        .addTo(map)
        .bindPopup(`<strong>${e.titel}</strong><br>${e.beschreibung}` +
          (e.flyer_url ? `<br><img src="${e.flyer_url}" style="width:100px;">`: ''));
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

  if (cat !== 'Alle') filtered = filtered.filter(e => e.kategorie === cat);
  if (loc) filtered = filtered.filter(e => e.ort?.toLowerCase().includes(loc.toLowerCase()));

  if (loc && radius > 0) {
    const coords = await getCoordinatesFromAddress(loc);
    if (coords) {
      if (radiusCircle) map.removeLayer(radiusCircle);
      radiusCircle = L.circle([coords.lat,coords.lng], {
        radius: radius * 1000,
        color: '#6b5531',
        fillColor: '#6b5531',
        fillOpacity: 0.1
      }).addTo(map);
      filtered = filtered.filter(e => {
        if (!e.lat || !e.lng) return false;
        const d = getDistance(coords.lat, coords.lng, e.lat, e.lng);
        return d <= radius;
      });
      map.setView([coords.lat,coords.lng], 12);
    }
  } else if (radiusCircle) {
    map.removeLayer(radiusCircle);
  }

  displayEvents(filtered);
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + 
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getCoordinatesFromAddress(adresse) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}`);
    const d = await res.json();
    return d[0] ? { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) } : null;
  } catch(e){ console.error(e); return null; }
}

async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function handleAddEventClick() {
  checkUser().then(user => {
    if (!user) openLoginModal();
    else openAddEventModal();
  });
}

function openLoginModal(){ document.getElementById('loginModal').classList.remove('hidden'); }
function closeLoginModal(){ document.getElementById('loginModal').classList.add('hidden'); }
function openAddEventModal(){ document.getElementById('addEventModal').classList.remove('hidden'); }
function closeAddEventModal(){ document.getElementById('addEventModal').classList.add('hidden'); }

async function login() {
  const email = document.getElementById('authEmail').value;
  const pw = document.getElementById('authPassword').value;
  const { data:{user}, error } = await supabase.auth.signInWithPassword({ email, password: pw });
  if (error) return alert('Login fehlgeschlagen: '+error.message);
  alert('Login OK! Du kannst nun ein Fest hinzufügen.');
  closeLoginModal();
  openAddEventModal();
}

async function signup() {
  const email = document.getElementById('authEmail').value;
  const pw = document.getElementById('authPassword').value;
  const { data:{user}, error } = await supabase.auth.signUp({ email, password: pw });
  if (error) return alert('Registrierung fehlgeschlagen:'+error.message);
  alert('Registrierung OK! Bitte E‑Mail verifizieren.');
  closeLoginModal();
  openAddEventModal();
}

async function submitEvent() {
  const user = await checkUser();
  if (!user) return alert('Bitte erst einloggen.');
  const t = document.getElementById('eventTitle').value.trim();
  const b = document.getElementById('eventDescription').value.trim();
  const c = document.getElementById('eventCategory').value;
  const addr = document.getElementById('eventAddress').value.trim();
  const file = document.getElementById('eventImage').files[0];
  if (!t||!b||!addr||!file) return alert('Alle Felder + Bild sind Pflicht.');

  const coords = await getCoordinatesFromAddress(addr);
  if (!coords) return alert('Adresse ungültig.');

  const fname = Date.now() + '-' + file.name;
  const { error: upErr } = await supabase.storage.from('flyer').upload(fname, file);
  if (upErr) return alert('Upload fehlgeschlagen: '+upErr.message);
  const { data: { publicUrl } } = supabase.storage.from('flyer').getPublicUrl(fname);

  const ort = addr.split(',').pop().trim();
  const { error } = await supabase.from('events').insert({
    titel: t, beschreibung: b, kategorie: c, adresse: addr, ort, lat: coords.lat, lng: coords.lng,
    flyer_url: publicUrl, user_id: user.id
  });
  if (error) return alert('Speichern fehlgeschlagen: '+error.message);

  alert('Fest erfolgreich gespeichert!');
  closeAddEventModal();
  document.getElementById('eventTitle').value = '';
  document.getElementById('eventDescription').value = '';
  document.getElementById('eventCategory').value = 'Konzert';
  document.getElementById('eventAddress').value = '';
  document.getElementById('eventImage').value = '';
  await loadEvents();
}
