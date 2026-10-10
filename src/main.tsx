import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against Firebase Auth internal popup timeout assertion bug in iframe environment
window.addEventListener('error', (event) => {
  const msg = event?.message || (event?.error && String(event.error)) || '';
  if (msg.includes('Pending promise was never set')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    console.warn('[Firebase Auth] Ignored known internal popup timeout assertion in iframe:', msg);
    return true;
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = reason?.message || String(reason || '');
  if (msg.includes('Pending promise was never set')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    console.warn('[Firebase Auth] Ignored known internal popup timeout unhandled rejection in iframe:', msg);
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
