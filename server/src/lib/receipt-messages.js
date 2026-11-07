/*
 * Receipt message overrides, validated on the way in.
 *
 * The client edits one message at a time, but the business row stores a single
 * JSONB object. This module keeps that object honest: only the fifteen known
 * message ids survive, only the four supported locales are written, values
 * stay strings within the editor's limit, and an all-empty message is dropped
 * so it falls back to the printed default instead of printing nothing.
 */

/* The fifteen closing messages a receipt picks one of. The layout labels
   (order number, table, totals …) are fixed text and are not stored here. */
export const RECEIPT_MESSAGE_KEYS = [
  'footer_1',
  'footer_2',
  'footer_3',
  'footer_4',
  'footer_5',
  'footer_6',
  'footer_7',
  'footer_8',
  'footer_9',
  'footer_10',
  'footer_11',
  'footer_12',
  'footer_13',
  'footer_14',
  'footer_15',
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
