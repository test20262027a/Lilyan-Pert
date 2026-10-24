/*
 * Client mirror of the canonical `menu_settings` shape (server/src/lib/menu-settings.js).
 *
 * The settings screen always edits a complete object: a business saved before
 * these controls existed opens with every switch on and automatic QR table
 * identification selected, which is exactly how its menus already behaved.
 */

export const FEATURE_KEYS = [
  'search',
  'categories',
  'ads',
  'featured',
  'best_selling',
  'social',
  'prices',
  'details',
];

export const ORDER_KEYS = ['cart', 'checkout', 'order'];

export const TABLE_MODES = ['manual', 'qr', 'qr_fallback'];

const flag = (value) => (typeof value === 'boolean' ? value : true);

function pair(raw, key) {
  const value = raw && typeof raw[key] === 'object' && raw[key] ? raw[key] : {};
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
