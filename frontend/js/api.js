// js/api.js — Production-ready REST API wrapper

const API_BASE =
window.location.hostname === "localhost"
? "http://localhost:5000/api"
: "https://your-production-api.com/api";

const Api = (() => {

/* ==============================
TOKEN HANDLING
============================== */

const getToken = () => localStorage.getItem("token");

const setToken = (token) => {
if (token) localStorage.setItem("token", token);
};

const clearToken = () => {
localStorage.removeItem("token");
};

/* ==============================
HEADERS
============================== */

function buildHeaders(extra = {}) {
const headers = {
"Content-Type": "application/json",
...extra
};

```
const token = getToken();
if (token) headers["Authorization"] = `Bearer ${token}`;

return headers;
```

}

/* ==============================
TIMEOUT SUPPORT
============================== */

function fetchWithTimeout(url, options, timeout = 10000) {
return Promise.race([
fetch(url, options),
new Promise((_, reject) =>
setTimeout(() => reject(new Error("Request timeout")), timeout)
)
]);
}

/* ==============================
REQUEST HANDLER
============================== */

async function request(method, path, body = null, params = null) {
try {

```
  const url = new URL(API_BASE + path);

  if (params) {
    Object.keys(params).forEach(k =>
      url.searchParams.append(k, params[k])
    );
  }

  const options = {
    method,
    headers: buildHeaders()
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetchWithTimeout(url, options);

  let data;

  try {
    data = await res.json();
  } catch {
    data = { success: false, message: "Invalid server response" };
  }

  if (!res.ok) {

    if (res.status === 401) {
      clearToken();
      window.location.href = "/login";
    }

    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;

    throw err;
  }

  return data;

} catch (err) {

  console.error("API Error:", err);

  throw {
    success: false,
    message: err.message || "Network error"
  };
}
```

}

/* ==============================
API METHODS
============================== */

return {

```
/* 🔐 AUTH */

login: async (email, password) => {
  const res = await request("POST", "/auth/login", { email, password });

  if (res.token) {
    setToken(res.token);
  }

  return res;
},

register: (data) => request("POST", "/auth/register", data),

me: () => request("GET", "/auth/me"),

logout: () => {
  clearToken();
},

/* 📅 EVENTS */

getEvents: (params) => request("GET", "/events", null, params),

getEvent: (id) => request("GET", `/events/${id}`),

createEvent: (data) => request("POST", "/events", data),

updateEvent: (id, data) => request("PUT", `/events/${id}`, data),

deleteEvent: (id) => request("DELETE", `/events/${id}`),

getStats: () => request("GET", "/events/stats"),

/* 📜 LOGS */

getLogs: (params) => request("GET", "/logs", null, params),

/* 🔔 NOTIFICATIONS */

getNotifications: () => request("GET", "/notifications"),

getUnreadCount: () => request("GET", "/notifications/count"),

markRead: (id) => request("PATCH", `/notifications/${id}/read`),

markAllRead: () => request("PATCH", "/notifications/read-all"),

/* ❤️ HEALTH */

health: () => request("GET", "/health"),
```

};

})();

// expose globally
window.Api = Api;
