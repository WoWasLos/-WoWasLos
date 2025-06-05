const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let map;
let markers = [];

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await loadEvents();
});

function initMap() {
  map = L.map('map').setView([48.1, 8.2], 9);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const bounds = L.latLngBounds(
    L.latLng(47.5, 7.5),
    L.latLng(49.0, 9.5)
  );
  map.setMaxBounds(bounds);
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Fehler beim Laden:', error);
    return;
  }

  document.getElementById('eventList').innerHTML = '';
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  data.forEach(event => {
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
        markers.forEach(m => map.removeLayer(m));
        markers = [];

        data.forEach(event => {
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

function handleAddEventClick() {
  const user = supabase.auth.user();
  if (user) {
    alert("Du bist eingeloggt. Hier könnte ein Formular erscheinen.");
    scrollToEvents();
  } else {
    document.getElementById('loginModal').classList.remove('hidden');
  }
}

function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  supabase.auth.signInWithPassword({ email, password })
    .then(async ({ error }) => {
      if (error) {
        alert("Login fehlgeschlagen: " + error.message);
      } else {
        alert("Login erfolgreich");
        document.getElementById('loginModal').classList.add('hidden');
        await loadEvents();
        scrollToEvents();
      }
    });
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function scrollToEvents() {
  document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
}
