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
 * The admin panel rail: brand, compact navigation tree, footer and the collapse
 * control. It owns its two preferences — the collapsed rail and the one open
 * group — so the shell only has to track the mobile drawer.
 *
 * The navigation is a single-open accordion: `expandedGroup` holds at most one
 * group key, so opening a group always closes the previous one and the tree can
 * never leave two submenus open at once.
 */
export default function Sidebar({ open = false, onNavigate }) {
  const { t } = useI18n();
  const { memberships, businessId, isManager, isOwner, can } = useAuth();
  const { business } = useBusiness();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1',
  );
  // The icon rail only exists on desktop; on mobile the same drawer is always
  // full width with its labels, whatever the saved desktop preference is.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1001px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1001px)');
    const onChange = (event) => setIsDesktop(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  const railCollapsed = collapsed && isDesktop;
  // One identifier instead of a boolean per group: the accordion cannot drift
  // into several open groups, and the current route seeds it on first render.
  const [expandedGroup, setExpandedGroup] = useState(
    () => groupFor(titleKeyFor(location.pathname))?.key ?? null,
  );

  const currentKey = titleKeyFor(location.pathname);

  // The page content is offset by the rail's real width, so the nav never
  // overlaps the dashboard and the content always reclaims the freed space.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--admin-sidebar-width', railCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH);
    return () => root.style.removeProperty('--admin-sidebar-width');
  }, [railCollapsed]);

  // Reaching a page opens the group that holds it and closes every other one.
  useEffect(() => {
    setExpandedGroup(groupFor(titleKeyFor(location.pathname))?.key ?? null);
  }, [location.pathname]);

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });

  const toggleGroup = (item) =>
    setExpandedGroup((current) => (current === item.key ? null : item.key));

  const membership = memberships.find((m) => m.business_id === businessId);

  return (
    <div className={`sidebar-shell ${open ? 'is-open' : ''} ${railCollapsed ? 'is-collapsed' : ''}`}>
      <aside className={`sidebar ${open ? 'is-open' : ''} ${railCollapsed ? 'is-collapsed' : ''}`}>
        <div className="brand">
          <span className="brand__mark">
            <Icon name="qr" size={20} />
          </span>
          <span className="brand__text">
            <span className="brand__name">{business?.name_en || business?.name || t('app_name')}</span>
          </span>
        </div>

        <nav className="sidebar__nav" id="admin-sidebar-nav">
          <SidebarNav
            items={NAV}
            roles={{ isManager, isOwner, can }}
            currentKey={currentKey}
            collapsed={railCollapsed}
            expandedGroup={expandedGroup}
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

      {/*
       * Straddles the rail's outer edge, so it never scrolls with the tree and
       * stays clickable in both states. The chevron flips with the real layout
       * direction: it always points at the edge the rail is moving toward.
       */}
      <button
        type="button"
        className="nav-collapse"
        onClick={toggleCollapsed}
        aria-label={railCollapsed ? t('nav_expand') : t('nav_collapse')}
        aria-expanded={!railCollapsed}
        aria-controls="admin-sidebar-nav"
        title={railCollapsed ? t('nav_expand') : t('nav_collapse')}
      >
        <Icon name="chevronLeft" size={18} className="nav-collapse__chev" />
      </button>
    </div>
  );
}
