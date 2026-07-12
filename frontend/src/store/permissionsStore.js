import { create } from 'zustand';
import api from '../api/client';

export const usePermissionsStore = create((set, get) => ({
  permissions: {},
  loaded: false,

  // Fetch permissions for current user role
  fetchPermissions: async (role) => {
    try {
      const data = await api.get(`/permissions/${role}`);
      set({ permissions: data, loaded: true });
    } catch (e) {
      console.error('Failed to load permissions');
    }
  },

  // Check if user has access to a module
  hasAccess: (module) => {
    const perms = get().permissions;
    const access = perms[module];
    return access && access !== 'No Access';
  },

  // Check if user has full access
  hasFullAccess: (module) => {
    const perms = get().permissions;
    return perms[module] === 'Full Access';
  },

  // Get access level string
  getAccessLevel: (module) => {
    const perms = get().permissions;
    return perms[module] || 'No Access';
  },

  // Update a permission locally (real-time)
  updatePermission: (module, access) => {
    set(state => ({
      permissions: { ...state.permissions, [module]: access }
    }));
  },

  reset: () => set({ permissions: {}, loaded: false }),
}));
