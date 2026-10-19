import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { Badge } from './ui';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { BusinessProvider, useBusiness } from '../context/BusinessContext';
import AppHeader from './header/AppHeader';

/*
 * Navigation mirrors the business modules, grouped the way the dashboard
 * presents them: a few direct destinations and three expandable groups. Every
 * entry points at a real route and carries the minimum role that may see it.
 */
const NAV = [
  { to: '/', icon: 'dashboard', key: 'nav_dashboard', exact: true },
  { to: '/orders', icon: 'cart', key: 'nav_orders' },
  { to: '/menu-preview', icon: 'home', key: 'nav_view_menu', preview: true },
  {
    key: 'nav_group_menu',
    icon: 'wrench',
    children: [
      { to: '/menu', icon: 'book', key: 'nav_menu' },
      { to: '/order-menu', icon: 'coffee', key: 'nav_order_menu' },
      { to: '/tables', icon: 'qr', key: 'nav_tables' },
      /*
       * Promotions live on the existing marketing page, on its promotions tab:
       * this entry carries that tab in its link so the module is reached from
       * Menu Management without a second page or route. Editing promotions is
       * manager work, the same role the page and the API already enforce.
       */
      { to: '/marketing', search: '?tab=promotions', icon: 'tag', key: 'nav_promotions', min: 'manager' },
    ],
  },
  {
    key: 'nav_group_reports',
    icon: 'chart',
    children: [
      { to: '/reviews', icon: 'star', key: 'nav_reviews' },
    ],
  },
  {
    key: 'nav_group_business',
    icon: 'building',
    children: [
      { to: '/settings', icon: 'settings', key: 'nav_settings' },
      { to: '/users', icon: 'users', key: 'nav_users', min: 'manager' },
      { to: '/backups', icon: 'database', key: 'nav_backups', min: 'owner' },
    ],
  },
];

/** Ticking clock isolated in its own component so it never rerenders the page. */
export function LiveClock({ timeZone, className }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);
  const now = new Date();
  const text = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone || undefined,
  }).format(now);
  return <span className={className}>{text}</span>;
}

const COLLAPSE_KEY = 'lilyan.sidebar.collapsed';

function canSee(item, { isManager, isOwner }) {
  if (!item.min) return true;
  if (item.min === 'owner') return isOwner;
  return isManager;
}

/** Finds the navigation entry (group child included) that owns a path. */
function titleKeyFor(pathname) {
  for (const item of NAV) {
    if (item.to && (item.exact ? pathname === item.to : pathname.startsWith(item.to))) return item.key;
    for (const child of item.children || []) {
      if (pathname === child.to || pathname.startsWith(`${child.to}/`)) return child.key;
    }
  }
  return 'nav_dashboard';
}

function Shell() {
  const { t } = useI18n();
  const { memberships, businessId, isManager, isOwner } = useAuth();
  const { business } = useBusiness();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1',
  );
  const [openGroups, setOpenGroups] = useState(() => {
    const key = titleKeyFor(location.pathname);
    const group = NAV.find((item) => (item.children || []).some((c) => c.key === key));
    return group ? { [group.key]: true } : {};
  });

  useEffect(() => {
    setMenuOpen(false);
    // Opening a group for the active page keeps the tree self-explanatory.
    const key = titleKeyFor(location.pathname);
    const group = NAV.find((item) => (item.children || []).some((c) => c.key === key));
    if (group) setOpenGroups((state) => ({ ...state, [group.key]: true }));
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      return !v;
    });
  };

  const membership = memberships.find((m) => m.business_id === businessId);
  const title = titleKeyFor(location.pathname);
  const allowed = (item) => canSee(item, { isManager, isOwner });

  return (
    <div className="app-shell">
      {menuOpen ? <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="brand">
          <span className="brand__mark">
            {business?.logo_url ? (
              <img src={business.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
            ) : (
              'LP'
            )}
          </span>
          <span className="brand__text">
            <div className="brand__name">{business?.name_en || business?.name || t('app_name')}</div>
            <div className="brand__sub">{membership ? t(`role_${membership.role}`) : t('tagline')}</div>
          </span>
          <button
            type="button"
            className="nav-collapse"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t('nav_expand') : t('nav_collapse')}
            title={collapsed ? t('nav_expand') : t('nav_collapse')}
          >
            <Icon name="chevronsLeft" size={15} className={collapsed ? 'icon--dir' : ''} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.filter(allowed).map((item) => {
            if (item.preview) {
              // The customer menu is a public page of this business.
              return (
                <a
                  key={item.key}
                  className="nav-link"
                  href={business ? `/m/${business.slug}` : '#'}
                  target="_blank"
                  rel="noreferrer"
                  title={t(item.key)}
                  onClick={(e) => {
                    if (!business) e.preventDefault();
                    setMenuOpen(false);
                  }}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{t(item.key)}</span>
                </a>
              );
            }
            if (!item.children) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                  title={t(item.key)}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{t(item.key)}</span>
                </NavLink>
              );
            }

            const children = item.children.filter(allowed);
            const isOpen = Boolean(openGroups[item.key]);
            const isCurrent = children.some((c) => c.key === title);
            return (
              <div key={item.key}>
                <button
                  type="button"
                  className={`nav-link nav-group ${isCurrent ? 'is-current' : ''}`}
                  aria-expanded={isOpen}
                  title={t(item.key)}
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      localStorage.setItem(COLLAPSE_KEY, '0');
                    }
                    setOpenGroups((state) => ({ ...state, [item.key]: !isOpen }));
                  }}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{t(item.key)}</span>
                  <Icon name="chevronDown" size={14} className={`nav-group__caret ${isOpen ? 'is-open' : ''}`} />
                </button>
                {isOpen ? (
                  <div className="nav-children">
                    {children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={`${child.to}${child.search || ''}`}
                        className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {/* Submenu entries keep the dot convention; one may opt
                            into its own small outlined mark instead. */}
                        {child.icon ? (
                          <Icon name={child.icon} size={14} className="nav-child-icon" />
                        ) : (
                          <span className="nav-dot" />
                        )}
                        <span>{t(child.key)}</span>
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="sidebar__spacer" />
      </aside>

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
