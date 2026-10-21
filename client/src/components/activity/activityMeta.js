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
