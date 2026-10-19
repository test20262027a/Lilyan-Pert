import crypto from 'node:crypto';
import express from 'express';
import { q, tx } from '../db.js';
import { requireAuth, withBusiness, hashPassword } from '../auth.js';
import { ah, bad, conflict, isUuid, notFound } from '../lib/http.js';
import { getVapidKeys } from '../lib/push.js';

const router = express.Router();
router.use(requireAuth);

/* --------------------------------------------------------------- tables */

router.get(
  '/tables',
  withBusiness('staff'),
  ah(async (req, res) => {
    const { rows } = await q(
      // Stable display order: names first group by their text ("Table 1 … Table
      // 10", then "Terrace 1"), and inside a group the number decides — so a
      // renamed table never jumps around and 10 never sorts before 2.
      `SELECT t.*, (SELECT count(*)::int FROM orders o WHERE o.table_id = t.id) AS order_count
         FROM tables t WHERE t.business_id = $1
        ORDER BY regexp_replace(t.name, '\\d+$', '') ASC,
                 NULLIF(regexp_replace(t.name, '\\D', '', 'g'), '')::numeric NULLS LAST,
                 t.name`,
      [req.businessId],
    );
    res.json({ tables: rows });
  }),
);

router.post(
  '/tables',
  withBusiness('manager'),
  ah(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) throw bad('NAME_REQUIRED');
    // One table per name inside a business: the check is server-side so it holds
    // whatever the client sends, and it only ever looks at this business's rows.
    const dupe = await q(
      'SELECT 1 FROM tables WHERE business_id = $1 AND lower(name) = lower($2)',
      [req.businessId, name],
    );
    if (dupe.rowCount) throw conflict('TABLE_DUPLICATE');
    const seats = Math.max(1, Math.min(40, Number(req.body?.seats) || 4));
    const token = crypto.randomBytes(8).toString('hex');
    const { rows } = await q(
      `INSERT INTO tables (business_id, name, seats, zone, qr_token, active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        req.businessId,
        name.slice(0, 80),
        seats,
        req.body?.zone ? String(req.body.zone).slice(0, 60) : null,
        token,
        req.body?.active === undefined ? true : Boolean(req.body.active),
      ],
    );
    res.status(201).json({ table: rows[0] });
  }),
);

router.put(
  '/tables/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const b = req.body || {};
    // Renaming keeps `qr_token` untouched: an already distributed QR link must
    // survive a rename, so only the display fields are written here.
    const name = b.name ? String(b.name).slice(0, 80) : null;
    if (name) {
      const dupe = await q(
        'SELECT 1 FROM tables WHERE business_id = $1 AND lower(name) = lower($2) AND id <> $3',
        [req.businessId, name, req.params.id],
      );
      if (dupe.rowCount) throw conflict('TABLE_DUPLICATE');
    }
    const { rows } = await q(
      `UPDATE tables SET name = COALESCE($3, name), seats = COALESCE($4, seats),
                         zone = COALESCE($5, zone), active = COALESCE($6, active)
        WHERE id = $1 AND business_id = $2 RETURNING *`,
      [
        req.params.id,
        req.businessId,
        name,
        b.seats === undefined ? null : Math.max(1, Math.min(40, Number(b.seats) || 4)),
        b.zone === undefined ? null : String(b.zone).slice(0, 60),
        b.active === undefined ? null : Boolean(b.active),
      ],
    );
    if (!rows[0]) throw notFound('TABLE_NOT_FOUND');
    res.json({ table: rows[0] });
  }),
);

/*
 * Deleting a table is refused while it still carries live work, so a delete can
 * never detach an order that is not finished. Historical orders are never
 * deleted: they keep their own `table_name` snapshot (see schema.sql) and their
 * `table_id` is released by the foreign key, and the public QR link stops
 * resolving as soon as the row is gone.
 */
router.delete(
  '/tables/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    // Ownership first: a malformed or another business's table id reads as
    // "not found" and never reaches the database as a query.
    if (!isUuid(req.params.id)) throw notFound('TABLE_NOT_FOUND');
    const owned = await q('SELECT 1 FROM tables WHERE id = $1 AND business_id = $2', [
      req.params.id,
      req.businessId,
    ]);
    if (!owned.rowCount) throw notFound('TABLE_NOT_FOUND');

    const active = await q(
      `SELECT count(*)::int AS c FROM orders
        WHERE table_id = $1 AND status IN ('pending','preparing','ready')`,
      [req.params.id],
    );
    if (active.rows[0].c > 0) throw conflict('TABLE_HAS_ACTIVE_ORDERS');

    await q('DELETE FROM tables WHERE id = $1 AND business_id = $2', [
      req.params.id,
      req.businessId,
    ]);
    res.json({ ok: true });
  }),
);

/* -------------------------------------------------------------- reviews */

router.get(
  '/reviews',
  withBusiness('staff'),
  ah(async (req, res) => {
    const params = [req.businessId];
    let where = 'r.business_id = $1';
    if (req.query.status && req.query.status !== 'all') {
      params.push(String(req.query.status).slice(0, 20));
      where += ` AND r.status = $${params.length}`;
    }
    const { rows } = await q(
      `SELECT r.*, o.order_number FROM reviews r
         LEFT JOIN orders o ON o.id = r.order_id
        WHERE ${where} ORDER BY r.created_at DESC LIMIT 200`,
      params,
    );
    res.json({ reviews: rows });
  }),
);

router.patch(
  '/reviews/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const status = String(req.body?.status || '');
    if (!['pending', 'approved', 'rejected'].includes(status)) throw bad('INVALID_STATUS');
    const { rows } = await q(
      'UPDATE reviews SET status = $3 WHERE id = $1 AND business_id = $2 RETURNING *',
      [req.params.id, req.businessId, status],
    );
    if (!rows[0]) throw notFound('REVIEW_NOT_FOUND');
    res.json({ review: rows[0] });
  }),
);

router.delete(
  '/reviews/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const { rowCount } = await q('DELETE FROM reviews WHERE id = $1 AND business_id = $2', [
      req.params.id,
      req.businessId,
    ]);
    if (!rowCount) throw notFound('REVIEW_NOT_FOUND');
    res.json({ ok: true });
  }),
);

/* ---------------------------------------------------- ads & promotions */

router.get(
  '/ads',
  withBusiness('staff'),
  ah(async (req, res) => {
    const { rows } = await q(
      'SELECT * FROM advertisements WHERE business_id = $1 ORDER BY sort_order, created_at',
      [req.businessId],
    );
    res.json({ ads: rows });
  }),
);

const adColumns = [
  'image_url', 'link_url', 'title_ku', 'title_fa', 'title_ar', 'title_en',
  'subtitle_ku', 'subtitle_fa', 'subtitle_ar', 'subtitle_en',
];

router.post(
  '/ads',
  withBusiness('manager'),
  ah(async (req, res) => {
    const b = req.body || {};
    const { rows } = await q(
      `INSERT INTO advertisements (business_id, ${adColumns.join(', ')}, active, sort_order)
       VALUES ($1, ${adColumns.map((_, i) => `$${i + 2}`).join(', ')}, $${adColumns.length + 2}, $${adColumns.length + 3})
       RETURNING *`,
      [
        req.businessId,
        ...adColumns.map((c) => (b[c] === undefined || b[c] === null ? null : String(b[c]).slice(0, 1000))),
        b.active === undefined ? true : Boolean(b.active),
        Number(b.sort_order) || 0,
      ],
    );
    res.status(201).json({ ad: rows[0] });
  }),
);

router.put(
  '/ads/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const b = req.body || {};
    const sets = [];
    const values = [req.params.id, req.businessId];
    for (const col of adColumns) {
      if (col in b) {
        values.push(b[col] === null ? null : String(b[col]).slice(0, 1000));
        sets.push(`${col} = $${values.length}`);
      }
    }
    if ('active' in b) {
      values.push(Boolean(b.active));
      sets.push(`active = $${values.length}`);
    }
    if ('sort_order' in b) {
      values.push(Number(b.sort_order) || 0);
      sets.push(`sort_order = $${values.length}`);
    }
    if (!sets.length) return res.json({ ok: true, unchanged: true });
    const { rows } = await q(
      `UPDATE advertisements SET ${sets.join(', ')} WHERE id = $1 AND business_id = $2 RETURNING *`,
      values,
    );
    if (!rows[0]) throw notFound('AD_NOT_FOUND');
    res.json({ ad: rows[0] });
  }),
);

router.delete(
  '/ads/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const { rowCount } = await q('DELETE FROM advertisements WHERE id = $1 AND business_id = $2', [
      req.params.id,
      req.businessId,
    ]);
    if (!rowCount) throw notFound('AD_NOT_FOUND');
    res.json({ ok: true });
  }),
);

router.get(
  '/promotions',
  withBusiness('staff'),
  ah(async (req, res) => {
    const { rows } = await q(
      `SELECT p.*, pr.name_en AS product_name_en, pr.name_ku AS product_name_ku,
              pr.name_fa AS product_name_fa, pr.name_ar AS product_name_ar
         FROM promotions p LEFT JOIN products pr ON pr.id = p.product_id
        WHERE p.business_id = $1 ORDER BY p.created_at DESC`,
      [req.businessId],
    );
    res.json({ promotions: rows });
  }),
);

async function assertProduct(businessId, productId) {
  if (!productId) return null;
  if (!isUuid(productId)) throw bad('INVALID_PRODUCT');
  const { rows } = await q('SELECT id FROM products WHERE id = $1 AND business_id = $2', [
    productId,
    businessId,
  ]);
  if (!rows[0]) throw bad('INVALID_PRODUCT');
  return productId;
}

router.post(
  '/promotions',
  withBusiness('manager'),
  ah(async (req, res) => {
    const b = req.body || {};
    const type = b.discount_type === 'fixed' ? 'fixed' : 'percent';
    const value = Number(b.discount_value);
    if (!Number.isFinite(value) || value < 0) throw bad('INVALID_DISCOUNT');
    if (type === 'percent' && value > 100) throw bad('INVALID_DISCOUNT');
    const productId = await assertProduct(req.businessId, b.product_id || null);
    const { rows } = await q(
      `INSERT INTO promotions (business_id, product_id, discount_type, discount_value,
                               starts_at, ends_at, active, title_ku, title_fa, title_ar, title_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        req.businessId,
        productId,
        type,
        value,
        b.starts_at || null,
        b.ends_at || null,
        b.active === undefined ? true : Boolean(b.active),
        b.title_ku || null,
        b.title_fa || null,
        b.title_ar || null,
        b.title_en || null,
      ],
    );
    res.status(201).json({ promotion: rows[0] });
  }),
);

router.put(
  '/promotions/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const b = req.body || {};
    if (b.product_id !== undefined) await assertProduct(req.businessId, b.product_id || null);
    const { rows } = await q(
      `UPDATE promotions
          SET product_id = COALESCE($3, product_id),
              discount_type = COALESCE($4, discount_type),
              discount_value = COALESCE($5, discount_value),
              starts_at = $6, ends_at = $7,
              active = COALESCE($8, active),
              title_ku = COALESCE($9, title_ku), title_fa = COALESCE($10, title_fa),
              title_ar = COALESCE($11, title_ar), title_en = COALESCE($12, title_en)
        WHERE id = $1 AND business_id = $2 RETURNING *`,
      [
        req.params.id,
        req.businessId,
        b.product_id || null,
        b.discount_type === undefined ? null : b.discount_type === 'fixed' ? 'fixed' : 'percent',
        b.discount_value === undefined ? null : Math.max(0, Number(b.discount_value) || 0),
        b.starts_at || null,
        b.ends_at || null,
        b.active === undefined ? null : Boolean(b.active),
        b.title_ku || null,
        b.title_fa || null,
        b.title_ar || null,
        b.title_en || null,
      ],
    );
    if (!rows[0]) throw notFound('PROMOTION_NOT_FOUND');
    res.json({ promotion: rows[0] });
  }),
);

router.delete(
  '/promotions/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const { rowCount } = await q('DELETE FROM promotions WHERE id = $1 AND business_id = $2', [
      req.params.id,
      req.businessId,
    ]);
    if (!rowCount) throw notFound('PROMOTION_NOT_FOUND');
    res.json({ ok: true });
  }),
);

/* ---------------------------------------------------------------- users */

router.get(
  '/users',
  withBusiness('manager'),
  ah(async (req, res) => {
    const { rows } = await q(
      `SELECT m.id AS membership_id, m.role, m.status, m.created_at,
              u.id, u.email, u.full_name, u.phone, u.locale
         FROM memberships m JOIN users u ON u.id = m.user_id
        WHERE m.business_id = $1
        ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'staff' THEN 2 ELSE 3 END, u.created_at`,
      [req.businessId],
    );
    res.json({ users: rows, can_manage: req.role === 'owner' || req.role === 'super_admin' });
  }),
);

async function countOwners(client, businessId) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS c FROM memberships WHERE business_id = $1 AND role = 'owner' AND status = 'active'`,
    [businessId],
  );
  return rows[0].c;
}

router.post(
  '/users',
  withBusiness('owner'),
  ah(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = ['manager', 'staff', 'customer'].includes(req.body?.role) ? req.body.role : 'staff';
    if (!email.includes('@')) throw bad('INVALID_EMAIL');
    if (password.length < 8) throw bad('WEAK_PASSWORD');

    const created = await tx(async (c) => {
      let userId;
      const existing = await c.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows[0]) {
        userId = existing.rows[0].id;
        const member = await c.query(
          'SELECT 1 FROM memberships WHERE business_id = $1 AND user_id = $2',
          [req.businessId, userId],
        );
        if (member.rowCount) throw conflict('ALREADY_MEMBER');
      } else {
        const u = await c.query(
          `INSERT INTO users (email, password_hash, full_name, phone) VALUES ($1,$2,$3,$4) RETURNING id`,
          [
            email,
            hashPassword(password),
            req.body?.full_name ? String(req.body.full_name).slice(0, 120) : null,
            req.body?.phone ? String(req.body.phone).slice(0, 40) : null,
          ],
        );
        userId = u.rows[0].id;
      }
      await c.query('INSERT INTO memberships (business_id, user_id, role) VALUES ($1,$2,$3)', [
        req.businessId,
        userId,
        role,
      ]);
      return userId;
    });

    res.status(201).json({ ok: true, user_id: created });
  }),
);

router.patch(
  '/users/:membershipId',
  withBusiness('owner'),
  ah(async (req, res) => {
    const { rows } = await q(
      'SELECT * FROM memberships WHERE id = $1 AND business_id = $2',
      [req.params.membershipId, req.businessId],
    );
    const membership = rows[0];
    if (!membership) throw notFound('MEMBERSHIP_NOT_FOUND');

    const nextRole = ['owner', 'manager', 'staff', 'customer'].includes(req.body?.role)
      ? req.body.role
      : null;
    const nextStatus = ['active', 'disabled'].includes(req.body?.status) ? req.body.status : null;

    if (membership.role === 'owner' && nextRole && nextRole !== 'owner') {
      const owners = await countOwners({ query: (t, p) => q(t, p) }, req.businessId);
      if (owners <= 1) throw conflict('LAST_OWNER');
    }
    if (membership.role === 'owner' && nextStatus === 'disabled') {
      const owners = await countOwners({ query: (t, p) => q(t, p) }, req.businessId);
      if (owners <= 1) throw conflict('LAST_OWNER');
    }

    const updated = await q(
      `UPDATE memberships SET role = COALESCE($3, role), status = COALESCE($4, status)
        WHERE id = $1 AND business_id = $2 RETURNING *`,
      [req.params.membershipId, req.businessId, nextRole, nextStatus],
    );
    res.json({ membership: updated.rows[0] });
  }),
);

router.delete(
  '/users/:membershipId',
  withBusiness('owner'),
  ah(async (req, res) => {
    const { rows } = await q(
      'SELECT * FROM memberships WHERE id = $1 AND business_id = $2',
      [req.params.membershipId, req.businessId],
    );
    const membership = rows[0];
    if (!membership) throw notFound('MEMBERSHIP_NOT_FOUND');
    if (membership.role === 'owner') {
      const owners = await countOwners({ query: (t, p) => q(t, p) }, req.businessId);
      if (owners <= 1) throw conflict('LAST_OWNER');
    }
    await q('DELETE FROM memberships WHERE id = $1 AND business_id = $2', [
      req.params.membershipId,
      req.businessId,
    ]);
    res.json({ ok: true });
  }),
);

/* --------------------------------------------------------------- media */

router.post(
  '/media',
  withBusiness('staff'),
  ah(async (req, res) => {
    const dataUrl = String(req.body?.data_url || '');
    const match = /^data:(image\/(png|jpeg|jpg|webp|gif|svg\+xml));base64,(.+)$/i.exec(dataUrl);
    if (!match) throw bad('INVALID_IMAGE');
    const mime = match[1].toLowerCase();
    const buffer = Buffer.from(match[3], 'base64');
    if (buffer.length > 8 * 1024 * 1024) throw bad('IMAGE_TOO_LARGE');
    const { rows } = await q(
      `INSERT INTO media (business_id, mime, byte_size, data) VALUES ($1,$2,$3,$4) RETURNING id`,
      [req.businessId, mime, buffer.length, match[3]],
    );
    // The read route below is mounted under /api/manage, so the URL handed back
    // to the client must be that same path — otherwise every stored image 404s.
    res
      .status(201)
      .json({ id: rows[0].id, url: `/api/manage/media/${rows[0].id}`, byte_size: buffer.length });
  }),
);

/** Images are immutable, so they are cached hard. */
router.get(
  '/media/:id',
  ah(async (req, res) => {
    if (!isUuid(req.params.id)) throw notFound('MEDIA_NOT_FOUND');
    const { rows } = await q('SELECT mime, data FROM media WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw notFound('MEDIA_NOT_FOUND');
    res.set('Content-Type', rows[0].mime);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(rows[0].data, 'base64'));
  }),
);

/* --------------------------------------------------- notifications/push */

router.get(
  '/notifications',
  withBusiness('staff'),
  ah(async (req, res) => {
    const [list, unread] = await Promise.all([
      q(
        `SELECT n.*, o.order_number FROM notifications n
           LEFT JOIN orders o ON o.id = n.order_id
          WHERE n.business_id = $1 ORDER BY n.created_at DESC LIMIT 40`,
        [req.businessId],
      ),
      q(
        'SELECT count(*)::int AS c FROM notifications WHERE business_id = $1 AND read_at IS NULL',
        [req.businessId],
      ),
    ]);
    res.json({ notifications: list.rows, unread: unread.rows[0].c });
  }),
);

router.post(
  '/notifications/read',
  withBusiness('staff'),
  ah(async (req, res) => {
    const id = req.body?.id;
    if (id && isUuid(id)) {
      await q(
        'UPDATE notifications SET read_at = now() WHERE id = $1 AND business_id = $2 AND read_at IS NULL',
        [id, req.businessId],
      );
    } else {
      await q(
        'UPDATE notifications SET read_at = now() WHERE business_id = $1 AND read_at IS NULL',
        [req.businessId],
      );
    }
    res.json({ ok: true });
  }),
);

router.get(
  '/push/public-key',
  withBusiness('staff'),
  ah(async (_req, res) => {
    const keys = await getVapidKeys();
    res.json({ public_key: keys.publicKey });
  }),
);

router.post(
  '/push/subscribe',
  withBusiness('staff'),
  ah(async (req, res) => {
    const sub = req.body?.subscription || req.body;
    const endpoint = String(sub?.endpoint || '');
    const p256dh = String(sub?.keys?.p256dh || '');
    const auth = String(sub?.keys?.auth || '');
    if (!endpoint || !p256dh || !auth) throw bad('INVALID_SUBSCRIPTION');
    await q(
      `INSERT INTO push_subscriptions (business_id, user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (endpoint) DO UPDATE
         SET business_id = EXCLUDED.business_id,
             user_id = EXCLUDED.user_id,
             p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth`,
      [
        req.businessId,
        req.user.id,
        endpoint.slice(0, 1000),
        p256dh.slice(0, 500),
        auth.slice(0, 500),
        String(req.headers['user-agent'] || '').slice(0, 300),
      ],
    );
    res.status(201).json({ ok: true });
  }),
);

router.post(
  '/push/unsubscribe',
  withBusiness('staff'),
  ah(async (req, res) => {
    const endpoint = String(req.body?.endpoint || '');
    if (!endpoint) throw bad('ENDPOINT_REQUIRED');
    await q('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [
      endpoint,
      req.user.id,
    ]);
    res.json({ ok: true });
  }),
);

router.get(
  '/push/status',
  withBusiness('staff'),
  ah(async (req, res) => {
    const { rows } = await q(
      'SELECT count(*)::int AS devices FROM push_subscriptions WHERE business_id = $1',
      [req.businessId],
    );
    res.json({ devices: rows[0].devices });
  }),
);

export default router;
