/*
 * Maps a backend error code from the promotions routes to a localized sentence,
 * so the form and the page never show a raw internal key.
 */
const KEYS = {
  INVALID_DISCOUNT: 'error_invalid_discount',
  INVALID_MAX_USES: 'error_invalid_max_uses',
  INVALID_PRODUCT: 'error_invalid_product',
  INVALID_CATEGORY: 'error_invalid_category',
  DUPLICATE_CODE: 'error_duplicate_code',
  CODE_REQUIRED: 'error_code_required',
  INVALID_CODE: 'error_invalid_code',
  INVALID_DATE: 'error_invalid_date',
  INVALID_DATE_RANGE: 'error_invalid_date_range',
  INVALID_MIN_ORDER: 'error_invalid_min_order',
  PROMOTION_NOT_FOUND: 'error_not_found',
  FORBIDDEN: 'user_view_only',
};

export function promotionsErrorText(code, t) {
  if (!code) return '';
  return t(KEYS[code] || 'state_error');
}
