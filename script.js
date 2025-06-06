const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const map = L.map('map').setView([48.5, 9.0], 8); // Süddeutschland

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap-Mitwirkende'
}).addTo(map);

// === EVENTS LADEN ===
async function loadEvents() {
  const { data: events, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Fehler beim Laden der Events:', error.message);
    return;
  }

  events.forEach(event => {
    if (event.lat && event.lng) {
      const marker = L.marker([event.lat, event.lng]).addTo(map);
      marker.bindPopup(`<b>${event.titel}</b><br>${event.beschreibung}`);
    }
  });
}

loadEvents();

// === MODAL FUNKTIONEN ===
function openLoginModal() {
  document.getElementById('loginModal').style.display = 'block';
}
function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
}
function openAddEventModal() {
  document.getElementById('addEventModal').style.display = 'block';
}
function closeAddEventModal() {
  document.getElementById('addEventModal').style.display = 'none';
}

// === LOGIN ===
async function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert('Login fehlgeschlagen: ' + error.message);
    return;
  }

  alert('Login erfolgreich: ' + data.user.email);
  closeLoginModal();
  openAddEventModal();
}

// === SIGNUP ===
async function signup() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert('Registrierung fehlgeschlagen: ' + error.message);
    return;
  }

  alert('Registrierung erfolgreich. Bitte Mail bestätigen.');
  closeLoginModal();
}

// === NUTZER PRÜFEN & ADD EVENT MODAL ÖFFNEN ===
async function checkUser() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    openLoginModal();
  } else {
    openAddEventModal();
  }
}

// === ADRESSE → KOORDINATEN ===
async function getCoordinatesFromAddress(address) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
  );
  const data = await response.json();
  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  }
  return null;
}

// === EVENT HINZUFÜGEN ===
async function submitEvent() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    alert('Bitte zuerst anmelden.');
    closeAddEventModal();
    return;
  }

  const titel = document.getElementById('eventTitle').value;
  const beschreibung = document.getElementById('eventDescription').value;
  const kategorie = document.getElementById('eventCategory').value;
  const adresse = document.getElementById('eventAddress').value;

  const coords = await getCoordinatesFromAddress(adresse);
  if (!coords) {
    alert('Adresse konnte nicht gefunden werden.');
    return;
  }

  const { error } = await supabase.from('events').insert([
    {
      titel,
      beschreibung,
      kategorie,
      ort: adresse,
      lat: coords.lat,
      lng: coords.lng,
      user_id: user.id
    }
  ]);

  if (error) {
    alert('Fehler beim Hinzufügen des Events: ' + error.message);
  } else {
    alert('Event erfolgreich hinzugefügt!');
    closeAddEventModal();
    loadEvents(); // neu laden
  }
}

