import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Icon from './Icon';
import { Badge } from './ui';
import { useAuth } from '../context/AuthContext';
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

  return (
    <div className="app-shell">
      {menuOpen ? <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} /> : null}
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />

      <div className="main">
        <AppHeader onOpenSidebar={() => setMenuOpen((v) => !v)} />

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  const { isSuperAdmin, role } = useAuth();
  return (
    <BusinessProvider>
      <Shell />
      {isSuperAdmin ? (
        <div style={{ position: 'fixed', insetBlockEnd: 8, insetInlineStart: 8, zIndex: 50 }}>
          <Badge kind="active">
            <Icon name="shield" size={12} /> {role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Badge>
        </div>
      ) : null}
    </BusinessProvider>
  );
}
