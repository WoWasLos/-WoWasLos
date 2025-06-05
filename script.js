const supabaseUrl = 'https://bddofzmczzoiyausrdzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZG9mem1jenpvaXlhdXNyZHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDQwMTIsImV4cCI6MjA2MzU4MDAxMn0.-MISfzyKIP3zUbJl5vOZDlUAGQXBqntbc9r_sG2zsJI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// === DOM References ===
const loginSection = document.getElementById("login-section");
const addEventSection = document.getElementById("add-event-section");
const eventsListSection = document.getElementById("events-list");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const showAddEventBtn = document.getElementById("show-add-event-btn");
const flyerInput = document.getElementById("flyer");
const eventForm = document.getElementById("event-form");
const eventsList = document.getElementById("events");
const filterCategory = document.getElementById("filter-category");

// === Map Setup ===
const map = L.map('map').setView([48.137154, 11.576124], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// === Auth Status Check ===
supabase.auth.getSession().then(({ data: { session } }) => {
  updateAuthUI(session);
});

// === Auth Listener ===
supabase.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session);
});

// === UI Helper ===
function updateAuthUI(session) {
  const isLoggedIn = !!session;
  loginSection.classList.toggle("hidden", isLoggedIn);
  logoutBtn.classList.toggle("hidden", !isLoggedIn);
  showAddEventBtn.classList.toggle("hidden", !isLoggedIn);
  addEventSection.classList.add("hidden"); // Immer ausblenden zuerst
}

// === Auth Buttons ===
signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert("Signup-Fehler: " + error.message);
});

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert("Login-Fehler: " + error.message);
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

// === Show Add Event Section ===
showAddEventBtn.addEventListener("click", () => {
  addEventSection.classList.toggle("hidden");
});

// === Add Event Form Submit ===
eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("event-name").value;
  const description = document.getElementById("event-description").value;
  const location = document.getElementById("event-location").value;
  const date = document.getElementById("event-date").value;
  const category = document.getElementById("event-category").value;
  const flyerFile = flyerInput.files[0];

  let flyer_url = null;

  if (flyerFile) {
    const { data: fileData, error: fileError } = await supabase.storage
      .from("flyer")
      .upload(`flyers/${Date.now()}_${flyerFile.name}`, flyerFile);
    if (fileError) {
      alert("Fehler beim Hochladen des Flyers: " + fileError.message);
      return;
    }
    flyer_url = supabase.storage.from("flyer").getPublicUrl(fileData.path).data.publicUrl;
  }

  const user = (await supabase.auth.getUser()).data.user;

  const { error } = await supabase
    .from("events")
    .insert([{ name, description, location, date, category, flyer_url, created_by: user.id }]);

  if (error) {
    alert("Fehler beim Speichern: " + error.message);
  } else {
    eventForm.reset();
    addEventSection.classList.add("hidden");
    loadEvents();
  }
});

// === Filter Events ===
filterCategory.addEventListener("change", () => {
  loadEvents(filterCategory.value);
});

// === Load Events ===
async function loadEvents(category = "") {
  let query = supabase.from("events").select("*");

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    alert("Fehler beim Laden: " + error.message);
    return;
  }

  displayEvents(data);
}

// === Display Events ===
function displayEvents(events) {
  eventsList.innerHTML = "";
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  events.forEach((event) => {
    const item = document.createElement("div");
    item.innerHTML = `
      <h3>${event.name}</h3>
      <p>${event.description}</p>
      <p><strong>Ort:</strong> ${event.location}</p>
      <p><strong>Datum:</strong> ${event.date}</p>
      <p><strong>Kategorie:</strong> ${event.category}</p>
      ${event.flyer_url ? `<p><a href="${event.flyer_url}" target="_blank">Flyer anzeigen</a></p>` : ""}
      <hr/>
    `;
    eventsList.appendChild(item);

    // Geocode & Marker
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.location)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) {
          const { lat, lon } = data[0];
          L.marker([lat, lon]).addTo(map).bindPopup(event.name);
        }
      });
  });
}

// === Initial Load ===
loadEvents();
