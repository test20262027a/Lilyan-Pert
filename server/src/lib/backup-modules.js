/**
 * Canonical backup-module registry.
 *
 * Both "Full Backup" and "Backup by Sections" read from this single list, so a
 * module can never be silently omitted from a full backup. `scope: 'business'`
 * modules are always keyed by business_id on restore, which is what keeps a
 * restore from crossing tenants.
 *
 * Deliberately excluded: users' password hashes, memberships' private auth
 * data, sessions, VAPID private keys, push subscriptions (device-specific
 * secrets), caches.
 */
export const BACKUP_MODULES = [
  {
    key: 'business_profile',
    group: 'core',
    scope: 'business',
    exportMode: 'single',
    table: 'businesses',
    columns: [
      'id', 'slug', 'name', 'name_ku', 'name_fa', 'name_ar', 'name_en',
      'description', 'logo_url', 'cover_url', 'phone', 'email', 'website',
      'address', 'city', 'latitude', 'longitude', 'socials', 'business_type',
      'timezone', 'currency',
    ],
  },
  {
    key: 'business_settings',
    group: 'core',
    scope: 'business',
    exportMode: 'jsonColumns',
    table: 'businesses',
    columns: [
      'theme', 'working_hours', 'receipt_settings', 'notification_settings',
      'menu_settings', 'editable_text', 'tax_rate', 'service_charge_rate',
    ],
  },
  {
    key: 'menu_categories',
    group: 'menu',
    scope: 'business',
    exportMode: 'rows',
    table: 'categories',
    columns: ['id', 'icon', 'sort_order', 'active', 'name_ku', 'name_fa', 'name_ar', 'name_en'],
    orderBy: 'sort_order, created_at',
  },
  {
    key: 'menu_products',
    group: 'menu',
    scope: 'business',
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
  {
    key: 'orders',
    group: 'orders',
    scope: 'business',
    exportMode: 'rows',
    table: 'orders',
    columns: [
      'id', 'table_id', 'order_number', 'status', 'channel', 'customer_name',
      'customer_phone', 'notes', 'subtotal', 'discount', 'tax', 'service_charge',
      'total', 'created_at', 'completed_at',
    ],
    orderBy: 'created_at',
  },
  {
    key: 'order_items',
    group: 'orders',
    scope: 'business',
    exportMode: 'rows',
    table: 'order_items',
    columns: ['id', 'order_id', 'product_id', 'name', 'unit_price', 'quantity', 'line_total', 'notes'],
    dependsOn: ['orders'],
  },
  {
    key: 'order_audit',
    group: 'orders',
    scope: 'business',
    exportMode: 'rows',
    table: 'order_status_history',
    columns: ['id', 'order_id', 'from_status', 'to_status', 'changed_by_name', 'changed_at'],
    dependsOn: ['orders'],
  },
  {
    key: 'receipt_prints',
    group: 'orders',
    scope: 'business',
    exportMode: 'rows',
    table: 'receipt_prints',
    columns: ['id', 'order_id', 'printed_by_name', 'printed_at'],
    dependsOn: ['orders'],
  },
  {
    key: 'tables',
    group: 'operations',
    scope: 'business',
    exportMode: 'rows',
    table: 'tables',
    columns: ['id', 'name', 'seats', 'qr_token', 'zone', 'active'],
  },
  {
    key: 'reviews',
    group: 'operations',
    scope: 'business',
    exportMode: 'rows',
    table: 'reviews',
    columns: ['id', 'order_id', 'customer_name', 'rating', 'comment', 'status', 'created_at'],
  },
  {
    key: 'advertisements',
    group: 'marketing',
    scope: 'business',
    exportMode: 'rows',
    table: 'advertisements',
    columns: [
      'id', 'image_url', 'link_url', 'title_ku', 'title_fa', 'title_ar', 'title_en',
      'subtitle_ku', 'subtitle_fa', 'subtitle_ar', 'subtitle_en', 'active', 'sort_order',
    ],
  },
  {
    key: 'promotions',
    group: 'marketing',
    scope: 'business',
    exportMode: 'rows',
    table: 'promotions',
    columns: [
      'id', 'product_id', 'discount_type', 'discount_value', 'starts_at', 'ends_at',
      'active', 'title_ku', 'title_fa', 'title_ar', 'title_en',
    ],
  },
  {
    key: 'reports',
    group: 'analytics',
    scope: 'business',
    exportMode: 'rows',
    table: 'business_views',
    columns: ['id', 'session_key', 'source', 'viewed_on'],
  },
  {
    key: 'media',
    group: 'assets',
    scope: 'business',
    exportMode: 'rows',
    table: 'media',
    columns: ['id', 'mime', 'byte_size', 'data', 'created_at'],
  },
];

export const GROUPS = [
  { key: 'core', labelKey: 'group_core' },
  { key: 'menu', labelKey: 'group_menu' },
  { key: 'orders', labelKey: 'group_orders' },
  { key: 'operations', labelKey: 'group_operations' },
  { key: 'marketing', labelKey: 'group_marketing' },
  { key: 'analytics', labelKey: 'group_analytics' },
  { key: 'assets', labelKey: 'group_assets' },
];

export const FORMAT_VERSION = '1.0';
export const SCHEMA_VERSION = '2026.10';

export const moduleByKey = (key) => BACKUP_MODULES.find((m) => m.key === key);

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
