import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Icon from './Icon';
import { Badge } from './ui';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { BusinessProvider } from '../context/BusinessContext';
import AppHeader from './header/AppHeader';
import Sidebar from './sidebar/Sidebar';

/*
 * The authenticated shell: the admin rail (its own component, so navigation
 * stays out of the layout), the shared header and the page outlet. Only the
 * mobile drawer state lives here.
 */
function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);

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
      </div>
    </div>
  );
}

export default function Layout() {
  const { isSuperAdmin, role } = useAuth();
  const { t } = useI18n();
  return (
    <BusinessProvider>
      <Shell />
      {isSuperAdmin ? (
        <div style={{ position: 'fixed', insetBlockEnd: 8, insetInlineStart: 8, zIndex: 50 }}>
          <Badge kind="active">
            <Icon name="shield" size={12} /> {role === 'super_admin' ? t('role_super_admin') : t(`role_${role}`)}
          </Badge>
        </div>
      ) : null}
    </BusinessProvider>
  );
}
