const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map = L.map('map', {
  maxBounds: L.latLngBounds(L.latLng(46.5, 7), L.latLng(50.5, 11.5)),
  minZoom: 6,
  maxZoom: 18
}).setView([48.5, 9.5], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

function showSection(section) {
  document.getElementById('login-section').style.display = section === 'login' ? 'block' : 'none';
  document.getElementById('app-section').style.display = section === 'app' ? 'block' : 'none';
  document.getElementById('finder-section').style.display = section === 'finder' ? 'block' : 'none';
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return alert('Login fehlgeschlagen: ' + error.message);
  showSection('app');
}

async function signup() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  alert(error ? 'Registrierung fehlgeschlagen: ' + error.message : 'Registrierung erfolgreich!');
}

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.length === 0) return null;
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

async function addEvent() {
  const name = document.getElementById('event-name').value;
  const address = document.getElementById('event-address').value;
  const coords = await geocode(address);
  if (!coords) return alert("Adresse konnte nicht gefunden werden.");

  const description = document.getElementById('event-description').value;
  const time = document.getElementById('event-time').value;
  const price = document.getElementById('event-price').value;
  const parking = document.getElementById('event-parking').value;
  const website = document.getElementById('event-website').value;
  const category = Array.from(document.getElementById('event-category').selectedOptions).map(o => o.value);

  const flyerFile = document.getElementById('event-flyer').files[0];
  const attachments = document.getElementById('event-attachments').files;
  let flyer_url = '', uploaded_attachments = [];

  if (flyerFile) {
    const { data } = await supabase.storage.from('event_assets').upload(`flyers/${Date.now()}_${flyerFile.name}`, flyerFile);
    flyer_url = supabase.storage.from('event_assets').getPublicUrl(data.path).data.publicUrl;
  }

  for (let file of attachments) {
    const { data } = await supabase.storage.from('event_assets').upload(`attachments/${Date.now()}_${file.name}`, file);
    uploaded_attachments.push({ name: file.name, url: supabase.storage.from('event_assets').getPublicUrl(data.path).data.publicUrl });
  }

  const { error } = await supabase.from('events').insert([{
    name, location: coords.join(','), address, description, time, price, parking, website, category, flyer_url, attachments: uploaded_attachments
  }]);

  if (error) alert('Fehler beim Hinzufügen: ' + error.message);
  else {
    alert('Veranstaltung hinzugefügt!');
    loadEvents();
  }
}

async function loadEvents() {
  const categories = Array.from(document.getElementById('filter-category').selectedOptions).map(o => o.value);

  const { data, error } = await supabase.from('events').select('*');
  if (error) return alert('Fehler beim Laden: ' + error.message);

  document.getElementById('event-list').innerHTML = '';
  map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l); });

  data.filter(ev => {
    return categories.length === 0 || categories.some(cat => ev.category.includes(cat));
  }).forEach(ev => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${ev.name}</strong><br>${ev.description}<br><a href="${ev.website}" target="_blank">Webseite</a>`;
    document.getElementById('event-list').appendChild(li);

    const [lat, lng] = ev.location.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      L.marker([lat, lng]).addTo(map).bindPopup(ev.name);
    }
  });
}
