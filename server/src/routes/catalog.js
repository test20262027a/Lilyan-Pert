import express from 'express';
import { q } from '../db.js';
import { requireAuth, withBusiness } from '../auth.js';
import { ah, bad, isUuid, notFound, num } from '../lib/http.js';

const router = express.Router();
router.use(requireAuth);

const catName = (n) => (n === null || n === undefined || n === '' ? null : String(n).slice(0, 300));
const desc = (n) => (n === null || n === undefined || n === '' ? null : String(n).slice(0, 1000));

async function loadCategory(businessId, id) {
  const { rows } = await q('SELECT * FROM categories WHERE id=$1 AND business_id=$2', [id, businessId]);
  if (!rows[0]) throw notFound('CATEGORY_NOT_FOUND');
  return rows[0];
}

async function loadProduct(businessId, id) {
  const { rows } = await q('SELECT * FROM products WHERE id=$1 AND business_id=$2', [id, businessId]);
  if (!rows[0]) throw notFound('PRODUCT_NOT_FOUND');
  return rows[0];
}

/* ------------------------------------------------------------- categories */

/** Category list with both stored and effective product counts. */
router.get(
  '/categories',
  withBusiness('staff'),
  ah(async (req, res) => {
    const { rows } = await q(
      `SELECT c.*,
              (SELECT count(*)::int FROM products p WHERE p.category_id = c.id) AS product_count,
              (SELECT count(*)::int FROM products p
                WHERE p.category_id = c.id AND p.active AND p.available) AS product_active_count
         FROM categories c
        WHERE c.business_id = $1
        ORDER BY c.sort_order, c.created_at`,
      [req.businessId],
    );
    res.json({ categories: rows });
  }),
);

router.post(
  '/categories',
  withBusiness('manager'),
  ah(async (req, res) => {
    const b = req.body || {};
    const nameEn = catName(b.name_en);
    if (!nameEn && !b.name_ku && !b.name_fa && !b.name_ar) throw bad('NAME_REQUIRED');
    // New categories default to Active.
    const { rows } = await q(
      `INSERT INTO categories (business_id, icon, sort_order, active, name_ku, name_fa, name_ar, name_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.businessId,
        b.icon ? String(b.icon).slice(0, 60) : 'utensils',
        num(b.sort_order, 0),
        b.active === undefined ? true : Boolean(b.active),
        catName(b.name_ku),
        catName(b.name_fa),
        catName(b.name_ar),
        nameEn,
      ],
    );
    res.status(201).json({ category: rows[0] });
  }),
);

router.put(
  '/categories/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    await loadCategory(req.businessId, req.params.id);
    const b = req.body || {};
    const { rows } = await q(
      `UPDATE categories
          SET icon = COALESCE($3, icon),
              sort_order = COALESCE($4, sort_order),
              active = COALESCE($5, active),
              name_ku = COALESCE($6, name_ku),
              name_fa = COALESCE($7, name_fa),
              name_ar = COALESCE($8, name_ar),
              name_en = COALESCE($9, name_en),
              updated_at = now()
        WHERE id = $1 AND business_id = $2
        RETURNING *`,
      [
        req.params.id,
        req.businessId,
        b.icon ? String(b.icon).slice(0, 60) : null,
        b.sort_order === undefined ? null : num(b.sort_order, 0),
        b.active === undefined ? null : Boolean(b.active),
        catName(b.name_ku),
        catName(b.name_fa),
        catName(b.name_ar),
        catName(b.name_en),
      ],
    );
    // Note: products keep their own stored active flag — nothing is cascaded here.
    res.json({ category: rows[0] });
  }),
);

router.delete(
  '/categories/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    await loadCategory(req.businessId, req.params.id);
    const used = await q('SELECT count(*)::int c FROM products WHERE category_id = $1', [req.params.id]);
    if (used.rows[0].c > 0) {
      throw bad('CATEGORY_HAS_PRODUCTS', String(used.rows[0].c));
    }
    await q('DELETE FROM categories WHERE id=$1 AND business_id=$2', [req.params.id, req.businessId]);
    res.json({ ok: true });
  }),
);

/* --------------------------------------------------------------- products */

router.get(
  '/products',
  withBusiness('staff'),
  ah(async (req, res) => {
    const params = [req.businessId];
    let where = 'p.business_id = $1';
    if (req.query.category_id && isUuid(req.query.category_id)) {
      params.push(req.query.category_id);
      where += ` AND p.category_id = $${params.length}`;
    }
    if (req.query.search) {
      params.push(`%${String(req.query.search).slice(0, 80)}%`);
      where += ` AND (p.name_en ILIKE $${params.length} OR p.name_ku ILIKE $${params.length}
                      OR p.name_fa ILIKE $${params.length} OR p.name_ar ILIKE $${params.length})`;
    }
    const { rows } = await q(
      `SELECT p.*, c.name_en AS category_name_en, c.name_ku AS category_name_ku,
              c.name_fa AS category_name_fa, c.name_ar AS category_name_ar, c.active AS category_active
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where}
        ORDER BY p.sort_order, p.created_at`,
      params,
    );
    res.json({ products: rows });
  }),
);

router.post(
  '/products',
  withBusiness('manager'),
  ah(async (req, res) => {
    const b = req.body || {};
    if (!b.name_en && !b.name_ku && !b.name_fa && !b.name_ar) throw bad('NAME_REQUIRED');
    const price = num(b.price, NaN);
    if (!Number.isFinite(price) || price < 0) throw bad('INVALID_PRICE');
    if (b.category_id) {
      await loadCategory(req.businessId, b.category_id);
    }
    const { rows } = await q(
      `INSERT INTO products (business_id, category_id, price, image_url, active, available, sort_order,
                             name_ku, name_fa, name_ar, name_en,
                             description_ku, description_fa, description_ar, description_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        req.businessId,
        b.category_id || null,
        price,
        b.image_url ? String(b.image_url).slice(0, 2000) : null,
        b.active === undefined ? true : Boolean(b.active),
        b.available === undefined ? true : Boolean(b.available),
        num(b.sort_order, 0),
        catName(b.name_ku),
        catName(b.name_fa),
        catName(b.name_ar),
        catName(b.name_en),
        desc(b.description_ku),
        desc(b.description_fa),
        desc(b.description_ar),
        desc(b.description_en),
      ],
    );
    res.status(201).json({ product: rows[0] });
  }),
);

router.put(
  '/products/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    await loadProduct(req.businessId, req.params.id);
    const b = req.body || {};
    if (b.category_id) await loadCategory(req.businessId, b.category_id);
    if (b.price !== undefined) {
      const price = num(b.price, NaN);
      if (!Number.isFinite(price) || price < 0) throw bad('INVALID_PRICE');
    }
    const { rows } = await q(
      `UPDATE products
          SET category_id = COALESCE($3, category_id),
              price = COALESCE($4, price),
              image_url = $5,
              active = COALESCE($6, active),
              available = COALESCE($7, available),
              sort_order = COALESCE($8, sort_order),
              name_ku = COALESCE($9, name_ku),
              name_fa = COALESCE($10, name_fa),
              name_ar = COALESCE($11, name_ar),
              name_en = COALESCE($12, name_en),
              description_ku = COALESCE($13, description_ku),
              description_fa = COALESCE($14, description_fa),
              description_ar = COALESCE($15, description_ar),
              description_en = COALESCE($16, description_en),
              updated_at = now()
        WHERE id = $1 AND business_id = $2
        RETURNING *`,
      [
        req.params.id,
        req.businessId,
        b.category_id || null,
        b.price === undefined ? null : num(b.price, 0),
        b.image_url === undefined ? null : b.image_url ? String(b.image_url).slice(0, 2000) : null,
        b.active === undefined ? null : Boolean(b.active),
        b.available === undefined ? null : Boolean(b.available),
        b.sort_order === undefined ? null : num(b.sort_order, 0),
        catName(b.name_ku),
        catName(b.name_fa),
        catName(b.name_ar),
        catName(b.name_en),
        desc(b.description_ku),
        desc(b.description_fa),
        desc(b.description_ar),
        desc(b.description_en),
      ],
    );
    res.json({ product: rows[0] });
  }),
);

router.delete(
  '/products/:id',
  withBusiness('manager'),
  ah(async (req, res) => {
    await loadProduct(req.businessId, req.params.id);
    await q('DELETE FROM products WHERE id=$1 AND business_id=$2', [req.params.id, req.businessId]);
    res.json({ ok: true });
  }),
);

/**
 * Menu statistics. A product's *effective* visibility combines its own stored
 * state with its category's state, without ever rewriting the product row.
 */
router.get(
  '/stats',
  withBusiness('staff'),
  ah(async (req, res) => {
    const b = req.businessId;
    const [cats, prods] = await Promise.all([
      q(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE active)::int AS active,
                count(*) FILTER (WHERE NOT active)::int AS inactive
           FROM categories WHERE business_id = $1`,
        [b],
      ),
      q(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE p.active AND p.available)::int AS active,
                count(*) FILTER (WHERE NOT (p.active AND p.available))::int AS inactive,
                count(*) FILTER (WHERE p.active AND c.active IS NOT TRUE)::int AS hidden_by_category
           FROM products p LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.business_id = $1`,
        [b],
      ),
    ]);
    res.json({ categories: cats.rows[0], products: prods.rows[0] });
  }),
);

/** Combined category+product search used by the menu management screen. */
router.get(
  '/search',
  withBusiness('staff'),
  ah(async (req, res) => {
    const term = String(req.query.q || '').trim();
    if (!term) return res.json({ categories: [], products: [] });
    const like = `%${term.slice(0, 80)}%`;
    const [cats, prods] = await Promise.all([
      q(
        `SELECT id, name_en, name_ku, name_fa, name_ar, icon, active FROM categories
          WHERE business_id = $1 AND (name_en ILIKE $2 OR name_ku ILIKE $2 OR name_fa ILIKE $2 OR name_ar ILIKE $2)
          ORDER BY sort_order LIMIT 30`,
        [req.businessId, like],
      ),
      q(
        `SELECT p.id, p.name_en, p.name_ku, p.name_fa, p.name_ar, p.price, p.active, p.available,
                p.category_id, c.name_en AS category_name_en
           FROM products p LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.business_id = $1 AND (p.name_en ILIKE $2 OR p.name_ku ILIKE $2 OR p.name_fa ILIKE $2 OR p.name_ar ILIKE $2)
          ORDER BY p.sort_order LIMIT 60`,
        [req.businessId, term],
      ),
    ]);
    res.json({ categories: cats.rows, products: prods.rows });
  }),
);

export default router;
