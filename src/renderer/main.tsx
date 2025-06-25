import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Main React Application Bootstrap - Minimal Authentication Only
 * No routing, no MUI - just the authentication system
 */
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
