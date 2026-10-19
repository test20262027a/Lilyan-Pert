import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { Badge, Spinner, useToast } from './ui';
import { localized, useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { BusinessProvider, useBusiness } from '../context/BusinessContext';
import { get, post } from '../api';
import { applyTheme } from '../theme';
import { playChime } from '../hooks/usePush';

const NAV = [
  { to: '/', icon: 'dashboard', key: 'nav_dashboard', exact: true },
  { to: '/menu', icon: 'book', key: 'nav_menu' },
  { to: '/orders', icon: 'receipt', key: 'nav_orders' },
  { to: '/order-menu', icon: 'coffee', key: 'nav_order_menu' },
  { to: '/tables', icon: 'qr', key: 'nav_tables' },
  { to: '/reviews', icon: 'star', key: 'nav_reviews' },
  { to: '/marketing', icon: 'megaphone', key: 'nav_marketing' },
  { to: '/backups', icon: 'database', key: 'nav_backups' },
  { to: '/users', icon: 'users', key: 'nav_users' },
  { to: '/settings', icon: 'settings', key: 'nav_settings' },
];

/** Ticking clock isolated in its own component so it never rerenders the page. */
export function LiveClock({ timeZone, className }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 20000);
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
          // In-app alert for the newest event; sound follows the saved preference.
          if (newest.type === 'new_order') {
            if (business?.notification_settings?.sound_enabled !== false) playChime();
            toast.success(`${t('dash_new_orders')} · #${newest.order_number || ''}`.trim());
          }
        }
      }
    } catch {
      /* silently ignore polling errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.notification_settings?.sound_enabled, locale]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const markAll = async () => {
    await post('/manage/notifications/read', {});
    load();
  };

  return (
    <span className="bell-wrap">
      <button
        className="btn btn--icon"
        aria-label={t('dash_status_notifications')}
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

function Shell() {
  const { t, locale, setLocale, LOCALES } = useI18n();
  const { user, logout, memberships, businessId } = useAuth();
  const { business, save } = useBusiness();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const themeMode = business?.theme?.mode === 'dark' ? 'dark' : 'light';
  const toggleTheme = async () => {
    if (!business) return;
    const next = { ...(business.theme || {}), mode: themeMode === 'dark' ? 'light' : 'dark' };
    applyTheme(next); // instant feedback, then persisted
    setBusy(true);
    try {
      await save({ theme: next });
    } catch {
      applyTheme(business.theme);
    } finally {
      setBusy(false);
    }
  };

  const membership = memberships.find((m) => m.business_id === businessId);
  const title =
    NAV.find((n) => (n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)))
      ?.key || 'nav_dashboard';
  const businessName =
    localized(business, 'name', locale) || business?.name || t('app_name');

  return (
    <div className="app-shell">
      {menuOpen ? <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
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
            <div className="brand__sub">
              {membership ? t(`role_${membership.role}`) : t('tagline')}
            </div>
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={item.icon} size={18} />
              <span>{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__spacer" />

        {business ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              className="btn btn--sm"
              href={`/m/${business.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="eye" size={15} />
              {t('nav_customer_menu')}
            </a>
            <div className="sidebar__user">{user?.email}</div>
            <button
              className="btn btn--sm"
              onClick={async () => {
                await logout();
              }}
            >
              <Icon name="logout" size={15} />
              {t('auth_logout')}
            </button>
          </div>
        ) : null}
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

          <select
            className="select"
            style={{ width: 'auto', minHeight: 38, padding: '6px 10px', fontSize: 13 }}
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

          <button
            className="btn btn--icon"
            onClick={toggleTheme}
            disabled={busy || !business}
            aria-label={themeMode === 'dark' ? t('theme_light') : t('theme_dark')}
            title={themeMode === 'dark' ? t('theme_light') : t('theme_dark')}
          >
            {busy ? <Spinner size={16} /> : <Icon name={themeMode === 'dark' ? 'sun' : 'moon'} size={18} />}
          </button>

          <NotificationsBell />
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
