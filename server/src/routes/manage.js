import crypto from 'node:crypto';
import express from 'express';
import { q, tx } from '../db.js';
import { requireAuth, withBusiness, perm, hashPassword, needsPasswordSetup } from '../auth.js';
import {
  MANDATORY,
  effectivePermissions,
  grantablePermissions,
  isFullAccess,
  rolePresets,
  sanitizePermissions,
} from '../lib/permissions.js';
import { ah, bad, conflict, forbidden, isUuid, notFound } from '../lib/http.js';
import { normalizeAvatarType, normalizeProfileImageUrl } from '../lib/profile.js';
import {
  brandSuffix,
  resolveIdentity,
  splitIdentifier,
  suffixLocked,
} from '../lib/identity.js';
import { recordActivity } from '../lib/activity.js';
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
  perm('tables.view'),
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
  perm('tables.create'),
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
  perm('tables.edit'),
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
  perm('tables.delete'),
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
  perm('reviews.view'),
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
  perm('reviews.edit'),
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
  perm('reviews.delete'),
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
  perm('ads.view'),
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
  perm('ads.create'),
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
  perm('ads.edit'),
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
  perm('ads.delete'),
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
  perm('promotions.view'),
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

/**
 * Fixed discount and minimum order per currency — `{ IQD: { discount, … }, … }`.
 * Each currency keeps its own entered amount so an IQD offer is never reused as
 * a Toman or USD one; an empty entry simply means "not offered in that currency".
 */
function promoCurrencyAmounts(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const currency of ['IQD', 'TOMAN', 'USD']) {
    const row = source[currency];
    if (!row || typeof row !== 'object') continue;
    const entry = {};
    if (row.discount !== undefined && row.discount !== null && String(row.discount).trim() !== '') {
      entry.discount = promoMoney(row.discount, 'INVALID_DISCOUNT');
    }
    if (row.min_order !== undefined && row.min_order !== null && String(row.min_order).trim() !== '') {
      entry.min_order = promoMoney(row.min_order, 'INVALID_MIN_ORDER');
    }
    if (Object.keys(entry).length) out[currency] = entry;
  }
  return out;
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
    currencyAmounts: promoCurrencyAmounts(body.currency_amounts),
  };
}

router.post(
  '/promotions',
  withBusiness('manager'),
  perm('promotions.create'),
  ah(async (req, res) => {
    const b = req.body || {};
    const input = await promotionInput(req.businessId, b);
    const { rows } = await q(
      `INSERT INTO promotions (business_id, code, product_id, category_id, target_type,
                               discount_type, discount_value, min_order, starts_at, ends_at,
                               active, title_ku, title_fa, title_ar, title_en, max_uses,
                               currency_amounts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
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
        JSON.stringify(input.currencyAmounts || {}),
      ],
    );
    res.status(201).json({ promotion: rows[0] });
  }),
);

router.put(
  '/promotions/:id',
  withBusiness('manager'),
  perm('promotions.edit'),
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
              title_ar = COALESCE($16, title_ar), title_en = COALESCE($17, title_en),
              currency_amounts = $18
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
        JSON.stringify(input.currencyAmounts || {}),
      ],
    );
    if (!rows[0]) throw notFound('PROMOTION_NOT_FOUND');
    res.json({ promotion: rows[0] });
  }),
);

router.delete(
  '/promotions/:id',
  withBusiness('manager'),
  perm('promotions.delete'),
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

/*
 * User management works on business memberships, never on the global identity.
 * Removing someone from this business deletes their membership row only; the
 * `users` row (and every order, receipt print and audit entry they produced)
 * stays, so history keeps its attribution. Role rank is the outer boundary and
 * the stored module permission set is the finer one, both enforced here.
 */
const ASSIGNABLE_ROLES = ['owner', 'manager', 'staff', 'customer'];
const ROLE_RANK = { customer: 0, staff: 1, manager: 2, owner: 3 };

/*
 * Search folding for the four scripts the product supports (Kurdish Sorani,
 * Persian, Arabic, English). Stored values are never rewritten: the comparison
 * folds away only the variants that make the same name look different —
 * alef/yeh/keh forms, teh marbuta, the Arabic-Indic and Persian digits, and the
 * zero-width joiners Kurdish and Persian words carry. Kept as a JS map and a
 * matching SQL `translate()` pair so both sides of the comparison agree.
 */
const FOLD_PAIRS = [
  ['أإآٱ', 'اااا'],
  ['ة', 'ه'],
  ['ىي', 'یی'],
  ['ك', 'ک'],
  ['ؤ', 'و'],
  ['ئ', 'ی'],
  ['۰۱۲۳۴۵۶۷۸۹', '0123456789'],
  ['٠١٢٣٤٥٦٧٨٩', '0123456789'],
];
const FOLD_FROM = FOLD_PAIRS.map(([from]) => from).join('');
const FOLD_TO = FOLD_PAIRS.map(([, to]) => to).join('');
/* Zero-width joiners, tatweel and the short vowel marks Persian/Arabic names
   carry — dropped for the comparison only, never from the stored value. */
const JOINERS = /[\u200c\u200d\u0640\u064b-\u0652]/g;
const JOINER_CHARS = '\u200c\u200d\u0640\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652';

/** Folds a typed term the same way the SQL expression folds the stored value. */
function foldTerm(value) {
  let out = String(value || '').toLowerCase();
  out = out.replace(/[أإآٱةىيكؤئ۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩]/g, (ch) => {
    const at = FOLD_FROM.indexOf(ch);
    return at === -1 ? ch : FOLD_TO[at];
  });
  return out.replace(JOINERS, '').replace(/\s+/g, ' ').trim();
}

/** SQL twin of `foldTerm` for one column (joiners stripped, then folded). */
function foldSql(column) {
  return `translate(translate(lower(${column}), '${JOINER_CHARS}', ''), '${FOLD_FROM}', '${FOLD_TO}')`;
}

async function countOwners(businessId) {
  const { rows } = await q(
    `SELECT count(*)::int AS c FROM memberships WHERE business_id = $1 AND role = 'owner' AND status = 'active'`,
    [businessId],
  );
  return rows[0].c;
}

/** The actor's own rank inside this business (super admin ranks above owner). */
function actorRank(req) {
  return req.role === 'super_admin' ? 4 : ROLE_RANK[req.role] ?? -1;
}

/** True when the actor may hand out `role` / act on a membership of that role. */
function canActOnRole(req, role) {
  if (req.role === 'super_admin') return true;
  const rank = ROLE_RANK[role] ?? -1;
  // An owner may create or manage another owner; anyone else stays strictly below.
  if (req.role === 'owner') return rank <= ROLE_RANK.owner;
  return rank < actorRank(req);
}

/** The permissions object a save should store (NULL = follow the role template). */
function permissionPayload(req, role, submitted) {
  if (submitted === undefined || submitted === null) return null;
  const allowed = new Set(grantablePermissions(role, req.permissions));
  for (const [key, value] of Object.entries(submitted)) {
    if (value === true && !allowed.has(key)) throw bad('PERMISSION_NOT_GRANTABLE');
  }
  return sanitizePermissions(role, submitted, req.permissions);
}

/* ------------------------------------------- login identifier & creator */

/** The platform's primary business: where the Creator account's work lives. */
async function primaryBusinessId() {
  const { rows } = await q('SELECT id FROM businesses ORDER BY created_at LIMIT 1');
  return rows[0]?.id || null;
}

/** The one Super Admin / Creator record, whatever its current state. */
async function creatorRecord() {
  const { rows } = await q(
    `SELECT id, email, full_name, password_hash
       FROM users WHERE is_super_admin = true ORDER BY created_at LIMIT 1`,
  );
  return rows[0] || null;
}

/**
 * Who may set the Creator's password: the Creator itself, or the owner of the
 * platform's primary business (the verified owner). A brand-new registrant owns
 * their own new business, not the primary one, so registration alone never
 * grants this.
 */
async function mayManageCreator(req) {
  if (req.user?.is_super_admin) return true;
  const primary = await primaryBusinessId();
  return Boolean(primary) && req.role === 'owner' && req.businessId === primary;
}

/**
 * The business's own login suffix, generated from the brand name in the
 * Business Profile. It is read-only everywhere: a request can never supply it.
 */
async function businessSuffix(businessId) {
  const { rows } = await q(
    'SELECT slug, name, name_en FROM businesses WHERE id = $1',
    [businessId],
  );
  return brandSuffix(rows[0] || {});
}

/** An optional recovery address; an internal login name is not a mailbox. */
function recoveryEmail(raw) {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim().toLowerCase();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 200) throw bad('INVALID_RECOVERY_EMAIL');
  return value;
}

router.get(
  '/users',
  withBusiness('manager'),
  perm('users.view'),
  ah(async (req, res) => {
    const params = [req.businessId];
    const where = ['m.business_id = $1'];

    // Partial matching across the identity fields the administrator may read:
    // name, email and phone. `%` / `_` typed by the user stay literal.
    const term = foldTerm(String(req.query.q || '').slice(0, 80));
    if (term) {
      const pattern = `%${term.replace(/([%_\\])/g, '\\$1')}%`;
      params.push(pattern);
      const at = `$${params.length}`;
      where.push(
        `(${foldSql('u.full_name')} LIKE ${at} ESCAPE '\\'
          OR ${foldSql('u.email')} LIKE ${at} ESCAPE '\\'
          OR ${foldSql('u.phone')} LIKE ${at} ESCAPE '\\')`,
      );
    }
    if (ASSIGNABLE_ROLES.includes(req.query.role)) {
      params.push(req.query.role);
      where.push(`m.role = $${params.length}`);
    }
    if (['active', 'disabled'].includes(req.query.status)) {
      params.push(req.query.status);
      where.push(`m.status = $${params.length}`);
    }

    const { rows } = await q(
      `SELECT m.id AS membership_id, m.role, m.status, m.permissions, m.created_at,
              u.id, u.email, u.full_name, u.phone, u.locale,
              u.profile_image_url, u.avatar_type, u.recovery_email
         FROM memberships m JOIN users u ON u.id = m.user_id
        WHERE ${where.join(' AND ')}
        ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'staff' THEN 2 ELSE 3 END,
                 u.created_at`,
      params,
    );

    const business = await q(
      `SELECT id, name, name_ku, name_fa, name_ar, name_en, slug, login_suffix
         FROM businesses WHERE id = $1`,
      [req.businessId],
    );    const users = rows.map((r) => {
      const permissions = effectivePermissions(r.role, r.permissions);
      return {
        membership_id: r.membership_id,
        id: r.id,
        email: r.email,
        // The identifier split back into the two fields the edit form edits.
        ...splitIdentifier(r.email),
        recovery_email: r.recovery_email || null,
        full_name: r.full_name,
        phone: r.phone,
        locale: r.locale,
        profile_image_url: r.profile_image_url,
        avatar_type: r.avatar_type || 'default',
        role: r.role,
        status: r.status,
        created_at: r.created_at,
        permissions,
        full_access: isFullAccess(r.role, permissions),
      };
    });

    // What this administrator may grant, per role — the UI's locked cards come
    // from the server, so an edited page still cannot select them.
    const grantable = Object.fromEntries(
      ASSIGNABLE_ROLES.map((role) => [role, grantablePermissions(role, req.permissions)]),
    );

    // Counts describe the whole membership list, never the filtered page: the
    // three tiles must keep meaning "this business", whatever the admin types
    // into the search box or picks in the filters.
    const totals = await q(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status = 'active')::int AS active,
              count(*) FILTER (WHERE status = 'disabled')::int AS disabled
         FROM memberships WHERE business_id = $1`,
      [req.businessId],
    );

    const creator = await creatorRecord();
    const businessRow = business.rows[0] || null;
    const suffix = brandSuffix(businessRow || {});

    res.json({
      users,
      counts: totals.rows[0],
      can_manage: true,
      actor_role: req.role,
      grantable,
      presets: rolePresets(),
      mandatory: MANDATORY,
      business: businessRow,
      // Everything the Account Settings card needs: the business's locked
      // suffix (generated from its brand name) and the Creator record's state.
      account: {
        login_suffix: suffix,
        suggested_suffix: suffix,
        suffix_locked: true,
        creator: creator
          ? {
            email: creator.email,
            full_name: creator.full_name,
            needs_setup: needsPasswordSetup(creator.password_hash),
            can_set_password: await mayManageCreator(req),
          }
          : { email: null, full_name: null, needs_setup: true, can_set_password: await mayManageCreator(req) },
      },
    });
  }),
);

router.post(
  '/users',
  withBusiness('manager'),
  perm('users.create'),
  ah(async (req, res) => {
    const fullName = String(req.body?.full_name || '').trim().slice(0, 120);
    const phone = String(req.body?.phone || '').trim().slice(0, 40) || null;
    const password = String(req.body?.password || '');
    const role = ASSIGNABLE_ROLES.includes(req.body?.role) ? req.body.role : 'staff';
    const status = req.body?.status === 'disabled' ? 'disabled' : 'active';

    // The login identifier is composed here, on the server: the username the
    // administrator typed plus the business's own suffix, generated from its
    // brand name. A client can never supply or override that suffix.
    const suffix = await businessSuffix(req.businessId);
    if (suffixLocked(req.body, suffix)) throw bad('SUFFIX_LOCKED');
    const identity = resolveIdentity(req.body || {}, suffix);
    if (identity.error) throw bad(identity.error);
    if (!identity.identifier) throw bad('INVALID_EMAIL');
    const email = identity.identifier;
    const recovery = recoveryEmail(req.body?.recovery_email);

    if (!fullName) throw bad('NAME_REQUIRED');
    if (!canActOnRole(req, role) || (role === 'owner' && !['owner', 'super_admin'].includes(req.role))) {
      throw bad('ROLE_NOT_ASSIGNABLE');
    }
    const permissions = permissionPayload(req, role, req.body?.permissions);
    // Appearance is optional: no photo, and the neutral avatar unless one is chosen.
    const profileImageUrl = normalizeProfileImageUrl(req.body?.profile_image_url) || null;
    const avatarType = normalizeAvatarType(req.body?.avatar_type) || 'default';

    const created = await tx(async (c) => {
      let userId;
      const existing = await c.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
      if (existing.rows[0]) {
        // An existing identity is linked, never duplicated — and its password
        // is never touched by a business administrator.
        userId = existing.rows[0].id;
        const member = await c.query(
          'SELECT 1 FROM memberships WHERE business_id = $1 AND user_id = $2',
          [req.businessId, userId],
        );
        if (member.rowCount) throw conflict('ALREADY_MEMBER');
      } else {
        if (password.length < 8) throw bad('WEAK_PASSWORD');
        const u = await c.query(
          `INSERT INTO users (email, password_hash, full_name, phone, profile_image_url,
                              avatar_type, recovery_email)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [email, hashPassword(password), fullName, phone, profileImageUrl, avatarType, recovery],
        );
        userId = u.rows[0].id;
      }
      const membership = await c.query(
        `INSERT INTO memberships (business_id, user_id, role, status, permissions)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [req.businessId, userId, role, status, permissions],
      );
      return { userId, membershipId: membership.rows[0].id };
    });

    res.status(201).json({
      ok: true,
      user_id: created.userId,
      membership_id: created.membershipId,
      login_identifier: email,
      linked: Boolean(created.userId) && Boolean(req.body?.link_only),
    });
  }),
);

router.patch(
  '/users/:membershipId',
  withBusiness('manager'),
  perm('users.edit'),
  ah(async (req, res) => {
    if (!isUuid(req.params.membershipId)) throw notFound('MEMBERSHIP_NOT_FOUND');
    const { rows } = await q(
      `SELECT m.*, u.email FROM memberships m JOIN users u ON u.id = m.user_id
        WHERE m.id = $1 AND m.business_id = $2`,
      [req.params.membershipId, req.businessId],
    );
    const membership = rows[0];
    if (!membership) throw notFound('MEMBERSHIP_NOT_FOUND');
    if (!canActOnRole(req, membership.role)) throw bad('ROLE_NOT_ASSIGNABLE');

    const self = membership.user_id === req.user.id;
    const b = req.body || {};
    const nextRole = b.role === undefined ? null : b.role;
    const nextStatus = b.status === undefined ? null : b.status;

    if (nextRole !== null) {
      if (!ASSIGNABLE_ROLES.includes(nextRole)) throw bad('INVALID_ROLE');
      if (!canActOnRole(req, nextRole)) throw bad('ROLE_NOT_ASSIGNABLE');
      if (nextRole === 'owner' && !['owner', 'super_admin'].includes(req.role)) {
        throw bad('ROLE_NOT_ASSIGNABLE');
      }
      if (self && nextRole !== membership.role) throw conflict('CANNOT_MODIFY_SELF');
    }
    if (nextStatus !== null) {
      if (!['active', 'disabled'].includes(nextStatus)) throw bad('INVALID_STATUS');
      // Nobody can deactivate their own account — that is how a business locks
      // itself out with a single click.
      if (self && nextStatus === 'disabled') throw conflict('CANNOT_MODIFY_SELF');
    }

    const losingOwner =
      membership.role === 'owner' &&
      ((nextRole !== null && nextRole !== 'owner') || nextStatus === 'disabled');
    if (losingOwner && (await countOwners(req.businessId)) <= 1) throw conflict('LAST_OWNER');

    // Permissions are validated against the role the membership will end up in.
    const targetRole = nextRole || membership.role;
    const permissions = permissionPayload(req, targetRole, b.permissions);

    // Validated before the transaction opens, so a rejected file reference never
    // leaves the membership half-updated nor overwrites the stored photo.
    const hasProfileImage = b.profile_image_url !== undefined;
    const profileImageUrl = normalizeProfileImageUrl(b.profile_image_url);
    const avatarType = normalizeAvatarType(b.avatar_type);

    /*
     * Changing the internal login identifier. Only the identifier is checked
     * for uniqueness here — the database's unique index remains the real guard,
     * and a collision is reported as EMAIL_TAKEN instead of a 500.
     */
    let nextIdentifier = null;
    if (b.username !== undefined || b.login_suffix !== undefined || b.suffix !== undefined) {
      const current = splitIdentifier(membership.email);
      /*
       * The suffix is protected. An existing account keeps the suffix it was
       * created with, so renaming the brand never changes a live credential;
       * only an account stored without one picks up the business's current
       * suffix. A request that tries to send a different suffix is refused.
       */
      const suffix = current.suffix || await businessSuffix(req.businessId);
      if (suffixLocked(b, suffix)) throw bad('SUFFIX_LOCKED');
      // An account created before the English-only rule keeps the username it
      // signs in with: the strict rule is applied only to a name the form
      // actually changes, so editing a legacy user never breaks its login.
      const requested = b.username === undefined
        ? current.username
        : String(b.username).trim().toLowerCase();
      const identity = requested === current.username
        ? { username: current.username, suffix, identifier: membership.email }
        : resolveIdentity({ username: requested }, suffix);
      if (identity.error) throw bad(identity.error);
      if (identity.identifier && identity.identifier !== membership.email) {
        const taken = await q(
          'SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> $2',
          [identity.identifier, membership.user_id],
        );
        if (taken.rowCount) throw conflict('EMAIL_TAKEN');
        nextIdentifier = identity.identifier;
      }
    }

    const hasRecoveryEmail = b.recovery_email !== undefined;
    const nextRecoveryEmail = hasRecoveryEmail ? recoveryEmail(b.recovery_email) : null;

    const updated = await tx(async (c) => {
      const saved = await c.query(
        `UPDATE memberships SET role = COALESCE($3, role),
                                status = COALESCE($4, status),
                                permissions = CASE WHEN $5::boolean THEN $6::jsonb ELSE permissions END
          WHERE id = $1 AND business_id = $2 RETURNING *`,
        [
          req.params.membershipId,
          req.businessId,
          nextRole,
          nextStatus,
          b.permissions !== undefined,
          permissions === null ? null : JSON.stringify(permissions),
        ],
      );
      // The identity's own profile fields live on `users`, not on the membership.
      if (
        b.full_name !== undefined
        || b.phone !== undefined
        || hasProfileImage
        || avatarType !== undefined
        || nextIdentifier !== null
        || hasRecoveryEmail
      ) {
        const fullName = b.full_name === undefined ? null : String(b.full_name).trim().slice(0, 120);
        if (b.full_name !== undefined && !fullName) throw bad('NAME_REQUIRED');
        await c.query(
          `UPDATE users SET full_name = COALESCE($2, full_name),
                            phone = COALESCE($3, phone),
                            profile_image_url = CASE WHEN $4::boolean THEN $5::text ELSE profile_image_url END,
                            avatar_type = COALESCE($6, avatar_type),
                            email = COALESCE($7, email),
                            recovery_email = CASE WHEN $8::boolean THEN $9::text ELSE recovery_email END,
                            updated_at = now()
            WHERE id = $1`,
          [
            membership.user_id,
            fullName,
            b.phone === undefined ? null : String(b.phone).slice(0, 40),
            hasProfileImage,
            profileImageUrl === undefined ? null : profileImageUrl,
            avatarType === undefined ? null : avatarType,
            nextIdentifier,
            hasRecoveryEmail,
            nextRecoveryEmail,
          ],
        );
      }
      return saved.rows[0];
    });

    res.json({
      membership: updated,
      permissions: effectivePermissions(updated.role, updated.permissions),
    });
  }),
);

router.delete(
  '/users/:membershipId',
  withBusiness('manager'),
  perm('users.delete'),
  ah(async (req, res) => {
    if (!isUuid(req.params.membershipId)) throw notFound('MEMBERSHIP_NOT_FOUND');
    const { rows } = await q(
      'SELECT * FROM memberships WHERE id = $1 AND business_id = $2',
      [req.params.membershipId, req.businessId],
    );
    const membership = rows[0];
    if (!membership) throw notFound('MEMBERSHIP_NOT_FOUND');
    if (!canActOnRole(req, membership.role)) throw bad('ROLE_NOT_ASSIGNABLE');
    if (membership.user_id === req.user.id) throw conflict('CANNOT_MODIFY_SELF');
    if (membership.role === 'owner' && (await countOwners(req.businessId)) <= 1) {
      throw conflict('LAST_OWNER');
    }
    // Membership only: the global identity, its orders and its audit trail stay.
    await q('DELETE FROM memberships WHERE id = $1 AND business_id = $2', [
      req.params.membershipId,
      req.businessId,
    ]);
    res.json({ ok: true });
  }),
);

/* --------------------------------------- account settings & credentials */

/*
 * Sets a new password for a member of this business. This is the supported
 * recovery path for an internal login identifier (which has no mailbox): an
 * administrator with the `users.edit` permission issues a new password, and the
 * member changes it again from "My account" once signed in.
 */
router.post(
  '/users/:membershipId/password',
  withBusiness('manager'),
  perm('users.edit'),
  ah(async (req, res) => {
    if (!isUuid(req.params.membershipId)) throw notFound('MEMBERSHIP_NOT_FOUND');
    const password = String(req.body?.password || '');
    if (password.length < 8) throw bad('WEAK_PASSWORD');

    const { rows } = await q(
      'SELECT * FROM memberships WHERE id = $1 AND business_id = $2',
      [req.params.membershipId, req.businessId],
    );
    const membership = rows[0];
    if (!membership) throw notFound('MEMBERSHIP_NOT_FOUND');
    if (!canActOnRole(req, membership.role)) throw bad('ROLE_NOT_ASSIGNABLE');
    // Your own password goes through /api/auth/change-password, which also
    // verifies the current one.
    if (membership.user_id === req.user.id) throw conflict('CANNOT_MODIFY_SELF');

    await q('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [
      membership.user_id,
      hashPassword(password),
    ]);
    res.json({ ok: true });
  }),
);

/**
 * The business's login suffix is generated from its brand name and protected:
 * this endpoint reports it and refuses any attempt to replace it with a
 * different one. The brand name in the Business Profile is the only way to
 * change it, and accounts that already exist keep their own suffix.
 */
router.put(
  '/account-settings',
  withBusiness('manager'),
  perm('users.edit'),
  ah(async (req, res) => {
    const suffix = await businessSuffix(req.businessId);
    if (suffixLocked(req.body, suffix)) throw bad('SUFFIX_LOCKED');
    res.json({ ok: true, login_suffix: suffix, locked: true });
  }),
);

/*
 * The one-time owner-controlled initialization (and later re-keying) of the
 * Creator account.
 *
 * Authorized for: the Creator itself, or the owner of the platform's primary
 * business — the verified owner. An anonymous visitor cannot reach it (the
 * router requires a session and a business), registration creates a *different*
 * business, and the platform role is never granted here: this endpoint only
 * ever sets a password on the record that already carries it.
 */
router.post(
  '/creator-password',
  withBusiness('manager'),
  perm('users.edit'),
  ah(async (req, res) => {
    if (!(await mayManageCreator(req))) throw forbidden('CREATOR_SETUP_NOT_ALLOWED');
    const password = String(req.body?.password || '');
    if (password.length < 8) throw bad('WEAK_PASSWORD');

    const creator = await creatorRecord();
    const isCreator = Boolean(creator) && creator.id === req.user.id;
    // Once a password has really been set, only the Creator may replace it.
    if (creator && !needsPasswordSetup(creator.password_hash) && !isCreator) {
      throw conflict('CREATOR_ALREADY_CLAIMED');
    }

    let email = creator?.email || 'superadmin@work.app';
    if (creator) {
      await q(
        `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`,
        [creator.id, hashPassword(password)],
      );
    } else {
      // Only reachable if the record was removed by hand; identity is fixed.
      await q(
        `INSERT INTO users (email, password_hash, full_name, is_super_admin)
         VALUES ($1,$2,$3,true)`,
        [email, hashPassword(password), 'Lilyan Pert Creator'],
      );
    }

    const businessId = req.businessId || (await primaryBusinessId());
    if (businessId) {
      await recordActivity({
        businessId,
        actorId: req.user.id,
        actorName: req.user.full_name || req.user.email,
        entity: 'user',
        action: 'updated',
        entityLabel: email,
        path: req.path,
      });
    }
    res.json({ ok: true, email });
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

/*
 * Notification feed, grouped by the three dashboard priorities.
 *
 * The stored `type` is the only thing that decides a category — orders
 * (`new_order`), reviews, and activities (`activity` + `status_change`). Counts are computed
 * from the same scoped rows the list is built from, so the badge can never
 * disagree with what the panel shows. Everything stays inside this business.
 */
const NOTIF_CATEGORY_SQL = {
  // Only a genuinely created order lands in Orders; every status transition
  // and system event is an activity, whatever it is titled.
  orders: "type = 'new_order'",
  reviews: "type = 'review'",
  activities: "type IN ('activity','status_change')",
};

/** Newest rows per category, so one busy stream can never hide another. */
const NOTIF_LIMIT = 30;

router.get(
  '/notifications',
  withBusiness('staff'),
  ah(async (req, res) => {
    const [orders, reviews, activities, counts] = await Promise.all([
      q(
        `SELECT n.*, o.order_number FROM notifications n
           LEFT JOIN orders o ON o.id = n.order_id
          WHERE n.business_id = $1 AND ${NOTIF_CATEGORY_SQL.orders}
          ORDER BY n.created_at DESC LIMIT ${NOTIF_LIMIT}`,
        [req.businessId],
      ),
      q(
        `SELECT n.*, o.order_number FROM notifications n
           LEFT JOIN orders o ON o.id = n.order_id
          WHERE n.business_id = $1 AND ${NOTIF_CATEGORY_SQL.reviews}
          ORDER BY n.created_at DESC LIMIT ${NOTIF_LIMIT}`,
        [req.businessId],
      ),
      q(
        `SELECT n.*, o.order_number FROM notifications n
           LEFT JOIN orders o ON o.id = n.order_id
          WHERE n.business_id = $1 AND ${NOTIF_CATEGORY_SQL.activities}
          ORDER BY n.created_at DESC LIMIT ${NOTIF_LIMIT}`,
        [req.businessId],
      ),
      q(
        `SELECT
           count(*) FILTER (WHERE read_at IS NULL AND ${NOTIF_CATEGORY_SQL.orders})::int AS orders,
           count(*) FILTER (WHERE read_at IS NULL AND ${NOTIF_CATEGORY_SQL.reviews})::int AS reviews,
           count(*) FILTER (WHERE read_at IS NULL AND ${NOTIF_CATEGORY_SQL.activities})::int AS activities
         FROM notifications WHERE business_id = $1`,
        [req.businessId],
      ),
    ]);

    const lists = { orders: orders.rows, reviews: reviews.rows, activities: activities.rows };
    const unread = counts.rows[0];
    const total = unread.orders + unread.reviews + unread.activities;

    res.json({
      // One merged, newest-first feed for the "All" tab.
      notifications: [...lists.orders, ...lists.reviews, ...lists.activities].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      ),
      lists,
      unread: { ...unread, total },
    });
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
