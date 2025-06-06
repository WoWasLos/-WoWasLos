// Beispiel umfassender JavaScript-Code mit Supabase-Anbindung und Navigation

const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'DEIN_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

const loginModal = document.getElementById('loginModal');
const addEventModal = document.getElementById('addEventModal');

// Navigation ist im Header und bleibt immer sichtbar durch CSS (fixed)
// Kein JS-Code nötig um Nav auszublenden

// Show modals
function showLoginModal() {
  loginModal.classList.remove('hidden');
}

function closeLoginModal() {
  loginModal.classList.add('hidden');
}

function showAddEventModal() {
  addEventModal.classList.remove('hidden');
}

function closeAddEventModal() {
  addEventModal.classList.add('hidden');
}

// Login Funktion
async function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { user, error } = await supabase.auth.signIn({ email, password });
  if (error) {
    alert('Login fehlgeschlagen: ' + error.message);
  } else {
    alert('Erfolgreich eingeloggt!');
    closeLoginModal();
    // Nach Login evtl. UI aktualisieren
  }
}

// Signup Funktion
async function signup() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { user, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert('Registrierung fehlgeschlagen: ' + error.message);
  } else {
    alert('Registrierung erfolgreich! Bitte prüfe deine E-Mail zum Verifizieren.');
  }
}

// Event hinzufügen
async function submitEvent() {
  const title = document.getElementById('eventTitle').value.trim();
  const description = document.getElementById('eventDescription').value.trim();
  const category = document.getElementById('eventCategory').value;
  const address = document.getElementById('eventAddress').value.trim();
  const imageFile = document.getElementById('eventImage').files[0];

  if (!title || !description || !address) {
    alert('Bitte alle Pflichtfelder ausfüllen.');
    return;
  }

  // Bildupload und Adresse in Koordinaten umwandeln (optional)

  // Beispiel: Event in Datenbank speichern (hier nur alert)
  alert(`Veranstaltung "${title}" wurde hinzugefügt!`);

  closeAddEventModal();

  // Events neu laden, Karte updaten, etc.
}

// Navigation Buttons
function handleAddEventClick() {
  if (!supabase.auth.user()) {
    showLoginModal();
  } else {
    showAddEventModal();
  }
}

function scrollToEvents() {
  document.getElementById('sidebar').scrollIntoView({ behavior: 'smooth' });
}

// Filter Events - je nach eigener Implementierung
function filterEvents() {
  // Filter-Logik hier
}

// Optional: Events laden und in Liste/map anzeigen
async function loadEvents() {
  // Supabase Abfrage oder andere Logik
}

// Optional: Logout
async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) alert('Logout fehlgeschlagen: ' + error.message);
  else alert('Erfolgreich ausgeloggt!');
  // UI aktualisieren
}
