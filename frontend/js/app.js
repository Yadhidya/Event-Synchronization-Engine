(async () => {

/* ==============================
GLOBAL STATE
============================== */

const AppState = {
user: null,
events: [],
currentView: "dashboard",
notifOpen: false
};

/* ==============================
DOM HELPERS
============================== */

const $ = (id) => document.getElementById(id);

const authOverlay = $("auth-overlay");
const appEl = $("app");
const loginForm = $("login-form");
const registerForm = $("register-form");
const eventForm = $("event-form");
const modalOverlay = $("modal-overlay");
const notifDropdown = $("notif-dropdown");
const notifBtn = $("notif-btn");

/* ==============================
UTILITIES
============================== */

function debounce(fn, delay = 300) {
let t;
return (...args) => {
clearTimeout(t);
t = setTimeout(() => fn(...args), delay);
};
}

async function safeApi(call, errorMsg) {
try {
return await call();
} catch (err) {
UI.toast(errorMsg || err.message, "error");
return null;
}
}

function setButtonLoading(btn, loading) {
const text = btn.querySelector(".btn-text");
const loader = btn.querySelector(".btn-loader");

```
btn.disabled = loading;
text?.classList.toggle("hidden", loading);
loader?.classList.toggle("hidden", !loading);
```

}

function refreshEventsIfVisible() {
if (AppState.currentView === "events") {
loadEventsTable();
}
}

/* ==============================
AUTH
============================== */

function showApp(user) {
AppState.user = user;

```
authOverlay.classList.add("hidden");
appEl.classList.remove("hidden");

$("user-avatar").textContent = user.avatar || "🙂";
$("user-name-side").textContent = user.name;
$("user-role-side").textContent = user.role;
$("topbar-user").textContent = `${user.avatar || "🙂"} ${user.name}`;

SocketClient.connect(user);

loadDashboard();
startNotifPolling();
```

}

async function tryAutoLogin() {
const token = localStorage.getItem("token");
if (!token) return false;

```
const res = await safeApi(() => Api.me());

if (!res) {
  localStorage.removeItem("token");
  return false;
}

showApp(res.user);
return true;
```

}

/* ==============================
LOGIN
============================== */

loginForm.addEventListener("submit", async (e) => {
e.preventDefault();

```
const btn = loginForm.querySelector(".btn");
setButtonLoading(btn, true);

const email = $("login-email").value;
const password = $("login-password").value;

const res = await safeApi(() => Api.login(email, password), "Login failed");

if (res) {
  localStorage.setItem("token", res.token);
  showApp(res.user);
}

setButtonLoading(btn, false);
```

});

/* ==============================
REGISTER
============================== */

registerForm.addEventListener("submit", async (e) => {
e.preventDefault();

```
const btn = registerForm.querySelector(".btn");
setButtonLoading(btn, true);

const data = {
  name: $("reg-name").value,
  email: $("reg-email").value,
  password: $("reg-password").value,
  role: $("reg-role").value
};

const res = await safeApi(() => Api.register(data), "Registration failed");

if (res) {
  localStorage.setItem("token", res.token);
  showApp(res.user);
}

setButtonLoading(btn, false);
```

});

/* ==============================
NAVIGATION
============================== */

const ViewHandlers = {
events: loadEventsTable,
logs: loadLogs,
analytics: loadAnalytics,
create: resetForm
};

function navigateTo(view) {
AppState.currentView = view;

```
document.querySelectorAll(".view").forEach(v =>
  v.classList.add("hidden")
);

$(`view-${view}`)?.classList.remove("hidden");

document.querySelectorAll(".nav-item").forEach(n =>
  n.classList.toggle("active", n.dataset.view === view)
);

const titles = {
  dashboard: "Dashboard",
  events: "Events",
  create: "Create Event",
  logs: "Activity Log",
  analytics: "Analytics"
};

$("topbar-title").textContent = titles[view] || view;

ViewHandlers[view]?.();
```

}

document.querySelectorAll(".nav-item").forEach(item => {
item.addEventListener("click", () => {
navigateTo(item.dataset.view);
$("sidebar").classList.remove("open");
});
});

/* ==============================
EVENTS TABLE
============================== */

async function loadEventsTable() {

```
const params = {
  status: $("filter-status").value,
  priority: $("filter-priority").value
};

const res = await safeApi(() => Api.getEvents(params), "Failed to load events");

if (!res) return;

let events = res.data;

const search = $("event-search").value.toLowerCase();

if (search) {
  events = events.filter(e =>
    e.event_name.toLowerCase().includes(search) ||
    (e.description || "").toLowerCase().includes(search)
  );
}

AppState.events = events;

UI.renderEventsTable(events, AppState.user.id, AppState.user.role === "admin");
```

}

$("event-search")?.addEventListener(
"input",
debounce(loadEventsTable, 300)
);

/* ==============================
NOTIFICATIONS
============================== */

notifBtn.addEventListener("click", async () => {

```
AppState.notifOpen = !AppState.notifOpen;

notifDropdown.classList.toggle("hidden", !AppState.notifOpen);

if (AppState.notifOpen) {
  const res = await safeApi(() => Api.getNotifications());
  UI.renderNotifications(res?.data || []);
  UI.setNotifBadge(0);
}
```

});

function startNotifPolling() {
setInterval(async () => {
const res = await safeApi(() => Api.getUnreadCount());
if (res) UI.setNotifBadge(res.count);
}, 15000);
}

/* ==============================
SOCKET EVENTS
============================== */

function onEventCreated(event) {
refreshEventsIfVisible();

```
AppState.events.unshift(event);
UI.renderRecentEvents(AppState.events);
```

}

function onEventUpdated(event) {
refreshEventsIfVisible();

```
const idx = AppState.events.findIndex(e => e.id === event.id);
if (idx >= 0) AppState.events[idx] = event;

UI.renderRecentEvents(AppState.events);
```

}

function onEventDeleted(id) {
refreshEventsIfVisible();

```
AppState.events = AppState.events.filter(e => e.id !== id);
UI.renderRecentEvents(AppState.events);
```

}

/* ==============================
BOOT
============================== */

const loggedIn = await tryAutoLogin();

if (!loggedIn) {
authOverlay.classList.remove("hidden");
}

window.App = {
navigateTo,
onEventCreated,
onEventUpdated,
onEventDeleted
};

})();
