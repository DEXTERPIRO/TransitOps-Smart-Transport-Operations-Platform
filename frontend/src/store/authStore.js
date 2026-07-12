import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  (set) => ({
    user: null,
    accessToken: null,
    theme: 'light',
    language: localStorage.getItem('language') || 'en',
    setAuth: (user, accessToken) => set({ user, accessToken }),
    logout: () => set({ user: null, accessToken: null }),
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((s) => ({
      theme: s.theme === 'dark' ? 'light' : 'dark'
    })),
    setLanguage: (language) => {
      localStorage.setItem('language', language);
      set({ language });
    },
  }),
  { name: 'transitops-auth' }
));
