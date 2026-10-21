import express from 'express';
import { q, tx } from '../db.js';
import { ah, bad, isUuid, notFound } from '../lib/http.js';
import { pushNewOrder } from '../lib/push.js';

const router = express.Router();

const round2 = (n) => Math.round(n * 100) / 100;

function activePromotionFor(promotions, productId) {
  return promotions.find((p) => p.product_id === productId) || null;
}

function promoUnitPrice(product, promotion) {
  const base = Number(product.price);
  if (!promotion) return base;
  if (promotion.discount_type === 'percent') {
    return round2(base - (base * Number(promotion.discount_value)) / 100);
  }
  return round2(Math.max(0, base - Number(promotion.discount_value)));
}

/**
 * The part of the order a promotion applies to: everything, one category or one
 * product. Derived from the stored lines, never from the request body.
 */
function promotionBaseAmount(promotion, lines, subtotal) {
  if (promotion.target_type === 'category') {
    return round2(
      lines.filter((l) => l.category_id === promotion.category_id).reduce((sum, l) => sum + l.line_total, 0),
    );
  }
  if (promotion.target_type === 'product') {
    return round2(
      lines.filter((l) => l.product_id === promotion.product_id).reduce((sum, l) => sum + l.line_total, 0),
    );
  }
  return subtotal;
}

async function loadBusiness(key) {
  const col = isUuid(key) ? 'id' : 'slug';
  const { rows } = await q(`SELECT * FROM businesses WHERE ${col} = $1`, [key]);
  if (!rows[0]) throw notFound('BUSINESS_NOT_FOUND');
  return rows[0];
}

/**
 * Public menu payload. Only customer-safe fields leave the server: no member
 * emails, no user ids, no internal settings.
 */
router.get(
  '/menu/:key',
  ah(async (req, res) => {
    const business = await loadBusiness(req.params.key);

    let table = null;
    if (req.query.table) {
      const t = await q(
        'SELECT id, name, zone, seats FROM tables WHERE qr_token = $1 AND business_id = $2 AND active = true',
        [String(req.query.table).slice(0, 64), business.id],
      );
      table = t.rows[0] || null;
    }

    const [cats, prods, promos, ads, reviews] = await Promise.all([
      q(
        `SELECT id, icon, sort_order, name_ku, name_fa, name_ar, name_en
           FROM categories WHERE business_id = $1 AND active = true
          ORDER BY sort_order, created_at`,
        [business.id],
      ),
      q(
        `SELECT p.id, p.category_id, p.price, p.image_url, p.name_ku, p.name_fa, p.name_ar, p.name_en,
                p.description_ku, p.description_fa, p.description_ar, p.description_en, p.sort_order
           FROM products p JOIN categories c ON c.id = p.category_id
          WHERE p.business_id = $1 AND p.active = true AND p.available = true AND c.active = true
          ORDER BY p.sort_order, p.created_at`,
        [business.id],
      ),
      q(
        `SELECT id, product_id, discount_type, discount_value, title_ku, title_fa, title_ar, title_en
           FROM promotions
          WHERE business_id = $1 AND active = true AND product_id IS NOT NULL
            AND (starts_at IS NULL OR starts_at <= now())
            AND (ends_at IS NULL OR ends_at >= now())
            -- A promotion that used up its redemptions stops being advertised.
            AND (max_uses IS NULL OR used_count < max_uses)
            -- Code-based promotions are redeemed by the guest at checkout, never
            -- applied silently to the menu price.
            AND code IS NULL`,
        [business.id],
      ),
      /*
       * Only advertisements a guest may really see: enabled, inside their
       * schedule (an expired but still enabled advertisement is not shown) and
       * inside a placement the menu renders. Higher priority first.
       */
      q(
        `SELECT a.id, a.image_url, a.link_url, a.category_id, a.product_id, a.placement,
                a.title_ku, a.title_fa, a.title_ar, a.title_en,
                a.subtitle_ku, a.subtitle_fa, a.subtitle_ar, a.subtitle_en,
                a.sort_order AS priority,
                pr.name_ku AS product_name_ku, pr.name_fa AS product_name_fa,
                pr.name_ar AS product_name_ar, pr.name_en AS product_name_en,
                c.name_ku AS category_name_ku, c.name_fa AS category_name_fa,
                c.name_ar AS category_name_ar, c.name_en AS category_name_en
           FROM advertisements a
           LEFT JOIN products pr ON pr.id = a.product_id AND pr.business_id = a.business_id
           LEFT JOIN categories c ON c.id = a.category_id AND c.business_id = a.business_id
          WHERE a.business_id = $1 AND a.active = true
            AND (a.starts_at IS NULL OR a.starts_at <= now())
            AND (a.ends_at IS NULL OR a.ends_at >= now())
          ORDER BY a.sort_order DESC, a.created_at DESC`,
        [business.id],
      ),
      q(
        `SELECT id, customer_name, rating, comment, created_at
           FROM reviews WHERE business_id = $1 AND status = 'approved'
          ORDER BY created_at DESC LIMIT 30`,
        [business.id],
      ),
    ]);

    const products = prods.rows.map((p) => {
      const promotion = activePromotionFor(promos.rows, p.id);
      return {
        ...p,
        promotion_id: promotion?.id || null,
        promo_price: promotion ? promoUnitPrice(p, promotion) : null,
        promotion_titles: promotion
          ? {
              ku: promotion.title_ku,
              fa: promotion.title_fa,
              ar: promotion.title_ar,
              en: promotion.title_en,
            }
          : null,
      };
    });

    res.json({
      business: {
        id: business.id,
        slug: business.slug,
        name: business.name,
        name_ku: business.name_ku,
        name_fa: business.name_fa,
        name_ar: business.name_ar,
        name_en: business.name_en,
        description: business.description,
        logo_url: business.logo_url,
        cover_url: business.cover_url,
        phone: business.phone,
        address: business.address,
        city: business.city,
        latitude: business.latitude,
        longitude: business.longitude,
        socials: business.socials,
        business_type: business.business_type,
        theme: business.theme,
        working_hours: business.working_hours,
        menu_settings: business.menu_settings,
        editable_text: business.editable_text,
        currency: business.currency,
        timezone: business.timezone,
      },
      menu_disabled: business.menu_settings?.show_customer_menu === false,
      table,
      categories: cats.rows,
      products,
      advertisements: ads.rows,
      reviews: reviews.rows,
    });
  }),
);

/** Counts one menu view per browser session per day. */
router.post(
  '/views/:key',
  ah(async (req, res) => {
    const business = await loadBusiness(req.params.key);
    const sessionKey = String(req.body?.session_key || '').slice(0, 80);
    if (!sessionKey) throw bad('SESSION_KEY_REQUIRED');
    await q(
      `INSERT INTO business_views (business_id, session_key, source)
       VALUES ($1,$2,'menu') ON CONFLICT (business_id, session_key, viewed_on) DO NOTHING`,
      [business.id, sessionKey],
    );
    res.json({ ok: true });
  }),
);

router.post(
  '/reviews/:key',
  ah(async (req, res) => {
    const business = await loadBusiness(req.params.key);
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw bad('INVALID_RATING');
    const comment = req.body?.comment ? String(req.body.comment).slice(0, 2000) : null;
    const name = req.body?.customer_name ? String(req.body.customer_name).slice(0, 120) : null;
    const { rows } = await q(
      `INSERT INTO reviews (business_id, order_id, customer_name, rating, comment, status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING id, created_at`,
      [business.id, req.body?.order_id || null, name, rating, comment],
    );
    res.status(201).json({ review: rows[0], moderated: true });
  }),
);

/**
 * Public order placement. Prices, discounts, taxes and totals are all derived
 * server-side from stored product rows — nothing money-related is trusted from
 * the client.
 */
router.post(
  '/orders/:key',
  ah(async (req, res) => {
    const business = await loadBusiness(req.params.key);
    if (business.menu_settings?.show_customer_menu === false) {
      throw bad('MENU_DISABLED');
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) throw bad('EMPTY_ORDER');
    if (items.length > 60) throw bad('TOO_MANY_ITEMS');

    const result = await tx(async (c) => {
      let table = null;
      if (req.body?.table_token) {
        const t = await c.query(
          'SELECT id, name FROM tables WHERE qr_token = $1 AND business_id = $2 AND active = true',
          [String(req.body.table_token).slice(0, 64), business.id],
        );
        table = t.rows[0] || null;
        if (!table) throw bad('INVALID_TABLE');
      }

      const ids = [...new Set(items.map((i) => String(i.product_id)))].filter(isUuid);
      if (!ids.length) throw bad('INVALID_ITEMS');

      const found = await c.query(
        `SELECT p.id, p.price, p.category_id, p.name_en, p.name_ku, p.name_fa, p.name_ar,
                p.active, p.available, c.active AS category_active
           FROM products p LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.business_id = $1 AND p.id = ANY($2::uuid[])`,
        [business.id, ids],
      );
      const byId = new Map(found.rows.map((r) => [r.id, r]));

      const promos = await c.query(
        `SELECT id, product_id, discount_type, discount_value, max_uses, used_count FROM promotions
          WHERE business_id = $1 AND active = true AND product_id = ANY($2::uuid[])
            AND (starts_at IS NULL OR starts_at <= now())
            AND (ends_at IS NULL OR ends_at >= now())`,
        [business.id, ids],
      );
      const promoByProduct = new Map(promos.rows.map((p) => [p.product_id, p]));

      const lines = [];
      let subtotal = 0;
      // Every promotion this order really redeemed, so their counters can move.
      const appliedPromotions = new Set();

      for (const raw of items) {
        const product = byId.get(String(raw.product_id));
        if (!product) throw bad('PRODUCT_NOT_FOUND');
        if (!product.active || !product.available || product.category_active === false) {
          throw bad('PRODUCT_UNAVAILABLE', product.name_en || product.id);
        }
        const quantity = Math.max(1, Math.min(99, Math.floor(Number(raw.quantity) || 1)));
        let promotion = promoByProduct.get(product.id) || null;
        /*
         * Usage limit is enforced here, on the authoritative side: a promotion
         * whose redemptions are used up is ignored and the product is charged
         * its normal price, whatever the client sent.
         */
        if (promotion && promotion.max_uses !== null && Number(promotion.used_count) >= Number(promotion.max_uses)) {
          promotion = null;
        }
        const unitPrice = promoUnitPrice(product, promotion);
        if (promotion) appliedPromotions.add(promotion.id);
        const lineTotal = round2(unitPrice * quantity);
        subtotal = round2(subtotal + lineTotal);
        lines.push({
          product_id: product.id,
          category_id: product.category_id,
          name: product.name_en || product.name_ku || product.name_fa || product.name_ar,
          unit_price: unitPrice,
          quantity,
          line_total: lineTotal,
          notes: raw.notes ? String(raw.notes).slice(0, 300) : null,
        });
      }

      /*
       * A promotion code is validated here, on the authoritative side, against
       * the stored promotion: active flag, validity window, redemption cap,
       * minimum order and target — then the discount is recalculated from the
       * stored lines. The client cannot influence the amount it gets back.
       */
      let codePromotion = null;
      let discount = 0;
      const submittedCode = String(req.body?.promotion_code || '').trim().slice(0, 40);
      if (submittedCode) {
        const found = await c.query(
          'SELECT * FROM promotions WHERE business_id = $1 AND upper(code) = upper($2)',
          [business.id, submittedCode],
        );
        const promotion = found.rows[0];
        if (!promotion) throw bad('PROMO_NOT_FOUND');
        if (!promotion.active) throw bad('PROMO_INACTIVE');
        const now = Date.now();
        if (promotion.starts_at && new Date(promotion.starts_at).getTime() > now) {
          throw bad('PROMO_NOT_STARTED');
        }
        if (promotion.ends_at && new Date(promotion.ends_at).getTime() < now) {
          throw bad('PROMO_EXPIRED');
        }
        if (promotion.max_uses !== null && Number(promotion.used_count) >= Number(promotion.max_uses)) {
          throw bad('PROMO_EXHAUSTED');
        }
        if (Number(promotion.min_order || 0) > subtotal) throw bad('PROMO_MIN_ORDER');
        const base = promotionBaseAmount(promotion, lines, subtotal);
        if (base <= 0) throw bad('PROMO_NOT_APPLICABLE');
        discount =
          promotion.discount_type === 'percent'
            ? round2((base * Number(promotion.discount_value)) / 100)
            : round2(Number(promotion.discount_value));
        discount = round2(Math.min(discount, subtotal));
        if (discount <= 0) throw bad('PROMO_NOT_APPLICABLE');
        codePromotion = promotion;
      }

      const taxRate = Number(business.tax_rate || 0);
      const serviceRate = Number(business.service_charge_rate || 0);
      const taxable = round2(Math.max(0, subtotal - discount));
      const tax = round2((taxable * taxRate) / 100);
      const service = round2((taxable * serviceRate) / 100);
      const total = round2(taxable + tax + service);

      const seq = await c.query(
        'UPDATE businesses SET order_seq = order_seq + 1 WHERE id = $1 RETURNING order_seq',
        [business.id],
      );
      const orderNumber = seq.rows[0].order_seq;

      const order = await c.query(
        `INSERT INTO orders (business_id, table_id, table_name, order_number, status, channel, customer_name,
                             customer_phone, notes, subtotal, discount, tax, service_charge, total,
                             promotion_id, promotion_code, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'pending','customer',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now())
         RETURNING *`,
        [
          business.id,
          table?.id || null,
          table?.name || null,
          orderNumber,
          req.body?.customer_name ? String(req.body.customer_name).slice(0, 120) : null,
          req.body?.customer_phone ? String(req.body.customer_phone).slice(0, 40) : null,
          req.body?.notes ? String(req.body.notes).slice(0, 500) : null,
          subtotal,
          discount,
          tax,
          service,
          total,
          codePromotion?.id || [...appliedPromotions][0] || null,
          codePromotion?.code || null,
        ],
      );

      // One redemption per promotion actually applied by this order.
      if (codePromotion) appliedPromotions.add(codePromotion.id);
      for (const promotionId of appliedPromotions) {
        await c.query(
          'UPDATE promotions SET used_count = used_count + 1 WHERE id = $1 AND business_id = $2',
          [promotionId, business.id],
        );
      }

      for (const line of lines) {
        await c.query(
          `INSERT INTO order_items (order_id, business_id, product_id, name, unit_price, quantity, line_total, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            order.rows[0].id,
            business.id,
            line.product_id,
            line.name,
            line.unit_price,
            line.quantity,
            line.line_total,
            line.notes,
          ],
        );
      }

      await c.query(
        `INSERT INTO order_status_history (business_id, order_id, from_status, to_status, changed_by_name)
         VALUES ($1,$2,NULL,'pending','Customer')`,
        [business.id, order.rows[0].id],
      );

      await c.query(
        `INSERT INTO notifications (business_id, type, title, body, order_id)
         VALUES ($1,'new_order',$2,$3,$4)`,
        [
          business.id,
          `#${orderNumber}`,
          table?.name || req.body?.customer_name || '—',
          order.rows[0].id,
        ],
      );

      return { order: order.rows[0], tableName: table?.name || null };
    });

    // Web push is only ever triggered for a brand-new order.
    let push = { total: 0, sent: 0, failed: 0, pruned: 0 };
    try {
      push = await pushNewOrder(business.id, {
        id: result.order.id,
        order_number: result.order.order_number,
        table_name: result.tableName,
      });
    } catch (err) {
      console.warn('[public] push delivery failed:', err?.message || err);
      push = { total: 0, sent: 0, failed: 0, pruned: 0, error: true };
    }

    res.status(201).json({
      order: {
        id: result.order.id,
        order_number: result.order.order_number,
        status: result.order.status,
        total: result.order.total,
        subtotal: result.order.subtotal,
        created_at: result.order.created_at,
      },
      table: result.tableName,
      push,
    });
  }),
);

/** Status lookup for the customer, keyed by order number + business. */
router.get(
  '/orders/:key/:number',
  ah(async (req, res) => {
    const business = await loadBusiness(req.params.key);
    const { rows } = await q(
      `SELECT o.id, o.order_number, o.status, o.total, o.created_at, t.name AS table_name
         FROM orders o LEFT JOIN tables t ON t.id = o.table_id
        WHERE o.business_id = $1 AND o.order_number = $2`,
      [business.id, Number(req.params.number)],
    );
    if (!rows[0]) throw notFound('ORDER_NOT_FOUND');
    const items = await q(
      'SELECT name, quantity, unit_price, line_total FROM order_items WHERE order_id = $1 ORDER BY id',
      [rows[0].id],
    );
    res.json({ order: rows[0], items: items.rows });
  }),
);

export default router;
