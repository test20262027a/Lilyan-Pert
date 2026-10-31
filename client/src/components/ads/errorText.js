/*
 * Maps a backend error code from the advertisement routes to a localized
 * sentence, so the form never shows a raw internal key.
 */
const KEYS = {
  AD_TITLE_REQUIRED: 'error_ad_title_required',
  INVALID_URL: 'error_invalid_url',
  INVALID_DATE: 'error_invalid_date',
  INVALID_DATE_RANGE: 'error_invalid_date_range',
  INVALID_IMAGE: 'error_invalid_image',
  IMAGE_TOO_LARGE: 'error_image_too_large',
  INVALID_PRIORITY: 'error_invalid_priority',
  INVALID_PRODUCT: 'error_invalid_product',
  INVALID_CATEGORY: 'error_invalid_category',
  AD_NOT_FOUND: 'error_not_found',
  FORBIDDEN: 'user_view_only',
};

export function adErrorText(code, t) {
  if (!code) return '';
  return t(KEYS[code] || 'state_error');
}
