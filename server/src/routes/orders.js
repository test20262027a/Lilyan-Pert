import express from 'express';
import { q, tx } from '../db.js';
import { requireAuth, withBusiness } from '../auth.js';
import { ah, bad, conflict, isUuid, notFound, num } from '../lib/http.js';
import { safeZone } from '../lib/ranges.js';

const router = express.Router();
router.use(requireAuth);

const TRANSITIONS = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const round2 = (n) => Math.round(n * 100) / 100;

async function loadOrder(businessId, id) {
  const { rows } = await q('SELECT * FROM orders WHERE id = $1 AND business_id = $2', [id, businessId]);
  if (!rows[0]) throw notFound('ORDER_NOT_FOUND');
  return rows[0];
}

function assertEditable(order) {
  if (order.status === 'completed') throw conflict('ORDER_COMPLETED_LOCKED');
  if (order.status === 'cancelled') throw conflict('ORDER_CANCELLED_LOCKED');
}

/** List with date / status / receipt-number filters (all tenant-scoped). */
router.get(
  '/',
  withBusiness('staff'),
  ah(async (req, res) => {
    const params = [req.businessId];
    const where = ['o.business_id = $1'];

    /*
     * A day filter means a *business* day: the boundary is resolved in the
     * business timezone, the same way the dashboard buckets its reports.
     */
    const timezone = safeZone(
      (await q('SELECT timezone FROM businesses WHERE id = $1', [req.businessId])).rows[0]?.timezone,
    );
    let tzSlot = null;
    const dayExpr = () => {
      if (!tzSlot) {
        params.push(timezone);
        tzSlot = params.length;
      }
      return `(o.created_at AT TIME ZONE $${tzSlot}::text)::date`;
    };

    const receipt = String(req.query.receipt || '').trim();
    if (receipt) {
      // Receipt search deliberately spans every date, as required.
      params.push(Number(receipt.replace(/[^0-9]/g, '')) || -1);
      where.push(`o.order_number = $${params.length}`);
    } else {
      if (req.query.date) {
        const expr = dayExpr();
        params.push(String(req.query.date).slice(0, 10));
        where.push(`${expr} = $${params.length}::date`);
      }
      if (req.query.from) {
        const expr = dayExpr();
        params.push(String(req.query.from).slice(0, 10));
        where.push(`${expr} >= $${params.length}::date`);
      }
      if (req.query.to) {
        const expr = dayExpr();
        params.push(String(req.query.to).slice(0, 10));
        where.push(`${expr} <= $${params.length}::date`);
      }
    }

    if (req.query.status && req.query.status !== 'all') {
      params.push(String(req.query.status).slice(0, 20));
      where.push(`o.status = $${params.length}`);
    }
    if (req.query.table_id && isUuid(req.query.table_id)) {
      params.push(req.query.table_id);
      where.push(`o.table_id = $${params.length}`);
    }

    const limit = Math.min(200, Math.max(1, num(req.query.limit, 50)));
    const offset = Math.max(0, num(req.query.offset, 0));

    const [list, count, flow] = await Promise.all([
      q(
        `SELECT o.*, COALESCE(t.name, o.table_name) AS table_name,
                (SELECT full_name FROM users u WHERE u.id = o.created_by) AS created_by_name,
                (SELECT count(*)::int FROM order_items i WHERE i.order_id = o.id) AS item_count,
                (SELECT coalesce(sum(i.quantity),0)::int FROM order_items i WHERE i.order_id = o.id) AS units
           FROM orders o LEFT JOIN tables t ON t.id = o.table_id
          WHERE ${where.join(' AND ')}
          ORDER BY o.created_at DESC
          LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
      q(
        `SELECT count(*)::int AS total FROM orders o WHERE ${where.join(' AND ')}`,
        params,
      ),
      q(
        `SELECT status, count(*)::int AS c FROM orders WHERE business_id = $1 GROUP BY status`,
        [req.businessId],
      ),
    ]);

    res.json({
      // Each row carries the transitions the server would accept for it, so
      // the table can offer exactly the valid next statuses (none once an
      // order is completed or cancelled).
      orders: list.rows.map((row) => ({
        ...row,
        allowed_transitions: TRANSITIONS[row.status] || [],
      })),
      total: count.rows[0].total,
      limit,
      offset,
      flow: Object.fromEntries(flow.rows.map((r) => [r.status, r.c])),
    });
  }),
);

router.get(
  '/:id',
  withBusiness('staff'),
  ah(async (req, res) => {
    const order = await loadOrder(req.businessId, req.params.id);
    const creator = await q('SELECT full_name, email FROM users WHERE id = $1', [order.created_by]);
    order.created_by_name = creator.rows[0]?.full_name || creator.rows[0]?.email || null;
    const [items, history, prints, table] = await Promise.all([
      q('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [order.id]),
      q(
        `SELECT h.*, u.email AS changed_by_email FROM order_status_history h
           LEFT JOIN users u ON u.id = h.changed_by
          WHERE h.order_id = $1 ORDER BY h.changed_at`,
        [order.id],
      ),
      q('SELECT * FROM receipt_prints WHERE order_id = $1 ORDER BY printed_at', [order.id]),
      order.table_id ? q('SELECT id, name, zone FROM tables WHERE id = $1', [order.table_id]) : { rows: [] },
    ]);
    const business = await q('SELECT * FROM businesses WHERE id = $1', [req.businessId]);
    res.json({
      order,
      items: items.rows,
      history: history.rows,
      prints: prints.rows,
      // A deleted table falls back to the snapshot stored on the order.
      table: table.rows[0] || (order.table_name ? { id: null, name: order.table_name, zone: null } : null),
      business: business.rows[0],
      allowed_transitions: TRANSITIONS[order.status] || [],
    });
  }),
);

/** The authoritative receipt payload — used by preview, print and the screen. */
router.get(
  '/:id/receipt',
  withBusiness('staff'),
  ah(async (req, res) => {
    const order = await loadOrder(req.businessId, req.params.id);
    const [items, table, business, prints] = await Promise.all([
      q('SELECT name, quantity, unit_price, line_total, notes FROM order_items WHERE order_id = $1 ORDER BY id', [order.id]),
      order.table_id ? q('SELECT name, zone FROM tables WHERE id = $1', [order.table_id]) : { rows: [] },
      q('SELECT name, name_en, logo_url, address, city, phone, currency, receipt_settings, timezone FROM businesses WHERE id = $1', [req.businessId]),
      q(
        `SELECT p.printed_at, p.printed_by_name FROM receipt_prints p
          WHERE p.order_id = $1 ORDER BY p.printed_at DESC LIMIT 5`,
        [order.id],
      ),
    ]);
    res.json({
      order,
      items: items.rows,
      table: table.rows[0] || (order.table_name ? { name: order.table_name, zone: null } : null),
      business: business.rows[0],
      prints: prints.rows,
      currency: business.rows[0]?.currency,
    });
  }),
);

/** Records that a user actually pressed Print. Idempotent per explicit press. */
router.post(
  '/:id/print',
  withBusiness('staff'),
  ah(async (req, res) => {
    const order = await loadOrder(req.businessId, req.params.id);
    if (req.body?.preview === true) {
      // Previewing a receipt never creates an audit record.
      return res.json({ ok: true, recorded: false });
    }
    const { rows } = await q(
      `INSERT INTO receipt_prints (business_id, order_id, printed_by, printed_by_name)
       VALUES ($1,$2,$3,$4) RETURNING id, printed_at`,
      [req.businessId, order.id, req.user.id, req.user.full_name || req.user.email],
    );
    res.status(201).json({ ok: true, recorded: true, print: rows[0] });
  }),
);

/** Staff-created order (counter / phone orders). */
router.post(
  '/',
  withBusiness('staff'),
  ah(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) throw bad('EMPTY_ORDER');

    const business = (
      await q('SELECT * FROM businesses WHERE id = $1', [req.businessId])
    ).rows[0];

    const result = await tx(async (c) => {
      let table = null;
      if (req.body?.table_id) {
        const t = await c.query('SELECT id, name FROM tables WHERE id = $1 AND business_id = $2', [
          req.body.table_id,
          req.businessId,
        ]);
        if (!t.rows[0]) throw bad('INVALID_TABLE');
        table = t.rows[0];
      }
      const ids = [...new Set(items.map((i) => String(i.product_id)))].filter(isUuid);
      const found = await c.query(
        'SELECT id, price, name_en, name_ku, name_fa, name_ar FROM products WHERE business_id = $1 AND id = ANY($2::uuid[])',
        [req.businessId, ids],
      );
      const byId = new Map(found.rows.map((r) => [r.id, r]));

      let subtotal = 0;
      const lines = [];
      for (const raw of items) {
        const product = byId.get(String(raw.product_id));
        if (!product) throw bad('PRODUCT_NOT_FOUND');
        const quantity = Math.max(1, Math.min(99, Math.floor(Number(raw.quantity) || 1)));
        const unitPrice = Number(product.price);
        const lineTotal = round2(unitPrice * quantity);
        subtotal = round2(subtotal + lineTotal);
        lines.push({
          product_id: product.id,
          name: product.name_en || product.name_ku || product.name_fa || product.name_ar,
          unit_price: unitPrice,
          quantity,
          line_total: lineTotal,
          notes: raw.notes ? String(raw.notes).slice(0, 300) : null,
        });
      }

      let discount = round2(
        Math.max(0, Number(req.body?.discount) || 0),
      );
      if (req.body?.discount_type === 'percent') {
        discount = round2((subtotal * Math.min(100, Number(req.body?.discount) || 0)) / 100);
      }
      if (discount > subtotal) discount = subtotal;

      const taxed = round2(subtotal - discount);
      const tax = round2((taxed * Number(business.tax_rate || 0)) / 100);
      const service = round2((taxed * Number(business.service_charge_rate || 0)) / 100);
      const total = round2(taxed + tax + service);

      const seq = await c.query(
        'UPDATE businesses SET order_seq = order_seq + 1 WHERE id = $1 RETURNING order_seq',
        [req.businessId],
      );

      const order = await c.query(
        `INSERT INTO orders (business_id, table_id, table_name, order_number, status, channel, customer_name,
                             customer_phone, notes, subtotal, discount, tax, service_charge, total, created_by)
         VALUES ($1,$2,$3,$4,'pending','staff',$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          req.businessId,
          table?.id || null,
          table?.name || null,
          seq.rows[0].order_seq,
          req.body?.customer_name ? String(req.body.customer_name).slice(0, 120) : null,
          req.body?.customer_phone ? String(req.body.customer_phone).slice(0, 40) : null,
          req.body?.notes ? String(req.body.notes).slice(0, 500) : null,
          subtotal,
          discount,
          tax,
          service,
          total,
          req.user.id,
        ],
      );

      for (const line of lines) {
        await c.query(
          `INSERT INTO order_items (order_id, business_id, product_id, name, unit_price, quantity, line_total, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [order.rows[0].id, req.businessId, line.product_id, line.name, line.unit_price, line.quantity, line.line_total, line.notes],
        );
      }
      await c.query(
        `INSERT INTO order_status_history (business_id, order_id, from_status, to_status, changed_by, changed_by_name)
         VALUES ($1,$2,NULL,'pending',$3,$4)`,
        [req.businessId, order.rows[0].id, req.user.id, req.user.full_name || req.user.email],
      );
      return order.rows[0];
    });

    res.status(201).json({ order: result });
  }),
);

/** Status change — append-only audit, no duplicate rows when nothing changes. */
router.patch(
  '/:id/status',
  withBusiness('staff'),
  ah(async (req, res) => {
    const order = await loadOrder(req.businessId, req.params.id);
    const next = String(req.body?.status || '');
    if (!Object.keys(TRANSITIONS).includes(next)) throw bad('INVALID_STATUS');
    if (order.status === next) {
      return res.json({
        order,
        unchanged: true,
        audited: false,
        allowed_transitions: TRANSITIONS[order.status] || [],
      });
    }
    const allowed = TRANSITIONS[order.status] || [];
    if (!allowed.includes(next)) throw conflict('INVALID_STATUS_TRANSITION');

    const updated = await tx(async (c) => {
      const { rows } = await c.query(
        `UPDATE orders SET status = $3,
                           completed_at = CASE WHEN $3 = 'completed' THEN now() ELSE completed_at END,
                           updated_at = now()
          WHERE id = $1 AND business_id = $2 RETURNING *`,
        [order.id, req.businessId, next],
      );
      await c.query(
        `INSERT INTO order_status_history (business_id, order_id, from_status, to_status, changed_by, changed_by_name)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [req.businessId, order.id, order.status, next, req.user.id, req.user.full_name || req.user.email],
      );
      if (next === 'completed' || next === 'cancelled') {
        await c.query(
          `INSERT INTO notifications (business_id, type, title, body, order_id)
           VALUES ($1,'status_change',$2,$3,$4)`,
          [req.businessId, `#${order.order_number}`, next, order.id],
        );
      }
      return rows[0];
    });

    res.json({
      order: updated,
      audited: true,
      allowed_transitions: TRANSITIONS[updated.status] || [],
    });
  }),
);

/** Editing an order's notes / customer details. Completed orders are locked. */
router.patch(
  '/:id',
  withBusiness('staff'),
  ah(async (req, res) => {
    const order = await loadOrder(req.businessId, req.params.id);
    assertEditable(order);
    const b = req.body || {};
    const { rows } = await q(
      `UPDATE orders SET customer_name = COALESCE($3, customer_name),
                         customer_phone = COALESCE($4, customer_phone),
                         notes = COALESCE($5, notes),
                         updated_at = now()
        WHERE id = $1 AND business_id = $2 RETURNING *`,
      [
        order.id,
        req.businessId,
        b.customer_name === undefined ? null : String(b.customer_name).slice(0, 120),
        b.customer_phone === undefined ? null : String(b.customer_phone).slice(0, 40),
        b.notes === undefined ? null : String(b.notes).slice(0, 500),
      ],
    );
    res.json({ order: rows[0] });
  }),
);

/** Replaces the item list, recomputing every money value on the server. */
router.put(
  '/:id/items',
  withBusiness('staff'),
  ah(async (req, res) => {
    const order = await loadOrder(req.businessId, req.params.id);
    assertEditable(order);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) throw bad('EMPTY_ORDER');

    const business = (
      await q('SELECT tax_rate, service_charge_rate FROM businesses WHERE id = $1', [req.businessId])
    ).rows[0];

    const updated = await tx(async (c) => {
      const ids = [...new Set(items.map((i) => String(i.product_id)))].filter(isUuid);
      const found = await c.query(
        'SELECT id, price, name_en, name_ku, name_fa, name_ar FROM products WHERE business_id = $1 AND id = ANY($2::uuid[])',
        [req.businessId, ids],
      );
      const byId = new Map(found.rows.map((r) => [r.id, r]));

      await c.query('DELETE FROM order_items WHERE order_id = $1', [order.id]);

      let subtotal = 0;
      for (const raw of items) {
        const product = byId.get(String(raw.product_id));
        if (!product) throw bad('PRODUCT_NOT_FOUND');
        const quantity = Math.max(1, Math.min(99, Math.floor(Number(raw.quantity) || 1)));
        const unitPrice = Number(product.price);
        const lineTotal = round2(unitPrice * quantity);
        subtotal = round2(subtotal + lineTotal);
        await c.query(
          `INSERT INTO order_items (order_id, business_id, product_id, name, unit_price, quantity, line_total, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            order.id,
            req.businessId,
            product.id,
            product.name_en || product.name_ku || product.name_fa || product.name_ar,
            unitPrice,
            quantity,
            lineTotal,
            raw.notes ? String(raw.notes).slice(0, 300) : null,
          ],
        );
      }

      let discount = round2(Math.max(0, Number(req.body?.discount ?? order.discount) || 0));
      if (req.body?.discount_type === 'percent') {
        discount = round2((subtotal * Math.min(100, Number(req.body?.discount) || 0)) / 100);
      }
      if (discount > subtotal) discount = subtotal;
      const taxed = round2(subtotal - discount);
      const tax = round2((taxed * Number(business.tax_rate || 0)) / 100);
      const service = round2((taxed * Number(business.service_charge_rate || 0)) / 100);
      const total = round2(taxed + tax + service);

      const { rows } = await c.query(
        `UPDATE orders SET subtotal=$3, discount=$4, tax=$5, service_charge=$6, total=$7, updated_at=now()
          WHERE id=$1 AND business_id=$2 RETURNING *`,
        [order.id, req.businessId, subtotal, discount, tax, service, total],
      );
      return rows[0];
    });

    res.json({ order: updated });
  }),
);

router.delete(
  '/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const order = await loadOrder(req.businessId, req.params.id);
    if (order.status === 'completed') throw conflict('ORDER_COMPLETED_LOCKED');
    await q('DELETE FROM orders WHERE id = $1 AND business_id = $2', [order.id, req.businessId]);
    res.json({ ok: true });
  }),
);

export default router;
