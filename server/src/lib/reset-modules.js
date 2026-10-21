/**
 * Canonical "Reset Sample Data" registry.
 *
 * This is the ONLY place that decides what a reset may remove. One entry per
 * card on the administration page, in the exact order the reference screen
 * shows them, and each entry answers three questions with SQL:
 *
 *   stats()   how many rows the reset would really remove (eligible), how many
 *             sample rows are held back by a dependency (blocked), and how many
 *             rows exist in total so the UI can say "real records are kept".
 *   remove()  the delete/update itself, repeating every protection rule of
 *             stats() so a row that became dependent between the count and the
 *             delete is never removed.
 *
 * Every query is scoped by `business_id = $1` and by `is_sample = true`.
 * Nothing here can reach rows flagged as genuine business data, and nothing
 * here ever touches:
 *
 *   businesses     the business profile and identity
 *   users          global authentication identities
 *   memberships    except sample, non-owner ones (module `staff`)
 *   activity_log   the append-only audit trail (including reset itself)
 *   activity_hidden, backups, app_settings, push_subscriptions
 *
 * `scope: 'staff'` is the one module that removes memberships rather than menu
 * data; it still never deletes the owner membership or the user account.
 */

/** Rows every reset must leave alone. Reported to the UI as the protected set. */
export const PROTECTED = ['business', 'owner', 'auth', 'settings', 'audit'];

/** A sample row that a genuine, non-sample order still points at. */
const REAL_ORDER_ITEM = `SELECT 1 FROM order_items oi
                            JOIN orders o ON o.id = oi.order_id
                           WHERE oi.product_id = p.id AND NOT o.is_sample`;

export const RESET_MODULES = [
  /* ------------------------------------------------------------- orders */
  {
    key: 'orders',
    table: 'orders',
    risk: false,
    async stats(db, businessId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (WHERE o.is_sample)::int AS eligible,
                count(*)::int                             AS total
           FROM orders o WHERE o.business_id = $1`,
        [businessId],
      );
      return { ...rows[0], blocked: 0 };
    },
    async remove(db, businessId) {
      // Items, status history, receipt prints and notifications follow the
      // order's own foreign keys; nothing outside the order is affected.
      const { rowCount } = await db.query(
        `DELETE FROM orders o WHERE o.business_id = $1 AND o.is_sample`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* ------------------------------------------------------- business visits */
  {
    key: 'visits',
    table: 'business_views',
    risk: false,
    async stats(db, businessId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (WHERE v.is_sample)::int AS eligible,
                count(*)::int                             AS total
           FROM business_views v WHERE v.business_id = $1`,
        [businessId],
      );
      return { ...rows[0], blocked: 0 };
    },
    async remove(db, businessId) {
      const { rowCount } = await db.query(
        `DELETE FROM business_views v WHERE v.business_id = $1 AND v.is_sample`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* ------------------------------------------------------------ reviews */
  {
    key: 'reviews',
    table: 'reviews',
    risk: false,
    async stats(db, businessId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (WHERE r.is_sample)::int AS eligible,
                count(*)::int                             AS total
           FROM reviews r WHERE r.business_id = $1`,
        [businessId],
      );
      return { ...rows[0], blocked: 0 };
    },
    async remove(db, businessId) {
      const { rowCount } = await db.query(
        `DELETE FROM reviews r WHERE r.business_id = $1 AND r.is_sample`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* ----------------------------------------------------- advertisements */
  {
    key: 'advertisements',
    table: 'advertisements',
    risk: false,
    async stats(db, businessId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (WHERE a.is_sample)::int AS eligible,
                count(*)::int                              AS total
           FROM advertisements a WHERE a.business_id = $1`,
        [businessId],
      );
      return { ...rows[0], blocked: 0 };
    },
    async remove(db, businessId) {
      // Only the banners go; a linked product or category is never deleted.
      const { rowCount } = await db.query(
        `DELETE FROM advertisements a WHERE a.business_id = $1 AND a.is_sample`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* ------------------------------------------------------------- tables */
  {
    key: 'tables',
    table: 'tables',
    risk: false,
    async stats(db, businessId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (
                  WHERE t.is_sample AND NOT EXISTS (
                    SELECT 1 FROM orders o WHERE o.table_id = t.id AND NOT o.is_sample))::int AS eligible,
                count(*) FILTER (
                  WHERE t.is_sample AND EXISTS (
                    SELECT 1 FROM orders o WHERE o.table_id = t.id AND NOT o.is_sample))::int AS blocked,
                count(*)::int AS total
           FROM tables t WHERE t.business_id = $1`,
        [businessId],
      );
      return rows[0];
    },
    async remove(db, businessId) {
      // A table a real order still points at is kept: deleting it would drop
      // that order's table link. The printed QR code of a removed sample table
      // stops working — the confirmation dialog warns about that first.
      const { rowCount } = await db.query(
        `DELETE FROM tables t
          WHERE t.business_id = $1 AND t.is_sample
            AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.table_id = t.id AND NOT o.is_sample)`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* --------------------------------------------------------- promotions */
  {
    key: 'promotions',
    table: 'promotions',
    risk: false,
    async stats(db, businessId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (WHERE p.is_sample)::int AS eligible,
                count(*)::int                             AS total
           FROM promotions p WHERE p.business_id = $1`,
        [businessId],
      );
      return { ...rows[0], blocked: 0 };
    },
    async remove(db, businessId) {
      // Completed orders keep their frozen totals and promotion_code snapshot,
      // so no past order is recalculated by this delete.
      const { rowCount } = await db.query(
        `DELETE FROM promotions p WHERE p.business_id = $1 AND p.is_sample`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* ----------------------------------------------------------- products */
  {
    key: 'products',
    table: 'products',
    risk: true,
    async stats(db, businessId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (
                  WHERE p.is_sample AND NOT EXISTS (${REAL_ORDER_ITEM}))::int AS eligible,
                count(*) FILTER (
                  WHERE p.is_sample AND EXISTS (${REAL_ORDER_ITEM}))::int     AS blocked,
                count(*)::int AS total
           FROM products p WHERE p.business_id = $1`,
        [businessId],
      );
      return rows[0];
    },
    async remove(db, businessId) {
      // A sample product that a genuine order refers to stays, because that
      // order's line items are financial history. Real products are never in
      // this set at all.
      const { rowCount } = await db.query(
        `DELETE FROM products p
          WHERE p.business_id = $1 AND p.is_sample
            AND NOT EXISTS (${REAL_ORDER_ITEM})`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* --------------------------------------------------------- categories */
  {
    key: 'categories',
    table: 'categories',
    risk: true,
    async stats(db, businessId) {
      const blocked = `(EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id AND NOT p.is_sample)
                     OR EXISTS (SELECT 1 FROM advertisements a WHERE a.category_id = c.id AND NOT a.is_sample))`;
      const { rows } = await db.query(
        `SELECT count(*) FILTER (WHERE c.is_sample AND NOT ${blocked})::int AS eligible,
                count(*) FILTER (WHERE c.is_sample AND ${blocked})::int     AS blocked,
                count(*)::int AS total
           FROM categories c WHERE c.business_id = $1`,
        [businessId],
      );
      return rows[0];
    },
    async remove(db, businessId) {
      // A category holding a real product or a real banner is kept. Surviving
      // sample products of a removed category keep existing with no category.
      const { rowCount } = await db.query(
        `DELETE FROM categories c
          WHERE c.business_id = $1 AND c.is_sample
            AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id AND NOT p.is_sample)
            AND NOT EXISTS (SELECT 1 FROM advertisements a WHERE a.category_id = c.id AND NOT a.is_sample)`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* ------------------------------------------------------- staff members */
  {
    key: 'staff',
    table: 'memberships',
    risk: true,
    async stats(db, businessId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (
                  WHERE m.is_sample AND NOT EXISTS (
                    SELECT 1 FROM memberships o
                     WHERE o.business_id = $1 AND o.role = 'owner' AND o.user_id = m.user_id))::int AS eligible,
                count(*) FILTER (
                  WHERE m.is_sample AND EXISTS (
                    SELECT 1 FROM memberships o
                     WHERE o.business_id = $1 AND o.role = 'owner' AND o.user_id = m.user_id))::int AS blocked,
                count(*)::int AS total
           FROM memberships m WHERE m.business_id = $1 AND m.role <> 'owner'`,
        [businessId],
      );
      return rows[0];
    },
    async remove(db, businessId) {
      // Only the sample membership inside THIS business. The owner membership
      // and the sign-in account itself are always kept — real staff removal
      // stays in User Management, where it is authorized and audited.
      const { rowCount } = await db.query(
        `DELETE FROM memberships m
          WHERE m.business_id = $1 AND m.is_sample AND m.role <> 'owner'
            AND NOT EXISTS (SELECT 1 FROM memberships o
                             WHERE o.business_id = $1 AND o.role = 'owner' AND o.user_id = m.user_id)`,
        [businessId],
      );
      return rowCount;
    },
  },

  /* -------------------------------------------------------- suggestions */
  {
    key: 'suggestions',
    table: 'products',
    risk: true,
    async stats(db, businessId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (WHERE p.is_sample AND p.featured)::int AS eligible,
                0::int AS blocked,
                count(*) FILTER (WHERE p.featured)::int AS total
           FROM products p WHERE p.business_id = $1`,
        [businessId],
      );
      return rows[0];
    },
    async remove(db, businessId) {
      // Best sellers are computed from orders, they are not stored records.
      // The only saved recommendation is the "featured" flag, so this clears it
      // on sample products and never deletes a product or an order.
      const { rowCount } = await db.query(
        `UPDATE products p SET featured = false, updated_at = now()
          WHERE p.business_id = $1 AND p.is_sample AND p.featured`,
        [businessId],
      );
      return rowCount;
    },
  },
];

export const MODULE_KEYS = RESET_MODULES.map((m) => m.key);

export const moduleByKey = (key) => RESET_MODULES.find((m) => m.key === key);

/**
 * Execution order. Suggestions run before products so clearing a featured flag
 * is reported truthfully instead of hitting rows the product reset just
 * removed; orders run before tables so a sample order never blocks its table.
 */
export const EXECUTION_ORDER = [
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

/** Live eligible / blocked / total counts for every module of one business. */
export async function resetStats(db, businessId) {
  const out = [];
  for (const mod of RESET_MODULES) {
    const { eligible = 0, blocked = 0, total = 0 } = await mod.stats(db, businessId);
    out.push({ key: mod.key, risk: mod.risk, eligible, blocked, total });
  }
  return out;
}
