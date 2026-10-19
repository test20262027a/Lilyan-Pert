/*
 * Maps a backend error code from the promotions routes to a localized sentence,
 * so the form and the page never show a raw internal key.
 */
const KEYS = {
  INVALID_DISCOUNT: 'error_invalid_discount',
  INVALID_MAX_USES: 'error_invalid_max_uses',
  INVALID_PRODUCT: 'error_invalid_product',
  PROMOTION_NOT_FOUND: 'error_not_found',
  FORBIDDEN: 'user_view_only',
};

export function promotionsErrorText(code, t) {
  if (!code) return '';
  return t(KEYS[code] || 'state_error');
}
