import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppAuthGate } from './components/AppAuthGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppAuthGate>
      <App />
    </AppAuthGate>
  </StrictMode>,
);
