const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const southGermanyBounds = L.latLngBounds([47, 7], [50, 13.5]);

const map = L.map('map', {
  maxBounds: southGermanyBounds,
  maxZoom: 18,
  minZoom: 6,
  zoomSnap: 0.25
}).setView([48.5, 9], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

function showSection(section) {
  document.getElementById('finder-section').style.display = section === 'finder' ? 'block' : 'none';
  document.getElementById('add-section').style.display = section === 'add' ? 'block' : 'none';
  document.getElementById('login-section').style.display = section === 'add' ? 'block' : 'none';
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return alert('Login fehlgeschlagen: ' + error.message);
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('add-section').style.display = 'block';
}

async function signup() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert('Registrierung fehlgeschlagen: ' + error.message);
  else alert('Registrierung erfolgreich!');
}

async function loadEvents() {
  const filterLocation = document.getElementById('filter-location').value;
  const filterCategories = Array.from(document.getElementById('filter-category').selectedOptions).map(o => o.value);

  let query = supabase.from('events').select('*');
  if (filterCategories.length > 0) {
    query = query.in('categories', filterCategories);
  }

  const { data, error } = await query;
  if (error) return alert('Fehler beim Laden: ' + error.message);

  const list = document.getElementById('event-list');
  list.innerHTML = '';
  map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });

  for (const ev of data) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${ev.name}</strong><br>${ev.description}<br><a href="${ev.website}" target="_blank">Webseite</a><br><img src="${ev.image_url}" width="100" />`;
    list.appendChild(li);

    if (ev.lat && ev.lng) {
      L.marker([ev.lat, ev.lng]).addTo(map).bindPopup(ev.name);
    }
  }
}

async function addEvent() {
  const name = document.getElementById('event-name').value;
  const address = document.getElementById('event-address').value;
  const description = document.getElementById('event-description').value;
  const time = document.getElementById('event-time').value;
  const price = document.getElementById('event-price').value;
  const parking = document.getElementById('event-parking').value;
  const website = document.getElementById('event-website').value;
  const categories = Array.from(document.getElementById('event-category').selectedOptions).map(o => o.value);

  const imageFile = document.getElementById('event-image').files[0];
  let image_url = '';

  if (imageFile) {
    const path = `images/${Date.now()}_${imageFile.name}`;
    const { data, error } = await supabase.storage.from('event_assets').upload(path, imageFile);
    if (!error) {
      image_url = supabase.storage.from('event_assets').getPublicUrl(path).data.publicUrl;
    }
  }

  // Adresse in Koordinaten umwandeln
  const coords = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`).then(r => r.json());
  if (!coords[0]) return alert('Adresse konnte nicht gefunden werden.');

  const lat = parseFloat(coords[0].lat);
  const lng = parseFloat(coords[0].lon);

  const { error } = await supabase.from('events').insert([
    {
      name,
      address,
      description,
      time,
      price,
      parking,
      website,
      image_url,
      lat,
      lng,
      categories
    }
  ]);

  if (error) alert('Fehler beim Hinzufügen: ' + error.message);
  else {
    alert('Veranstaltung hinzugefügt!');
    loadEvents();
  }
}
