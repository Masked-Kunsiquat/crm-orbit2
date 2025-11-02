import { create } from 'zustand';

/**
 * Global UI State Store
 * Handles theme, authentication status, and UI preferences
 *
 * Note: This store is being integrated alongside existing Context providers.
 * Future work will migrate SettingsContext and AuthContext functionality here.
 */
export const useAppStore = create((set, get) => ({
  // Theme state (integrates with existing ThemeContext)
  theme: 'system', // 'light' | 'dark' | 'system'

  // Authentication state
  isAuthenticated: false,
  isAuthChecking: true,

  // UI state
  sidebarOpen: false,
  activeTab: 'contacts',

  // Search state (global search bar)
  globalSearchQuery: '',

  // Actions
  setTheme: (theme) => set({ theme }),

  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  setAuthChecking: (isAuthChecking) => set({ isAuthChecking }),

  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

  // Initialize auth state (placeholder - will integrate with authService later)
  initializeAuth: async () => {
    try {
      // TODO: Integrate with authService once migration is complete
      // For now, just mark as not checking
      set({ isAuthenticated: false, isAuthChecking: false });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isAuthenticated: false, isAuthChecking: false });
    }
  },

  // Logout action (placeholder - will integrate with authService later)
  logout: async () => {
    try {
      // TODO: Integrate with authService once migration is complete
      set({ isAuthenticated: false });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },
}));
