const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let map = L.map('map').setView([51.1657, 10.4515], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login fehlgeschlagen');
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadEvents();
}

async function signup() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert('Fehler bei Registrierung: ' + error.message);
  alert('Konto erstellt. Jetzt einloggen!');
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');
  const list = document.getElementById('event-list');
  list.innerHTML = '';
  data.forEach(ev => {
    const li = document.createElement('li');
    li.textContent = `${ev.name}: ${ev.description}`;
    list.appendChild(li);
    const [lat, lng] = ev.location.split(',').map(Number);
    L.marker([lat, lng]).addTo(map).bindPopup(ev.name);
  });
}

async function addEvent() {
  const name = document.getElementById('event-name').value;
  const location = document.getElementById('event-location').value;
  const description = document.getElementById('event-description').value;
  await supabase.from('events').insert([{ name, location, description }]);
  loadEvents();
}
