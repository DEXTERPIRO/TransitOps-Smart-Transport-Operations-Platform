import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  (set) => ({
    user: null,
    accessToken: null,
    theme: 'dark',
    setAuth: (user, accessToken) => set({ user, accessToken }),
    logout: () => set({ user: null, accessToken: null }),
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((s) => ({
      theme: s.theme === 'dark' ? 'light' : 'dark'
    })),
  }),
  { name: 'transitops-auth' }
));
