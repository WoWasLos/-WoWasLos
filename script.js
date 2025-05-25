const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Leaflet-Karte initialisieren
let map = L.map('map').setView([51.1657, 10.4515], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Login-Funktion
async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert('Login fehlgeschlagen: ' + error.message);
  } else {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadEvents();
  }
}

// Registrierung (Sign-Up)
async function signup() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert('Registrierung fehlgeschlagen: ' + error.message);
  } else {
    alert('Registrierung erfolgreich. Du kannst dich jetzt einloggen.');
  }
}

// Events laden und auf der Karte anzeigen
async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');

  if (error) {
    alert('Fehler beim Laden der Veranstaltungen: ' + error.message);
    return;
  }

  const list = document.getElementById('event-list');
  list.innerHTML = ''; // alte Einträge löschen

  data.forEach(ev => {
    const li = document.createElement('li');
    li.textContent = `${ev.name}: ${ev.description}`;
    list.appendChild(li);

    // Marker auf der Karte
    const [lat, lng] = ev.location.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      L.marker([lat, lng]).addTo(map).bindPopup(ev.name);
    }
  });
}

// Neue Veranstaltung hinzufügen
async function addEvent() {
  const name = document.getElementById('event-name').value;
  const location = document.getElementById('event-location').value;
  const description = document.getElementById('event-description').value;

  if (!name || !location) {
    alert('Bitte Name und Ort angeben (z. B. 51.23,10.12)');
    return;
  }

  const { error } = await supabase.from('events').insert([
    { name, location, description }
  ]);

  if (error) {
    alert('Fehler beim Hinzufügen: ' + error.message);
  } else {
    loadEvents(); // neu laden
  }
}


