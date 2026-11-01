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
  const { business, error, reload } = useBusiness();

  // The tab shows this section and this business, in this language.
  useDocumentMetadata(business);

  // An open mobile drawer owns the screen, so the page behind it must not scroll.
  useEffect(() => {
    document.body.classList.toggle('nav-drawer-open', menuOpen);
    return () => document.body.classList.remove('nav-drawer-open');
  }, [menuOpen]);

  /* The business record is the theme, the languages and the identity of the
     whole shell. Nothing of it is painted until that record is here — the
     appearance is already on the document by then (BusinessContext applies it
     before handing the record over), so the shell's very first frame is the
     saved theme, never a frame of the previous one behind a translucent
     overlay. A failed read becomes a localised retry instead of an endless
     animation. */
  if (!business) {
    /* Loading is the root overlay's job — announcing it there means the shell
       never paints a second loader next to it. Only a failure, which the global
       signal cannot express, gets its own copy of the same fixed composition. */
    return error ? (
      <GlobalBrandedLoader
        isLoading={false}
        error={error}
        onRetry={() => reload()}
      />
    ) : null;
  }

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
