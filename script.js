const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map;
let markers = [];

function initMap() {
  // Karte auf Süddeutschland zentrieren und Zoom begrenzen
  const southGermanyBounds = [
    [46.5, 7.5],  // Südwest (lat, lng)
    [50.6, 14.0]  // Nordost (lat, lng)
  ];

  map = L.map('map', {
    maxBounds: southGermanyBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 7,
    maxZoom: 15,
    zoomControl: true
  }).setView([48.8, 11.3], 8); // München zentriert

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
}

window.onload = () => {
  initMap();
  checkAuth();
};

async function checkAuth() {
  const user = supabase.auth.user();
  if (user) {
    showSection('event-section');
    loadEvents();
  } else {
    showSection('login-section');
  }
}

function showSection(id) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('event-section').style.display = 'none';
  document.getElementById('finder-section').style.display = 'none';
  document.getElementById(id).style.display = 'block';
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login fehlgeschlagen: ' + error.message);
  showSection('event-section');
  loadEvents();
}

async function signup() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert('Registrierung fehlgeschlagen: ' + error.message);
  else alert('Registrierung erfolgreich! Bitte jetzt einloggen.');
}

async function loadEvents(filterCategory = [], filterAddress = '') {
  // Filter: Kategorie (Array) und Adresse (String)
  // Supabase unterstützt ilike für Teilstrings, bei Array wird es komplexer, hier vereinfachtes Beispiel

  let query = supabase.from('events').select('*');

  if (filterCategory.length > 0) {
    query = query.contains('category', filterCategory);
  }

  const { data, error } = await query;

  if (error) return alert('Fehler beim Laden: ' + error.message);

  clearMarkers();

  const list = document.getElementById('event-list');
  list.innerHTML = '';

  data.forEach(ev => {
    // Filter Adresse grob durch String enthält
    if (filterAddress && !ev.address.toLowerCase().includes(filterAddress.toLowerCase())) {
      return;
    }

    const li = document.createElement('li');
    li.innerHTML = `<strong>${ev.name}</strong><br>
      ${ev.description}<br>
      ${ev.address}<br>
      ${ev.time ? new Date(ev.time).toLocaleString() : ''}<br>
      <a href="${ev.website}" target="_blank">Webseite</a><br>
      ${ev.price ? 'Preis: ' + ev.price + '<br>' : ''}
      ${ev.parking ? 'Parken: ' + ev.parking + '<br>' : ''}
      ${ev.flyer_url ? `<img src="${ev.flyer_url}" alt="Flyer" style="max-width:200px; margin-top:5px;">` : ''}
      <br>
      Kategorien: ${ev.category ? ev.category.join(', ') : ''}
    `;
    list.appendChild(li);

    if (ev.latitude && ev.longitude) {
      const marker = L.marker([ev.latitude, ev.longitude]).addTo(map).bindPopup(ev.name);
      markers.push(marker);
    }
  });
}

function clearMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
}

async function addEvent() {
  const name = document.getElementById('event-name').value.trim();
  const address = document.getElementById('event-address').value.trim();
  const description = document.getElementById('event-description').value.trim();
  const time = document.getElementById('event-time').value;
  const price = document.getElementById('event-price').value.trim();
  const parking = document.getElementById('event-parking').value.trim();
  const website = document.getElementById('event-website').value.trim();

  // Kategorie (Mehrfachauswahl)
  const categorySelect = document.getElementById('event-category');
  const selectedCategories = Array.from(categorySelect.selectedOptions).map(o => o.value);

  const flyerFile = document.getElementById('event-flyer').files[0];

  if (!name || !address) {
    return alert('Bitte Name und Adresse ausfüllen');
  }

  // Geocode Adresse zu lat/lng via Nominatim
  const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  let latitude = null;
  let longitude = null;

  try {
    const response = await fetch(geocodeUrl);
    const results = await response.json();
    if (results.length > 0) {
      latitude = parseFloat(results[0].lat);
      longitude = parseFloat(results[0].lon);
    } else {
      alert('Adresse konnte nicht gefunden werden.');
      return;
    }
  } catch (e) {
    alert('Fehler bei der Geokodierung: ' + e.message);
    return;
  }

  // Datei hochladen falls vorhanden
  let flyer_url = '';
  if (flyerFile) {
    const fileExt = flyerFile.name.split('.').pop();
    const fileName = `flyers/${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('event-assets').upload(fileName, flyerFile);
    if (error) {
      alert('Fehler beim Hochladen: ' + error.message);
      return;
    }
    const { publicUrl } = supabase.storage.from('event-assets').getPublicUrl(fileName);
    flyer_url = publicUrl;
  }

  // Insert Event
  const { error } = await supabase.from('events').insert([
    {
      name,
      address,
      description,
      time,
      price,
      parking,
      website,
      category: selectedCategories,
      flyer_url,
      latitude,
      longitude
    }
  ]);

  if (error) {
    alert('Fehler beim Speichern: ' + error.message);
  } else {
    alert('Veranstaltung hinzugefügt!');
    clearEventForm();
    loadEvents();
  }
}

function clearEventForm() {
  document.getElementById('event-name').value = '';
  document.getElementById('event-address').value = '';
  document.getElementById('event-description').value = '';
  document.getElementById('event-time').value = '';
  document.getElementById('event-price').value = '';
  document.getElementById('event-parking').value = '';
  document.getElementById('event-website').value = '';
  document.getElementById('event-flyer').value = '';
  const categorySelect = document.getElementById('event-category');
  for (let option of categorySelect.options) {
    option.selected = false;
  }
}

async function filterEvents() {
  const filterCategorySelect = document.getElementById('filter-category');
  const selectedFilterCategories = Array.from(filterCategorySelect.selectedOptions).map(o => o.value);
  const filterAddress = document.getElementById('filter-address').value.trim();
  await loadEvents(selectedFilterCategories, filterAddress);
}
