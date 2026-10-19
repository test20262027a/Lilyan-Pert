/*
 * The admin panel's navigation tree — one central place where every sidebar
 * destination is declared, with its route, its localized label key, its icon
 * and the minimum role that may see it.
 *
 * `min` follows the same role model the API enforces with withBusiness():
 *   undefined  → every member (staff and above) may open it,
 *   'manager'  → owner + manager, matching manager-only write endpoints,
 *   'owner'    → owner only (backups, sample-data reset).
 * Hiding an entry is never the security boundary: the destination page and the
 * API enforce the same rule on their own.
 */
export const NAV = [
  { to: '/', icon: 'dashboard', key: 'nav_dashboard', exact: true },
  { to: '/orders', icon: 'cart', key: 'nav_orders' },
  // The customer menu is a public page of this business, opened in a new tab.
  { icon: 'store', key: 'nav_view_menu', preview: true },
  {
    key: 'nav_group_menu',
    icon: 'utensils',
    children: [
      { to: '/menu', icon: 'utensils', key: 'nav_menu' },
      { to: '/tables', icon: 'grid', key: 'nav_tables' },
      { to: '/discounts', icon: 'tag', key: 'nav_discounts', min: 'manager' },
      { to: '/advertisements', icon: 'megaphone', key: 'nav_ads', min: 'manager' },
      { to: '/reviews', icon: 'star', key: 'nav_reviews' },
    ],
  },
  {
    key: 'nav_group_reports',
    icon: 'chart',
    children: [
      { to: '/statistics', icon: 'chartBars', key: 'nav_statistics' },
      { to: '/activity', icon: 'history', key: 'nav_activity', min: 'manager' },
    ],
  },
  {
    key: 'nav_group_business',
    icon: 'building',
    children: [
      { to: '/settings', icon: 'settings', key: 'nav_settings' },
      { to: '/menu-settings', icon: 'sliders', key: 'nav_menu_settings', min: 'manager' },
      { to: '/text-editor', icon: 'type', key: 'nav_text_editor', min: 'manager' },
      { to: '/users', icon: 'users', key: 'nav_users', min: 'manager' },
      { to: '/backups', icon: 'database', key: 'nav_backups', min: 'owner' },
      { to: '/reset-sample', icon: 'trash', key: 'nav_reset_sample', min: 'owner', danger: true },
    ],
  },
];

/** True when the signed-in member's roles allow this entry. */
export function canSee(item, { isManager, isOwner }) {
  if (!item.min) return true;
  if (item.min === 'owner') return isOwner;
  return isManager;
}

/** The label key of the entry (group child included) that owns a path. */
export function titleKeyFor(pathname) {
  for (const item of NAV) {
    if (item.to && (item.exact ? pathname === item.to : pathname.startsWith(item.to))) return item.key;
    for (const child of item.children || []) {
      if (pathname === child.to || pathname.startsWith(`${child.to}/`)) return child.key;
    }
  }
  return 'nav_dashboard';
}

/** The group that owns a label key, so its submenu can open with the page. */
export function groupFor(key) {
  return NAV.find((item) => (item.children || []).some((c) => c.key === key)) || null;
}
