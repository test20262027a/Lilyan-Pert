import crypto from 'node:crypto';
import express from 'express';
import { q, tx } from '../db.js';
import { requireAuth, withBusiness, hashPassword } from '../auth.js';
import { ah, bad, conflict, isUuid, notFound } from '../lib/http.js';
import { getVapidKeys } from '../lib/push.js';

const router = express.Router();
router.use(requireAuth);

/* --------------------------------------------------------------- tables */

/*
 * A table is ONE record holding its four localized names (name_ku … name_en),
 * the same shape categories and products already use. `name` stays the resolved
 * display value — Kurdish first, then Persian, Arabic, English — because the
 * customer menu, the order snapshot, the receipts and the dashboard all read
 * that one column.
 */
const TABLE_LANGS = ['ku', 'fa', 'ar', 'en'];

/** The four submitted names, trimmed and length-capped. */
function tableNames(body) {
  const names = {};
  for (const code of TABLE_LANGS) {
    const raw = body?.[`name_${code}`];
    names[code] = raw === undefined || raw === null ? '' : String(raw).trim().slice(0, 80);
  }
  return names;
}

/** True when the caller sent any of the four name fields at all. */
const hasNameFields = (body) => TABLE_LANGS.some((code) => body?.[`name_${code}`] !== undefined);

/** The stored display name: the first language that carries one. */
const displayName = (names) => TABLE_LANGS.map((code) => names[code]).find(Boolean) || '';

/** A positive whole number, null when absent/empty, NaN when not one. */
function positiveInt(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

/** A whole number ≥ 0, null when absent/empty, NaN when not one. */
function orderInt(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

router.get(
  '/tables',
  withBusiness('staff'),
  ah(async (req, res) => {
    const { rows } = await q(
      // The owner's display order first, then the stable fallback for tables
      // that share it (every table created before display order existed is 0):
      // names group by their text ("Table 1 … Table 10", then "Terrace 1") and
      // inside a group the number decides, so 10 never sorts before 2.
      `SELECT t.*, (SELECT count(*)::int FROM orders o WHERE o.table_id = t.id) AS order_count
         FROM tables t WHERE t.business_id = $1
        ORDER BY t.display_order ASC,
                 regexp_replace(t.name, '\\d+$', '') ASC,
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
    const names = tableNames(req.body);
    const name = displayName(names);
    if (!name) throw bad('NAME_REQUIRED');

    // The number the guest sees: required, positive, and unique in this business.
    const tableNumber = positiveInt(req.body?.table_number);
    if (tableNumber === null) throw bad('TABLE_NUMBER_REQUIRED');
    if (Number.isNaN(tableNumber)) throw bad('TABLE_NUMBER_INVALID');

    // Seating capacity keeps its existing rule: optional, 1–40, four by default.
    const seats = positiveInt(req.body?.seats);
    if (Number.isNaN(seats) || (seats !== null && seats > 40)) throw bad('SEATS_INVALID');

    const requestedOrder = orderInt(req.body?.display_order);
    if (Number.isNaN(requestedOrder)) throw bad('DISPLAY_ORDER_INVALID');

    // One table per name inside a business: the check is server-side so it holds
    // whatever the client sends, and it only ever looks at this business's rows.
    const dupe = await q(
      'SELECT 1 FROM tables WHERE business_id = $1 AND lower(name) = lower($2)',
      [req.businessId, name],
    );
    if (dupe.rowCount) throw conflict('TABLE_DUPLICATE');

    const numberTaken = await q(
      'SELECT 1 FROM tables WHERE business_id = $1 AND table_number = $2',
      [req.businessId, tableNumber],
    );
    if (numberTaken.rowCount) throw conflict('TABLE_NUMBER_DUPLICATE');

    // Appended after every existing table unless the owner chose an order.
    const order =
      requestedOrder ??
      (
        await q('SELECT COALESCE(max(display_order), 0) + 1 AS next FROM tables WHERE business_id = $1', [
          req.businessId,
        ])
      ).rows[0].next;

    const token = crypto.randomBytes(8).toString('hex');
    let rows;
    try {
      ({ rows } = await q(
        `INSERT INTO tables (business_id, name, name_ku, name_fa, name_ar, name_en,
                             table_number, seats, display_order, vip, zone, qr_token, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          req.businessId,
          name,
          names.ku || null,
          names.fa || null,
          names.ar || null,
          names.en || null,
          tableNumber,
          seats ?? 4,
          order,
          req.body?.vip === true,
          req.body?.zone ? String(req.body.zone).slice(0, 60) : null,
          token,
          req.body?.active === undefined ? true : Boolean(req.body.active),
        ],
      ));
    } catch (err) {
      // The unique index is the real guard: a number taken between the check
      // above and this insert is reported as a duplicate, never as a 500.
      if (err?.code === '23505') throw conflict('TABLE_NUMBER_DUPLICATE');
      throw err;
    }
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
    const names = tableNames(b);
    const withNames = hasNameFields(b);
    const name = withNames ? displayName(names) : null;
    if (withNames && !name) throw bad('NAME_REQUIRED');
    // A cleared language field clears that translation; a language the caller
    // never sent keeps whatever it already stored.
    const nameParams = withNames ? TABLE_LANGS.map((code) => names[code] || null) : [null, null, null, null];

    let tableNumber = null;
    if (b.table_number !== undefined) {
      tableNumber = positiveInt(b.table_number);
      if (tableNumber === null || Number.isNaN(tableNumber)) throw bad('TABLE_NUMBER_INVALID');
    }

    let seats = null;
    if (b.seats !== undefined) {
      seats = positiveInt(b.seats);
      if (seats === null || Number.isNaN(seats) || seats > 40) throw bad('SEATS_INVALID');
    }

    let order = null;
    if (b.display_order !== undefined) {
      order = orderInt(b.display_order);
      if (order === null || Number.isNaN(order)) throw bad('DISPLAY_ORDER_INVALID');
    }

    if (name) {
      const dupe = await q(
        'SELECT 1 FROM tables WHERE business_id = $1 AND lower(name) = lower($2) AND id <> $3',
        [req.businessId, name, req.params.id],
      );
      if (dupe.rowCount) throw conflict('TABLE_DUPLICATE');
    }
    if (tableNumber !== null) {
      const taken = await q(
        'SELECT 1 FROM tables WHERE business_id = $1 AND table_number = $2 AND id <> $3',
        [req.businessId, tableNumber, req.params.id],
      );
      if (taken.rowCount) throw conflict('TABLE_NUMBER_DUPLICATE');
    }

    let rows;
    try {
      ({ rows } = await q(
        `UPDATE tables SET name = COALESCE($3, name),
                           name_ku = COALESCE($4, name_ku), name_fa = COALESCE($5, name_fa),
                           name_ar = COALESCE($6, name_ar), name_en = COALESCE($7, name_en),
                           table_number = COALESCE($8, table_number),
                           seats = COALESCE($9, seats), display_order = COALESCE($10, display_order),
                           vip = COALESCE($11, vip), zone = COALESCE($12, zone),
                           active = COALESCE($13, active)
          WHERE id = $1 AND business_id = $2 RETURNING *`,
        [
          req.params.id,
          req.businessId,
          name,
          ...nameParams,
          tableNumber,
          seats,
          order,
          b.vip === undefined ? null : Boolean(b.vip),
          b.zone === undefined ? null : String(b.zone).slice(0, 60),
          b.active === undefined ? null : Boolean(b.active),
        ],
      ));
    } catch (err) {
      if (err?.code === '23505') throw conflict('TABLE_NUMBER_DUPLICATE');
      throw err;
    }
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
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const parsedOffset = Number.parseInt(req.query.offset, 10);
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 20, 1), 100);
    const offset = Math.max(Number.isFinite(parsedOffset) ? parsedOffset : 0, 0);

    const params = [req.businessId];
    let where = 'r.business_id = $1';
    if (req.query.status && req.query.status !== 'all') {
      params.push(String(req.query.status).slice(0, 20));
      where += ` AND r.status = $${params.length}`;
    }

    const [list, counted, rated] = await Promise.all([
      q(
        `SELECT r.*, o.order_number FROM reviews r
           LEFT JOIN orders o ON o.id = r.order_id
          WHERE ${where}
          ORDER BY r.created_at DESC, r.id DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
      q(`SELECT count(*)::int AS c FROM reviews r WHERE ${where}`, params),
      /*
       * One population for every number on the page: all reviews this business
       * owns, whatever their moderation state, scoped by business_id. The
       * average therefore always describes exactly the rows the five counts
       * add up to, and the page never mixes two different populations.
       */
      q(
        `SELECT count(*)::int AS total,
                COALESCE(avg(rating), 0) AS average,
                count(*) FILTER (WHERE rating = 5)::int AS r5,
                count(*) FILTER (WHERE rating = 4)::int AS r4,
                count(*) FILTER (WHERE rating = 3)::int AS r3,
                count(*) FILTER (WHERE rating = 2)::int AS r2,
                count(*) FILTER (WHERE rating = 1)::int AS r1
           FROM reviews WHERE business_id = $1`,
        [req.businessId],
      ),
    ]);

    const s = rated.rows[0];
    res.json({
      reviews: list.rows,
      total: counted.rows[0].c,
      summary: {
        total: s.total,
        average: Number(s.average) || 0,
        counts: { 5: s.r5, 4: s.r4, 3: s.r3, 2: s.r2, 1: s.r1 },
      },
    });
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

/*
 * Advertisements.
 *
 * One row per advertisement of the signed-in business. The four localized
 * title and description pairs live in the same record (title_* / subtitle_*),
 * the link to a menu product or category is a real foreign key inside the
 * business, and the schedule is stored as absolute instants converted from the
 * business's own timezone. `sort_order` carries the owner's priority inside one
 * placement: higher first, newest first on a tie.
 */

const AD_LANGS = ['ku', 'fa', 'ar', 'en'];

/** The positions the customer menu actually renders. */
const AD_PLACEMENTS = ['below_header', 'menu_end'];

const AD_SELECT = `
  SELECT a.*,
         pr.name_ku AS product_name_ku, pr.name_fa AS product_name_fa,
         pr.name_ar AS product_name_ar, pr.name_en AS product_name_en,
         c.name_ku  AS category_name_ku, c.name_fa AS category_name_fa,
         c.name_ar  AS category_name_ar, c.name_en AS category_name_en
    FROM advertisements a
    LEFT JOIN products pr ON pr.id = a.product_id AND pr.business_id = a.business_id
    LEFT JOIN categories c ON c.id = a.category_id AND c.business_id = a.business_id
`;

/** Trimmed free text, null when the owner left it empty. */
function adText(raw, max = 1000) {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim().slice(0, max);
  return value || null;
}

/** A stored picture reference: an uploaded media URL or an absolute web URL. */
function adImage(raw) {
  const value = String(raw ?? '').trim().slice(0, 1000);
  if (!value) return null;
  if (value.startsWith('/') || /^https?:\/\//i.test(value)) return value;
  throw bad('INVALID_IMAGE');
}

/** An optional destination: http(s) only, so a script URL can never be stored. */
function adLink(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw bad('INVALID_URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw bad('INVALID_URL');
  return candidate.slice(0, 1000);
}

/** The business's IANA zone; every schedule is written through it. */
async function businessZone(businessId) {
  const { rows } = await q('SELECT timezone FROM businesses WHERE id = $1', [businessId]);
  return rows[0]?.timezone || 'UTC';
}

/**
 * The absolute instant of a submitted wall-clock time ("2026-10-21T18:30") in
 * the business timezone, so a schedule means the same clock time the owner set.
 * An absolute timestamp (already carrying a zone) is kept as it is.
 */
function zonedInstant(raw, timeZone) {
  if (raw instanceof Date) return raw.toISOString();
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const local = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  let date;
  if (local) {
    const [, y, mo, d, h, mi, s = '00'] = local;
    const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(wall));
    const at = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const shown = Date.UTC(+at.year, +at.month - 1, +at.day, +at.hour % 24, +at.minute, +at.second);
    date = new Date(wall - (shown - wall));
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) throw bad('INVALID_DATE');
  return date.toISOString();
}

/** Priority inside one placement: a whole number, 0 when unset. */
function adPriority(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < -100000 || n > 100000) throw bad('INVALID_PRIORITY');
  return n;
}

/** Every value the Add / Edit Advertisement form sends, validated once. */
async function adInput(businessId, body) {
  const timeZone = await businessZone(businessId);
  const productId = body.product_id ? await assertProduct(businessId, body.product_id) : null;
  let categoryId = body.category_id ? await assertCategory(businessId, body.category_id) : null;

  // A product already belongs to a category: that is the relationship stored,
  // so the saved pair can never contradict the menu.
  if (productId) {
    const { rows } = await q('SELECT category_id FROM products WHERE id = $1 AND business_id = $2', [
      productId,
      businessId,
    ]);
    if (rows[0]?.category_id) categoryId = rows[0].category_id;
  }

  const startsAt = zonedInstant(body.starts_at, timeZone);
  const endsAt = zonedInstant(body.ends_at, timeZone);
  if (startsAt && endsAt && startsAt > endsAt) throw bad('INVALID_DATE_RANGE');

  const titles = {};
  const texts = {};
  for (const code of AD_LANGS) {
    titles[code] = adText(body[`title_${code}`], 160);
    texts[code] = adText(body[`subtitle_${code}`], 1000);
  }
  if (!AD_LANGS.some((code) => titles[code])) throw bad('AD_TITLE_REQUIRED');

  return {
    image_url: adImage(body.image_url),
    link_url: adLink(body.link_url),
    category_id: categoryId,
    product_id: productId,
    starts_at: startsAt,
    ends_at: endsAt,
    placement: AD_PLACEMENTS.includes(body.placement) ? body.placement : 'below_header',
    active: body.active === undefined ? true : Boolean(body.active),
    priority: adPriority(body.priority),
    titles,
    texts,
  };
}

const AD_COLUMNS = [
  'image_url', 'link_url', 'category_id', 'product_id',
  'title_ku', 'title_fa', 'title_ar', 'title_en',
  'subtitle_ku', 'subtitle_fa', 'subtitle_ar', 'subtitle_en',
  'starts_at', 'ends_at', 'placement', 'active', 'sort_order',
];

function adValues(input) {
  return [
    input.image_url,
    input.link_url,
    input.category_id,
    input.product_id,
    ...AD_LANGS.map((code) => input.titles[code]),
    ...AD_LANGS.map((code) => input.texts[code]),
    input.starts_at,
    input.ends_at,
    input.placement,
    input.active,
    input.priority,
  ];
}

router.get(
  '/ads',
  withBusiness('staff'),
  ah(async (req, res) => {
    const { rows } = await q(
      `${AD_SELECT} WHERE a.business_id = $1 ORDER BY a.sort_order DESC, a.created_at DESC`,
      [req.businessId],
    );
    res.json({ ads: rows });
  }),
);

router.post(
  '/ads',
  withBusiness('manager'),
  ah(async (req, res) => {
    const input = await adInput(req.businessId, req.body || {});
    const { rows } = await q(
      `INSERT INTO advertisements (business_id, ${AD_COLUMNS.join(', ')})
       VALUES ($1, ${AD_COLUMNS.map((_, i) => `$${i + 2}`).join(', ')})
       RETURNING id`,
      [req.businessId, ...adValues(input)],
    );
    const saved = await q(`${AD_SELECT} WHERE a.id = $1 AND a.business_id = $2`, [
      rows[0].id,
      req.businessId,
    ]);
    res.status(201).json({ ad: saved.rows[0] });
  }),
);

router.put(
  '/ads/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    const found = await q('SELECT * FROM advertisements WHERE id = $1 AND business_id = $2', [
      req.params.id,
      req.businessId,
    ]);
    const current = found.rows[0];
    if (!current) throw notFound('AD_NOT_FOUND');

    // A partial update keeps every field the caller did not send, so an edit
    // can never silently clear data it does not own.
    const body = req.body || {};
    const input = await adInput(req.businessId, {
      ...current,
      ...body,
      priority: 'priority' in body ? body.priority : current.sort_order,
    });

    await q(
      `UPDATE advertisements
          SET ${AD_COLUMNS.map((col, i) => `${col} = $${i + 3}`).join(', ')}, updated_at = now()
        WHERE id = $1 AND business_id = $2`,
      [req.params.id, req.businessId, ...adValues(input)],
    );

    const saved = await q(`${AD_SELECT} WHERE a.id = $1 AND a.business_id = $2`, [
      req.params.id,
      req.businessId,
    ]);
    res.json({ ad: saved.rows[0] });
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
              pr.name_fa AS product_name_fa, pr.name_ar AS product_name_ar,
              c.name_en AS category_name_en, c.name_ku AS category_name_ku,
              c.name_fa AS category_name_fa, c.name_ar AS category_name_ar
         FROM promotions p
         LEFT JOIN products pr ON pr.id = p.product_id
         LEFT JOIN categories c ON c.id = p.category_id
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

/** Optional redemption cap: absent/empty means unlimited, otherwise a whole number ≥ 1. */
function usageLimit(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw bad('INVALID_MAX_USES');
  return n;
}

const PROMO_TARGETS = ['order', 'category', 'product'];

/** The guest-facing redemption code: trimmed, 2–40 letters, digits, dash or underscore. */
function promoCode(raw) {
  const code = String(raw ?? '').trim().slice(0, 40);
  if (!code) throw bad('CODE_REQUIRED');
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(code)) throw bad('INVALID_CODE');
  return code;
}

/** Codes are unique per business, compared without case: SAVE5K and save5k collide. */
async function assertUniqueCode(businessId, code, excludeId) {
  const { rows } = await q(
    `SELECT id FROM promotions
      WHERE business_id = $1 AND upper(code) = upper($2)
        AND ($3::uuid IS NULL OR id <> $3::uuid)`,
    [businessId, code, excludeId || null],
  );
  if (rows[0]) throw conflict('DUPLICATE_CODE');
}

async function assertCategory(businessId, categoryId) {
  if (!categoryId || !isUuid(categoryId)) throw bad('INVALID_CATEGORY');
  const { rows } = await q('SELECT id FROM categories WHERE id = $1 AND business_id = $2', [
    categoryId,
    businessId,
  ]);
  if (!rows[0]) throw bad('INVALID_CATEGORY');
  return categoryId;
}

/** A non-negative money amount (discount value, minimum order). */
function promoMoney(raw, code) {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n < 0) throw bad(code);
  return Math.round(n * 100) / 100;
}

/** ISO timestamp for a submitted date; an end date covers its whole day. */
function promoDate(raw, endOfDay = false) {
  if (raw === undefined || raw === null || raw === '') return null;
  const text = String(raw);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(text);
  if (Number.isNaN(iso.getTime())) throw bad('INVALID_DATE');
  return iso.toISOString();
}

/**
 * Every value the Add / Edit Promotion form sends, validated once so create and
 * update can never disagree. The stored code keeps the owner's own casing; only
 * the uniqueness check is case-insensitive.
 */
async function promotionInput(businessId, body, excludeId) {
  const type = body.discount_type === 'fixed' ? 'fixed' : 'percent';
  const value = promoMoney(body.discount_value, 'INVALID_DISCOUNT');
  if (value <= 0) throw bad('INVALID_DISCOUNT');
  if (type === 'percent' && value > 100) throw bad('INVALID_DISCOUNT');

  const target = PROMO_TARGETS.includes(body.target_type) ? body.target_type : 'order';
  let productId = null;
  let categoryId = null;
  if (target === 'product') {
    productId = await assertProduct(businessId, body.product_id || null);
    if (!productId) throw bad('INVALID_PRODUCT');
  }
  if (target === 'category') categoryId = await assertCategory(businessId, body.category_id || null);

  const startsAt = promoDate(body.starts_at);
  const endsAt = promoDate(body.ends_at, true);
  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) throw bad('INVALID_DATE_RANGE');

  const code = promoCode(body.code);
  await assertUniqueCode(businessId, code, excludeId);

  return {
    code,
    type,
    value,
    target,
    productId,
    categoryId,
    startsAt,
    endsAt,
    minOrder: promoMoney(body.min_order, 'INVALID_MIN_ORDER'),
    maxUses: usageLimit(body.max_uses),
    active: body.active === undefined ? true : Boolean(body.active),
  };
}

router.post(
  '/promotions',
  withBusiness('manager'),
  ah(async (req, res) => {
    const b = req.body || {};
    const input = await promotionInput(req.businessId, b);
    const { rows } = await q(
      `INSERT INTO promotions (business_id, code, product_id, category_id, target_type,
                               discount_type, discount_value, min_order, starts_at, ends_at,
                               active, title_ku, title_fa, title_ar, title_en, max_uses)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        req.businessId,
        input.code,
        input.productId,
        input.categoryId,
        input.target,
        input.type,
        input.value,
        input.minOrder,
        input.startsAt,
        input.endsAt,
        input.active,
        b.title_ku || null,
        b.title_fa || null,
        b.title_ar || null,
        b.title_en || null,
        input.maxUses,
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
    if (!isUuid(req.params.id)) throw notFound('PROMOTION_NOT_FOUND');
    // The edit form edits the SAME record, so the code is excluded from its own
    // uniqueness check and no second promotion is ever created.
    const input = await promotionInput(req.businessId, b, req.params.id);
    const { rows } = await q(
      `UPDATE promotions
          SET code = $3, product_id = $4, category_id = $5, target_type = $6,
              discount_type = $7, discount_value = $8, min_order = $9,
              starts_at = $10, ends_at = $11, active = $12, max_uses = $13,
              title_ku = COALESCE($14, title_ku), title_fa = COALESCE($15, title_fa),
              title_ar = COALESCE($16, title_ar), title_en = COALESCE($17, title_en)
        WHERE id = $1 AND business_id = $2 RETURNING *`,
      [
        req.params.id,
        req.businessId,
        input.code,
        input.productId,
        input.categoryId,
        input.target,
        input.type,
        input.value,
        input.minOrder,
        input.startsAt,
        input.endsAt,
        input.active,
        input.maxUses,
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
