import express from 'express';
import { q } from '../db.js';
import { requireAuth, withBusiness, perm } from '../auth.js';
import { ah, bad, conflict } from '../lib/http.js';
import { normalizeMenuSettings } from '../lib/menu-settings.js';
import { normalizeReceiptMessages } from '../lib/receipt-messages.js';

const router = express.Router();
router.use(requireAuth);

const PROFILE_FIELDS = {
  name: 'text',
  name_ku: 'text',
  name_fa: 'text',
  name_ar: 'text',
  name_en: 'text',
  description: 'text',
  logo_url: 'text',
  cover_url: 'text',
  phone: 'text',
  email: 'text',
  website: 'text',
  address: 'text',
  city: 'text',
  business_type: 'text',
  timezone: 'text',
  currency: 'text',
};

const JSON_FIELDS = [
  'socials',
  'addresses',
  'theme',
  'working_hours',
  'receipt_settings',
  'notification_settings',
  'dashboard_settings',
  'menu_settings',
  'editable_text',
];

const NUM_FIELDS = ['latitude', 'longitude', 'tax_rate', 'service_charge_rate'];

/** Full business record for the signed-in tenant (staff and above may read). */
router.get(
  '/',
  withBusiness('staff'),
  ah(async (req, res) => {
    const { rows } = await q('SELECT * FROM businesses WHERE id = $1', [req.businessId]);
    res.json({ business: rows[0], role: req.role });
  }),
);

/**
 * Updates profile + settings. Only values present in the allow-lists below can
 * be written — a client can never inject id, slug, order_seq or ownership.
 */
router.put(
  '/',
  withBusiness('manager'),
  perm('settings.edit'),
  ah(async (req, res) => {
    const body = { ...(req.body || {}) };
    /*
     * Menu Settings is stored as one canonical object: unknown table modes and
     * non-boolean switches are coerced here, so a direct request can never save
     * a configuration the menus cannot interpret.
     */
    if (body.menu_settings && typeof body.menu_settings === 'object') {
      body.menu_settings = normalizeMenuSettings(body.menu_settings);
    }
    /*
     * The admin-return control is meaningless while the customer menu is off,
     * so the rule is enforced here too and not only in the settings screen: a
     * direct request can never leave a business with the control armed while
     * its public menu is disabled.
     */
    if (body.menu_settings && typeof body.menu_settings === 'object' && body.menu_settings.show_customer_menu === false) {
      body.menu_settings = { ...body.menu_settings, show_admin_return: false };
    }
    /*
     * Receipt messages are the only editable text with a fixed identity: only
     * the fifteen known message ids and the four supported locales may be
     * stored, and an emptied message drops its override entirely.
     */
    if (body.editable_text && typeof body.editable_text === 'object' && 'receipt_messages' in body.editable_text) {
      body.editable_text = {
        ...body.editable_text,
        receipt_messages: normalizeReceiptMessages(body.editable_text.receipt_messages),
      };
    }
    /*
     * Optimistic concurrency for editors that send the record version they
     * loaded: a save that would overwrite a newer change is refused instead of
     * silently winning. Requests without the header keep the old behaviour.
     */
    if (body.expected_updated_at) {
      const { rows } = await q('SELECT updated_at FROM businesses WHERE id = $1', [req.businessId]);
      const stored = rows[0]?.updated_at ? new Date(rows[0].updated_at).getTime() : null;
      const expected = new Date(body.expected_updated_at).getTime();
      if (stored !== null && Number.isFinite(expected) && stored !== expected) {
        throw conflict('STALE_BUSINESS');
      }
    }
    const sets = [];
    const values = [req.businessId];

    for (const [field, kind] of Object.entries(PROFILE_FIELDS)) {
      if (field in body) {
        values.push(body[field] === null ? null : String(body[field]).slice(0, 4000));
        sets.push(`${field} = $${values.length}`);
      }
    }
    for (const field of JSON_FIELDS) {
      if (field in body) {
        if (body[field] === null || typeof body[field] !== 'object') {
          throw bad('INVALID_JSON_FIELD', field);
        }
        values.push(JSON.stringify(body[field]));
        sets.push(`${field} = $${values.length}::jsonb`);
      }
    }
    for (const field of NUM_FIELDS) {
      if (field in body) {
        const n = Number(body[field]);
        if (!Number.isFinite(n)) throw bad('INVALID_NUMBER', field);
        values.push(n);
        sets.push(`${field} = $${values.length}`);
      }
    }

    if (!sets.length) return res.json({ ok: true, unchanged: true });

    sets.push('updated_at = now()');
    const { rows } = await q(
      `UPDATE businesses SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    res.json({ business: rows[0] });
  }),
);

/** Live counters used by the profile page header. */
router.get(
  '/stats',
  withBusiness('staff'),
  ah(async (req, res) => {
    const b = req.businessId;
    const [cats, prods, tables, orders, reviews, staff] = await Promise.all([
      q(`SELECT count(*)::int c, count(*) FILTER (WHERE active)::int a FROM categories WHERE business_id=$1`, [b]),
      q(`SELECT count(*)::int c, count(*) FILTER (WHERE active)::int a FROM products WHERE business_id=$1`, [b]),
      q(`SELECT count(*)::int c FROM tables WHERE business_id=$1`, [b]),
      q(`SELECT count(*)::int c FROM orders WHERE business_id=$1`, [b]),
      q(`SELECT count(*)::int c FROM reviews WHERE business_id=$1`, [b]),
      q(
        `SELECT m.role, count(*)::int c FROM memberships m
          WHERE m.business_id=$1 AND m.status='active' GROUP BY m.role`,
        [b],
      ),
    ]);
    res.json({
      categories: cats.rows[0],
      products: prods.rows[0],
      tables: tables.rows[0].c,
      orders: orders.rows[0].c,
      reviews: reviews.rows[0].c,
      staff: staff.rows,
    });
  }),
);

export default router;
