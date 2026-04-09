import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from './config';

const KEYS = {
  CACHED_ALERTS: 'safecircle_cached_alerts',
  DRAFTS: 'safecircle_drafts',
  SYNC_QUEUE: 'safecircle_sync_queue',
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Alert caching ---

export async function cacheAlerts(alerts) {
  const sliced = alerts.slice(0, CONFIG.OFFLINE_CACHE_MAX_ALERTS);
  await AsyncStorage.setItem(KEYS.CACHED_ALERTS, JSON.stringify({
    alerts: sliced,
    cachedAt: Date.now(),
  }));
}

export async function getCachedAlerts() {
  const raw = await AsyncStorage.getItem(KEYS.CACHED_ALERTS);
  if (!raw) return { alerts: [], cachedAt: null };
  return JSON.parse(raw);
}

// --- Drafts ---

export async function saveDraft(type, data) {
  const drafts = await getDrafts();
  const existing = drafts.findIndex((d) => d.id === data.id);
  const draft = {
    id: data.id || generateId(),
    type,
    data,
    updatedAt: Date.now(),
  };

  if (existing >= 0) {
    drafts[existing] = draft;
  } else {
    if (drafts.length >= CONFIG.MAX_DRAFTS) {
      drafts.shift(); // remove oldest
    }
    drafts.push(draft);
  }

  await AsyncStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  return draft;
}

export async function getDrafts() {
  const raw = await AsyncStorage.getItem(KEYS.DRAFTS);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function deleteDraft(id) {
  const drafts = await getDrafts();
  const filtered = drafts.filter((d) => d.id !== id);
  await AsyncStorage.setItem(KEYS.DRAFTS, JSON.stringify(filtered));
}

// --- Sync queue ---

export async function addToSyncQueue(item) {
  const queue = await getSyncQueue();
  queue.push({
    id: generateId(),
    ...item,
    queuedAt: Date.now(),
  });
  await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
}

export async function getSyncQueue() {
  const raw = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function removeFromSyncQueue(id) {
  const queue = await getSyncQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
}
