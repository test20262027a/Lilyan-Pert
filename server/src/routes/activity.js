import express from 'express';
import { q } from '../db.js';
import { requireAuth, withBusiness } from '../auth.js';
import { ah, bad, isUuid, notFound } from '../lib/http.js';
import { addDays, localDay, safeZone } from '../lib/ranges.js';

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
 * filtered to the verified current business. Search, the module/type/user
 * filters and the date window are all applied in SQL over the whole dataset —
 * never over one rendered page.
 */

const KINDS = ['activity', 'order_status', 'print'];
const ENTITIES = [
  'product', 'category', 'table', 'promotion', 'ad', 'review',
  'user', 'settings', 'backup', 'reset', 'order', 'print',
];
const RANGES = ['today', 'yesterday', 'week', 'month', 'custom', 'all'];

/*
 * Records the report must never erase through the UI: permission changes,
 * backup/restore history and the order lifecycle are authoritative audit
 * records. They stay in the report and the delete affordance is disabled.
 */
const PROTECTED_ENTITIES = new Set(['user', 'backup', 'reset']);

const MAX_LIMIT = 100;
const MAX_TERM = 80;

const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));

/** Strips ILIKE wildcards so a search term can only ever be a plain substring. */
const cleanTerm = (v) => String(v ?? '').replace(/[%_\\]/g, ' ').trim().slice(0, MAX_TERM);

router.get(
  '/',
  withBusiness('manager'),
  ah(async (req, res) => {
    const business = req.businessId;
    const biz = (await q('SELECT timezone FROM businesses WHERE id = $1', [business])).rows[0];
    const timezone = safeZone(biz?.timezone);

    const kind = KINDS.includes(String(req.query.kind)) ? String(req.query.kind) : null;
    const entity = ENTITIES.includes(String(req.query.entity)) ? String(req.query.entity) : null;
    const actor = isUuid(req.query.actor) ? String(req.query.actor) : null;
    const term = cleanTerm(req.query.q);
    const like = term ? `%${term}%` : null;
    const rangeKey = RANGES.includes(String(req.query.range)) ? String(req.query.range) : 'all';

    const today = localDay(timezone);
    let win = { from: null, to: null };
    if (rangeKey === 'today') win = { from: today, to: today };
    else if (rangeKey === 'yesterday') {
      const day = addDays(today, -1);
      win = { from: day, to: day };
    } else if (rangeKey === 'week') win = { from: addDays(today, -6), to: today };
    else if (rangeKey === 'month') win = { from: addDays(today, -29), to: today };
    else if (rangeKey === 'custom') {
      const a = isDay(req.query.from) ? String(req.query.from) : null;
      const b = isDay(req.query.to) ? String(req.query.to) : a;
      if (a && b) win = a <= b ? { from: a, to: b } : { from: b, to: a };
    }

    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 25));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    /*
     * Every branch appends its own placeholders in the order they appear in the
     * SQL below, so a parameter can never point at another branch's value. The
     * window is compared as a calendar day inside the business timezone, so
     * "today" means the restaurant's today, not the server's.
     */
    const params = [business];
    const dateFilter = (column) => {
      if (!win.from) return '';
      params.push(timezone, win.from, win.to);
      const at = params.length - 2;
      return ` AND (${column} AT TIME ZONE $${at}::text)::date BETWEEN $${at + 1}::date AND $${at + 2}::date`;
    };
    const searchFilter = (columns) => {
      if (!like) return '';
      params.push(like);
      const at = params.length;
      return ` AND (${columns.map((c) => `coalesce(${c}, '') ILIKE $${at}`).join(' OR ')})`;
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
         WHERE a.business_id = $1 ${dateFilter('a.created_at')} ${sql}
           AND NOT EXISTS (
                 SELECT 1 FROM activity_hidden x
                  WHERE x.business_id = $1 AND x.kind = 'activity' AND x.entry_id = a.id)
           ${searchFilter(['a.actor_name', 'a.entity', 'a.action', 'a.entity_label', 'a.path'])}`);
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
         WHERE h.business_id = $1 ${dateFilter('h.changed_at')} ${sql}
           ${searchFilter([
             'h.changed_by_name',
             'h.from_status',
             'h.to_status',
             'o.order_number::text',
           ])}`);
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
         WHERE p.business_id = $1 ${dateFilter('p.printed_at')} ${sql}
           ${searchFilter(['p.printed_by_name', 'o.order_number::text'])}`);
    }

    const actors = await q(
      `SELECT id, min(name) AS name FROM (
         SELECT u.id, coalesce(nullif(u.full_name, ''), u.email) AS name
           FROM memberships m
           JOIN users u ON u.id = m.user_id
          WHERE m.business_id = $1 AND m.status = 'active'
         UNION ALL
         SELECT actor_id, actor_name FROM activity_log
          WHERE business_id = $1 AND actor_id IS NOT NULL
         UNION ALL
         SELECT changed_by, changed_by_name FROM order_status_history
          WHERE business_id = $1 AND changed_by IS NOT NULL
         UNION ALL
         SELECT printed_by, printed_by_name FROM receipt_prints
          WHERE business_id = $1 AND printed_by IS NOT NULL
       ) u
       WHERE name IS NOT NULL
       GROUP BY id
       ORDER BY min(name)`,
      [business],
    );

    if (!branches.length) {
      return res.json({
        entries: [],
        total: 0,
        actors: actors.rows,
        entities: ENTITIES,
        range: rangeKey,
        window: win,
      });
    }

    const union = branches.join(' UNION ALL ');
    const filterParams = [...params];
    const limitIdx = params.push(limit);
    const offsetIdx = params.push(offset);

    const [items, count] = await Promise.all([
      q(
        `SELECT * FROM (${union}) t ORDER BY t.at DESC, t.id DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      ),
      q(`SELECT count(*)::int AS total FROM (${union}) t`, filterParams),
    ]);

    res.json({
      entries: items.rows.map((row) => ({
        ...row,
        deletable: row.kind === 'activity' && !PROTECTED_ENTITIES.has(row.entity),
      })),
      total: count.rows[0].total,
      actors: actors.rows,
      entities: ENTITIES,
      range: rangeKey,
      window: win,
      filters: { kind, entity, actor, from: win.from, to: win.to, q: term, limit, offset },
    });
  }),
);

/*
 * Removes one entry from the report.
 *
 * The authoritative audit row is never deleted: the report is filtered through
 * `activity_hidden`, so an archived entry disappears from the feed while the
 * security record itself stays intact. Order status changes, receipt prints,
 * permission changes and backup history are not archivable at all.
 */
router.delete(
  '/:kind/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const kind = String(req.params.kind);
    const id = String(req.params.id);
    if (kind !== 'activity') throw bad('ACTIVITY_PROTECTED');
    if (!isUuid(id)) throw notFound('ACTIVITY_NOT_FOUND');

    const { rows } = await q('SELECT id, entity FROM activity_log WHERE id = $1 AND business_id = $2', [
      id,
      req.businessId,
    ]);
    const row = rows[0];
    if (!row) throw notFound('ACTIVITY_NOT_FOUND');
    if (PROTECTED_ENTITIES.has(row.entity)) throw bad('ACTIVITY_PROTECTED');

    await q(
      `INSERT INTO activity_hidden (business_id, kind, entry_id, hidden_by, hidden_by_name)
       VALUES ($1, 'activity', $2, $3, $4)
       ON CONFLICT (business_id, kind, entry_id) DO NOTHING`,
      [
        req.businessId,
        id,
        isUuid(req.user?.id) ? req.user.id : null,
        req.user?.full_name || req.user?.email || null,
      ],
    );

    res.json({ ok: true });
  }),
);

export default router;
