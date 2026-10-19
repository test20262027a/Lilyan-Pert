import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { Badge, Spinner, useToast } from './ui';
import { localized, useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { BusinessProvider, useBusiness } from '../context/BusinessContext';
import { get, post, put } from '../api';
import { applyTheme } from '../theme';
import { playSound } from '../sound';

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
    ],
  },
  {
    key: 'nav_group_reports',
    icon: 'chart',
    children: [
      { to: '/reviews', icon: 'star', key: 'nav_reviews' },
      { to: '/marketing', icon: 'megaphone', key: 'nav_marketing' },
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

function NotificationsBell() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const seenRef = useRef(null);
  const { business } = useBusiness();
  const soundEnabled = business?.notification_settings?.sound_enabled !== false;
  const soundKey = business?.notification_settings?.sound_key;

  const load = useCallback(async () => {
    try {
      const data = await get('/manage/notifications');
      const list = data.notifications || [];
      setItems(list);
      setUnread(data.unread || 0);

      const newest = list[0];
      if (newest) {
        if (seenRef.current === null) {
          seenRef.current = newest.id; // first load establishes the baseline
        } else if (newest.id !== seenRef.current) {
          seenRef.current = newest.id;
          // In-app alert for the newest event; sound follows the saved setting.
          if (newest.type === 'new_order') {
            if (soundEnabled) playSound(soundKey);
            toast.success(`${t('dash_new_orders')} · #${newest.order_number || ''}`.trim());
          }
        }
      }
    } catch {
      /* silently ignore polling errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled, soundKey, locale]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const markAll = async () => {
    await post('/manage/notifications/read', {});
    load();
  };

  return (
    <span className="bell-wrap">
      <button
        type="button"
        className="btn btn--icon"
        aria-label={t('dash_status_notifications')}
        title={t('dash_status_notifications')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={18} />
        {unread > 0 ? <span className="bell__dot">{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="dropdown" role="menu">
          <div className="dropdown__head">
            <span>{t('dash_status_notifications')}</span>
            <button className="btn btn--ghost btn--sm" onClick={markAll}>
              {t('action_clear')}
            </button>
          </div>
          <div className="dropdown__list">
            {items.length === 0 ? (
              <div className="dropdown__item">{t('dash_no_notifications')}</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  className={`dropdown__item ${n.read_at ? '' : 'is-unread'}`}
                  style={{ display: 'block', width: '100%', textAlign: 'start', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={async () => {
                    setOpen(false);
                    await post('/manage/notifications/read', { id: n.id });
                    load();
                    if (n.order_id) navigate(`/orders/${n.order_id}`);
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    <Icon name={n.type === 'new_order' ? 'receipt' : 'refresh'} size={13} />{' '}
                    {n.type === 'new_order' ? t('dash_new_orders') : t('status_change')}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                    #{n.order_number} {n.body ? `· ${n.body}` : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </span>
  );
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
  const { t, locale, setLocale, LOCALES } = useI18n();
  const { user, logout, memberships, businessId, isManager, isOwner } = useAuth();
  const { business, setBusiness } = useBusiness();
  const location = useLocation();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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
    setUserOpen(false);
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

  const themeMode = business?.theme?.mode === 'dark' ? 'dark' : 'light';
  const toggleTheme = async () => {
    if (!business || busy) return;
    // The next mode follows what is actually applied, so a quick second click
    // can never flip back from a stale saved value.
    const applied = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = { ...(business.theme || {}), mode: applied === 'dark' ? 'light' : 'dark' };
    applyTheme(next); // instant feedback, then persisted
    setBusy(true);
    try {
      const saved = await put('/business', { theme: next });
      if (saved?.business) setBusiness(saved.business);
    } catch {
      applyTheme(business.theme);
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const soundEnabled = business?.notification_settings?.sound_enabled !== false;
  const toggleSound = async () => {
    if (!business) return;
    const next = { ...(business.notification_settings || {}), sound_enabled: !soundEnabled };
    setBusiness({ ...business, notification_settings: next });
    if (!soundEnabled) playSound(next.sound_key); // preview on the same gesture
    try {
      await put('/dashboard/notification-settings', { sound_enabled: !soundEnabled });
    } catch {
      setBusiness(business);
      toast.error(t('error_generic'));
    }
  };

  const membership = memberships.find((m) => m.business_id === businessId);
  const title = titleKeyFor(location.pathname);
  const businessName = localized(business, 'name', locale) || business?.name || t('app_name');
  const initials = (user?.full_name || user?.email || '?').trim().charAt(0).toUpperCase();
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
                        to={child.to}
                        className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="nav-dot" />
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
        <header className="topbar">
          <button
            className="btn btn--icon sidebar-mobile-toggle"
            aria-label={t('label_actions')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name="layers" size={18} />
          </button>
          {/* Branding + the current page, kept on a single compact row. */}
          {business ? (
            <div className="topbar__brand">
              <span className="topbar__logo">
                {business.logo_url ? <img src={business.logo_url} alt="" /> : 'LP'}
              </span>
              <div className="topbar__brand-text">
                <span className="topbar__brand-name" title={businessName}>{businessName}</span>
                <span className="topbar__brand-sub">{t(title)}</span>
              </div>
            </div>
          ) : (
            <span className="topbar__title">{t(title)}</span>
          )}
          <span className="topbar__spacer" />

          <div className="topbar__tools">
            <span className="usermenu">
              <button
                type="button"
                className="avatar"
                aria-label={t('auth_account')}
                title={user?.email || t('auth_account')}
                onClick={() => setUserOpen((v) => !v)}
              >
                {initials}
              </button>
              {userOpen ? (
                <div className="dropdown dropdown--sm" role="menu">
                  <div className="dropdown__head">
                    <span>{membership ? t(`role_${membership.role}`) : t('auth_account')}</span>
                    <Badge kind={themeMode === 'dark' ? 'inactive' : 'active'}>
                      {themeMode === 'dark' ? t('theme_dark') : t('theme_light')}
                    </Badge>
                  </div>
                  <div className="dropdown__item" style={{ color: 'var(--muted)' }}>
                    {user?.email}
                  </div>
                  <button type="button" className="dropdown__item--btn" onClick={toggleTheme} disabled={busy}>
                    <Icon name={themeMode === 'dark' ? 'sun' : 'moon'} size={14} />{' '}
                    {themeMode === 'dark' ? t('theme_light') : t('theme_dark')}
                  </button>
                  <button type="button" className="dropdown__item--btn" onClick={() => logout()}>
                    <Icon name="logout" size={14} /> {t('auth_logout')}
                  </button>
                </div>
              ) : null}
            </span>

            <button
              type="button"
              className="btn btn--icon"
              onClick={toggleTheme}
              disabled={busy || !business}
              aria-label={themeMode === 'dark' ? t('theme_light') : t('theme_dark')}
              title={themeMode === 'dark' ? t('theme_light') : t('theme_dark')}
            >
              {busy ? <Spinner size={16} /> : <Icon name={themeMode === 'dark' ? 'sun' : 'moon'} size={18} />}
            </button>

            <NotificationsBell />

            <button
              type="button"
              className="btn btn--icon"
              onClick={toggleSound}
              disabled={!business}
              aria-label={t('dash_sound')}
              aria-pressed={soundEnabled}
              title={`${t('dash_sound')}: ${soundEnabled ? t('label_active') : t('label_inactive')}`}
            >
              <Icon name={soundEnabled ? 'volume' : 'volumeOff'} size={18} />
            </button>

            <span className="lang-select">
              <Icon name="globe" size={15} />
              <select
                className="select"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                aria-label={t('label_language')}
              >
                {LOCALES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </header>

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
