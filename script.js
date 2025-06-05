const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


const map = L.map('map').setView([48.3, 8.2], 9); // Schwarzwald
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let currentUser = null;

// Modal & UI-Elemente
const modal = document.getElementById('modal');
const addEventBtn = document.getElementById('add-event-btn');
const closeModal = document.getElementById('close-modal');
const loginBtn = document.getElementById('login-btn');
const eventForm = document.getElementById('event-form');
const authBox = document.getElementById('auth');
const filterSelect = document.getElementById('category-filter');
const eventsList = document.getElementById('events-list');

// Auth check & Login
addEventBtn.onclick = async () => {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user;
  modal.classList.remove('hidden');

  if (currentUser) {
    eventForm.classList.remove('hidden');
    authBox.classList.add('hidden');
  } else {
    eventForm.classList.add('hidden');
    authBox.classList.remove('hidden');
  }
};

loginBtn.onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) {
    currentUser = data.user;
    eventForm.classList.remove('hidden');
    authBox.classList.add('hidden');
  } else {
    alert("Login fehlgeschlagen.");
  }
};

closeModal.onclick = () => modal.classList.add('hidden');

// Veranstaltungen laden
async function loadEvents() {
  const selectedCategory = filterSelect.value;
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .ilike('category', selectedCategory ? `%${selectedCategory}%` : '%');

  eventsList.innerHTML = '';
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  events.forEach(event => {
    // Karte
    L.marker([event.lat, event.lng])
      .addTo(map)
      .bindPopup(`<b>${event.name}</b><br>${event.description}`);

    // Liste
    const div = document.createElement('div');
    div.innerHTML = `<strong>${event.name}</strong><br>${event.date}<br>${event.location}`;
    eventsList.appendChild(div);
  });
}

filterSelect.addEventListener('change', loadEvents);

// Neue Veranstaltung speichern
document.getElementById('event-form').addEventListener('submit', async (e) => {
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

  // Dummy Koordinaten (hier könntest du Geocoding einbauen)
  const lat = 48.3 + Math.random() * 0.8;
  const lng = 7.8 + Math.random() * 1;

  await supabase.from('events').insert({
    name, description, location, date, category, flyer_url, lat, lng, created_by: currentUser.id
  });

  modal.classList.add('hidden');
  loadEvents();
});

loadEvents();
