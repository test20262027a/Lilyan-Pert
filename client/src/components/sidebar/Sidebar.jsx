import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import SidebarNav from './SidebarNav';
import { NAV, groupFor, titleKeyFor } from '../nav/navConfig';

const COLLAPSE_KEY = 'lilyan.sidebar.collapsed';
const EXPANDED_WIDTH = '280px';
const COLLAPSED_WIDTH = '72px';

/*
 * The admin panel rail: brand, scrollable navigation tree and the collapse
 * control. It owns the two preferences it is responsible for — the collapsed
 * rail and which groups are open — so the shell only has to track the mobile
 * drawer.
 *
 * The wrapper `.sidebar-shell` is the fixed, full-viewport column; the inner
 * `<aside>` clips its own content so the navigation scrolls on its own while
 * the branding and footer stay put.
 */
export default function Sidebar({ open = false, onNavigate }) {
  const { t } = useI18n();
  const { memberships, businessId, isManager, isOwner, can } = useAuth();
  const { business } = useBusiness();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1',
  );
  const [openGroups, setOpenGroups] = useState(() => {
    const group = groupFor(titleKeyFor(location.pathname));
    return group ? { [group.key]: true } : {};
  });

  const currentKey = titleKeyFor(location.pathname);

  // The page content is offset by the rail's real width, so the nav never
  // overlaps the dashboard and follows the collapse state.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--admin-sidebar-width', collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH);
    return () => root.style.removeProperty('--admin-sidebar-width');
  }, [collapsed]);

  // Reaching a page opens the group that holds it, so the tree always explains
  // where the member currently is — without closing the groups they opened.
  useEffect(() => {
    const group = groupFor(titleKeyFor(location.pathname));
    if (group) setOpenGroups((state) => ({ ...state, [group.key]: true }));
  }, [location.pathname]);

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });

  const toggleGroup = (item) => {
    // A collapsed rail has no room for submenu rows, so opening a group expands it.
    if (collapsed) {
      setCollapsed(false);
      localStorage.setItem(COLLAPSE_KEY, '0');
    }
    setOpenGroups((state) => ({ ...state, [item.key]: !state[item.key] }));
  };

  const membership = memberships.find((m) => m.business_id === businessId);

  return (
    <div className={`sidebar-shell ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="brand">
          <span className="brand__mark">
            <Icon name="qr" size={22} />
          </span>
          <span className="brand__text">
            <span className="brand__name">{business?.name_en || business?.name || t('app_name')}</span>
            <span className="brand__sub">{t('nav_brand_title')}</span>
          </span>
        </div>

        <nav className="sidebar__nav">
          <SidebarNav
            items={NAV}
            roles={{ isManager, isOwner, can }}
            currentKey={currentKey}
            collapsed={collapsed}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
            previewHref={business ? `/m/${business.slug}` : ''}
            onNavigate={onNavigate}
          />
        </nav>

        {membership ? (
          <div className="sidebar__user">
            <span className="sidebar__role">
              <Icon name="shield" size={12} />
              {t(`role_${membership.role}`)}
            </span>
          </div>
        ) : null}
      </aside>

      {/* Straddles the rail's outer edge, so it never scrolls with the tree. */}
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
  );
}
