// src/main.ts
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (import.meta.env.DEV) {
  console.log('MSW: Attempting to start service worker');
  import('./mocks/browser') 
    .then(({ worker }) => {
      worker.start({ onUnhandledRequest: 'bypass' }) 
        .then(() => {
          console.log('MSW: Service worker started successfully!');
          ReactDOM.createRoot(document.getElementById('root')!).render(
            <React.StrictMode>
              <App />
            </React.StrictMode>,
          );
        });
    })
    .catch((error) => {
      console.error('--- MSW: Failed to start service worker: ---', error);
      // Even if MSW fails, render your app
      ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    });
} else {
  // Production mode: Render your app directly
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}