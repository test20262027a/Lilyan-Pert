/*
 * The canonical authorization model.
 *
 * Roles keep their existing meaning (owner → manager → staff → customer) and
 * stay the outer boundary; inside that boundary a membership carries a set of
 * fine-grained module permissions. Three rules make the model safe:
 *
 *   1. ROLE_TEMPLATE is the *ceiling*: a role can never hold a permission its
 *      template does not list, so a staff account can never be given user
 *      management, backups or sample-data reset, whatever the client sends.
 *   2. MANDATORY is always on (the few abilities that make the account work at
 *      all), so "Clear all" can never lock someone out of the admin panel.
 *   3. An owner always holds everything — the business can never be left
 *      without a fully privileged administrator.
 *
 * A membership whose `permissions` column is NULL uses its role template, so
 * every account created before this model existed keeps exactly the access it
 * had. Only an explicit object narrows (or widens within the ceiling) it.
 */

/** Ordered catalog: the order is the order the UI renders. */
export const PERMISSION_CATALOG = [
  { key: 'dashboard.view', group: 'dashboard', action: 'view' },

  { key: 'orders.view', group: 'orders', action: 'view' },
  { key: 'orders.edit', group: 'orders', action: 'edit' },
  { key: 'orders.status', group: 'orders', action: 'status' },
  { key: 'orders.print', group: 'orders', action: 'print' },

  { key: 'menu.products.view', group: 'menu_products', action: 'view' },
  { key: 'menu.products.create', group: 'menu_products', action: 'create' },
  { key: 'menu.products.edit', group: 'menu_products', action: 'edit' },
  { key: 'menu.products.delete', group: 'menu_products', action: 'delete' },

  { key: 'menu.categories.view', group: 'menu_categories', action: 'view' },
  { key: 'menu.categories.create', group: 'menu_categories', action: 'create' },
  { key: 'menu.categories.edit', group: 'menu_categories', action: 'edit' },
  { key: 'menu.categories.delete', group: 'menu_categories', action: 'delete' },

  { key: 'statistics.view', group: 'statistics', action: 'view' },

  { key: 'tables.view', group: 'tables', action: 'view' },
  { key: 'tables.create', group: 'tables', action: 'create' },
  { key: 'tables.edit', group: 'tables', action: 'edit' },
  { key: 'tables.delete', group: 'tables', action: 'delete' },

  { key: 'reviews.view', group: 'reviews', action: 'view' },
  { key: 'reviews.create', group: 'reviews', action: 'create' },
  { key: 'reviews.edit', group: 'reviews', action: 'edit' },
  { key: 'reviews.delete', group: 'reviews', action: 'delete' },

  { key: 'promotions.view', group: 'promotions', action: 'view' },
  { key: 'promotions.create', group: 'promotions', action: 'create' },
  { key: 'promotions.edit', group: 'promotions', action: 'edit' },
  { key: 'promotions.delete', group: 'promotions', action: 'delete' },

  { key: 'ads.view', group: 'ads', action: 'view' },
  { key: 'ads.create', group: 'ads', action: 'create' },
  { key: 'ads.edit', group: 'ads', action: 'edit' },
  { key: 'ads.delete', group: 'ads', action: 'delete' },

  { key: 'backup.full', group: 'backup', action: 'full' },

  { key: 'users.view', group: 'users', action: 'view' },
  { key: 'users.create', group: 'users', action: 'create' },
  { key: 'users.edit', group: 'users', action: 'edit' },
  { key: 'users.delete', group: 'users', action: 'delete' },

  { key: 'activity.view', group: 'activity', action: 'view' },
  { key: 'activity.delete', group: 'activity', action: 'delete' },

  { key: 'business.view', group: 'business', action: 'view' },
  { key: 'business.edit', group: 'business', action: 'edit' },

  { key: 'settings.view', group: 'settings', action: 'view' },
  { key: 'settings.edit', group: 'settings', action: 'edit' },

  { key: 'appearance.edit', group: 'appearance', action: 'edit' },

  { key: 'menu_settings.view', group: 'menu_settings', action: 'view' },
  { key: 'menu_settings.edit', group: 'menu_settings', action: 'edit' },

  { key: 'text_editor.view', group: 'text_editor', action: 'view' },
  { key: 'text_editor.create', group: 'text_editor', action: 'create' },
  { key: 'text_editor.edit', group: 'text_editor', action: 'edit' },
  { key: 'text_editor.delete', group: 'text_editor', action: 'delete' },

  { key: 'reset_sample.full', group: 'reset_sample', action: 'full' },
];

export const ALL_PERMISSIONS = PERMISSION_CATALOG.map((p) => p.key);
const ALL = new Set(ALL_PERMISSIONS);

/** Elevated abilities only an owner may ever hold or grant. */
const OWNER_ONLY = ['backup.full', 'users.view', 'users.create', 'users.edit', 'users.delete', 'reset_sample.full'];

/** What each role can ever hold — assignment is validated against this. */
export const ROLE_TEMPLATE = {
  owner: ALL_PERMISSIONS,
  manager: ALL_PERMISSIONS.filter((key) => !OWNER_ONLY.includes(key)),
  staff: [
    'dashboard.view',
    'orders.view', 'orders.edit', 'orders.status', 'orders.print',
    'menu.products.view', 'menu.categories.view',
    'statistics.view', 'reviews.view',
    'business.view', 'settings.view', 'menu_settings.view', 'text_editor.view',
  ],
  customer: [],
};

/** Always granted for the role; "Clear all" keeps them. */
export const MANDATORY = {
  owner: ALL_PERMISSIONS,
  manager: ['dashboard.view', 'orders.view', 'settings.view'],
  staff: ['dashboard.view'],
  customer: [],
};

const TEMPLATE_SETS = Object.fromEntries(
  Object.entries(ROLE_TEMPLATE).map(([role, keys]) => [role, new Set(keys)]),
);

/** Catalog order, duplicates dropped. */
const ordered = (set) => PERMISSION_CATALOG.filter((p) => set.has(p.key)).map((p) => p.key);

/**
 * The permissions a membership really has. `stored` is the membership's
 * permissions object (or null when the role template applies).
 */
export function effectivePermissions(role, stored) {
  const ceiling = TEMPLATE_SETS[role] || new Set();
  if (stored === null || stored === undefined) return ordered(new Set(ceiling));
  const granted = new Set(MANDATORY[role] || []);
  if (stored && typeof stored === 'object') {
    for (const [key, value] of Object.entries(stored)) {
      if (value === true && ceiling.has(key)) granted.add(key);
    }
  }
  return ordered(granted);
}

/** True when the membership holds nothing less than its whole role ceiling. */
export function isFullAccess(role, permissions) {
  const ceiling = ROLE_TEMPLATE[role] || [];
  return permissions.length === ceiling.length && ceiling.every((key) => permissions.includes(key));
}

/**
 * The keys the acting administrator may assign to `role`: the role ceiling
 * narrowed by what the actor holds itself. An owner holds everything, so the
 * owner sees the whole ceiling.
 */
export function grantablePermissions(role, actorPermissions) {
  const ceiling = ROLE_TEMPLATE[role] || [];
  const held = new Set(actorPermissions || []);
  return ceiling.filter((key) => held.has(key));
}

/** Sanitizes a submitted permissions object for the role (rejects unknown/over-ceiling). */
export function sanitizePermissions(role, submitted, actorPermissions) {
  if (submitted === undefined || submitted === null) return null;
  if (typeof submitted !== 'object' || Array.isArray(submitted)) return null;
  const allowed = new Set(grantablePermissions(role, actorPermissions));
  const out = {};
  for (const [key, value] of Object.entries(submitted)) {
    if (value === true && ALL.has(key) && allowed.has(key)) out[key] = true;
  }
  return out;
}

/** True when `key` is inside the role's ceiling (used by route guards). */
export function roleAllows(role, key) {
  return Boolean(TEMPLATE_SETS[role]?.has(key));
}

/** Role presets returned to the User Management screen. */
export function rolePresets() {
  return Object.fromEntries(
    Object.entries(ROLE_TEMPLATE).map(([role, keys]) => [role, ordered(new Set(keys))]),
  );
}
