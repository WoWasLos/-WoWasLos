const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map = L.map('map', {Add commentMore actions
  maxBounds: L.latLngBounds(
    L.latLng(47, 6),   // Südwest
    L.latLng(50.1, 13) // Nordost
  ),
  maxZoom: 18,
  minZoom: 6
}).setView([48.5, 9], 7);
let map = L.map('map').setView([48.5, 9], 7); // Süddeutschland

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

function showSection(section) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('add-section').style.display = 'none';

  if (section === 'login') document.getElementById('login-section').style.display = 'block';
  else if (section === 'add') document.getElementById('add-section').style.display = 'block';
  else if (section === 'app') document.getElementById('app').style.display = 'block';
  document.getElementById('finder-section').style.display = 'none';

  if (section === 'login') {
    document.getElementById('login-section').style.display = 'block';
  } else if (section === 'add') {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        alert("Bitte zuerst einloggen.");
        showSection('login');
      } else {
        document.getElementById('add-section').style.display = 'block';
      }
    });
  } else {
    document.getElementById('finder-section').style.display = 'block';
    loadEvents();
  }
}

async function login() {
@@ -32,8 +37,8 @@ async function login() {

  if (error) return alert('Login fehlgeschlagen: ' + error.message);

  showSection('app');
  loadEvents();
  alert('Erfolgreich eingeloggt!');
  showSection('finder');
}

async function signup() {
@@ -71,6 +76,13 @@ async function loadEvents() {
}

async function addEvent() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    alert("Du musst eingeloggt sein, um eine Veranstaltung hinzuzufügen.");
    showSection('login');
    return;
  }

  const name = document.getElementById('event-name').value;
  const location = document.getElementById('event-location').value;
  const description = document.getElementById('event-description').value;
@@ -121,8 +133,9 @@ async function addEvent() {

  if (error) alert('Fehler beim Hinzufügen: ' + error.message);
  else {
    alert("Veranstaltung hinzugefügt!");
    alert('Veranstaltung hinzugefügt!');
    loadEvents();
    showSection('finder');
  }
}
