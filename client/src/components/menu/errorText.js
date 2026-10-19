/*
 * Maps a backend error code from the catalog routes to a localized sentence, so
 * forms and dialogs never show a raw internal key.
 */
const KEYS = {
  NAME_REQUIRED: 'menu_name_required',
  INVALID_PRICE: 'menu_price_invalid',
  CATEGORY_NOT_FOUND: 'menu_category_required',
  PRODUCT_NOT_FOUND: 'error_generic',
  CATEGORY_HAS_PRODUCTS: 'menu_category_has_products',
};

export function catalogErrorText(code, t) {
  if (!code) return '';
  return t(KEYS[code] || 'state_error');
}
