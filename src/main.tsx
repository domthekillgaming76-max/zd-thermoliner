import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { bootstrapInstalledVersion } from './lib/appVersion';
import { markStandaloneRoot } from './lib/appMode';
import { installCryptoPolyfill } from './lib/cryptoPolyfill';
import { registerServiceWorker } from './services/updateService';

installCryptoPolyfill();
markStandaloneRoot();
bootstrapInstalledVersion();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void registerServiceWorker();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
