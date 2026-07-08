import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { APP_VERSION } from './lib/appVersion';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`/sw.js?v=${APP_VERSION}`)
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[Z&D PWA] update available');
            }
          });
        });

        setInterval(() => {
          void registration.update();
        }, 60_000);
      })
      .catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
