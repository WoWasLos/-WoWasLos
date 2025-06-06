const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';Add commentMore actions
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let map;
let markers = [];

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await loadEvents();
  setupUI();
  checkUser();
  await checkUser();
});

function setupUI() {
@@ -38,6 +39,7 @@ async function checkUser() {
    document.getElementById('btnAddEvent').textContent = 'Veranstaltung hinzufügen';
  } else {
    document.getElementById('btnLogout').classList.add('hidden');
    document.getElementById('btnAddEvent').textContent = 'Veranstaltung hinzufügen';
  }
}

@@ -80,7 +82,7 @@ function updateEventList(events) {

async function filterEvents() {
  const category = document.getElementById('categoryFilter').value;
  const locationFilter = document.getElementById('locationFilter').value.toLowerCase();
  const locationFilter = document.getElementById('locationFilter').value.trim().toLowerCase();
  const radiusKm = parseFloat(document.getElementById('radiusFilter').value);

  const { data, error } = await supabase.from('events').select('*');
@@ -98,9 +100,9 @@ async function filterEvents() {
    filtered = filtered.filter(e => e.ort && e.ort.toLowerCase().includes(locationFilter));
  }

  if (!isNaN(radiusKm) && radiusKm > 0 && filtered.length > 0) {
    // Berechne Koordinaten des Filterorts (erste gefundene Adresse)
    const coords = await getCoordinatesFromAddress(document.getElementById('locationFilter').value);
  if (!isNaN(radiusKm) && radiusKm > 0 && filtered.length > 0 && locationFilter) {
    // Koordinaten des Filter-Orts holen
    const coords = await getCoordinatesFromAddress(locationFilter);
    if (coords) {
      filtered = filtered.filter(e => {
        if (!e.lat || !e.lng) return false;
@@ -114,7 +116,6 @@ async function filterEvents() {
}

function distance(lat1, lon1, lat2, lon2) {
  // Haversine-Formel in km
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
@@ -133,7 +134,7 @@ function deg2rad(deg) {
async function onAddEventClick() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toggleModal('loginModal');
    toggleModal('loginModal', false);
    return;
  }
  toggleModal('addEventModal', false);
@@ -176,6 +177,7 @@ async function submitEvent() {
}

async function getCoordinatesFromAddress(address) {
  if (!address) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const response = await fetch(url);
@@ -207,26 +209,7 @@ async function login() {

async function register() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  if (!email || !password) {
    alert("Bitte E-Mail und Passwort eingeben.");
    return;
  }
  const password = document.getElementById('

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert("Registrierung fehlgeschlagen: " + error.message);
  } else {
    alert("Registrierung erfolgreich. Bitte einloggen.");
  }
}

async function logout() {
  await supabase.auth.signOut();
  alert("Ausgeloggt!");
  checkUser();
}

function scrollToEvents() {
  document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
}
