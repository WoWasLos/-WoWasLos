const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
// Karte initialisieren
const southGermanyBounds = L.latLngBounds(
  [47.2, 7.5], // Südwest
  [49.8, 13.0] // Nordost
);

let map = L.map('map', {
  maxBounds: southGermanyBounds,
  maxBoundsViscosity: 1.0,
  minZoom: 6,
}).setView([48.5, 9.0], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Login
async function loginAndShowForm() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return alert('Login fehlgeschlagen: ' + error.message);

  document.getElementById('login-section').style.display = 'none';
  document.getElementById('add-section').style.display = 'block';
}

// Registrierung
async function signup() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert('Registrierung fehlgeschlagen: ' + error.message);
  else alert('Registrierung erfolgreich!');
}

// Veranstaltungen laden
async function loadEvents() {
  const categorySelect = document.getElementById('filter-category');
  const selectedOptions = Array.from(categorySelect.selectedOptions).map(opt => opt.value);
  const locationQuery = document.getElementById('filter-location').value;

  let { data, error } = await supabase.from('events').select('*');
  if (error) return alert('Fehler beim Laden: ' + error.message);

  // Filter lokal anwenden
  if (selectedOptions.length) {
    data = data.filter(ev => selectedOptions.some(cat => ev.category?.includes(cat)));
  }

  if (locationQuery) {
    data = data.filter(ev => ev.address?.toLowerCase().includes(locationQuery.toLowerCase()));
  }

  const list = document.getElementById('event-list');
  list.innerHTML = '';
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  data.forEach(ev => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${ev.name}</strong><br>
      ${ev.description}<br>
      ${ev.time ? new Date(ev.time).toLocaleString() + '<br>' : ''}
      ${ev.website ? `<a href="${ev.website}" target="_blank">Webseite</a><br>` : ''}
      ${ev.flyer_url ? `<img src="${ev.flyer_url}" alt="Flyer" style="max-width:200px;"><br>` : ''}
    `;
    list.appendChild(li);

    if (ev.lat && ev.lng) {
      L.marker([ev.lat, ev.lng]).addTo(map).bindPopup(ev.name);
    }
  });
}

// Adresse → Koordinaten
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

// Veranstaltung hinzufügen
async function addEvent() {
  const name = document.getElementById('event-name').value;
  const address = document.getElementById('event-address').value;
  const description = document.getElementById('event-description').value;
  const time = document.getElementById('event-time').value;
  const price = document.getElementById('event-price').value;
  const parking = document.getElementById('event-parking').value;
  const website = document.getElementById('event-website').value;

  const categorySelect = document.getElementById('event-category');
  const selectedCategories = Array.from(categorySelect.selectedOptions).map(opt => opt.value);

  const flyerFile = document.getElementById('event-flyer').files[0];

  const coords = await geocodeAddress(address);
  if (!coords) return alert('Adresse konnte nicht gefunden werden');

  let flyer_url = '';
  if (flyerFile) {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-assets')
      .upload(`flyers/${Date.now()}_${flyerFile.name.toLowerCase()}`, flyerFile);

    if (uploadError) {
      console.error(uploadError);
      return alert('Bild konnte nicht hochgeladen werden');
    }

    flyer_url = supabase.storage.from('event-assets').getPublicUrl(uploadData.path).data.publicUrl;
  }

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
      lat: coords.lat,
      lng: coords.lng
    }
  ]);

  if (error) return alert('Fehler beim Speichern: ' + error.message);
  else {
    alert('Veranstaltung gespeichert!');
    loadEvents();
  }
}
