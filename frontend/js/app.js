// js/app.js — Main application controller
(async () => {

  /* ── State ──────────────────────────────────────────────── */
  let currentUser  = null;
  let allEvents    = [];
  let currentView  = 'dashboard';
  let notifOpen    = false;

  /* ── DOM refs ───────────────────────────────────────────── */
  const authOverlay    = document.getElementById('auth-overlay');
  const appEl          = document.getElementById('app');
  const loginForm      = document.getElementById('login-form');
  const registerForm   = document.getElementById('register-form');
  const eventForm      = document.getElementById('event-form');
  const modalOverlay   = document.getElementById('modal-overlay');
  const notifDropdown  = document.getElementById('notif-dropdown');
  const notifBtn       = document.getElementById('notif-btn');

  /* ══════════════════════════════════════════════════════════
     AUTH
  ══════════════════════════════════════════════════════════ */
  function showApp(user) {
    currentUser = user;
    authOverlay.classList.add('hidden');
    appEl.classList.remove('hidden');

    document.getElementById('user-avatar').textContent   = user.avatar || '🙂';
    document.getElementById('user-name-side').textContent = user.name;
    document.getElementById('user-role-side').textContent = user.role;
    document.getElementById('topbar-user').textContent    = `${user.avatar || '🙂'} ${user.name}`;

    SocketClient.connect(user);
    loadDashboard();
    pollNotifCount();
  }

  async function tryAutoLogin() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const { user } = await Api.me();
      showApp(user);
      return true;
    } catch { localStorage.removeItem('token'); return false; }
  }

  // Login form submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    UI.setLoading('login-form', true); // no spinner btn in login, handled below
    const btn  = loginForm.querySelector('.btn');
    const text = btn.querySelector('.btn-text');
    const load = btn.querySelector('.btn-loader');
    btn.disabled = true; text.classList.add('hidden'); load.classList.remove('hidden');

    try {
      const { token, user } = await Api.login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value
      );
      localStorage.setItem('token', token);
      showApp(user);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false; text.classList.remove('hidden'); load.classList.add('hidden');
    }
  });

  // Register form submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('reg-error');
    errEl.classList.add('hidden');
    const btn  = registerForm.querySelector('.btn');
    const text = btn.querySelector('.btn-text');
    const load = btn.querySelector('.btn-loader');
    btn.disabled = true; text.classList.add('hidden'); load.classList.remove('hidden');

    try {
      const { token, user } = await Api.register({
        name:     document.getElementById('reg-name').value,
        email:    document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        role:     document.getElementById('reg-role').value,
      });
      localStorage.setItem('token', token);
      showApp(user);
    } catch (err) {
      errEl.textContent = err.data?.errors?.[0]?.msg || err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false; text.classList.remove('hidden'); load.classList.add('hidden');
    }
  });

  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      loginForm.classList.toggle('hidden',    which !== 'login');
      registerForm.classList.toggle('hidden', which !== 'register');
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    currentUser = null;
    SocketClient.disconnect();
    appEl.classList.add('hidden');
    authOverlay.classList.remove('hidden');
  });

  /* ══════════════════════════════════════════════════════════
     NAVIGATION
  ══════════════════════════════════════════════════════════ */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      navigateTo(view);
      // Close sidebar on mobile
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.getElementById('sidebar-close').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });

  function navigateTo(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`)?.classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.view === view);
    });
    const titles = { dashboard: 'Dashboard', events: 'Events', create: 'Create Event', logs: 'Activity Log', analytics: 'Analytics' };
    document.getElementById('topbar-title').textContent = titles[view] || view;

    if (view === 'events')    loadEventsTable();
    if (view === 'logs')      loadLogs();
    if (view === 'analytics') loadAnalytics();
    if (view === 'create')    resetForm();
  }

  /* ══════════════════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════════════════ */
  async function loadDashboard() {
    try {
      const [statsRes, eventsRes] = await Promise.all([
        Api.getStats(),
        Api.getEvents({ limit: 10 }),
      ]);
      const t = statsRes.data.totals;
      document.getElementById('s-total').textContent    = t.total;
      document.getElementById('s-active').textContent   = t.active;
      document.getElementById('s-pending').textContent  = t.pending;
      document.getElementById('s-critical').textContent = t.critical;

      // Connected clients from health
      Api.health().then(h => {
        document.getElementById('s-clients').textContent = h.clients;
      }).catch(() => {});

      allEvents = eventsRes.data;
      UI.renderRecentEvents(allEvents);
    } catch (err) {
      UI.toast('Failed to load dashboard: ' + err.message, 'error');
    }
  }

  /* ══════════════════════════════════════════════════════════
     EVENTS TABLE
  ══════════════════════════════════════════════════════════ */
  async function loadEventsTable() {
    const params = {};
    const status   = document.getElementById('filter-status').value;
    const priority = document.getElementById('filter-priority').value;
    const search   = document.getElementById('event-search').value.trim();

    if (status)   params.status   = status;
    if (priority) params.priority = priority;

    try {
      const res = await Api.getEvents(params);
      let events = res.data;
      if (search) {
        const q = search.toLowerCase();
        events = events.filter(e => e.event_name.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q));
      }
      allEvents = events;
      UI.renderEventsTable(events, currentUser.id, currentUser.role === 'admin');
    } catch (err) { UI.toast('Failed to load events', 'error'); }
  }

  document.getElementById('refresh-events')?.addEventListener('click', loadEventsTable);
  document.getElementById('filter-status')?.addEventListener('change',  loadEventsTable);
  document.getElementById('filter-priority')?.addEventListener('change', loadEventsTable);
  document.getElementById('event-search')?.addEventListener('input', () => {
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(loadEventsTable, 300);
  });

  /* ══════════════════════════════════════════════════════════
     CREATE / EDIT EVENT FORM
  ══════════════════════════════════════════════════════════ */
  function resetForm() {
    eventForm.reset();
    document.getElementById('edit-event-id').value = '';
    document.getElementById('form-mode-label').textContent  = 'Produce New Event';
    document.getElementById('form-submit-label').textContent = '⚡ Broadcast Event';
    document.getElementById('form-error').classList.add('hidden');
    document.getElementById('form-success').classList.add('hidden');
  }

  document.getElementById('form-cancel')?.addEventListener('click', () => {
    resetForm();
    navigateTo('events');
  });

  eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl     = document.getElementById('form-error');
    const successEl = document.getElementById('form-success');
    errEl.classList.add('hidden');
    successEl.classList.add('hidden');

    const editId = document.getElementById('edit-event-id').value;
    const rawPayload = document.getElementById('f-payload').value.trim();
    let payload = null;
    if (rawPayload) {
      try { payload = JSON.parse(rawPayload); }
      catch { errEl.textContent = 'Payload must be valid JSON'; errEl.classList.remove('hidden'); return; }
    }

    const data = {
      event_name:  document.getElementById('f-name').value.trim(),
      description: document.getElementById('f-description').value.trim(),
      category:    document.getElementById('f-category').value.trim() || 'general',
      priority:    document.getElementById('f-priority').value,
      status:      document.getElementById('f-status').value,
      ...(payload && { payload }),
    };

    const btn = document.getElementById('form-submit');
    btn.disabled = true;

    try {
      if (editId) {
        await Api.updateEvent(editId, data);
        successEl.textContent = '✅ Event updated and broadcasted to all clients!';
        UI.toast('Event updated!', 'success');
      } else {
        await Api.createEvent(data);
        successEl.textContent = '⚡ Event created and broadcasted to all clients!';
        UI.toast('Event broadcasted!', 'success');
        eventForm.reset();
      }
      successEl.classList.remove('hidden');
      loadDashboard();
    } catch (err) {
      errEl.textContent = err.data?.errors?.[0]?.msg || err.message;
      errEl.classList.remove('hidden');
      UI.toast(err.message, 'error');
    } finally { btn.disabled = false; }
  });

  /* ══════════════════════════════════════════════════════════
     EVENT ACTIONS (called from table buttons)
  ══════════════════════════════════════════════════════════ */
  async function viewEvent(id) {
    try {
      const { data } = await Api.getEvent(id);
      UI.renderEventDetail(data);
      document.getElementById('modal-footer').innerHTML = `
        <button class="btn btn-ghost" id="modal-close-btn">Close</button>
        <button class="btn btn-primary" onclick="App.editEvent(${id}); document.getElementById('modal-overlay').classList.add('hidden')">Edit</button>`;
      document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    } catch { UI.toast('Failed to load event details', 'error'); }
  }

  async function editEvent(id) {
    navigateTo('create');
    try {
      const { data: e } = await Api.getEvent(id);
      document.getElementById('edit-event-id').value    = e.id;
      document.getElementById('f-name').value           = e.event_name;
      document.getElementById('f-description').value    = e.description || '';
      document.getElementById('f-category').value       = e.category || '';
      document.getElementById('f-priority').value       = e.priority;
      document.getElementById('f-status').value         = e.status;
      document.getElementById('f-payload').value        = e.payload ? JSON.stringify(typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload, null, 2) : '';
      document.getElementById('form-mode-label').textContent  = `Edit Event #${e.id}`;
      document.getElementById('form-submit-label').textContent = '💾 Update & Broadcast';
    } catch { UI.toast('Failed to load event for editing', 'error'); }
  }

  async function deleteEvent(id) {
    if (!confirm(`Delete event #${id}? This action cannot be undone.`)) return;
    try {
      await Api.deleteEvent(id);
      UI.toast('Event deleted!', 'success');
      loadEventsTable();
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  /* ══════════════════════════════════════════════════════════
     LOGS
  ══════════════════════════════════════════════════════════ */
  async function loadLogs() {
    const action = document.getElementById('log-filter-action').value;
    try {
      const res = await Api.getLogs({ limit: 80, ...(action && { action }) });
      UI.renderLogs(res.data);
    } catch { UI.toast('Failed to load logs', 'error'); }
  }
  document.getElementById('refresh-logs')?.addEventListener('click', loadLogs);
  document.getElementById('log-filter-action')?.addEventListener('change', loadLogs);

  /* ══════════════════════════════════════════════════════════
     ANALYTICS
  ══════════════════════════════════════════════════════════ */
  async function loadAnalytics() {
    try {
      const { data } = await Api.getStats();
      UI.renderCharts(data);
    } catch { UI.toast('Failed to load analytics', 'error'); }
  }

  /* ══════════════════════════════════════════════════════════
     NOTIFICATIONS
  ══════════════════════════════════════════════════════════ */
  notifBtn.addEventListener('click', async () => {
    notifOpen = !notifOpen;
    notifDropdown.classList.toggle('hidden', !notifOpen);
    if (notifOpen) {
      const { data } = await Api.getNotifications().catch(() => ({ data: [] }));
      UI.renderNotifications(data);
      UI.setNotifBadge(0);
    }
  });
  document.addEventListener('click', (e) => {
    if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
      notifOpen = false;
      notifDropdown.classList.add('hidden');
    }
  });
  document.getElementById('mark-all-read')?.addEventListener('click', async () => {
    await Api.markAllRead().catch(() => {});
    UI.setNotifBadge(0);
    const { data } = await Api.getNotifications().catch(() => ({ data: [] }));
    UI.renderNotifications(data);
  });

  async function pollNotifCount() {
    try {
      const { count } = await Api.getUnreadCount();
      UI.setNotifBadge(count);
    } catch {}
    setTimeout(pollNotifCount, 15000);
  }

  /* ══════════════════════════════════════════════════════════
     MODAL
  ══════════════════════════════════════════════════════════ */
  function closeModal() { modalOverlay.classList.add('hidden'); }
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  /* ══════════════════════════════════════════════════════════
     CLEAR STREAM
  ══════════════════════════════════════════════════════════ */
  document.getElementById('clear-stream')?.addEventListener('click', () => {
    document.getElementById('event-stream').innerHTML = `<div class="stream-empty">Stream cleared — waiting for new events…</div>`;
  });

  /* ══════════════════════════════════════════════════════════
     SOCKET CALLBACKS (called from socket.js)
  ══════════════════════════════════════════════════════════ */
  function onEventCreated(event) {
    if (currentView === 'events') loadEventsTable();
    allEvents.unshift(event);
    UI.renderRecentEvents(allEvents);
    loadDashboard();
    pollNotifCount();
  }
  function onEventUpdated(event) {
    if (currentView === 'events') loadEventsTable();
    const idx = allEvents.findIndex(e => e.id === event.id);
    if (idx >= 0) allEvents[idx] = event;
    UI.renderRecentEvents(allEvents);
    // Highlight row
    setTimeout(() => {
      const row = document.querySelector(`#events-tbody tr[data-id="${event.id}"]`);
      if (row) {
        row.classList.add('highlight');
        setTimeout(() => row.classList.remove('highlight'), 1500);
      }
    }, 100);
  }
  function onEventDeleted(id) {
    if (currentView === 'events') loadEventsTable();
    allEvents = allEvents.filter(e => e.id !== id);
    UI.renderRecentEvents(allEvents);
    loadDashboard();
  }

  /* ══════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════ */
  const autoLoggedIn = await tryAutoLogin();
  if (!autoLoggedIn) {
    authOverlay.classList.remove('hidden');
  }

  // Expose to global so other modules can call
  window.App = {
    viewEvent, editEvent, deleteEvent,
    onEventCreated, onEventUpdated, onEventDeleted,
  };

})();
