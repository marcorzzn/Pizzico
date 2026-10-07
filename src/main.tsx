import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for Offline-First PWA capabilities
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // Graceful ignore in dev or restricted environments
      console.debug('ServiceWorker registration skipped:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
