// socket/socketManager.js — Singleton socket.io accessor
let _io = null;

function init(io) {
  _io = io;

  io.on('connection', (socket) => {
    const user = socket.handshake.auth?.user || { name: 'Anonymous' };
    console.log(`🔌  Client connected   — socket: ${socket.id} | user: ${user.name}`);

    // Broadcast presence to everyone
    io.emit('user:joined', { socketId: socket.id, user, connectedClients: io.engine.clientsCount });

    // Client explicitly subscribes to a room / category
    socket.on('subscribe', (room) => {
      socket.join(room);
      socket.emit('subscribed', { room });
    });

    // Client sends a manual event trigger (producer mode)
    socket.on('event:trigger', async (data) => {
      console.log(`⚡  Manual trigger from ${socket.id}:`, data.event_name);
      io.emit('event:triggered', { ...data, triggeredAt: new Date().toISOString() });
    });

    // Ping / heartbeat
    socket.on('ping', () => socket.emit('pong', { ts: Date.now() }));

    socket.on('disconnect', (reason) => {
      console.log(`🔌  Client disconnected — socket: ${socket.id} | reason: ${reason}`);
      io.emit('user:left', { socketId: socket.id, connectedClients: io.engine.clientsCount });
    });
  });
}

function getIO() {
  if (!_io) throw new Error('Socket.io not initialised — call init(io) first');
  return _io;
}

module.exports = { init, getIO };
