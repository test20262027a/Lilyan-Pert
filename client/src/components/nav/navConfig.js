/*
 * The admin panel's navigation tree — one central place where every sidebar
 * destination is declared, with its route, its localized label key, its icon
 * and the minimum role that may see it.
 *
 * `min` follows the same role model the API enforces with withBusiness():
 *   undefined  → every member (staff and above) may open it,
 *   'manager'  → owner + manager, matching manager-only write endpoints,
 *   'owner'    → owner only (backups, sample-data reset).
 * `perm` is the module permission the destination needs. A member whose role
 * template includes it keeps seeing the entry exactly as before; a member whose
 * permissions were narrowed loses it. Hiding an entry is never the security
 * boundary: the destination route and the API enforce the same rule on their own.
 */
export const NAV = [
  { to: '/', icon: 'dashboard', key: 'nav_dashboard', exact: true, perm: 'dashboard.view' },
  { to: '/orders', icon: 'cart', key: 'nav_orders', perm: 'orders.view' },
  // The customer menu is a public page of this business, opened in a new tab.
  { icon: 'store', key: 'nav_view_menu', preview: true },
  {
    key: 'nav_group_menu',
    icon: 'utensils',
    children: [
      { to: '/menu', icon: 'utensils', key: 'nav_menu', perm: 'menu.products.view' },
      { to: '/tables', icon: 'grid', key: 'nav_tables', perm: 'tables.view' },
      { to: '/discounts', icon: 'tag', key: 'nav_discounts', min: 'manager', perm: 'promotions.view' },
      { to: '/advertisements', icon: 'megaphone', key: 'nav_ads', min: 'manager', perm: 'ads.view' },
      { to: '/reviews', icon: 'star', key: 'nav_reviews', perm: 'reviews.view' },
    ],
  },
  {
    key: 'nav_group_reports',
    icon: 'chart',
    children: [
      { to: '/statistics', icon: 'chartBars', key: 'nav_statistics', perm: 'statistics.view' },
      { to: '/activity', icon: 'history', key: 'nav_activity', min: 'manager', perm: 'activity.view' },
    ],
  },
  {
    key: 'nav_group_business',
    icon: 'building',
    children: [
      /* Menu Settings has no sidebar entry of its own: it is the "menu" tab of
         this Business Settings workspace (and /menu-settings still opens it). */
      { to: '/settings', icon: 'settings', key: 'nav_settings', perm: 'settings.view' },
      { to: '/text-editor', icon: 'type', key: 'nav_text_editor', min: 'manager', perm: 'text_editor.view' },
      { to: '/users', icon: 'users', key: 'nav_users', min: 'manager', perm: 'users.view' },
      { to: '/backups', icon: 'database', key: 'nav_backups', min: 'owner', perm: 'backup.full' },
      { to: '/reset-sample', icon: 'trash', key: 'nav_reset_sample', min: 'owner', danger: true, perm: 'reset_sample.full' },
    ],
  },
];

/** True when the signed-in member's roles AND module permissions allow this entry. */
export function canSee(item, { isManager, isOwner, can }) {
  if (item.min === 'owner' && !isOwner) return false;
  if (item.min === 'manager' && !isManager) return false;
  if (item.perm && !(can ? can(item.perm) : true)) return false;
  return true;
}

/** The label key of the entry (group child included) that owns a path. */
export function titleKeyFor(pathname) {
  // The legacy /menu-settings destination now lives inside Business Settings,
  // so it keeps that entry highlighted instead of falling back to the dashboard.
  const path = pathname === '/menu-settings' ? '/settings' : pathname;
  for (const item of NAV) {
    if (item.to && (item.exact ? path === item.to : path.startsWith(item.to))) return item.key;
    for (const child of item.children || []) {
      if (path === child.to || path.startsWith(`${child.to}/`)) return child.key;
    }
  }
  return 'nav_dashboard';
}

/** The group that owns a label key, so its submenu can open with the page. */
export function groupFor(key) {
  return NAV.find((item) => (item.children || []).some((c) => c.key === key)) || null;
}
