import express from 'express';
import { q } from '../db.js';
import { requireAuth, withBusiness } from '../auth.js';
import { ah, isUuid } from '../lib/http.js';

const router = express.Router();
router.use(requireAuth);

/*
 * Activity reports.
 *
 * Three real sources of records are merged into one feed:
 *   1. `activity_log`        — authorized changes to menu, tables, promotions,
 *                              advertisements, reviews, users, settings, backups;
 *   2. `order_status_history`— every order status change (append-only, written
 *                              since the app was built);
 *   3. `receipt_prints`      — every time a member pressed Print on an order.
 *
 * Nothing here is invented: the feed shows what the business's own records say,
 * filtered to the verified current business.
 */

const KINDS = ['activity', 'order_status', 'print'];
const ENTITIES = [
  'product', 'category', 'table', 'promotion', 'ad', 'review',
  'user', 'settings', 'backup', 'reset', 'order', 'print',
];

const MAX_LIMIT = 100;

router.get(
  '/',
  withBusiness('manager'),
  ah(async (req, res) => {
    const business = req.businessId;
    const kind = KINDS.includes(String(req.query.kind)) ? String(req.query.kind) : null;
    const entity = ENTITIES.includes(String(req.query.entity)) ? String(req.query.entity) : null;
    const actor = isUuid(req.query.actor) ? String(req.query.actor) : null;
    const from = req.query.from ? String(req.query.from).slice(0, 10) : null;
    const to = req.query.to ? String(req.query.to).slice(0, 10) : null;
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 25));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    /*
     * Every branch appends its own placeholders in the order they appear in the
     * SQL below, so a parameter can never point at another branch's value.
     */
    const params = [business];
    const dateFilter = (column) => {
      let sql = '';
      if (from) sql += ` AND ${column} >= $${params.push(from)}::date`;
      if (to) sql += ` AND ${column} < ($${params.push(to)}::date + interval '1 day')`;
      return sql;
    };

    const branches = [];

    if (!kind || kind === 'activity') {
      let sql = '';
      if (entity) sql += ` AND a.entity = $${params.push(entity)}`;
      if (actor) sql += ` AND a.actor_id = $${params.push(actor)}::uuid`;
      branches.push(`
        SELECT 'activity' AS kind, a.id, a.created_at AS at, a.actor_name, a.entity, a.action,
               a.entity_label, NULL::text AS from_status, NULL::text AS to_status,
               NULL::int AS order_number
          FROM activity_log a
         WHERE a.business_id = $1 ${dateFilter('a.created_at')} ${sql}`);
    }

    if ((!kind || kind === 'order_status') && (!entity || entity === 'order')) {
      let sql = '';
      if (actor) sql += ` AND h.changed_by = $${params.push(actor)}::uuid`;
      branches.push(`
        SELECT 'order_status' AS kind, h.id, h.changed_at AS at, h.changed_by_name AS actor_name,
               'order' AS entity, h.to_status AS action, NULL::text AS entity_label,
               h.from_status, h.to_status, o.order_number
          FROM order_status_history h
          JOIN orders o ON o.id = h.order_id
         WHERE h.business_id = $1 ${dateFilter('h.changed_at')} ${sql}`);
    }

    if ((!kind || kind === 'print') && (!entity || entity === 'print')) {
      let sql = '';
      if (actor) sql += ` AND p.printed_by = $${params.push(actor)}::uuid`;
      branches.push(`
        SELECT 'print' AS kind, p.id, p.printed_at AS at, p.printed_by_name AS actor_name,
               'print' AS entity, 'printed' AS action, NULL::text AS entity_label,
               NULL::text AS from_status, NULL::text AS to_status, o.order_number
          FROM receipt_prints p
          JOIN orders o ON o.id = p.order_id
         WHERE p.business_id = $1 ${dateFilter('p.printed_at')} ${sql}`);
    }

    if (!branches.length) {
      return res.json({ entries: [], total: 0, actors: [], entities: ENTITIES });
    }

    const union = branches.join(' UNION ALL ');
    const filterParams = [...params];
    const limitIdx = params.push(limit);
    const offsetIdx = params.push(offset);

    const [items, count, actors] = await Promise.all([
      q(
        `SELECT * FROM (${union}) t ORDER BY t.at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      ),
      q(`SELECT count(*)::int AS total FROM (${union}) t`, filterParams),
      q(
        `SELECT DISTINCT actor_id AS id, actor_name AS name FROM (
           SELECT actor_id, actor_name FROM activity_log WHERE business_id = $1 AND actor_id IS NOT NULL
           UNION ALL
           SELECT changed_by, changed_by_name FROM order_status_history WHERE business_id = $1 AND changed_by IS NOT NULL
           UNION ALL
           SELECT printed_by, printed_by_name FROM receipt_prints WHERE business_id = $1 AND printed_by IS NOT NULL
         ) u ORDER BY name`,
        [business],
      ),
    ]);

    res.json({
      entries: items.rows,
      total: count.rows[0].total,
      actors: actors.rows,
      entities: ENTITIES,
      filters: { kind, entity, actor, from, to, limit, offset },
    });
  }),
);

export default router;
