// js/ui.js — Enhanced UI utilities

const UI = (() => {

  /* ─────────────────────────────────────────────
     DOM Helpers
  ───────────────────────────────────────────── */

  const $ = (id) => document.getElementById(id);

  const create = (tag, cls) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  };


  /* ─────────────────────────────────────────────
     Safe HTML escape
  ───────────────────────────────────────────── */

  function escHtml(str = "") {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return String(str).replace(/[&<>"']/g, m => map[m]);
  }


  /* ─────────────────────────────────────────────
     Time helpers
  ───────────────────────────────────────────── */

  function fmtTime(d) {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function fmtDateTime(s) {
    if (!s) return "—";
    const d = new Date(s);
    return (
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      fmtTime(d)
    );
  }


  /* ─────────────────────────────────────────────
     Toast System
  ───────────────────────────────────────────── */

  function toast(message, type = "info", duration = 4000) {

    const container = $("toast-container");
    if (!container) return;

    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️"
    };

    const el = create("div", `toast toast-${type}`);

    el.innerHTML = `
      <span>${icons[type] || icons.info}</span>
      <span>${escHtml(message)}</span>
    `;

    container.appendChild(el);

    const MAX_TOASTS = 5;
    if (container.children.length > MAX_TOASTS) {
      container.removeChild(container.firstChild);
    }

    setTimeout(() => {
      el.classList.add("out");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
    }, duration);
  }


  /* ─────────────────────────────────────────────
     WebSocket Status
  ───────────────────────────────────────────── */

  function setWSStatus(status) {

    const ind = $("ws-indicator");
    const label = $("ws-label");

    if (!ind || !label) return;

    ind.className = `ws-indicator ${status}`;

    label.textContent =
      status === "connected"
        ? "Live"
        : status === "disconnected"
        ? "Offline"
        : "Connecting…";
  }


  /* ─────────────────────────────────────────────
     Live Banner
  ───────────────────────────────────────────── */

  function updateLiveBanner(msg) {
    const el = $("live-banner-text");
    if (el) el.textContent = msg;
  }

  function flashLiveBanner(msg) {

    const el = $("live-banner-text");
    if (!el) return;

    el.textContent = msg;
    el.style.color = "var(--accent)";

    setTimeout(() => {
      el.style.color = "";
    }, 2500);
  }


  /* ─────────────────────────────────────────────
     Event Stream
  ───────────────────────────────────────────── */

  function addStreamItem({ type, event }) {

    const stream = $("event-stream");
    if (!stream) return;

    const empty = stream.querySelector(".stream-empty");
    if (empty) empty.remove();

    const icons = {
      created: "⚡",
      updated: "✏️",
      deleted: "🗑️",
      triggered: "🔥",
      system: "🔵"
    };

    const colors = {
      created: "var(--accent)",
      updated: "var(--blue)",
      deleted: "var(--red)",
      triggered: "var(--yellow)",
      system: "var(--text-3)"
    };

    const el = create("div", "stream-item new");

    el.innerHTML = `
      <span class="stream-icon">${icons[type] || "●"}</span>
      <div class="stream-body">
        <div class="stream-name" style="color:${colors[type] || "inherit"}">
          ${escHtml(event.event_name)}
        </div>
        <div class="stream-meta">
          ${type.toUpperCase()} · ${event.category || "general"} · ${fmtTime(new Date())}
        </div>
      </div>
    `;

    stream.prepend(el);

    setTimeout(() => el.classList.remove("new"), 1500);

    const items = stream.querySelectorAll(".stream-item");
    if (items.length > 50) items[items.length - 1].remove();
  }


  /* ─────────────────────────────────────────────
     Stats Badge
  ───────────────────────────────────────────── */

  function updateStatBadge() {

    const el = $("stat-total");
    if (!el) return;

    el.style.borderColor = "var(--accent)";

    setTimeout(() => {
      el.style.borderColor = "";
    }, 600);
  }


  /* ─────────────────────────────────────────────
     Notification Badge
  ───────────────────────────────────────────── */

  function setNotifBadge(count) {

    const badge = $("notif-badge");
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }


  /* ─────────────────────────────────────────────
     Badge helpers
  ───────────────────────────────────────────── */

  function priorityBadge(p) {
    return `<span class="badge badge-${p}">${p}</span>`;
  }

  function statusBadge(s) {
    return `<span class="badge badge-${s}">${s}</span>`;
  }


  /* ─────────────────────────────────────────────
     Events Table
  ───────────────────────────────────────────── */

  function renderEventsTable(events, currentUserId, isAdmin) {

    const tbody = $("events-tbody");
    if (!tbody) return;

    if (!events.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-row">No events found</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = events.map(e => `
      <tr data-id="${e.id}">
        <td><code>#${e.id}</code></td>
        <td><strong>${escHtml(e.event_name)}</strong></td>
        <td><code>${escHtml(e.category || "—")}</code></td>
        <td>${priorityBadge(e.priority)}</td>
        <td>${statusBadge(e.status)}</td>
        <td>
          <span class="creator-chip">
            <span>${e.creator_avatar || "🙂"}</span>
            <span>${escHtml(e.creator_name || "—")}</span>
          </span>
        </td>
        <td class="ts-cell">${fmtDateTime(e.created_at)}</td>
        <td>
          <div class="tbl-actions">
            <button class="btn btn-ghost btn-sm" onclick="App.viewEvent(${e.id})">View</button>
            ${
              isAdmin || e.created_by == currentUserId
                ? `
                  <button class="btn btn-ghost btn-sm" onclick="App.editEvent(${e.id})">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="App.deleteEvent(${e.id})">Del</button>
                `
                : ""
            }
          </div>
        </td>
      </tr>
    `).join("");
  }


  /* ─────────────────────────────────────────────
     Loading Button State
  ───────────────────────────────────────────── */

  function setLoading(btnId, loading) {

    const btn = $(btnId);
    if (!btn) return;

    const text = btn.querySelector(".btn-text");
    const loader = btn.querySelector(".btn-loader");

    btn.disabled = loading;

    text?.classList.toggle("hidden", loading);
    loader?.classList.toggle("hidden", !loading);
  }


  /* ─────────────────────────────────────────────
     Public API
  ───────────────────────────────────────────── */

  return {
    toast,
    setWSStatus,
    updateLiveBanner,
    flashLiveBanner,
    addStreamItem,
    updateStatBadge,
    setNotifBadge,
    priorityBadge,
    statusBadge,
    renderEventsTable,
    escHtml,
    fmtDateTime,
    setLoading
  };

})();

window.UI = UI;
