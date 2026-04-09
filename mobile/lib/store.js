import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme preference: 'system' | 'light' | 'dark'
export const useThemeStore = create((set, get) => ({
  preference: 'system', // 'system' | 'light' | 'dark'
  setPreference: async (pref) => {
    set({ preference: pref });
    try {
      await AsyncStorage.setItem('theme_preference', pref);
    } catch {}
  },
  loadPreference: async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_preference');
      if (saved && ['system', 'light', 'dark'].includes(saved)) {
        set({ preference: saved });
      }
    } catch {}
  },
}));

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

export const useLocationStore = create((set) => ({
  latitude: null,
  longitude: null,
  setLocation: (latitude, longitude) => set({ latitude, longitude }),
}));

export const useAlertStore = create((set) => ({
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts],
  })),
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter((a) => a.id !== id),
  })),
}));
