// js/ui.js — UI utilities, rendering helpers, toast system
const UI = (() => {

  // ── Toast ────────────────────────────────────────────────
  function toast(message, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, duration);
  }

  // ── WebSocket status indicator ──────────────────────────
  function setWSStatus(status) {
    const ind   = document.getElementById('ws-indicator');
    const label = document.getElementById('ws-label');
    ind.className = `ws-indicator ${status}`;
    label.textContent = status === 'connected' ? 'Live' : status === 'disconnected' ? 'Offline' : 'Connecting…';
  }

  // ── Live banner ─────────────────────────────────────────
  function updateLiveBanner(msg) {
    document.getElementById('live-banner-text').textContent = msg;
  }
  function flashLiveBanner(msg) {
    const el = document.getElementById('live-banner-text');
    el.textContent = msg;
    el.style.color = 'var(--accent)';
    setTimeout(() => { el.style.color = ''; }, 2500);
  }

  // ── Event stream ────────────────────────────────────────
  function addStreamItem({ type, event }) {
    const stream = document.getElementById('event-stream');
    const empty  = stream.querySelector('.stream-empty');
    if (empty) empty.remove();

    const icons  = { created: '⚡', updated: '✏️', deleted: '🗑️', triggered: '🔥', system: '🔵' };
    const colors = { created: 'var(--accent)', updated: 'var(--blue)', deleted: 'var(--red)', triggered: 'var(--yellow)', system: 'var(--text-3)' };

    const el = document.createElement('div');
    el.className = 'stream-item new';
    el.innerHTML = `
      <span class="stream-icon">${icons[type] || '●'}</span>
      <div class="stream-body">
        <div class="stream-name" style="color:${colors[type] || 'inherit'}">${escHtml(event.event_name)}</div>
        <div class="stream-meta">${type.toUpperCase()} · ${event.category || 'general'} · ${fmtTime(new Date())}</div>
      </div>`;
    stream.prepend(el);

    setTimeout(() => el.classList.remove('new'), 1500);

    // Keep last 50 entries
    const items = stream.querySelectorAll('.stream-item');
    if (items.length > 50) items[items.length - 1].remove();
  }

  // ── Stats badge pulse ───────────────────────────────────
  function updateStatBadge() {
    const el = document.getElementById('stat-total');
    el.style.borderColor = 'var(--accent)';
    setTimeout(() => { el.style.borderColor = ''; }, 600);
  }

  // ── Notification badge ──────────────────────────────────
  function setNotifBadge(count) {
    const badge = document.getElementById('notif-badge');
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // ── Priority badge HTML ─────────────────────────────────
  function priorityBadge(p) {
    return `<span class="badge badge-${p}">${p}</span>`;
  }
  function statusBadge(s) {
    return `<span class="badge badge-${s}">${s}</span>`;
  }

  // ── Render events table ─────────────────────────────────
  function renderEventsTable(events, currentUserId, isAdmin) {
    const tbody = document.getElementById('events-tbody');
    if (!events.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="loading-row">No events found</td></tr>`;
      return;
    }
    tbody.innerHTML = events.map(e => `
      <tr data-id="${e.id}">
        <td><span style="font-family:var(--font-mono);color:var(--text-3)">#${e.id}</span></td>
        <td><strong>${escHtml(e.event_name)}</strong></td>
        <td><code>${escHtml(e.category || '—')}</code></td>
        <td>${priorityBadge(e.priority)}</td>
        <td>${statusBadge(e.status)}</td>
        <td>
          <span class="creator-chip">
            <span>${e.creator_avatar || '🙂'}</span>
            <span>${escHtml(e.creator_name || '—')}</span>
          </span>
        </td>
        <td class="ts-cell">${fmtDateTime(e.created_at)}</td>
        <td>
          <div class="tbl-actions">
            <button class="btn btn-ghost btn-sm" onclick="App.viewEvent(${e.id})">View</button>
            ${(isAdmin || e.created_by == currentUserId)
              ? `<button class="btn btn-ghost btn-sm" onclick="App.editEvent(${e.id})">Edit</button>
                 <button class="btn btn-danger btn-sm" onclick="App.deleteEvent(${e.id})">Del</button>`
              : ''}
          </div>
        </td>
      </tr>`).join('');
  }

  // ── Render logs ─────────────────────────────────────────
  function renderLogs(logs) {
    const container = document.getElementById('log-stream');
    if (!logs.length) {
      container.innerHTML = `<div class="loading-row">No log entries found</div>`;
      return;
    }
    container.innerHTML = logs.map(l => `
      <div class="log-item">
        <span class="log-ts">${fmtDateTime(l.timestamp)}</span>
        <span class="log-action-badge log-${l.action}">${l.action}</span>
        <span style="font-family:var(--font-mono);font-size:.78rem">${l.event_name ? escHtml(l.event_name.slice(0, 20)) : `#${l.event_id}`}</span>
        <span style="color:var(--text-2)">${escHtml(l.details || '—')}</span>
      </div>`).join('');
  }

  // ── Render recent events (mini list) ────────────────────
  function renderRecentEvents(events) {
    const el = document.getElementById('recent-events');
    if (!events.length) { el.innerHTML = `<div class="loading-row">No events yet</div>`; return; }
    el.innerHTML = events.slice(0, 10).map(e => `
      <div class="mini-item">
        <span class="mini-name">${escHtml(e.event_name)}</span>
        ${priorityBadge(e.priority)} ${statusBadge(e.status)}
      </div>`).join('');
  }

  // ── Render analytics charts ─────────────────────────────
  function renderCharts(stats) {
    const { totals, byCategory, recentActivity } = stats;
    const max = Math.max(totals.active, totals.pending, totals.completed, totals.failed) || 1;

    // Status chart
    const statusData = [
      { label: 'active',    val: totals.active,    cls: '' },
      { label: 'pending',   val: totals.pending,   cls: 'bar-yellow' },
      { label: 'completed', val: totals.completed, cls: 'bar-blue' },
      { label: 'failed',    val: totals.failed,    cls: 'bar-red' },
    ];
    document.getElementById('chart-status').innerHTML = `
      <div class="bar-chart">${statusData.map(d => barRow(d.label, d.val, max, d.cls)).join('')}</div>`;

    // Category chart
    const catMax = Math.max(...byCategory.map(c => c.count)) || 1;
    const catColors = ['', 'bar-yellow', 'bar-blue', 'bar-red', 'bar-purple'];
    document.getElementById('chart-category').innerHTML = `
      <div class="bar-chart">${byCategory.map((c, i) => barRow(c.category, c.count, catMax, catColors[i % catColors.length])).join('')}</div>`;

    // Activity chart (last 7 days)
    const actMax = Math.max(...recentActivity.map(r => r.count)) || 1;
    document.getElementById('chart-activity').innerHTML = `
      <div class="bar-chart">${recentActivity.map(r => barRow(r.day, r.count, actMax, '')).join('')}</div>`;
  }

  function barRow(label, val, max, cls) {
    const pct = Math.round((val / max) * 100);
    return `<div class="bar-row">
      <span class="bar-label">${escHtml(String(label))}</span>
      <div class="bar-track">
        <div class="bar-fill ${cls}" style="width:${Math.max(pct, 3)}%">${val}</div>
      </div>
    </div>`;
  }

  // ── Render notification dropdown ─────────────────────────
  function renderNotifications(notifs) {
    const list = document.getElementById('notif-list');
    if (!notifs.length) {
      list.innerHTML = `<div class="notif-empty">All caught up! 🎉</div>`;
      return;
    }
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
        ${!n.is_read ? '<div class="notif-item-dot"></div>' : '<div style="width:8px"></div>'}
        <div>
          <div class="notif-item-msg">${escHtml(n.message)}</div>
          <div class="notif-item-ts">${fmtDateTime(n.created_at)}</div>
        </div>
      </div>`).join('');
  }

  // ── Render event detail modal ────────────────────────────
  function renderEventDetail(e) {
    document.getElementById('modal-title').textContent = `Event #${e.id}`;
    document.getElementById('modal-body').innerHTML = `
      <div class="detail-grid">
        <div class="detail-field full">
          <label>Event Name</label>
          <value style="font-size:1.1rem;font-weight:700">${escHtml(e.event_name)}</value>
        </div>
        <div class="detail-field">
          <label>Category</label><value>${escHtml(e.category)}</value>
        </div>
        <div class="detail-field">
          <label>Priority</label><value>${priorityBadge(e.priority)}</value>
        </div>
        <div class="detail-field">
          <label>Status</label><value>${statusBadge(e.status)}</value>
        </div>
        <div class="detail-field">
          <label>Created By</label><value>${e.creator_avatar || '🙂'} ${escHtml(e.creator_name || '—')}</value>
        </div>
        <div class="detail-field">
          <label>Created At</label><value style="font-family:var(--font-mono);font-size:.82rem">${fmtDateTime(e.created_at)}</value>
        </div>
        <div class="detail-field full">
          <label>Description</label><value>${escHtml(e.description || '—')}</value>
        </div>
        ${e.payload ? `<div class="detail-field full">
          <label>Payload</label>
          <pre class="payload-pre">${escHtml(JSON.stringify(typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload, null, 2))}</pre>
        </div>` : ''}
      </div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  // ── Helpers ──────────────────────────────────────────────
  function escHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmtTime(d)     { return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function fmtDateTime(s) {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + fmtTime(d);
  }
  function setLoading(btnId, loading) {
    const btn    = document.getElementById(btnId);
    if (!btn) return;
    const text   = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    text?.classList.toggle('hidden', loading);
    loader?.classList.toggle('hidden', !loading);
  }

  return {
    toast, setWSStatus, updateLiveBanner, flashLiveBanner, addStreamItem,
    updateStatBadge, setNotifBadge, priorityBadge, statusBadge,
    renderEventsTable, renderLogs, renderRecentEvents, renderCharts,
    renderNotifications, renderEventDetail, escHtml, fmtDateTime, setLoading,
  };
})();

window.UI = UI;
