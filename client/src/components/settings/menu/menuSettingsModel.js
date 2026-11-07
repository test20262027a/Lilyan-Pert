/*
 * Client mirror of the canonical `menu_settings` shape (server/src/lib/menu-settings.js).
 *
 * The settings screen always edits a complete object: a business saved before
 * these controls existed opens with every switch on and automatic QR table
 * identification selected, which is exactly how its menus already behaved.
 */

/* Same order the General Menu Features list renders them in. */
export const FEATURE_KEYS = [
  'search',
  'status',
  'hours',
  'ads',
  'featured',
  'best_selling',
  'categories',
  'product_count',
  'summary',
  'prices',
  'details',
  'about',
  'social',
];

export const ORDER_KEYS = ['cart', 'checkout', 'order'];

export const TABLE_MODES = ['manual', 'qr', 'qr_fallback'];

const flag = (value) => (typeof value === 'boolean' ? value : true);

/* A single-boolean record saved before the two switches existed becomes the same
   verdict for both menus, so an upgrade never re-enables a disabled feature. */
function pair(raw, key) {
  const saved = raw ? raw[key] : undefined;
  const value = typeof saved === 'boolean' ? { main: saved, qr: saved } : saved && typeof saved === 'object' ? saved : {};
  return { main: flag(value.main), qr: flag(value.qr) };
}

export function normalizeMenuSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const features = {};
  for (const key of FEATURE_KEYS) features[key] = pair(source.features, key);
  const ordering = {};
  for (const key of ORDER_KEYS) ordering[key] = pair(source.ordering, key);

  return {
    ...source,
    features,
    ordering,
    table_mode: TABLE_MODES.includes(source.table_mode) ? source.table_mode : 'qr',
  };
}
