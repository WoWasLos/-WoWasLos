// Supabase initialisieren
const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = supabaseJs.createClient(supabaseUrl, supabaseKey);

// Elemente
const loginModal = document.getElementById('login-modal');
const addEventModal = document.getElementById('add-event-modal');

const loginForm = document.getElementById('login-form');
const eventForm = document.getElementById('event-form');

const btnAddEvent = document.getElementById('btn-add-event');
const btnLogout = document.getElementById('btn-logout');

const loginClose = document.getElementById('login-close');
const eventClose = document.getElementById('event-close');

const eventsList = document.getElementById('events-list');

let currentUser = null;

// Beim Laden prüfen, ob User eingeloggt
window.onload = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    setupLoggedInState();
  } else {
    setupLoggedOutState();
  }
  loadEvents();
};

// Login Modal schließen
loginClose.addEventListener('click', () => {
  loginModal.style.display = 'none';
});

// Event Modal schließen
eventClose.addEventListener('click', () => {
  addEventModal.style.display = 'none';
});

// Login-Formular absenden
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login fehlgeschlagen: ' + error.message);
  } else {
    currentUser = data.user;
    loginModal.style.display = 'none';
    setupLoggedInState();
    loadEvents();
  }
});

// Logout Button
btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null;
  setupLoggedOutState();
  loadEvents();
});

// Veranstaltung hinzufügen Button
btnAddEvent.addEventListener('click', () => {
  if (!currentUser) {
    loginModal.style.display = 'block';
  } else {
    addEventModal.style.display = 'block';
  }
});

// Event-Formular absenden
eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = eventForm.title.value.trim();
  const description = eventForm.description.value.trim();
  const location = eventForm.location.value.trim();
  const category = eventForm.category.value;
  const date = eventForm.date.value;

  if (!title || !location || !category || !date) {
    alert('Bitte alle Pflichtfelder ausfüllen.');
    return;
  }

  const { error } = await supabase.from('events').insert([{
    title,
    description,
    location,
    category,
    date,
    user_id: currentUser.id,
  }]);

  if (error) {
    alert('Fehler beim Speichern: ' + error.message);
  } else {
    alert('Veranstaltung erfolgreich gespeichert!');
    addEventModal.style.display = 'none';
    eventForm.reset();
    loadEvents();
  }
});

// UI anpassen für eingeloggt/ausgeloggt
function setupLoggedInState() {
  btnAddEvent.style.display = 'inline-block';
  btnLogout.style.display = 'inline-block';
}

function setupLoggedOutState() {
  btnAddEvent.style.display = 'inline-block';
  btnLogout.style.display = 'none';
}

// Veranstaltungen laden und anzeigen
async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });

  eventsList.innerHTML = '';

  if (error) {
    eventsList.innerHTML = '<p>Fehler beim Laden der Veranstaltungen.</p>';
    return;
  }

  if (!data || data.length === 0) {
    eventsList.innerHTML = '<p>Keine Veranstaltungen gefunden.</p>';
    return;
  }

  data.forEach(event => {
    const eventDiv = document.createElement('div');
    eventDiv.classList.add('event-item');
    eventDiv.innerHTML = `
      <h3>${escapeHtml(event.title)}</h3>
      <p><strong>Datum:</strong> ${event.date}</p>
      <p><strong>Ort:</strong> ${escapeHtml(event.location)}</p>
      <p><strong>Kategorie:</strong> ${escapeHtml(event.category)}</p>
      <p>${escapeHtml(event.description || '')}</p>
    `;
    eventsList.appendChild(eventDiv);
  });
}

// Hilfsfunktion gegen XSS
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}
