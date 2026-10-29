/*
 * Presentation helpers for one activity record.
 *
 * Everything here derives only from fields the API actually stored
 * (`kind`, `entity`, `action`); nothing is inferred from free text and no row
 * is invented on the client.
 */

/** Entity → existing approved module label. Same keys the backup picker uses. */
export const ENTITY_KEYS = {
  category: 'module_menu_categories',
  product: 'module_menu_products',
  table: 'module_tables',
  promotion: 'module_promotions',
  ad: 'module_advertisements',
  review: 'module_reviews',
  user: 'nav_users',
  settings: 'module_business_settings',
  backup: 'backup_title',
  reset: 'backup_reset_sample',
  order: 'module_orders',
  print: 'module_receipt_prints',
};

/** The sample-data modules a reset can clear, in the reset page's own keys. */
const RESET_MODULES = new Set([
  'orders',
  'visits',
  'reviews',
  'advertisements',
  'tables',
  'promotions',
  'products',
  'categories',
  'staff',
  'suggestions',
]);

/**
 * A record's own label, in the reader's language.
 *
 * A reset row stores the module keys it cleared ("orders, reviews"), so those
 * are rendered as the module names instead of leaking the internal keys. Every
 * other label is text the actor typed or the API stored, shown unchanged.
 */
export function entityLabelText(t, row) {
  const raw = String(row?.entity_label || '').trim();
  if (row?.entity !== 'reset' || !raw) return raw;
  return raw
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => (RESET_MODULES.has(key) ? t(`reset_mod_${key}`) : t('act_title')))
    .join(' · ');
}

/** Contextual icon and pastel tone for the recorded action. */
export function activityVisual(row) {
  if (row.kind === 'order_status') return { icon: 'refresh', tone: 'purple' };
  if (row.kind === 'print') return { icon: 'print', tone: 'blue' };
  switch (row.action) {
    case 'created':
      return { icon: 'plus', tone: 'green' };
    case 'deleted':
      return { icon: 'trash', tone: 'red' };
    case 'restored':
      return { icon: 'refresh', tone: 'purple' };
    case 'updated':
      return row.entity === 'settings'
        ? { icon: 'settings', tone: 'orange' }
        : { icon: 'pencil', tone: 'blue' };
    default:
      return { icon: 'history', tone: 'gray' };
  }
}

/** Pastel tone of the module badge. */
const BADGE_TONES = {
  order: 'blue',
  print: 'blue',
  product: 'green',
  category: 'green',
  table: 'green',
  promotion: 'amber',
  ad: 'orange',
  review: 'purple',
  user: 'purple',
  settings: 'gray',
  backup: 'gray',
  reset: 'gray',
};

export const badgeTone = (entity) => BADGE_TONES[entity] || 'gray';
