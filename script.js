const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


const map = L.map('map').setView([51.1657, 10.4515], 6); // Deutschland Mitte
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const modal = document.getElementById('modal');
const addEventBtn = document.getElementById('add-event-btn');
const closeModal = document.getElementById('close-modal');
const eventForm = document.getElementById('event-form');
const authBox = document.getElementById('auth');
const loginBtn = document.getElementById('login-btn');
const eventsList = document.getElementById('events-list');
const filter = document.getElementById('category-filter');

let currentUser = null;

// === Auth ===
addEventBtn.addEventListener('click', async () => {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user;
  modal.classList.remove('hidden');
  if (!currentUser) {
    eventForm.classList.add('hidden');
    authBox.classList.remove('hidden');
  } else {
    eventForm.classList.remove('hidden');
    authBox.classList.add('hidden');
  }
});

closeModal.onclick = () => modal.classList.add('hidden');

loginBtn.onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) {
    currentUser = data.user;
    eventForm.classList.remove('hidden');
    authBox.classList.add('hidden');
  } else {
    alert('Login fehlgeschlagen');
  }
};

// === Events anzeigen ===
async function loadEvents() {
  const category = filter.value;
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .ilike('category', category ? `%${category}%` : '%');

  eventsList.innerHTML = '';
  events.forEach(event => {
    // Liste
    const div = document.createElement('div');
    div.innerHTML = `<strong>${event.name}</strong><br>${event.date}`;
    eventsList.appendChild(div);

    // Karte
    L.marker([event.lat, event.lng])
      .addTo(map)
      .bindPopup(`<strong>${event.name}</strong><br>${event.description}`);
  });
}

filter.addEventListener('change', loadEvents);

// === Neue Veranstaltung speichern ===
eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const description = document.getElementById('description').value;
  const location = document.getElementById('location').value;
  const date = document.getElementById('date').value;
  const category = document.getElementById('category').value;

  const flyer = document.getElementById('flyer').files[0];
  let flyer_url = null;

  if (flyer) {
    const { data, error } = await supabase.storage.from('flyer').upload(Date.now() + '-' + flyer.name, flyer);
    if (!error) {
      flyer_url = supabase.storage.from('flyer').getPublicUrl(data.path).data.publicUrl;
    }
  }

  // Geocoding (vereinfachtes Beispiel: zufällige Koordinaten)
  const lat = 48.5 + Math.random();
  const lng = 8.5 + Math.random();

  await supabase.from('events').insert({
    name, description, location, date, category, flyer_url,
    lat, lng,
    created_by: currentUser.id
  });

  modal.classList.add('hidden');
  loadEvents();
});

loadEvents();
