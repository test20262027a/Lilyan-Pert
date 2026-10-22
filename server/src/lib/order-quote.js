import { bad, isUuid } from './http.js';

/*
 * The one pricing engine for the public ordering menu.
 *
 * The menu advertises a product's promotional unit price from the same helpers,
 * the cart's live totals come from `quoteOrder`, and the order endpoint saves
 * exactly what `quoteOrder` returned — so a guest can never read one amount in
 * the cart and be charged another, and nothing money-related is ever taken from
 * the request body.
 */

const round2 = (n) => Math.round(n * 100) / 100;

/** The unit price a product really sells for, with its own promotion applied. */
export function promoUnitPrice(product, promotion) {
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
export function promotionBaseAmount(promotion, lines, subtotal) {
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

/**
 * Prices a cart against the stored products, their promotions, the submitted
 * code (when there is one) and the business's tax / service rates.
 *
 * Throws the same codes the order endpoint throws, so the cart can explain an
 * unavailable product or a rejected code in the guest's own language.
 * Read-only: no counter moves and nothing is written.
 */
export async function quoteOrder(query, business, items, submittedCode) {
  const ids = [...new Set(items.map((i) => String(i.product_id)))].filter(isUuid);
  if (!ids.length) throw bad('INVALID_ITEMS');

  const found = await query(
    `SELECT p.id, p.price, p.category_id, p.name_en, p.name_ku, p.name_fa, p.name_ar,
            p.active, p.available, c.active AS category_active
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.business_id = $1 AND p.id = ANY($2::uuid[])`,
    [business.id, ids],
  );
  const byId = new Map(found.rows.map((r) => [r.id, r]));

  const promos = await query(
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
   * A promotion code is validated here, on the authoritative side, against the
   * stored promotion: active flag, validity window, redemption cap, minimum
   * order and target — then the discount is recalculated from the stored lines.
   * The client cannot influence the amount it gets back.
   */
  let codePromotion = null;
  let discount = 0;
  const code = String(submittedCode || '').trim().slice(0, 40);
  if (code) {
    const foundCode = await query(
      'SELECT * FROM promotions WHERE business_id = $1 AND upper(code) = upper($2)',
      [business.id, code],
    );
    const promotion = foundCode.rows[0];
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

  return {
    lines,
    subtotal,
    discount,
    tax,
    service,
    total,
    taxRate,
    serviceRate,
    codePromotion,
    // The promotions the order actually redeemed (product offers + the code).
    appliedPromotionIds: [...appliedPromotions],
  };
}
