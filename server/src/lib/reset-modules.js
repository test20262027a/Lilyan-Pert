import { countModule, moduleByKey as backupModuleByKey } from './backup-modules.js';

/**
 * Canonical deletion registry.
 *
 * This is the ONLY place that decides what a reset may remove, and it is keyed
 * by the SAME module identifiers as `backup-modules.js`: every entry names the
 * backup module whose authoritative count it reports, so the Backup panel and
 * the Reset panel can never disagree about how many records a module holds.
 *
 * Two deliberate operations, never mixed:
 *
 *   removeSample()  "Reset sample data" — only rows the demo seed flagged
 *                   (`is_sample = true`). Real business data is untouchable.
 *   removeAll()     "Delete business data" — every record of the module for the
 *                   caller's business, after an explicit typed confirmation.
 *                   Ownership, sign-in identities, backups and other
 *                   businesses are never part of it.
 *
 * Dependencies are reported, not guessed: `stats()` returns the records that
 * survive (`detached`) or disappear (`cascaded`) with the module, so the page
 * can explain the impact before anything is deleted. The delete handlers repeat
 * their own protection rules instead of trusting a previous count.
 */

/** Rows no reset of any kind can reach. */
export const PROTECTED = ['business', 'owner', 'auth', 'backups', 'subscriptions'];

const scalar = async (db, businessId, sql) => {
  const { rows } = await db.query(sql, [businessId]);
  return rows[0]?.c ?? 0;
};

/** Authoritative count of a module — the same query the backup manifest uses. */
const totalOf = (db, businessId, key) => countModule(db, businessId, backupModuleByKey(key));

/** Sample rows of a table, split by whether a dependency protects them. */
async function sampleRows(db, businessId, table, protect = 'false') {
  const { rows } = await db.query(
    `SELECT count(*) FILTER (WHERE t.is_sample AND NOT (${protect}))::int AS eligible,
            count(*) FILTER (WHERE t.is_sample AND (${protect}))::int     AS blocked
       FROM ${table} t
      WHERE t.business_id = $1`,
    [businessId],
  );
  return { eligible: rows[0]?.eligible ?? 0, blocked: rows[0]?.blocked ?? 0 };
}

const dependents = (...pairs) => pairs.filter((p) => p && p.count > 0);

const NO_SAMPLE = { eligible: 0, blocked: 0 };

export const RESET_MODULES = [
  /* ------------------------------------------------------------- orders */
  {
    key: 'orders',
    table: 'orders',
    module: 'orders',
    risk: true,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'orders');
      const sample = await sampleRows(db, businessId, 'orders');
      return {
        total,
        sample,
        removable: total,
        dependents: dependents(
          { key: 'order_items', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM order_items WHERE business_id = $1') },
          { key: 'order_audit', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM order_status_history WHERE business_id = $1') },
          { key: 'receipt_prints', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM receipt_prints WHERE business_id = $1') },
          { key: 'order_discounts', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM order_discount_history WHERE business_id = $1') },
          { key: 'notifications', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM notifications WHERE business_id = $1 AND order_id IS NOT NULL') },
        ),
      };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        'DELETE FROM orders o WHERE o.business_id = $1 AND o.is_sample',
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM orders WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* ------------------------------------------------------- business visits */
  {
    key: 'visits',
    table: 'business_views',
    module: 'business_views',
    risk: false,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'business_views');
      return { total, sample: await sampleRows(db, businessId, 'business_views'), removable: total, dependents: [] };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        'DELETE FROM business_views v WHERE v.business_id = $1 AND v.is_sample',
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM business_views WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* ------------------------------------------------------------ reviews */
  {
    key: 'reviews',
    table: 'reviews',
    module: 'reviews',
    risk: false,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'reviews');
      return { total, sample: await sampleRows(db, businessId, 'reviews'), removable: total, dependents: [] };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        'DELETE FROM reviews r WHERE r.business_id = $1 AND r.is_sample',
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM reviews WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* ----------------------------------------------------- advertisements */
  {
    key: 'advertisements',
    table: 'advertisements',
    module: 'advertisements',
    risk: false,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'advertisements');
      return {
        total,
        sample: await sampleRows(db, businessId, 'advertisements'),
        removable: total,
        dependents: [],
      };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        'DELETE FROM advertisements a WHERE a.business_id = $1 AND a.is_sample',
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM advertisements WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* ------------------------------------------------------------- tables */
  {
    key: 'tables',
    table: 'tables',
    module: 'tables',
    risk: false,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'tables');
      const protect = 'EXISTS (SELECT 1 FROM orders o WHERE o.table_id = t.id AND NOT o.is_sample)';
      return {
        total,
        sample: await sampleRows(db, businessId, 'tables', protect),
        removable: total,
        // Orders keep their table-name snapshot and simply lose the live link.
        dependents: dependents({
          key: 'orders',
          count: await scalar(db, businessId, 'SELECT count(*)::int c FROM orders WHERE business_id = $1 AND table_id IS NOT NULL'),
        }),
      };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        `DELETE FROM tables t
          WHERE t.business_id = $1 AND t.is_sample
            AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.table_id = t.id AND NOT o.is_sample)`,
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM tables WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* --------------------------------------------------------- promotions */
  {
    key: 'promotions',
    table: 'promotions',
    module: 'promotions',
    risk: false,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'promotions');
      return {
        total,
        sample: await sampleRows(db, businessId, 'promotions'),
        removable: total,
        // Completed orders keep their frozen totals and promotion_code snapshot.
        dependents: [],
      };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        'DELETE FROM promotions p WHERE p.business_id = $1 AND p.is_sample',
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM promotions WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* ----------------------------------------------------------- products */
  {
    key: 'products',
    table: 'products',
    module: 'menu_products',
    risk: true,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'menu_products');
      const protect = `EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
                                 WHERE oi.product_id = t.id AND NOT o.is_sample)`;
      return {
        total,
        sample: await sampleRows(db, businessId, 'products', protect),
        removable: total,
        dependents: dependents(
          // Order lines survive with their frozen name and price.
          { key: 'order_items', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM order_items WHERE business_id = $1 AND product_id IS NOT NULL') },
          // A product discount is deleted with its product by the foreign key.
          { key: 'promotions', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM promotions WHERE business_id = $1 AND product_id IS NOT NULL') },
        ),
      };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        `DELETE FROM products p
          WHERE p.business_id = $1 AND p.is_sample
            AND NOT EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
                             WHERE oi.product_id = p.id AND NOT o.is_sample)`,
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM products WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* --------------------------------------------------------- categories */
  {
    key: 'categories',
    table: 'categories',
    module: 'menu_categories',
    risk: true,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'menu_categories');
      const protect = `(EXISTS (SELECT 1 FROM products p WHERE p.category_id = t.id AND NOT p.is_sample)
                    OR EXISTS (SELECT 1 FROM advertisements a WHERE a.category_id = t.id AND NOT a.is_sample))`;
      return {
        total,
        sample: await sampleRows(db, businessId, 'categories', protect),
        removable: total,
        dependents: dependents(
          // These records survive; only their category link is cleared.
          { key: 'menu_products', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM products WHERE business_id = $1 AND category_id IS NOT NULL') },
          { key: 'advertisements', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM advertisements WHERE business_id = $1 AND category_id IS NOT NULL') },
          { key: 'promotions', count: await scalar(db, businessId, 'SELECT count(*)::int c FROM promotions WHERE business_id = $1 AND category_id IS NOT NULL') },
        ),
      };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        `DELETE FROM categories c
          WHERE c.business_id = $1 AND c.is_sample
            AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id AND NOT p.is_sample)
            AND NOT EXISTS (SELECT 1 FROM advertisements a WHERE a.category_id = c.id AND NOT a.is_sample)`,
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM categories WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* ------------------------------------------------------- staff members */
  {
    key: 'staff',
    table: 'memberships',
    module: 'team_members',
    risk: true,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'team_members');
      const protect = `EXISTS (SELECT 1 FROM memberships o
                                 WHERE o.business_id = $1 AND o.role = 'owner' AND o.user_id = t.user_id)`;
      return {
        total,
        sample: await sampleRows(db, businessId, 'memberships', protect),
        removable: await scalar(
          db,
          businessId,
          "SELECT count(*)::int c FROM memberships WHERE business_id = $1 AND role <> 'owner'",
        ),
        dependents: [],
      };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        `DELETE FROM memberships m
          WHERE m.business_id = $1 AND m.is_sample AND m.role <> 'owner'
            AND NOT EXISTS (SELECT 1 FROM memberships o
                             WHERE o.business_id = $1 AND o.role = 'owner' AND o.user_id = m.user_id)`,
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      // The owner membership and every sign-in account stay, always.
      const { rowCount } = await db.query(
        "DELETE FROM memberships WHERE business_id = $1 AND role <> 'owner'",
        [businessId],
      );
      return rowCount;
    },
  },

  /* -------------------------------------------------------- suggestions */
  {
    key: 'suggestions',
    table: 'products',
    module: 'featured_products',
    risk: true,
    sample: true,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'featured_products');
      return {
        total,
        sample: {
          eligible: await scalar(db, businessId, 'SELECT count(*)::int c FROM products WHERE business_id = $1 AND is_sample AND featured'),
          blocked: 0,
        },
        removable: total,
        dependents: [],
      };
    },
    async removeSample(db, businessId) {
      const { rowCount } = await db.query(
        'UPDATE products SET featured = false, updated_at = now() WHERE business_id = $1 AND is_sample AND featured',
        [businessId],
      );
      return rowCount;
    },
    async removeAll(db, businessId) {
      // Best sellers are computed from orders; the stored recommendation is the
      // featured flag, so this clears it and deletes no product or order.
      const { rowCount } = await db.query(
        'UPDATE products SET featured = false, updated_at = now() WHERE business_id = $1 AND featured',
        [businessId],
      );
      return rowCount;
    },
  },

  /* ------------------------------------------------------- notifications */
  {
    key: 'notifications',
    table: 'notifications',
    module: 'notifications',
    risk: false,
    sample: false,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'notifications');
      return { total, sample: NO_SAMPLE, removable: total, dependents: [] };
    },
    async removeSample() {
      return 0;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM notifications WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* ---------------------------------------------------- activity history */
  {
    key: 'activity',
    table: 'activity_log',
    module: 'activity_reports',
    risk: true,
    sample: false,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'activity_reports');
      return {
        total,
        sample: NO_SAMPLE,
        removable: total,
        dependents: dependents({
          key: 'activity_hidden',
          count: await scalar(db, businessId, 'SELECT count(*)::int c FROM activity_hidden WHERE business_id = $1'),
        }),
      };
    },
    async removeSample() {
      return 0;
    },
    async removeAll(db, businessId) {
      await db.query('DELETE FROM activity_hidden WHERE business_id = $1', [businessId]);
      const { rowCount } = await db.query('DELETE FROM activity_log WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* ------------------------------------------------------ uploaded files */
  {
    key: 'media',
    table: 'media',
    module: 'uploaded_files',
    risk: true,
    sample: false,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'uploaded_files');
      return {
        total,
        sample: NO_SAMPLE,
        removable: total,
        dependents: dependents({
          // Pictures still referenced by a record; removing the file leaves the
          // URL in place, so the page explains it before the delete.
          key: 'menu_products',
          count: await scalar(
            db,
            businessId,
            "SELECT count(*)::int c FROM products WHERE business_id = $1 AND image_url LIKE '/api/manage/media/%'",
          ),
        }),
      };
    },
    async removeSample() {
      return 0;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query('DELETE FROM media WHERE business_id = $1', [businessId]);
      return rowCount;
    },
  },

  /* ------------------------------------------------------ business setup */
  {
    key: 'settings',
    table: 'businesses',
    module: 'business_settings',
    risk: true,
    sample: false,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'business_settings');
      return { total, sample: NO_SAMPLE, removable: total, dependents: [] };
    },
    async removeSample() {
      return 0;
    },
    async removeAll(db, businessId) {
      // Back to the column defaults of the schema: theme, dashboard, notification,
      // menu, receipt and working-hour settings, taxes and the editable copy.
      const { rowCount } = await db.query(
        `UPDATE businesses SET
           theme = '{"mode":"light","preset":"midnight","primary":"#7C67E4"}'::jsonb,
           dashboard_settings = '{"show_overview":true,"show_insights":true,"show_order_notifications":true,"show_recent_orders":true,"show_notification_settings":true}'::jsonb,
           notification_settings = '{}'::jsonb,
           menu_settings = '{"show_customer_menu":true,"show_admin_return":true}'::jsonb,
           receipt_settings = '{}'::jsonb,
           working_hours = '{}'::jsonb,
           editable_text = '{}'::jsonb,
           tax_rate = 0,
           service_charge_rate = 0,
           updated_at = now()
         WHERE id = $1`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* ------------------------------------------------------------ branding */
  {
    key: 'branding',
    table: 'businesses',
    module: 'business_profile',
    risk: true,
    sample: false,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'business_profile');
      return { total, sample: NO_SAMPLE, removable: total, dependents: [] };
    },
    async removeSample() {
      return 0;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query(
        'UPDATE businesses SET logo_url = NULL, cover_url = NULL, login_bg_url = NULL, updated_at = now() WHERE id = $1',
        [businessId],
      );
      return rowCount;
    },
  },

  /* ------------------------------------------------------------ texts */
  {
    key: 'texts',
    table: 'businesses',
    module: 'editable_text',
    risk: true,
    sample: false,
    async stats(db, businessId) {
      const total = await totalOf(db, businessId, 'editable_text');
      return { total, sample: NO_SAMPLE, removable: total, dependents: [] };
    },
    async removeSample() {
      return 0;
    },
    async removeAll(db, businessId) {
      const { rowCount } = await db.query(
        "UPDATE businesses SET editable_text = '{}'::jsonb, updated_at = now() WHERE id = $1",
        [businessId],
      );
      return rowCount;
    },
  },
];

export const MODULE_KEYS = RESET_MODULES.map((m) => m.key);

export const moduleByKey = (key) => RESET_MODULES.find((m) => m.key === key);

/** Modules a sample reset may run, in dependency-safe order. */
export const SAMPLE_EXECUTION_ORDER = [
  'suggestions',
  'orders',
  'visits',
  'reviews',
  'advertisements',
  'tables',
  'promotions',
  'products',
  'categories',
  'staff',
];

/**
 * Modules a business-data delete runs, in dependency-safe order: the records
 * that point at others go first, the pictures last (once nothing references
 * them), and the business-wide settings at the very end.
 */
export const DATA_EXECUTION_ORDER = [
  'suggestions',
  'orders',
  'visits',
  'reviews',
  'advertisements',
  'tables',
  'promotions',
  'products',
  'categories',
  'staff',
  'notifications',
  'activity',
  'media',
  'texts',
  'settings',
  'branding',
];

/** Live counts for every module of one business, for both operations. */
export async function resetStats(db, businessId) {
  const out = [];
  for (const mod of RESET_MODULES) {
    const stats = await mod.stats(db, businessId);
    out.push({
      key: mod.key,
      risk: mod.risk,
      sample: mod.sample,
      total: stats.total ?? 0,
      sample_counts: { eligible: stats.sample?.eligible ?? 0, blocked: stats.sample?.blocked ?? 0 },
      removable: stats.removable ?? 0,
      dependents: stats.dependents || [],
    });
  }
  return out;
}
