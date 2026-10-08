import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket = null;
const listeners = new Map();

/**
 * Dedicated Socket.IO service.
 * Events supported by the planned backend:
 *   incident:new | incident:updated
 *   road:blocked | road:updated
 *   vehicle:location | live:update
 */
export function connectSocket() {
  if (!SOCKET_URL) return null;
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1500,
  });

  // Re-bind any previously registered handlers
  for (const [event, handlers] of listeners.entries()) {
    for (const handler of handlers) {
      socket.on(event, handler);
    }
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function isSocketConnected() {
  return Boolean(socket?.connected);
}

/**
 * Subscribe to a socket event. Returns an unsubscribe function.
 */
export function onSocketEvent(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);

  if (socket) socket.on(event, handler);

  return () => {
    listeners.get(event)?.delete(handler);
    if (socket) socket.off(event, handler);
  };
}

export function emitSocket(event, payload) {
  if (socket?.connected) socket.emit(event, payload);
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  onSocketEvent,
  emitSocket,
};