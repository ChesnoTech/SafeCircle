import { Platform } from 'react-native';

const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const CONFIG = {
  // Server
  API_URL: process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:3000/api`,
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || `http://${DEFAULT_HOST}:3000`,

  // Alerts
  DEFAULT_RADIUS_KM: 10,
  ALERT_REFRESH_INTERVAL_MS: 30000,

  // Grid cell size for Socket.IO region rooms (must match backend)
  GEO_GRID_SIZE: 0.01,

  // Upload
  MAX_PHOTO_QUALITY: 0.8,
  ALLOWED_IMAGE_TYPES: ['images'],

  // Theme colors
  COLORS: {
    primary: '#DC2626',
    warning: '#F59E0B',
    success: '#22C55E',
    info: '#6366F1',
    background: '#f5f5f5',
    card: '#fff',
    text: '#111',
    textSecondary: '#666',
    textMuted: '#888',
    border: '#e0e0e0',
    error: '#DC2626',
    danger: '#EF4444',
  },
};

// Convert lat/lng to a grid cell string for Socket.IO region rooms
export function getGridCell(latitude, longitude) {
  const latCell = Math.floor(latitude / CONFIG.GEO_GRID_SIZE) * CONFIG.GEO_GRID_SIZE;
  const lngCell = Math.floor(longitude / CONFIG.GEO_GRID_SIZE) * CONFIG.GEO_GRID_SIZE;
  return `${latCell.toFixed(2)},${lngCell.toFixed(2)}`;
}
