import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { applyThemeToDOM, getStoredTheme } from './app/theme';
import './index.css';

// Initialize theme before render to prevent flash
applyThemeToDOM(getStoredTheme());

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
