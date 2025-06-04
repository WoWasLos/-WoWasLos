const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map;
let markers = [];

const southGermanyBounds = L.latLngBounds(
  L.latLng(46.5, 6.5),  // Südwest (z.B. Bodensee)
  L.latLng(50.7, 14.0)  // Nordost (z.B. Dresden Grenze)
);

window.onload = () => {
  initMap();
  setupEventListeners();
  checkAuthState();
};

function initMap() {
  map = L.map('map', {
    maxBounds: southGermanyBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 7,
    maxZoom: 16,
    zoomControl: true,
  }).setView([48.7, 11.5], 8);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
}

function clearMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
}

function setupEventListeners() {
  document.getElementById('nav-login').addEventListener('click', () => {
    showSection('login-section');
  });

  document.getElementById('nav-event-finder').addEventListener('click', () => {
    showSection('event-finder-section');
    loadEvents();
  });

  document.getElementById('nav-event-add').addEventListener('click', async () => {
    const user = await supabase.auth.getUser();
    if (!user.data) {
      alert('Bitte zuerst anmelden!');
      showSection('login-section');
      return;
    }
    showSection('add-section');
  });

  document.getElementById('nav-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    alert('Abgemeldet');
    updateNavForAuth(null);
    showSection('login-section');
  });

  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Login fehlgeschlagen: ' + error.message);
      return;
    }
    alert('Login erfolgreich!');
    updateNavForAuth(data.user);
    showSection('event-finder-section');
    loadEvents();
  });

  document.getElementById('btn-signup').addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert('Registrierung fehlgeschlagen: ' + error.message);
    else alert('Registrierung erfolgreich! Bitte einloggen.');
  });

  document.getElementById('btn-filter').addEventListener('click', () => {
    loadEvents();
  });

  document.getElementById('btn-add-event').addEventListener('click', () => {
    addEvent();
  });
}

function updateNavForAuth(user) {
  if (user) {
    document.getElementById('nav-login').classList.add('hidden');
    document.getElementById('nav-event-add').classList.remove('hidden');
    document.getElementById('nav-logout').classList.remove('hidden');
  } else {
    document.getElementById('nav-login').classList.remove('hidden');
    document.getElementById('nav-event-add').classList.add('hidden');
    document.getElementById('nav-logout').classList.add('hidden');
  }
}

function showSection(sectionId) {
  const sections = ['login-section', 'event-finder-section', 'add-section'];
  sections.forEach(id => {
    document.getElementById(id).style.display = (id === sectionId) ? 'block' : 'none';
  });
}

async function geocodeAddress(address) {
  // OpenStreetMap Nominatim API
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'WoWasLosApp' } });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (e) {
    console.error('Geocode Error:', e);
    return null;
  }
}

async function loadEvents() {
  clearMarkers();
  const select = document.getElementById('filter-category');
  const selectedCategories = Array.from(select.selectedOptions).map(opt => opt.value);
  const locationFilter = document.getElementById('filter-location').value.trim();

  let query = supabase.from('events').select('*');

  if (selectedCategories.length > 0) {
    // filter categories: Supabase 'in' filter
    query = query.in('category', selectedCategories);
  }

 
