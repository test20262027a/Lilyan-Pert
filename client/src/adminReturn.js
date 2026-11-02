/*
 * Where "back to the admin panel" lands.
 *
 * The customer ordering menu runs in its own tab (the admin sidebar opens it,
 * and a guest reads the public QR link in the browser), so the browser's own
 * history is not a reliable way back. The admin shell records the last admin
 * route it actually showed; this module hands that route back only when the
 * signed-in user still holds the permission that route's own gate checks, and
 * otherwise falls back to the dashboard.
 */

const STORAGE_KEY = 'lilyan.admin.last-route';

/*
 * Every admin route a return may land on, with the permission its route gate in
 * App.jsx requires. The in-store ordering menu (/order-menu) is deliberately
 * absent: returning there would be returning to the page the button sits on.
 */
const ROUTE_PERMISSIONS = {
  '/': 'dashboard.view',
  '/menu': 'menu.products.view',
  '/orders': 'orders.view',
  '/tables': 'tables.view',
  '/reviews': 'reviews.view',
  '/discounts': 'promotions.view',
  '/advertisements': 'ads.view',
  '/statistics': 'statistics.view',
  '/activity': 'activity.view',
  '/backups': 'backup.full',
  '/reset-sample': 'reset_sample.full',
  '/users': 'users.view',
  '/settings': 'settings.view',
  '/menu-settings': 'menu_settings.view',
  '/text-editor': 'text_editor.view',
};

/** Records the admin screen currently on show — read by the customer menu. */
export function rememberAdminRoute(pathname) {
  if (!ROUTE_PERMISSIONS[pathname]) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, pathname);
  } catch {
    /* private mode: the button simply falls back to the dashboard */
  }
}

/**
 * The route the return button opens: the previous admin screen while the user
 * is still authorized for it, otherwise the dashboard.
 */
export function adminReturnRoute(can) {
  let saved = null;
  try {
    saved = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  const permission = ROUTE_PERMISSIONS[saved];
  return permission && typeof can === 'function' && can(permission) ? saved : '/';
}
