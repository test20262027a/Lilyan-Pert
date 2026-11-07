/*
 * Maps a backend error code from the tables routes to a localized sentence, so
 * the forms and the delete dialog never show a raw internal key.
 */
const KEYS = {
  NAME_REQUIRED: 'table_name_required',
  TABLE_DUPLICATE: 'table_duplicate',
  TABLE_NUMBER_REQUIRED: 'table_number_required',
  TABLE_NUMBER_INVALID: 'table_number_invalid',
  TABLE_NUMBER_DUPLICATE: 'table_number_duplicate',
  DISPLAY_ORDER_INVALID: 'table_display_order_invalid',
  TABLE_HAS_ACTIVE_ORDERS: 'table_has_active_orders',
  FORBIDDEN: 'user_view_only',
  SEATS_INVALID: 'table_seats_invalid',
};

export function tablesErrorText(code, t) {
  if (!code) return '';
  return t(KEYS[code] || 'state_error');
}
