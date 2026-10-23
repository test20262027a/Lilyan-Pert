/*
 * The single source of truth for section header identity.
 *
 * Every page banner, modal, drawer, confirmation and cart sheet asks this file
 * which picture and icon belong to the section it lives in. Nothing else names
 * an image, so a new form inherits its parent section's header automatically
 * (it is resolved from the current route), and swapping a picture is a
 * one-line change here.
 *
 * Pictures live in /public/headers. Sections whose own picture has not been
 * supplied yet borrow the nearest related one through `image: '<other key>'`.
 */
const img = (name) => `/headers/${name}.avif`;
const png = (name) => `/headers/${name}.png`;

export const SECTION_HEADERS = {
  dashboard: { image: img('dashboard'), icon: 'dashboard' },
  orders: { image: img('orders'), icon: 'receipt' },
  menu: { image: img('menu'), icon: 'utensils' },
  tables: { image: img('tables'), icon: 'table' },
  promotions: { image: img('promotions'), icon: 'percent' },
  advertising: { image: img('advertising'), icon: 'megaphone' },
  reviews: { image: img('reviews'), icon: 'star' },
  analytics: { image: img('analytics'), icon: 'chart' },
  audit: { image: img('audit'), icon: 'history' },
  business: { image: img('business'), icon: 'store' },
  // Pending pictures — borrowed until the dedicated ones are added.
  textEditor: { image: 'business', icon: 'type' },
  users: { image: 'business', icon: 'users' },
  restore: { image: 'audit', icon: 'database' },
  reset: { image: 'audit', icon: 'refresh' },
  'customer-cart-empty': { image: png('customer-cart-empty'), icon: 'cart' },
  'customer-cart-full': { image: png('customer-cart-full'), icon: 'cart' },
  'customer-review': { image: png('customer-review'), icon: 'star' },
  // Customer-side windows that are not the cart (product, review…).
  customer: { image: 'menu', icon: 'utensils' },
};

/** First matching prefix wins; order matters for nested paths. */
const ROUTES = [
  ['/order-menu', 'orders'],
  ['/orders', 'orders'],
  ['/menu-settings', 'business'],
  ['/menu', 'menu'],
  ['/tables', 'tables'],
  ['/discounts', 'promotions'],
  ['/advertisements', 'advertising'],
  ['/marketing', 'advertising'],
  ['/reviews', 'reviews'],
  ['/statistics', 'analytics'],
  ['/activity', 'audit'],
  ['/settings', 'business'],
  ['/text-editor', 'textEditor'],
  ['/users', 'users'],
  ['/backups', 'restore'],
  ['/reset-sample', 'reset'],
  ['/m/', 'customer'],
];

export function sectionForPath(pathname = '/') {
  if (pathname === '/') return 'dashboard';
  const hit = ROUTES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`) || pathname === prefix.replace(/\/$/, ''));
  return hit ? hit[1] : 'dashboard';
}

export function sectionHeader(key) {
  const entry = SECTION_HEADERS[key] || SECTION_HEADERS.dashboard;
  const image = entry.image.startsWith('/') ? entry.image : SECTION_HEADERS[entry.image]?.image;
  return { key, icon: entry.icon, image: image || SECTION_HEADERS.dashboard.image };
}
