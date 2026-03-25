// js/socket.js — Socket.io client manager
const SocketClient = (() => {
  let socket = null;
  const handlers = {};

  function connect(user) {
    if (socket?.connected) return;

    socket = io({ auth: { user }, transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      UI.setWSStatus('connected');
      UI.updateLiveBanner('🟢 Connected — listening for events');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      UI.setWSStatus('disconnected');
      UI.updateLiveBanner('🔴 Disconnected — attempting reconnect…');
    });

    socket.on('connect_error', () => {
      UI.setWSStatus('disconnected');
    });

    // ── Server events ──────────────────────────────────────
    socket.on('event:created', ({ event }) => {
      UI.flashLiveBanner(`⚡ NEW: "${event.event_name}"`);
      UI.addStreamItem({ type: 'created', event });
      UI.updateStatBadge();
      App.onEventCreated(event);
    });

    socket.on('event:updated', ({ event }) => {
      UI.flashLiveBanner(`✏️ UPDATED: "${event.event_name}"`);
      UI.addStreamItem({ type: 'updated', event });
      App.onEventUpdated(event);
    });

    socket.on('event:deleted', ({ eventId }) => {
      UI.flashLiveBanner(`🗑️ DELETED: event #${eventId}`);
      UI.addStreamItem({ type: 'deleted', event: { id: eventId, event_name: `#${eventId}` } });
      App.onEventDeleted(eventId);
    });

    socket.on('event:triggered', (data) => {
      UI.flashLiveBanner(`🔥 TRIGGERED: "${data.event_name}"`);
      UI.addStreamItem({ type: 'triggered', event: data });
    });

    socket.on('user:joined', ({ user, connectedClients }) => {
      document.getElementById('s-clients').textContent = connectedClients;
      UI.addStreamItem({ type: 'system', event: { event_name: `${user.name} joined`, category: 'system' } });
    });

    socket.on('user:left', ({ connectedClients }) => {
      document.getElementById('s-clients').textContent = connectedClients;
    });

    socket.on('pong', ({ ts }) => {
      console.log('Pong latency:', Date.now() - ts, 'ms');
    });
  }

  function disconnect() {
    socket?.disconnect();
    socket = null;
  }

  function triggerEvent(data) {
    socket?.emit('event:trigger', data);
  }

  function ping() { socket?.emit('ping'); }

  return { connect, disconnect, triggerEvent, ping };
})();

window.SocketClient = SocketClient;
