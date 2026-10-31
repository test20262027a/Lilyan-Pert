import express from 'express';
import { q, tx } from '../db.js';
import { ah, bad, isUuid, notFound } from '../lib/http.js';
import { pushNewOrder } from '../lib/push.js';
import { menuContext, normalizeMenuSettings } from '../lib/menu-settings.js';
import { openStatus, zonedNow } from '../lib/hours.js';
import { promoUnitPrice, quoteOrder } from '../lib/order-quote.js';
import {
  LANGUAGE_CODES,
  currencyForLanguage,
  languagePrice,
  localizedName,
  normalizeLanguageSettings,
  resolveLanguage,
} from '../lib/languages.js';

const router = express.Router();

/*
 * Which ordering context a request belongs to.
 *
 * An explicit `main`/`qr` wins — the in-store menu and the customer menu both
 * report the context they were served in. Without one, a request that carries a
 * scanned table token is a QR order, and anything else is the main ordering
 * menu, which needs no QR code and lets the guest choose a table by hand. It
 * only decides which of the owner's two policies applies; a table is still
 * validated against the business before it is attached to an order.
 */
function menuContextFor(explicit, tableToken) {
  if (explicit === 'main' || explicit === 'qr') return explicit;
  return tableToken ? 'qr' : 'main';
}

function activePromotionFor(promotions, productId) {
  return promotions.find((p) => p.product_id === productId) || null;
}

/*
 * Product, cover and banner pictures are uploaded through the admin API, so
 * they are stored as `/api/manage/media/<id>` — a URL only a signed-in member
 * may read (a guest gets 401, which is why those pictures showed as broken in
 * the public menu). The public payload rewrites the same reference to the
 * public media route below, so a guest sees the very same stored file without
 * gaining access to any other upload.
 */
function publicMediaUrl(url) {
  if (typeof url !== 'string') return url;
  const match = /^\/api\/manage\/media\/([0-9a-fA-F-]{36})$/.exec(url);
  return match ? `/api/public/media/${match[1]}` : url;
}

async function loadBusiness(key) {
  const col = isUuid(key) ? 'id' : 'slug';
  const { rows } = await q(`SELECT * FROM businesses WHERE ${col} = $1`, [key]);
  if (!rows[0]) throw notFound('BUSINESS_NOT_FOUND');
  return rows[0];
}

/** Brand shown on the sign-in pages: the first business's name and logo only. */
router.get(
  '/brand',
  ah(async (_req, res) => {
    const { rows } = await q(
      `SELECT name, name_ku, name_fa, name_ar, name_en, logo_url, theme, menu_settings
         FROM businesses ORDER BY is_sample DESC, created_at LIMIT 1`,
    );
    const b = rows[0];
    res.json({
      name: b?.name || 'Lilyan Pert',
      // The localized names, so the sign-in tab can name the business in the
      // language the visitor is reading.
      name_ku: b?.name_ku || null,
      name_fa: b?.name_fa || null,
      name_ar: b?.name_ar || null,
      name_en: b?.name_en || null,
      logo_url: b ? publicMediaUrl(b.logo_url) : null,
      // The sign-in pages paint themselves in the business's own appearance.
      theme: b?.theme || null,
    });
  }),
);

/**
 * Public menu payload. Only customer-safe fields leave the server: no member
 * emails, no user ids, no internal settings.
 */
router.get(
  '/menu/:key',
  ah(async (req, res) => {
    const business = await loadBusiness(req.params.key);

    /*
     * The same payload serves both menu contexts. The ordering context is
     * explicit: the in-store menu asks for `context=main`, and a customer menu
     * is the `qr` context only when it was opened from a table's QR link (the
     * `table` token is that link's identifier). A menu opened normally carries
     * no token, so it is the main ordering menu — it offers a manual table
     * choice instead of demanding a QR scan.
     */
    const settings = normalizeMenuSettings(business.menu_settings);
    const menu = menuContext(settings, menuContextFor(req.query.context, req.query.table));

    /*
     * Table identification follows the configured mode:
     *   manual      — the scanned token is ignored; the guest picks a table.
     *   qr          — only a valid scanned token associates a table.
     *   qr_fallback — the token is tried first, the guest may pick a table.
     * A token that no longer exists (or belongs to another business, or a
     * disabled table) is never accepted; the menu says so instead of guessing.
     */
    let table = null;
    let tableState = menu.context === 'qr' ? 'missing' : 'none';
    const token = req.query.table ? String(req.query.table).slice(0, 64) : '';
    if (menu.context === 'qr' && menu.table_mode !== 'manual' && token) {
      const t = await q(
        'SELECT id, name, zone, seats, qr_token FROM tables WHERE qr_token = $1 AND business_id = $2 AND active = true',
        [token, business.id],
      );
      table = t.rows[0] || null;
      tableState = table ? 'resolved' : 'invalid';
    }

    /*
     * The main ordering menu always lets the guest pick a table inside the
     * order form; the QR menu only offers the list when its configured mode
     * allows a manual choice. Only active tables are ever listed, with the
     * localized names and printed number the form shows.
     */
    let tables = [];
    if (menu.context === 'main' || menu.table_mode !== 'qr') {
      const rows = await q(
        `SELECT id, name, table_number, zone, name_ku, name_fa, name_ar, name_en
           FROM tables WHERE business_id = $1 AND active = true
          ORDER BY display_order, name`,
        [business.id],
      );
      tables = rows.rows;
    }

    const [cats, prods, promos, ads, reviews] = await Promise.all([
      q(
        `SELECT id, icon, icon_color, sort_order, name_ku, name_fa, name_ar, name_en
           FROM categories WHERE business_id = $1 AND active = true
          ORDER BY sort_order, created_at`,
        [business.id],
      ),
      q(
        `SELECT p.id, p.category_id, p.price, p.price_ar, p.price_fa, p.price_en, p.price_fa_review,
                p.image_url, p.name_ku, p.name_fa, p.name_ar, p.name_en,
                p.description_ku, p.description_fa, p.description_ar, p.description_en, p.sort_order
           FROM products p JOIN categories c ON c.id = p.category_id
          WHERE p.business_id = $1 AND p.active = true AND p.available = true AND c.active = true
          ORDER BY p.sort_order, p.created_at`,
        [business.id],
      ),
      q(
        `SELECT id, product_id, discount_type, discount_value, currency_amounts,
                title_ku, title_fa, title_ar, title_en
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

    /*
     * Every product arrives with one price per language — its own, independently
     * entered amount in that language's currency — plus the product offer applied
     * in that currency. The menu never converts anything: a language without a
     * valid price simply says so (`valid: false`), and the card renders the
     * existing unavailable state for that language only.
     */
    const languageSettings = normalizeLanguageSettings(business.menu_settings?.language_settings);
    const businessCurrency = business.currency || 'IQD';
    const products = prods.rows.map((p) => {
      const promotion = activePromotionFor(promos.rows, p.id);
      const prices = {};
      for (const code of LANGUAGE_CODES) {
        const price = languagePrice(p, code, businessCurrency);
        const currency = currencyForLanguage(code, businessCurrency);
        prices[code] = {
          amount: promotion && price.valid
            ? promoUnitPrice(p, promotion, price.amount, currency, businessCurrency)
            : price.amount,
          base: price.amount,
          currency,
          valid: price.valid,
          review: price.review,
        };
      }
      return {
        ...p,
        image_url: publicMediaUrl(p.image_url),
        prices,
        promotion_id: promotion?.id || null,
        has_promotion: Boolean(promotion),
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

    /*
     * Best-selling recommendations. Ranked from this business's own order
     * history — never invented — and limited to products that are still active
     * and available inside an active category. Only the business's configured
     * number of products is returned.
     */
    const bestSettings = business.menu_settings?.best_selling || {};
    const bestCount = Math.min(20, Math.max(1, Math.floor(Number(bestSettings.count) || 6)));
    let bestSelling = [];
    if (bestSettings.enabled === true && menu.features.best_selling) {
      const best = await q(
        `SELECT p.id, sum(i.quantity)::int AS units
           FROM order_items i
           JOIN orders o ON o.id = i.order_id
           JOIN products p ON p.id = i.product_id
           JOIN categories c ON c.id = p.category_id
          WHERE i.business_id = $1 AND o.status <> 'cancelled'
            AND p.active = true AND p.available = true AND c.active = true
          GROUP BY p.id
          ORDER BY units DESC, p.id
          LIMIT $2`,
        [business.id, bestCount],
      );
      bestSelling = best.rows;
    }

    /*
     * The featured strip uses the business's own "special" flag — no invented
     * products, and only rows that are still sellable right now.
     */
    let featuredIds = [];
    if (menu.features.featured) {
      const featured = await q(
        `SELECT p.id
           FROM products p JOIN categories c ON c.id = p.category_id
          WHERE p.business_id = $1 AND p.featured = true
            AND p.active = true AND p.available = true AND c.active = true
          ORDER BY p.sort_order, p.created_at
          LIMIT 12`,
        [business.id],
      );
      featuredIds = featured.rows.map((row) => row.id);
    }

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
        logo_url: publicMediaUrl(business.logo_url),
        cover_url: publicMediaUrl(business.cover_url),
        phone: business.phone,
        email: business.email,
        website: business.website,
        address: business.address,
        addresses: business.addresses,
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
      menu,
      // Which languages the owner allows, and the one to fall back to.
      language_settings: languageSettings,
      table,
      table_state: tableState,
      /*
       * Today on the business's own clock, so the menu can show the working
       * hours card and its open/closed state without guessing a timezone.
       */
      hours: (() => {
        const now = zonedNow(business.timezone);
        return {
          ...openStatus(business.working_hours, business.timezone),
          now,
          today: now ? business.working_hours?.[now.dayKey] || null : null,
        };
      })(),
      tables,
      categories: cats.rows,
      products,
      /* The advertisement module is untouched; its banners are simply withheld
         from a context where the owner turned them off. */
      advertisements: menu.features.ads
        ? ads.rows.map((a) => ({ ...a, image_url: publicMediaUrl(a.image_url) }))
        : [],
      reviews: reviews.rows,
      best_selling: bestSelling,
      featured_ids: featuredIds,
    });
  }),
);

/**
 * Language availability only.
 *
 * The smallest payload that keeps an already-open ordering panel in sync: when
 * the owner switches a language off in Menu Settings, the panel re-reads this
 * and stops offering it, falling back to the configured default language — no
 * page refresh, and nothing else in the menu payload is re-sent. It reads the
 * very same record and normalizer as the full menu, so both can never disagree.
 */
router.get(
  '/menu/:key/languages',
  ah(async (req, res) => {
    const business = await loadBusiness(req.params.key);
    res.set('Cache-Control', 'no-store');
    res.json({
      language_settings: normalizeLanguageSettings(business.menu_settings?.language_settings),
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
    /*
     * One review notification per submitted review — the row id above is the
     * deduplication key, so a retried request creates its own review and its
     * own notification rather than a duplicate of an existing one. Best-effort:
     * a feed failure never fails the guest's review.
     */
    try {
      await q(
        `INSERT INTO notifications (business_id, type, title, body)
         VALUES ($1,'review',$2,$3)`,
        [
          business.id,
          name || '',
          `★ ${rating}/5${comment ? ` — ${comment.slice(0, 140)}` : ''}`,
        ],
      );
    } catch (err) {
      console.warn('[notifications] review feed:', err?.message || err);
    }
    res.status(201).json({ review: rows[0], moderated: true });
  }),
);

/**
 * Live checkout quote for the customer cart.
 *
 * The cart shows the guest exactly what the order endpoint will save: the same
 * pricing engine recalculates the lines, a submitted promotion code, the tax and
 * the service charge from stored data. Nothing is written and no redemption
 * counter moves, so applying a code is a preview until the order is placed.
 */
router.post(
  '/quote/:key',
  ah(async (req, res) => {
    const business = await loadBusiness(req.params.key);
    if (business.menu_settings?.show_customer_menu === false) throw bad('MENU_DISABLED');
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) throw bad('EMPTY_ORDER');
    if (items.length > 60) throw bad('TOO_MANY_ITEMS');

    const quote = await quoteOrder(
      (sql, params) => q(sql, params),
      business,
      items,
      req.body?.promotion_code,
      req.body?.language,
    );
    res.json({
      language: quote.language,
      currency: quote.currency,
      subtotal: quote.subtotal,
      discount: quote.discount,
      tax: quote.tax,
      service: quote.service,
      total: quote.total,
      tax_rate: quote.taxRate,
      service_rate: quote.serviceRate,
      promotion_code: quote.codePromotion?.code || null,
      lines: quote.lines.map((line) => ({
        product_id: line.product_id,
        unit_price: line.unit_price,
        quantity: line.quantity,
        line_total: line.line_total,
      })),
    });
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

    /*
     * The ordering policy is enforced here, not only in the menu UI: a guest
     * whose context has the cart, checkout or ordering switched off cannot post
     * an order by calling this endpoint directly.
     */
    const settings = normalizeMenuSettings(business.menu_settings);
    // The order is judged by the same context the menu was served in: an order
    // carrying a scanned table token is a QR order, everything else is the main
    // ordering menu.
    const menu = menuContext(settings, menuContextFor(req.body?.context, req.body?.table_token));
    if (!menu.can_order) throw bad('ORDERING_DISABLED');

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) throw bad('EMPTY_ORDER');
    if (items.length > 60) throw bad('TOO_MANY_ITEMS');

    const result = await tx(async (c) => {
      /*
       * Table resolution follows the configured identification mode. A token is
       * only ever accepted when it belongs to this business and its table is
       * still active; a manual id is validated the same way, so neither a forged
       * token nor another tenant's table can be attached to an order.
       */
      let table = null;
      // How the table was identified — kept on the order for the admin panel.
      let tableSource = null;
      const mode = menu.table_mode;
      if (req.body?.table_token && mode !== 'manual') {
        const t = await c.query(
          'SELECT id, name FROM tables WHERE qr_token = $1 AND business_id = $2 AND active = true',
          [String(req.body.table_token).slice(0, 64), business.id],
        );
        table = t.rows[0] || null;
        if (!table) throw bad('INVALID_TABLE');
        tableSource = 'qr';
      }
      // The main ordering menu has no QR code to identify the table, so its
      // manual choice is accepted regardless of the QR identification mode —
      // exactly like the table list the menu was served with.
      if (!table && req.body?.table_id && (menu.context === 'main' || mode !== 'qr')) {
        if (!isUuid(String(req.body.table_id))) throw bad('INVALID_TABLE');
        const t = await c.query(
          'SELECT id, name FROM tables WHERE id = $1 AND business_id = $2 AND active = true',
          [req.body.table_id, business.id],
        );
        table = t.rows[0] || null;
        if (!table) throw bad('INVALID_TABLE');
        tableSource = 'manual';
      }

      /*
       * Everything money-related is derived by the shared pricing engine, which
       * the customer cart also uses for its live totals — so the saved order and
       * the amounts the guest read are the same computation.
       */
      const quote = await quoteOrder(
        (sql, params) => c.query(sql, params),
        business,
        items,
        req.body?.promotion_code,
        req.body?.language,
      );
      const { lines, subtotal, discount, tax, service, total, codePromotion, appliedPromotionIds } = quote;
      // The order freezes both the language it was placed in and the currency
      // its amounts are expressed in (TOMAN for Persian — never Rial).
      const { language, currency } = quote;
      const appliedPromotions = new Set(appliedPromotionIds);

      const seq = await c.query(
        'UPDATE businesses SET order_seq = order_seq + 1 WHERE id = $1 RETURNING order_seq',
        [business.id],
      );
      const orderNumber = seq.rows[0].order_seq;

      const order = await c.query(
        `INSERT INTO orders (business_id, table_id, table_name, table_source, order_number, status, channel,
                             customer_name, customer_phone, notes, subtotal, discount, tax, service_charge, total,
                             promotion_id, promotion_code, language, currency, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'pending','customer',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now(),now())
         RETURNING *`,
        [
          business.id,
          table?.id || null,
          table?.name || null,
          tableSource,
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
          language,
          currency,
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
        // The language and currency the order was really saved in, so the
        // confirmation reads the same unit as the cart did.
        language: result.order.language,
        currency: result.order.currency,
        created_at: result.order.created_at,
      },
      table: result.tableName,
      push,
    });
  }),
);

/*
 * A picture a guest is allowed to see: only an upload that is already attached
 * to something this public menu shows — a product, a published advertisement,
 * or the business's own logo / cover. The list of uploads is never exposed, and
 * an unrelated id answers exactly like a missing one.
 */
router.get(
  '/media/:id',
  ah(async (req, res) => {
    if (!isUuid(req.params.id)) throw notFound('MEDIA_NOT_FOUND');
    const { rows } = await q(
      `SELECT m.mime, m.data FROM media m
        WHERE m.id = $1
          AND (
            EXISTS (SELECT 1 FROM products p
                     WHERE p.business_id = m.business_id AND p.image_url = $2)
            OR EXISTS (SELECT 1 FROM advertisements a
                        WHERE a.business_id = m.business_id AND a.image_url = $2)
            OR EXISTS (SELECT 1 FROM businesses b
                        WHERE b.id = m.business_id AND (b.logo_url = $2 OR b.cover_url = $2))
          )`,
      [req.params.id, `/api/manage/media/${req.params.id}`],
    );
    if (!rows[0]) throw notFound('MEDIA_NOT_FOUND');
    res.set('Content-Type', rows[0].mime);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(rows[0].data, 'base64'));
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
