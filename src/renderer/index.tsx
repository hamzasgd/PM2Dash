import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ConnectionProvider } from './context/ConnectionContext';

// Create root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
}

// Render the app
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <ConnectionProvider>
      <App />
    </ConnectionProvider>
  </React.StrictMode>
); 