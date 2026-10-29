import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppAuthGate } from './components/AppAuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global error handlers to prevent unhandled 'Script error.' crashes
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message === 'Script error.' || event.message?.includes('Script error')) {
      console.warn('[Global Error Handler] Caught cross-origin script error:', event);
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Global Promise Rejection Handler] Caught unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppAuthGate>
        <App />
      </AppAuthGate>
    </ErrorBoundary>
  </StrictMode>,
);
