/**
 * UI Slice
 * Manages UI state using Redux Toolkit
 * Following Instructions file standards with comprehensive UI management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
}

interface Modal {
  id: string;
  isOpen: boolean;
  data?: any;
}

interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  loading: boolean;
  notifications: Notification[];
  modals: Record<string, Modal>;
  breadcrumbs: Array<{ label: string; href?: string }>;
  pageTitle: string;
}

const initialState: UIState = {
  theme: 'light',
  sidebarCollapsed: false,
  loading: false,
  notifications: [],
  modals: {},
  breadcrumbs: [],
  pageTitle: 'Dashboard',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme management
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },

    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },

    // Sidebar management
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(action.payload));
    },

    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(state.sidebarCollapsed));
    },

    // Loading management
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Notification management
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      state.notifications.push(notification);
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },

    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Modal management
    openModal: (state, action: PayloadAction<{ id: string; data?: any }>) => {
      const { id, data } = action.payload;
      state.modals[id] = {
        id,
        isOpen: true,
        data,
      };
    },

    closeModal: (state, action: PayloadAction<string>) => {
      const modalId = action.payload;
      if (state.modals[modalId]) {
        state.modals[modalId]!.isOpen = false;
      }
    },

    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((modalId) => {
        state.modals[modalId].isOpen = false;
      });
    },

    // Navigation management
    setBreadcrumbs: (state, action: PayloadAction<Array<{ label: string; href?: string }>>) => {
      state.breadcrumbs = action.payload;
    },

    setPageTitle: (state, action: PayloadAction<string>) => {
      state.pageTitle = action.payload;
      document.title = `${action.payload} - Subscription Dashboard`;
    },

    // Initialize UI state from localStorage
    initializeUI: (state) => {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        state.theme = savedTheme;
      }

      const savedSidebarState = localStorage.getItem('sidebarCollapsed');
      if (savedSidebarState) {
        state.sidebarCollapsed = JSON.parse(savedSidebarState);
      }
    },
  },
});

// Export actions
export const {
  setTheme,
  toggleTheme,
  setSidebarCollapsed,
  toggleSidebar,
  setLoading,
  addNotification,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  closeAllModals,
  setBreadcrumbs,
  setPageTitle,
  initializeUI,
} = uiSlice.actions;

// Selectors
export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectLoading = (state: { ui: UIState }) => state.ui.loading;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectModals = (state: { ui: UIState }) => state.ui.modals;
export const selectModal = (modalId: string) => (state: { ui: UIState }) => state.ui.modals[modalId];
export const selectBreadcrumbs = (state: { ui: UIState }) => state.ui.breadcrumbs;
export const selectPageTitle = (state: { ui: UIState }) => state.ui.pageTitle;

// Export reducer
export default uiSlice.reducer;
