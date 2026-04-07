import { io } from 'socket.io-client';
import { CONFIG, getGridCell } from './config';
import { useAlertStore } from './store';

let socket = null;
let currentRegion = null;

export function getSocket() {
  if (!socket) {
    socket = io(CONFIG.SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      // Re-join region on reconnect
      if (currentRegion) {
        socket.emit('join_region', currentRegion);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    // Real-time alert events
    socket.on('new_alert', (alert) => {
      useAlertStore.getState().addAlert(alert);
    });

    socket.on('alert_resolved', ({ id }) => {
      useAlertStore.getState().removeAlert(id);
    });
  }

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentRegion = null;
  }
}

export function joinRegion(latitude, longitude) {
  const cell = getGridCell(latitude, longitude);
  if (cell === currentRegion) return; // Already in this region

  const s = getSocket();
  if (currentRegion) {
    s.emit('leave_region', currentRegion);
  }
  currentRegion = cell;
  s.emit('join_region', cell);
}

export function watchReport(reportId) {
  const s = getSocket();
  s.emit('watch_report', reportId);
}

export function unwatchReport(reportId) {
  const s = getSocket();
  s.emit('unwatch_report', reportId);
}
