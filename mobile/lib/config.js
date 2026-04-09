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

  // Offline
  OFFLINE_CACHE_MAX_ALERTS: 100,
  DRAFT_AUTO_SAVE_INTERVAL_MS: 30000,
  SYNC_RETRY_INTERVAL_MS: 60000,
  MAX_DRAFTS: 20,

  // Photos
  MAX_PHOTOS: 5,

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

  // Supported languages (code → native name)
  LANGUAGES: {
    en: 'English',
    ar: 'العربية',
    ru: 'Русский',
    es: 'Español',
    fr: 'Français',
    tr: 'Türkçe',
    pt: 'Português',
  },

  // Default language (detect from device, fallback to English)
  DEFAULT_LANGUAGE: 'en',

  // Supported countries (alpha-2 → name in English)
  COUNTRIES: {
    EG: 'Egypt',
    RU: 'Russia',
    SA: 'Saudi Arabia',
    AE: 'UAE',
    IN: 'India',
    TR: 'Turkey',
    MX: 'Mexico',
    BR: 'Brazil',
    NG: 'Nigeria',
    KE: 'Kenya',
    PH: 'Philippines',
    MA: 'Morocco',
    TN: 'Tunisia',
    PK: 'Pakistan',
  },

  // L&F categories with icons
  ITEM_CATEGORIES: [
    { id: 'documents', icon: '📄' },
    { id: 'phone', icon: '📱' },
    { id: 'wallet', icon: '👛' },
    { id: 'keys', icon: '🔑' },
    { id: 'bag', icon: '🎒' },
    { id: 'electronics', icon: '💻' },
    { id: 'jewelry', icon: '💍' },
    { id: 'clothing', icon: '👕' },
    { id: 'glasses', icon: '👓' },
    { id: 'pet', icon: '🐾' },
    { id: 'other', icon: '📦' },
  ],

  // Structured item attributes for matching
  ITEM_COLORS: [
    'black', 'white', 'brown', 'red', 'blue', 'green',
    'yellow', 'orange', 'pink', 'purple', 'gray', 'gold', 'silver',
  ],

  ITEM_BRANDS: [
    'apple', 'samsung', 'huawei', 'xiaomi', 'nokia', 'sony',
    'gucci', 'louis_vuitton', 'nike', 'adidas',
    'unknown', 'other',
  ],

  // Deep linking
  DEEP_LINK_SCHEME: process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME || 'safecircle',

  // Notification urgency tiers
  URGENCY_TIERS: {
    CRITICAL: { color: '#DC2626', label: 'URGENT' },
    HIGH: { color: '#F59E0B', label: 'High' },
    MEDIUM: { color: '#6366F1', label: 'Medium' },
    LOW: { color: '#22C55E', label: 'Low' },
  },
};

// Convert lat/lng to a grid cell string for Socket.IO region rooms
export function getGridCell(latitude, longitude) {
  const latCell = Math.floor(latitude / CONFIG.GEO_GRID_SIZE) * CONFIG.GEO_GRID_SIZE;
  const lngCell = Math.floor(longitude / CONFIG.GEO_GRID_SIZE) * CONFIG.GEO_GRID_SIZE;
  return `${latCell.toFixed(2)},${lngCell.toFixed(2)}`;
}
