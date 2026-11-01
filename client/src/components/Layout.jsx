import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BusinessProvider, useBusiness } from '../context/BusinessContext';
import GlobalBrandedLoader from './brand/GlobalBrandedLoader';
import useDocumentMetadata from '../hooks/useDocumentMetadata';
import AppHeader from './header/AppHeader';
import Sidebar from './sidebar/Sidebar';
import AnimatedBackToTop from './backToTop/AnimatedBackToTop';

/*
 * The authenticated shell: the admin rail (its own component, so navigation
 * stays out of the layout), the shared header and the page outlet. Only the
 * mobile drawer state lives here.
 */
function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { business, loading, error, reload } = useBusiness();

  // The tab shows this section and this business, in this language.
  useDocumentMetadata(business);

  // An open mobile drawer owns the screen, so the page behind it must not scroll.
  useEffect(() => {
    document.body.classList.toggle('nav-drawer-open', menuOpen);
    return () => document.body.classList.remove('nav-drawer-open');
  }, [menuOpen]);

  return (
    <div className="app-shell">
      {menuOpen ? <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} /> : null}
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />

      <div className="main">
        <AppHeader sidebarOpen={menuOpen} onOpenSidebar={() => setMenuOpen((v) => !v)} />

        <main className="page">
          <Outlet />
        </main>

        {/* One control for every admin screen. */}
        <AnimatedBackToTop />
      </div>

      {/* The business record is the theme, the languages and the identity of the
          whole shell, so the screen waits for it — and a failed read becomes a
          localised retry instead of an endless animation. */}
      <GlobalBrandedLoader
        isLoading={loading && !business}
        error={error && !business ? error : null}
        onRetry={() => reload()}
      />
    </div>
  );
}

export default function Layout() {
  return (
    <BusinessProvider>
      <Shell />
    </BusinessProvider>
  );
}
