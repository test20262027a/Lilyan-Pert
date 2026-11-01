import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { I18nProvider } from './i18n';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui';
import TooltipLayer from './components/tooltip/TooltipLayer';
import GlobalBrandedLoader from './components/brand/GlobalBrandedLoader';
import './styles.css';
import './scrollbars.css';
// Shared interactive states (hover / press / focus depth). Imported last so the
// shared vocabulary wins over page skins at equal specificity.
import './interaction.css';
// The one header design system: self-hosted header faces, then the shared
// 3D icon tile, alignment and typography every section header uses.
import './headers/headerFonts.css';
import './headers/headerSystem.css';
// The one premium 3D action plate: every admin button family (page actions,
// modal actions, confirm dialogs, toolbars) picks up its geometry, sheen,
// depth and states from here. Imported last so it wins over page skins.
import './buttons.css';

/* Safety net only: the branded loader below removes the first-paint splash the
   moment it paints (or as soon as nothing is loading). */
window.setTimeout(() => document.getElementById('boot-splash')?.remove(), 4000);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
            {/* The app's ONE loader: mounted once, here, above every route, so
                no page can swap it for a different size, position or variant
                and it never remounts between loading phases. */}
            <GlobalBrandedLoader />
            {/* One global tooltip bubble for every tooltip in the app. */}
            <TooltipLayer />
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
