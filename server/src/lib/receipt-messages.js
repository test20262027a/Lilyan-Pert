/*
 * Receipt message overrides, validated on the way in.
 *
 * The client edits one message at a time, but the business row stores a single
 * JSONB object. This module keeps that object honest: only the fourteen known
 * message ids survive, only the four supported locales are written, values
 * stay strings within the editor's limit, and an all-empty message is dropped
 * so it falls back to the printed default instead of printing nothing.
 */

export const RECEIPT_MESSAGE_KEYS = [
  'order_no',
  'table',
  'datetime',
  'customer',
  'cashier',
  'items',
  'total_column',
  'subtotal',
  'discount',
  'tax',
  'service_charge',
  'total',
  'notes',
  'footer',
];

export const MESSAGE_LOCALES = ['ku', 'fa', 'ar', 'en'];

const MAX_LENGTH = 1000;

/** Returns the normalized `receipt_messages` map for one business. */
export function normalizeReceiptMessages(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const key of RECEIPT_MESSAGE_KEYS) {
    const value = input[key];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const locales = {};
    for (const code of MESSAGE_LOCALES) {
      const raw = value[code];
      locales[code] = raw === undefined || raw === null ? '' : String(raw).slice(0, MAX_LENGTH);
    }
    if (MESSAGE_LOCALES.some((code) => locales[code].trim())) out[key] = locales;
  }
  return out;
}
