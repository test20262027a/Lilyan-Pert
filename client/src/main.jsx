import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { I18nProvider } from './i18n';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui';
import TooltipLayer from './components/tooltip/TooltipLayer';
import './styles.css';
import './scrollbars.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
            {/* One global tooltip bubble for every tooltip in the app. */}
            <TooltipLayer />
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
