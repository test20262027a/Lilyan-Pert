/*
 * Client mirror of the server's permission catalog.
 *
 * Only the keys, their order and their label keys live here — the server owns
 * the rules (role ceilings, mandatory keys, who may grant what). The User
 * Management screen renders this catalog and disables anything the server did
 * not include in `grantable[role]`.
 */

export const PERMISSION_CARDS = [
  { id: 'dashboard', label: 'perm_group_dashboard', perms: ['dashboard.view'] },
  {
    id: 'orders',
    label: 'perm_group_orders',
    perms: ['orders.view', 'orders.edit', 'orders.status', 'orders.print'],
  },
  {
    id: 'menu',
    label: 'perm_group_menu',
    subgroups: [
      {
        label: 'perm_sub_products',
        perms: ['menu.products.view', 'menu.products.create', 'menu.products.edit', 'menu.products.delete'],
      },
      {
        label: 'perm_sub_categories',
        perms: ['menu.categories.view', 'menu.categories.create', 'menu.categories.edit', 'menu.categories.delete'],
      },
    ],
  },
  { id: 'statistics', label: 'perm_group_statistics', perms: ['statistics.view'] },
  { id: 'tables', label: 'perm_group_tables', perms: ['tables.view', 'tables.create', 'tables.edit', 'tables.delete'] },
  { id: 'reviews', label: 'perm_group_reviews', perms: ['reviews.view', 'reviews.create', 'reviews.edit', 'reviews.delete'] },
  { id: 'promotions', label: 'perm_group_promotions', perms: ['promotions.view', 'promotions.create', 'promotions.edit', 'promotions.delete'] },
  { id: 'ads', label: 'perm_group_ads', perms: ['ads.view', 'ads.create', 'ads.edit', 'ads.delete'] },
  { id: 'backup', label: 'perm_group_backup', perms: ['backup.full'] },
  { id: 'users', label: 'perm_group_users', perms: ['users.view', 'users.create', 'users.edit', 'users.delete'] },
  { id: 'activity', label: 'perm_group_activity', perms: ['activity.view', 'activity.delete'] },
  { id: 'business', label: 'perm_group_business', perms: ['business.view', 'business.edit'] },
  { id: 'settings', label: 'perm_group_settings', perms: ['settings.view', 'settings.edit'] },
  { id: 'appearance', label: 'perm_group_appearance', perms: ['appearance.edit'] },
  { id: 'menu_settings', label: 'perm_group_menu_settings', perms: ['menu_settings.view', 'menu_settings.edit'] },
  {
    id: 'text_editor',
    label: 'perm_group_text_editor',
    perms: ['text_editor.view', 'text_editor.create', 'text_editor.edit', 'text_editor.delete'],
  },
  { id: 'reset_sample', label: 'perm_group_reset', perms: ['reset_sample.full'] },
];

/** Every card's permission keys in catalog order. */
export const ALL_PERMISSION_KEYS = PERMISSION_CARDS.flatMap((card) =>
  card.subgroups ? card.subgroups.flatMap((g) => g.perms) : card.perms,
);

/** The action of a key (`orders.status` → `status`) — its label key follows. */
export const actionOf = (key) => key.split('.').pop();
export const actionLabelKey = (key) => `perm_action_${actionOf(key)}`;

/** A permissions array as the `{ key: true }` object the API stores. */
export function toPermissionMap(permissions = []) {
  return Object.fromEntries(permissions.map((key) => [key, true]));
}

/** True when every permission of a card is grantable (otherwise the card is locked). */
export function cardGrantable(card, grantable) {
  const keys = card.subgroups ? card.subgroups.flatMap((g) => g.perms) : card.perms;
  return keys.some((key) => grantable.includes(key));
}

/** A short summary of a membership's effective permissions. */
export function permissionSummaryKey(user) {
  if (user.full_access) return 'user_perm_full';
  if (!user.permissions?.length) return 'user_perm_none';
  const editable = user.permissions.filter((key) => !key.endsWith('.view'));
  return editable.length ? 'user_perm_custom' : 'user_perm_view_only';
}
