const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map;
let markers = [];
const southGermanyBounds = L.latLngBounds([46.3, 7.9], [50.7, 14.8]); // ca. Süddeutschland

window.onload = async () => {
  await checkAuth();
  setupMap();
  setupCategoryMultiSelect();
};

async function checkAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Fehler beim Abrufen des Benutzers:', error);
    showSection('login-section');
    return;
  }
  if (user) {
    showSection('event-section');
    loadEvents();
  } else {
    showSection('login-section');
  }
}

function showSection(id) {
  document.getElementById('login-section').style.display = id === 'login-section' ? 'block' : 'none';
  document.getElementById('event-section').style.display = id === 'event-section' ? 'flex' : 'none';
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

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) alert('Registrierung fehlgeschlagen: ' + error.message);
  else alert('Registrierung erfolgreich! Bitte prüfen Sie Ihre E-Mails.');
}

function setupMap() {
  map = L.map('map', {
    maxBounds: southGermanyBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 7,
    maxZoom: 16,
  }).setView([48.5, 11.5], 7.5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);
}

function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  const results = await response.json();
  if (results.length === 0) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

async function loadEvents() {
  clearMarkers();

  const categorySelect = document.getElementById('filter-category');
  const categories = Array.from(categorySelect.selectedOptions).map(opt => opt.value);
  const locationFilter = document.getElementById('filter-location').value.trim();

  let query = supabase.from('events').select('*');

  if (categories.length && !categories.includes('')) {
    query = query.in('category', categories);
  }
  const { data, error } = await query;

  if (error) {
    alert('Fehler beim Laden: ' + error.message);
    return;
  }

  // Filtern nach Adresse, falls eingegeben (unscharf)
  let filteredData = data;
  if (locationFilter) {
    filteredData = [];
    for (const ev of data) {
      const geo = await geocodeAddress(locationFilter);
      if (!geo) continue;
      const evGeo = await geocodeAddress(ev.location);
      if (!evGeo) continue;

      // Abstand in Grad lat/lng (grob)
      const distance = Math.sqrt(
        Math.pow(geo.lat - evGeo.lat, 2) + Math.pow(geo.lng - evGeo.lng, 2)
      );
      if (distance < 1) filteredData.push(ev); // ~100km Radius
    }
  }

  const list = document.getElementById('event-list');
  list.innerHTML = '';

  filteredData.forEach(ev => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${ev.name}</strong><br>
      ${ev.description}<br>
      <strong>Datum:</strong> ${new Date(ev.time).toLocaleString()}<br>
      <strong>Preis:</strong> ${ev.price || '-'}<br>
      <strong>Parken:</strong> ${ev.parking || '-'}<br>
      <a href="${ev.website}" target="_blank" rel="noopener">Webseite</a><br>
      ${ev.flyer_url ? `<img src="${ev.flyer_url}" alt="Flyer" style="max-width: 200px; margin-top: 8px;">` : ''}
    `;
    list.appendChild(li);

    // Marker hinzufügen
    geocodeAddress(ev.location).then(coords => {
      if (!coords) return;
      const marker = L.marker([coords.lat, coords.lng]).addTo(map).bindPopup(ev.name);
      markers.push(marker);
    });
  });
}

function setupCategoryMultiSelect() {
  const filterCategory = document.getElementById('filter-category');
  filterCategory.setAttribute('multiple', '');
  filterCategory.size = 4;

  const eventCategory = document.getElementById('event-category');
  eventCategory.setAttribute('multiple', '');
  eventCategory.size = 4;

  // Vordefinierte Kategorien in event-category (Alternativ: hardcoded HTML)
  const categories = ['Dorffest', 'Konzert', 'Verein'];
  eventCategory.innerHTML = '';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    eventCategory.appendChild(opt);
  });
}

async function addEvent() {
  const name = document.getElementById('event-name').value.trim();
  const address = document.getElementById('event-location').value.trim();
  const description = document.getElementById('event-description').value.trim();
  const time = document.getElementById('event-time').value;
  const price = document.getElementById('event-price').value.trim();
  const parking = document.getElementById('event-parking').value.trim();
  const website = document.getElementById('event-website').value.trim();

  // Mehrfachauswahl Kategorie
  const categorySelect = document.getElementById('event-category');
  const selectedCategories = Array.from(categorySelect.selectedOptions).map(o => o.value);

  if (!name || !address || selectedCategories.length === 0) {
    alert('Bitte Name, Ort und mindestens eine Kategorie angeben.');
    return;
  }

  // Geocode Adresse prüfen
  const coords = await geocodeAddress(address);
  if (!coords) {
    alert('Adresse konnte nicht gefunden werden. Bitte prüfen Sie die Eingabe.');
    return;
  }

  // Dateien
  const flyerFile = document.getElementById('event-flyer').files[0];
  const attachmentsFiles = document.getElementById('event-attachments').files;

  let flyer_url = '';
  const uploaded_attachments = [];

  if (flyerFile) {
    const filePath = `flyers/${Date.now()}_${flyerFile.name.toLowerCase().replace(/\s/g, '_')}`;
    const { data, error } = await supabase.storage
      .from('event-assets')
      .upload(filePath, flyerFile);

    if (error) {
      alert('Fehler beim Hochladen des Flyers: ' + error.message);
      return;
    }
    flyer_url = supabase.storage.from('event-assets').getPublicUrl(data.path).data.publicUrl;
  }

  for (const file of attachmentsFiles) {
    const filePath = `attachments/${Date.now()}_${file.name.toLowerCase().replace(/\s/g, '_')}`;
    const { data, error } = await supabase.storage
      .from('event-assets')
      .upload(filePath, file);

    if (error) {
      alert('Fehler beim Hochladen einer Anlage: ' + error.message);
      return;
    }
    const url = supabase.storage.from('event-assets').getPublicUrl(data.path).data.publicUrl;
    uploaded_attachments.push({ name: file.name, url });
  }

  // Event speichern
  const { error } = await supabase.from('events').insert([
    {
      name,
      location: address,
      description,
      time,
      price,
      parking,
      website,
      flyer_url,
      attachments: uploaded_attachments,
      category: selectedCategories,
    },
  ]);

  if (error) {
    alert('Fehler beim Hinzufügen: ' + error.message);
  } else {
    alert('Veranstaltung erfolgreich hinzugefügt!');
    clearEventForm();
    loadEvents();
  }
}

function clearEventForm() {
  document.getElementById('event-name').value = '';
  document.getElementById('event-location').value = '';
  document.getElementById('event-description').value = '';
  document.getElementById('event-time').value = '';
  document.getElementById('event-price').value = '';
  document.getElementById('event-parking').value = '';
  document.getElementById('event-website').value = '';
  const categorySelect = document.getElementById('event-category');
  for (let i = 0; i < categorySelect.options.length; i++) {
    categorySelect.options[i].selected = false;
  }
  document.getElementById('event-flyer').value = '';
  document.getElementById('event-attachments').value = '';
}
