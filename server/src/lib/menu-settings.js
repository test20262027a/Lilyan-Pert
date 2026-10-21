/*
 * Canonical shape of `businesses.menu_settings`.
 *
 * The Menu Settings screen stores 23 independent values (eight general
 * features × two menu contexts, three ordering capabilities × two contexts and
 * one table-identification mode) inside the existing `menu_settings` jsonb
 * column — no extra table, no duplicate settings record.
 *
 * Every reader goes through normalizeMenuSettings(), so a business saved before
 * these controls existed keeps behaving exactly as it did: a missing value means
 * "enabled", and an unknown table mode falls back to automatic QR, which is what
 * the public menu already did with a scanned table token.
 */

export const MENU_FEATURE_KEYS = [
  'search',
  'categories',
  'ads',
  'featured',
  'best_selling',
  'social',
  'prices',
  'details',
];

export const MENU_ORDER_KEYS = ['cart', 'checkout', 'order'];

export const TABLE_MODES = ['manual', 'qr', 'qr_fallback'];

const flag = (value) => (typeof value === 'boolean' ? value : true);

function pair(raw, key) {
  const value = raw && typeof raw[key] === 'object' && raw[key] ? raw[key] : {};
  return { main: flag(value.main), qr: flag(value.qr) };
}

export function normalizeMenuSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const features = {};
  for (const key of MENU_FEATURE_KEYS) features[key] = pair(source.features, key);
  const ordering = {};
  for (const key of MENU_ORDER_KEYS) ordering[key] = pair(source.ordering, key);

  return {
    // Everything this module does not own (show_customer_menu, best_selling,
    // show_admin_return, future keys) is preserved untouched.
    ...source,
    features,
    ordering,
    table_mode: TABLE_MODES.includes(source.table_mode) ? source.table_mode : 'qr',
  };
}

/**
 * The effective configuration for one menu context.
 * `main` is the in-store ordering menu, `qr` is the public customer menu.
 */
export function menuContext(settings, context = 'qr') {
  const side = context === 'main' ? 'main' : 'qr';
  const pick = (group) =>
    Object.fromEntries(Object.entries(group).map(([key, value]) => [key, value[side] !== false]));

  const features = pick(settings.features);
  const ordering = pick(settings.ordering);

  return {
    context: side,
    features,
    ordering,
    // Checkout needs a cart and an order needs checkout — the effective
    // capability is the whole chain, never a single toggle.
    can_checkout: ordering.cart && ordering.checkout,
    can_order: ordering.cart && ordering.checkout && ordering.order,
    table_mode: settings.table_mode,
  };
}
