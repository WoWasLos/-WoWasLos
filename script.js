const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let map = L.map('map').setView([48.5, 9], 7); // Süddeutschland

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

function showSection(section) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('add-section').style.display = 'none';
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
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return alert('Login fehlgeschlagen: ' + error.message);

  alert('Erfolgreich eingeloggt!');
  showSection('finder');
}

async function signup() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert('Registrierung fehlgeschlagen: ' + error.message);
  else alert('Registrierung erfolgreich!');
}

async function loadEvents() {
  const category = document.getElementById('filter-category').value;

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .ilike('category', `%${category}%`);

  if (error) return alert('Fehler beim Laden: ' + error.message);

  const list = document.getElementById('event-list');
  list.innerHTML = '';
  map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });

  data.forEach(ev => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${ev.name}</strong><br>${ev.description}<br><a href="${ev.website}" target="_blank">Webseite</a>`;
    list.appendChild(li);

    const [lat, lng] = ev.location.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      L.marker([lat, lng]).addTo(map).bindPopup(ev.name);
    }
  });
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
  const time = document.getElementById('event-time').value;
  const price = document.getElementById('event-price').value;
  const parking = document.getElementById('event-parking').value;
  const website = document.getElementById('event-website').value;
  const category = document.getElementById('event-category').value;

  const flyerFile = document.getElementById('event-flyer').files[0];
  const attachments = document.getElementById('event-attachments').files;

  let flyer_url = '';
  const uploaded_attachments = [];

  if (flyerFile) {
    const { data, error } = await supabase.storage
      .from('event_assets')
      .upload(`flyers/${Date.now()}_${flyerFile.name}`, flyerFile);
    if (!error)
      flyer_url = supabase.storage.from('event_assets').getPublicUrl(data.path).data.publicUrl;
  }

  for (let file of attachments) {
    const { data, error } = await supabase.storage
      .from('event_assets')
      .upload(`attachments/${Date.now()}_${file.name}`, file);
    if (!error) {
      const url = supabase.storage.from('event_assets').getPublicUrl(data.path).data.publicUrl;
      uploaded_attachments.push({ name: file.name, url });
    }
  }

  const { error } = await supabase.from('events').insert([
    {
      name,
      location,
      description,
      time,
      price,
      parking,
      website,
      flyer_url,
      attachments: uploaded_attachments,
      category
    }
  ]);

  if (error) alert('Fehler beim Hinzufügen: ' + error.message);
  else {
    alert('Veranstaltung hinzugefügt!');
    loadEvents();
    showSection('finder');
  }
}
