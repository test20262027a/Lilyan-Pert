import { createHash } from 'node:crypto';

/**
 * Canonical backup registry.
 *
 * Three levels, all read from this one file:
 *
 *   category  the twelve cards of the page (Business & Profile, Menu & Products…)
 *   section   a row of the backup manifest — the labelled chip inside a card
 *   module    the actual query: one table, or one group of columns of `businesses`
 *
 * A section may own more than one module (an order is stored in `orders` plus
 * its `order_items`, its status history and its receipt prints), but it always
 * reports the row count of its first module, so the page never double counts.
 *
 * `restorable: false` marks data that is exported for reference only:
 *   - team memberships: an archive never grants roles or permissions back,
 *   - the audit trail: security records are not rewritten by a restore.
 *
 * Deliberately excluded: password hashes, sessions, authentication tokens,
 * VAPID private keys, push subscriptions (device secrets), caches and image
 * binaries. Pictures are stored as their public URLs, never as bytes.
 *
 * `businesses` modules only ever write the columns they own, and `id`/`slug`
 * are never restored, so one module can not rewrite the tenant's identity.
 */

const MODULE_DEFS = {
  business_profile: {
    exportMode: 'single',
    table: 'businesses',
    columns: [
      'id', 'slug', 'name', 'name_ku', 'name_fa', 'name_ar', 'name_en',
      'description', 'logo_url', 'cover_url', 'phone', 'email', 'website',
      'address', 'addresses', 'city', 'latitude', 'longitude', 'socials',
      'business_type', 'timezone', 'currency',
    ],
    restoreColumns: [
      'name', 'name_ku', 'name_fa', 'name_ar', 'name_en',
      'description', 'logo_url', 'cover_url', 'phone', 'email', 'website',
      'address', 'addresses', 'city', 'latitude', 'longitude', 'socials',
      'business_type', 'timezone', 'currency',
    ],
  },
  business_settings: {
    exportMode: 'jsonColumns',
    table: 'businesses',
    columns: ['theme', 'notification_settings', 'dashboard_settings', 'tax_rate', 'service_charge_rate'],
  },
  working_hours: {
    exportMode: 'jsonColumns',
    table: 'businesses',
    columns: ['working_hours'],
  },
  menu_settings: {
    exportMode: 'jsonColumns',
    table: 'businesses',
    columns: ['menu_settings'],
  },
  editable_text: {
    exportMode: 'jsonColumns',
    table: 'businesses',
    columns: ['editable_text'],
  },
  receipt_settings: {
    exportMode: 'jsonColumns',
    table: 'businesses',
    columns: ['receipt_settings'],
  },
  menu_categories: {
    exportMode: 'rows',
    table: 'categories',
    columns: ['id', 'icon', 'icon_color', 'sort_order', 'active', 'name_ku', 'name_fa', 'name_ar', 'name_en'],
    orderBy: 'sort_order, created_at',
  },
  menu_products: {
    exportMode: 'rows',
    table: 'products',
    columns: [
      'id', 'category_id', 'price', 'price_fa', 'price_en', 'image_url',
      'active', 'available', 'featured', 'sort_order', 'calories', 'prep_minutes', 'tags',
      'name_ku', 'name_fa', 'name_ar', 'name_en',
      'description_ku', 'description_fa', 'description_ar', 'description_en',
    ],
    orderBy: 'sort_order, created_at',
  },
  featured_products: {
    exportMode: 'derived',
    table: 'products',
    // Derived from the products module: exported for the record, restored by
    // the products restore itself (which carries the `featured` column).
    query: `SELECT id, featured, sort_order, name_fa, name_en
              FROM products WHERE business_id = $1 AND featured = true
             ORDER BY sort_order, created_at`,
    countQuery: `SELECT count(*)::int AS c FROM products WHERE business_id = $1 AND featured = true`,
  },
  orders: {
    exportMode: 'rows',
    table: 'orders',
    columns: [
      'id', 'table_id', 'table_name', 'order_number', 'status', 'channel', 'customer_name',
      'customer_phone', 'notes', 'subtotal', 'discount', 'tax', 'service_charge',
      'total', 'created_at', 'completed_at',
    ],
    orderBy: 'created_at',
  },
  order_items: {
    exportMode: 'rows',
    table: 'order_items',
    columns: ['id', 'order_id', 'product_id', 'name', 'unit_price', 'quantity', 'line_total', 'notes'],
    dependsOn: ['orders'],
  },
  order_audit: {
    exportMode: 'rows',
    table: 'order_status_history',
    columns: ['id', 'order_id', 'from_status', 'to_status', 'changed_by_name', 'changed_at'],
    dependsOn: ['orders'],
  },
  receipt_prints: {
    exportMode: 'rows',
    table: 'receipt_prints',
    columns: ['id', 'order_id', 'printed_by_name', 'printed_at'],
    dependsOn: ['orders'],
  },
  tables: {
    exportMode: 'rows',
    table: 'tables',
    columns: [
      'id', 'name', 'name_ku', 'name_fa', 'name_ar', 'name_en',
      'table_number', 'seats', 'display_order', 'vip', 'qr_token', 'zone', 'active',
    ],
  },
  reviews: {
    exportMode: 'rows',
    table: 'reviews',
    columns: ['id', 'order_id', 'customer_name', 'rating', 'comment', 'status', 'created_at'],
  },
  advertisements: {
    exportMode: 'rows',
    table: 'advertisements',
    columns: [
      'id', 'image_url', 'link_url', 'category_id', 'product_id',
      'title_ku', 'title_fa', 'title_ar', 'title_en',
      'subtitle_ku', 'subtitle_fa', 'subtitle_ar', 'subtitle_en',
      'starts_at', 'ends_at', 'placement', 'active', 'sort_order',
    ],
  },
  promotions: {
    exportMode: 'rows',
    table: 'promotions',
    columns: [
      'id', 'code', 'product_id', 'category_id', 'target_type', 'discount_type', 'discount_value',
      'min_order', 'max_uses', 'used_count', 'starts_at', 'ends_at',
      'active', 'title_ku', 'title_fa', 'title_ar', 'title_en',
    ],
  },
  team_members: {
    exportMode: 'derived',
    // Names and roles for the record; never written back by a restore.
    query: `SELECT m.id, m.user_id, u.full_name, u.email, m.role, m.status, m.permissions, m.created_at
              FROM memberships m JOIN users u ON u.id = m.user_id
             WHERE m.business_id = $1 ORDER BY m.created_at`,
    countQuery: `SELECT count(*)::int AS c FROM memberships WHERE business_id = $1`,
    restorable: false,
  },
  business_views: {
    exportMode: 'rows',
    table: 'business_views',
    columns: ['id', 'session_key', 'source', 'viewed_on'],
  },
  activity_reports: {
    exportMode: 'derived',
    // The audit trail is exported so an archive can be explained, never restored.
    query: `SELECT id, actor_name, entity, action, entity_label, created_at
              FROM activity_log WHERE business_id = $1 ORDER BY created_at`,
    countQuery: `SELECT count(*)::int AS c FROM activity_log WHERE business_id = $1`,
    restorable: false,
  },
};

/** The eighteen manifest sections, in page order, grouped by the twelve cards. */
export const BACKUP_SECTIONS = [
  { key: 'business_profile', category: 'profile', modules: ['business_profile'] },
  { key: 'business_settings', category: 'settings', modules: ['business_settings'] },
  { key: 'working_hours', category: 'settings', modules: ['working_hours'] },

  { key: 'menu_categories', category: 'menu_products', modules: ['menu_categories'] },
  { key: 'menu_products', category: 'menu_products', modules: ['menu_products'] },
  {
    key: 'featured_products',
    category: 'menu_products',
    modules: ['featured_products'],
    restorable: false,
    impliedBy: 'menu_products',
  },

  { key: 'orders', category: 'orders', modules: ['orders', 'order_items'] },
  { key: 'order_audit', category: 'order_history', modules: ['order_audit', 'receipt_prints'] },

  { key: 'tables', category: 'tables', modules: ['tables'] },
  { key: 'reviews', category: 'reviews', modules: ['reviews'] },

  { key: 'advertisements', category: 'marketing', modules: ['advertisements'] },
  { key: 'promotions', category: 'marketing', modules: ['promotions'] },

  { key: 'team_members', category: 'team', modules: ['team_members'] },

  { key: 'editable_text', category: 'appearance', modules: ['editable_text'] },
  { key: 'menu_settings', category: 'appearance', modules: ['menu_settings'] },

  { key: 'receipt_settings', category: 'printing', modules: ['receipt_settings'] },

  { key: 'business_views', category: 'reports', modules: ['business_views'] },
  { key: 'activity_reports', category: 'reports', modules: ['activity_reports'] },
];

/** The twelve cards of both backup panels, in reading order (right to left). */
export const BACKUP_CATEGORIES = [
  { key: 'profile', sections: ['business_profile'] },
  { key: 'settings', sections: ['business_settings', 'working_hours'] },
  { key: 'menu_products', sections: ['menu_categories', 'menu_products', 'featured_products'] },
  { key: 'orders', sections: ['orders'] },
  { key: 'order_history', sections: ['order_audit'] },
  { key: 'tables', sections: ['tables'] },
  { key: 'reviews', sections: ['reviews'] },
  { key: 'marketing', sections: ['advertisements', 'promotions'] },
  { key: 'team', sections: ['team_members'] },
  { key: 'appearance', sections: ['editable_text', 'menu_settings'] },
  { key: 'printing', sections: ['receipt_settings'] },
  { key: 'reports', sections: ['business_views', 'activity_reports'] },
];

export const BACKUP_MODULES = BACKUP_SECTIONS.flatMap((section) =>
  section.modules.map((key) => ({
    key,
    ...MODULE_DEFS[key],
    section: section.key,
    category: section.category,
    restorable:
      MODULE_DEFS[key].restorable === undefined ? !(section.restorable === false) : MODULE_DEFS[key].restorable,
  })),
);

export const FORMAT_VERSION = '1.1';
export const SCHEMA_VERSION = '2026.10';

export const moduleByKey = (key) => BACKUP_MODULES.find((m) => m.key === key);
export const sectionByKey = (key) => BACKUP_SECTIONS.find((s) => s.key === key);
export const categoryByKey = (key) => BACKUP_CATEGORIES.find((c) => c.key === key);

/** Dependency-safe order: dependencies first. */
export function sortByDependencies(modules) {
  const keys = new Set(modules.map((m) => m.key));
  const out = [];
  const seen = new Set();
  const visit = (mod) => {
    if (seen.has(mod.key)) return;
    seen.add(mod.key);
    for (const dep of mod.dependsOn || []) {
      if (keys.has(dep)) visit(moduleByKey(dep));
    }
    out.push(mod);
  };
  for (const m of modules) visit(m);
  return out;
}

/** Every module behind the given categories, in registry order. */
export function modulesForCategories(categoryKeys) {
  const wanted = new Set();
  for (const category of BACKUP_CATEGORIES) {
    if (categoryKeys.includes(category.key)) {
      for (const sectionKey of category.sections) {
        const section = sectionByKey(sectionKey);
        if (section) section.modules.forEach((m) => wanted.add(m));
      }
    }
  }
  return BACKUP_MODULES.filter((m) => wanted.has(m.key));
}

/** The sections a list of module keys really covers, in registry order. */
export function sectionsCoveredBy(moduleKeys) {
  const keys = new Set(moduleKeys);
  return BACKUP_SECTIONS.filter((section) => section.modules.some((m) => keys.has(m)));
}

/** Stable serialisation, so a checksum survives a jsonb round trip. */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/**
 * Integrity checksum of the archive contents. The checksum itself and the
 * byte-totals block are excluded, because the size is only known once the file
 * (which carries the checksum) has been serialised.
 */
export function archiveChecksum(manifest, modules) {
  const { checksum, totals, ...rest } = manifest || {};
  return createHash('sha256').update(stableStringify({ manifest: rest, modules })).digest('hex');
}
