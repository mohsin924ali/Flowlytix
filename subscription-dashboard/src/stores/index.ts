/**
 * Redux Store Configuration
 * Centralized state management using Redux Toolkit
 * Following Instructions file standards with comprehensive type safety
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

// Import reducers
import authReducer from './authSlice';
import subscriptionReducer from './subscriptionSlice';
import analyticsReducer from './analyticsSlice';
import uiReducer from './uiSlice';

// Root reducer configuration
const rootReducer = combineReducers({
  auth: authReducer,
  subscriptions: subscriptionReducer,
  analytics: analyticsReducer,
  ui: uiReducer,
});

// Redux persist configuration
const persistConfig = {
  key: 'subscription-dashboard-root',
  version: 1,
  storage,
  whitelist: ['auth'], // Only persist auth data
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persistor for rehydration
export const persistor = persistStore(store);

// TypeScript type definitions
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks for typed usage
export { useAppDispatch, useAppSelector } from './hooks';
