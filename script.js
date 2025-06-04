// Supabase Setup
const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Karte initialisieren
const southGermanyBounds = L.latLngBounds(
  [47.2, 7.5],  // Südwest (lat, lng)
  [49.8, 13.0]  // Nordost (lat, lng)
);

let map = L.map('map', {
  maxBounds: southGermanyBounds,
  maxBoundsViscosity: 1.0,
  minZoom: 6,
}).setView([48.5, 9.0], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Login und direkt Veranstaltung hinzufügen sichtbar machen
async function loginAndShowAdd() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login fehlgeschlagen: ' + error.message);

  // UI anpassen
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('add-section').style.display = 'block';
  document.getElementById('btn-event-add').style.display = 'inline-block';
  document.getElementById('btn-event-finder').style.display = 'inline-block';
  document.getElementById('btn-logout').style.display = 'inline-block';
}

// Registrierung
async function signup() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert('Registrierung fehlgeschlagen: ' + error.message);
  else alert('Registrierung erfolgreich!');
}

// Logout
async function logout() {
  await supabase.auth.signOut();
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('add-section').style.display = 'none';
  document.getElementById('event-finder-section').style.display = 'none';
  document.getElementById('btn-event-add').style.display = 'none';
  document.getElementById('btn-event-finder').style.display = 'inline-block';
  document.getElementById('btn-logout').style.display = 'none';
}

// Veranstaltungen laden mit Filter
async function loadEvents() {
  const categorySelect = document.getElementById('filter-category');
  const selectedCategories = Array.from(categorySelect.selectedOptions).map(opt => opt.value);
  const locationQuery = document.getElementById('filter-location').value.toLowerCase();

  let { data, error } = await supabase.from('events').select('*');
  if (error) return alert('Fehler beim Laden: ' + error.message);

  // Filter lokal anwenden
  if (selectedCategories.length) {
    data = data.filter(ev => ev.category && selectedCategories.some(cat => ev.category.includes(cat)));
  }

  if (locationQuery) {
    data = data.filter(ev => ev.address && ev.address.toLowerCase().includes(locationQuery));
  }

  const list = document.getElementById('event-list');
  list.innerHTML = '';

  // Alle Marker entfernen
