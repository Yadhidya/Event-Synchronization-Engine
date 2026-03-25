// js/api.js — Thin REST API wrapper

// 🔥 FIXED: Use backend URL instead of '/api'
const API_BASE = 'http://localhost:5000/api';

const Api = (() => {
  function getToken() {
    return localStorage.getItem('token');
  }

  function headers(extra = {}) {
    const h = {
      'Content-Type': 'application/json',
      ...extra
    };

    const t = getToken();
    if (t) {
      h['Authorization'] = `Bearer ${t}`;
    }

    return h;
  }

  async function request(method, path, body) {
    const opts = {
      method,
      headers: headers()
    };

    if (body) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, opts);

    const json = await res.json().catch(() => ({
      success: false,
      message: 'Invalid response'
    }));

    if (!res.ok) {
      const err = new Error(json.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = json;
      throw err;
    }

    return json;
  }

  return {
    // 🔐 Auth
    login:    (email, password) => request('POST', '/auth/login', { email, password }),
    register: (data)            => request('POST', '/auth/register', data),
    me:       ()                => request('GET',  '/auth/me'),

    // 📅 Events
    getEvents: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request('GET', `/events${q ? '?' + q : ''}`);
    },
    getEvent:    (id)        => request('GET',    `/events/${id}`),
    createEvent: (data)      => request('POST',   '/events', data),
    updateEvent: (id, data)  => request('PUT',    `/events/${id}`, data),
    deleteEvent: (id)        => request('DELETE', `/events/${id}`),
    getStats:    ()          => request('GET',    '/events/stats'),

    // 📜 Logs
    getLogs: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request('GET', `/logs${q ? '?' + q : ''}`);
    },

    // 🔔 Notifications
    getNotifications: ()   => request('GET',   '/notifications'),
    getUnreadCount:   ()   => request('GET',   '/notifications/count'),
    markRead:         (id) => request('PATCH', `/notifications/${id}/read`),
    markAllRead:      ()   => request('PATCH', '/notifications/read-all'),

    // ❤️ Health check
    health: () => request('GET', '/health'),
  };
})();

// Make globally available
window.Api = Api;