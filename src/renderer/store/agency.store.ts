/**
 * Agency Store
 *
 * Zustand store for managing current agency state and agency switching.
 * Handles the selected agency for multi-tenant operations.
 *
 * @domain Agency Management
 * @architecture Clean Architecture - Infrastructure Layer
 * @version 1.0.0
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Agency } from '../services/AgencyService';

/**
 * Agency store state interface
 */
export interface AgencyState {
  /** Currently selected agency */
  currentAgency: Agency | null;
  /** Whether agency switching is in progress */
  switching: boolean;
  /** Last switch timestamp */
  lastSwitched: number | null;
}

/**
 * Agency store actions interface
 */
export interface AgencyActions {
  /** Set the current agency */
  setCurrentAgency: (agency: Agency | null) => void;
  /** Switch to a different agency */
  switchToAgency: (agency: Agency) => Promise<void>;
  /** Clear current agency */
  clearCurrentAgency: () => void;
  /** Check if user can switch agencies */
  canSwitchAgencies: () => boolean;
  /** Initialize with first available agency if none selected */
  initializeWithFirstAgency: (agencies: Agency[]) => void;
}

/**
 * Combined agency store interface
 */
export interface AgencyStore extends AgencyState, AgencyActions {}

/**
 * Initial state
 */
const initialState: AgencyState = {
  currentAgency: null,
  switching: false,
  lastSwitched: null,
};

/**
 * Agency store implementation
 */
export const useAgencyStore = create<AgencyStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        /**
         * Set the current agency
         */
        setCurrentAgency: (agency: Agency | null) => {
          set(
            (state) => ({
              ...state,
              currentAgency: agency,
              lastSwitched: agency ? Date.now() : null,
            }),
            false,
            'agency/setCurrentAgency'
          );
        },

        /**
         * Switch to a different agency
         */
        switchToAgency: async (agency: Agency) => {
          try {
            set(
              (state) => ({
                ...state,
                switching: true,
              }),
              false,
              'agency/switchToAgency/start'
            );

            // TODO: In a real implementation, you might need to:
            // 1. Validate user has access to this agency
            // 2. Switch database connections
            // 3. Clear cached data from previous agency
            // 4. Reload necessary data for new agency

            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 500));

            set(
              (state) => ({
                ...state,
                currentAgency: agency,
                switching: false,
                lastSwitched: Date.now(),
              }),
              false,
              'agency/switchToAgency/success'
            );

            // Notify other parts of the application about agency switch
            window.dispatchEvent(
              new CustomEvent('agencyChanged', {
                detail: { agency, previousAgency: get().currentAgency },
              })
            );
          } catch (error) {
            set(
              (state) => ({
                ...state,
                switching: false,
              }),
              false,
              'agency/switchToAgency/error'
            );
            throw error;
          }
        },

        /**
         * Clear current agency
         */
        clearCurrentAgency: () => {
          set(
            (state) => ({
              ...state,
              currentAgency: null,
              lastSwitched: null,
            }),
            false,
            'agency/clearCurrentAgency'
          );
        },

        /**
         * Check if user can switch agencies
         */
        canSwitchAgencies: () => {
          // This would typically check user permissions
          // For now, we'll implement the logic in the component
          return true;
        },

        /**
         * Initialize with first available agency if none selected
         */
        initializeWithFirstAgency: (agencies: Agency[]) => {
          const currentState = get();
          if (!currentState.currentAgency && agencies.length > 0) {
            const firstAgency = agencies[0];
            if (firstAgency) {
              currentState.setCurrentAgency(firstAgency);
            }
          }
        },
      }),
      {
        name: 'agency-store',
        // Only persist the current agency, not switching state
        partialize: (state) => ({
          currentAgency: state.currentAgency,
          lastSwitched: state.lastSwitched,
        }),
      }
    ),
    {
      name: 'agency-store',
    }
  )
);

/**
 * Agency store selectors
 */
export const agencySelectors = {
  // State selectors
  currentAgency: (state: AgencyStore) => state.currentAgency,
  switching: (state: AgencyStore) => state.switching,
  lastSwitched: (state: AgencyStore) => state.lastSwitched,

  // Computed selectors
  hasCurrentAgency: (state: AgencyStore) => state.currentAgency !== null,
  currentAgencyId: (state: AgencyStore) => state.currentAgency?.id || null,
  currentAgencyName: (state: AgencyStore) => state.currentAgency?.name || null,
  currentAgencyStatus: (state: AgencyStore) => state.currentAgency?.status || null,
};
