import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA / offline support.
// onUpdate fires when a new version is waiting — App.js dispatches a toast.
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    window.dispatchEvent(new CustomEvent('swUpdateReady', { detail: registration }));
  },
  onSuccess: () => {
    console.log('[SW] App cached for offline use.');
  },
});

reportWebVitals();
