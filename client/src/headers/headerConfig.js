/*
 * The single source of truth for section header identity.
 *
 * Every page banner, modal, drawer, confirmation and cart sheet asks this file
 * which picture and icon belong to the section it lives in. Nothing else names
 * an image, so a new form inherits its parent section's header automatically
 * (it is resolved from the current route), and swapping a picture is a
 * one-line change here.
 *
 * Pictures live in /public/headers. A section names its OWN picture file; while
 * that file is still missing the header falls back to the nearest related one
 * through `fallback: '<other key>'`, painted underneath in the same layer, so a
 * header is never blank or broken and uploading the dedicated file is all it
 * takes to switch the section over.
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
  // Own picture slot per section; the fallback shows until that file exists.
  textEditor: { image: png('text-editor'), icon: 'type' },
  users: { image: png('users'), icon: 'users' },
  restore: { image: png('restore'), icon: 'database' },
  reset: { image: png('reset'), icon: 'refresh' },
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

/** A direct file path, or the picture of another section used as its slot. */
function pictureOf(reference) {
  if (typeof reference !== 'string') return null;
  return reference.startsWith('/') ? reference : SECTION_HEADERS[reference]?.image || null;
}

export function sectionHeader(key) {
  const entry = SECTION_HEADERS[key] || SECTION_HEADERS.dashboard;
  const image = pictureOf(entry.image) || SECTION_HEADERS.dashboard.image;
  return {
    key,
    icon: entry.icon,
    image,
    // Painted underneath `image`, so a section whose own file is not in
    // /public/headers yet still shows a complete, matching header.
    fallback: pictureOf(entry.fallback) || image,
  };
}
