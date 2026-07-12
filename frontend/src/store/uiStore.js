import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  activeModal: null,
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  modalData: null,
}));
