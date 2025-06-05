const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let map;
let markers = [];

let isLoginMode = true;

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadEvents();
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 9);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Begrenzung auf Schwarzwald
  const bounds = L.latLngBounds(L.latLng(47.5, 7.5), L.latLng(49.0, 9.5));
  map.setMaxBounds(bounds);
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Fehler beim Laden:', error);
    return;
  }

  document.getElementById('eventList').innerHTML = '';
  markers.forEach((m) => map.removeLayer(m));
  markers = [];

  data.forEach((event) => {
    const li = document.createElement('li');
    li.textContent = `${event.titel} (${event.kategorie})`;
    document.getElementById('eventList').appendChild(li);

    const marker = L.marker([event.lat, event.lng])
      .addTo(map)
      .bindPopup(`<strong>${event.titel}</strong><br>${event.beschreibung}`);
    markers.push(marker);
  });
}

function filterEvents() {
  const category = document.getElementById('categoryFilter').value;
  if (category === 'Alle') {
    loadEvents();
  } else {
    supabase
      .from('events')
      .select('*')
      .eq('kategorie', category)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }

        document.getElementById('eventList').innerHTML = '';
        markers.forEach((m) => map.removeLayer(m));
        markers = [];

        data.forEach((event) => {
          const li = document.createElement('li');
          li.textContent = `${event.titel} (${event.kategorie})`;
          document.getElementById('eventList').appendChild(li);

          const marker = L.marker([event.lat, event.lng])
            .addTo(map)
            .bindPopup(`<strong>${event.titel}</strong><br>${event.beschreibung}`);
          markers.push(marker);
        });
      });
  }
}

function scrollToEvents() {
  document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
}

function handleAddEventClick() {
  const user = supabase.auth.getUser().then(({ data }) => data.user);
  user.then((u) => {
    if (u) {
      showAddEventModal();
    } else {
      showLoginModal();
    }
  });
}

function showLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  document.getElementById('authTitle').textContent = isLoginMode ? 'Login' : 'Registrieren';
  document.getElementById('authActionBtn').textContent = isLoginMode ? 'Login' : 'Registrieren';
  document.getElementById('toggleAuthMode').textContent = isLoginMode
    ? 'Noch kein Konto? Jetzt registrieren'
    : 'Bereits ein Konto? Hier anmelden';
}

async function handleAuth() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  if (isLoginMode) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Login fehlgeschlagen: ' + error.message);
    } else {
      alert('Login erfolgreich');
      closeLoginModal();
      showAddEventModal();
    }
  } else {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert('Registrierung fehlgeschlagen: ' + error.message);
    } else {
      alert('Registrierung erfolgreich! Bitte überprüfe deine E-Mails zur Bestätigung.');
      toggleAuthMode();
    }
  }
}

function showAddEventModal() {
  document.getElementById('addEventOverlay').classList.remove('hidden');
}

function closeAddEventModal() {
  document.getElementById('addEventOverlay').classList.add('hidden');
}

async function submitEvent() {
  const title = document.getElementById('eventTitle').value.trim();
  const description = document.getElementById('eventDescription').value.trim();
  const category = document.getElementById('eventCategory').value;
  const address = document.getElementById('eventAddress').value.trim();

  if (!title || !address) {
    alert('Bitte Titel und Adresse eingeben.');
    return;
  }

  try {
    // Geocode-Adresse zu Koordinaten mit Nominatim
    const res = await fetch(
      `https://nominatim
