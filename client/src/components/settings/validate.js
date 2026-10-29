/*
 * Validation for the shared settings draft.
 *
 * One rule set serves every tab, so the single header Save can report the first
 * real problem and send the user to the tab that owns the field. Nothing here
 * rewrites a value — the checks only decide whether saving may continue.
 */

import { getDefaultEnabledLanguage } from '../../languages';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/* Digits plus the separators real phone numbers use; leading zeros are kept. */
const PHONE = /^[+()\d\s.-]{6,}$/;
const URL = /^https?:\/\/[^\s.]+\.[^\s]+$/i;

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function validateDraft(draft, t) {
  const fail = (tab, message) => ({ tab, message });

  // ---- Business information -------------------------------------------------
  // The name is required in the business's own default language, so an owner who
  // switched a language off is never asked for a field they cannot see.
  const primaryCode = getDefaultEnabledLanguage();
  const primaryName = String(draft[`name_${primaryCode}`] || draft.name_en || draft.name || '').trim();
  if (!primaryName) {
    return fail(
      'business',
      `${t('settings_required')}: ${t('settings_business_card')} (${t(`menu_lang_name_${primaryCode}`)})`,
    );
  }

  // ---- Contact --------------------------------------------------------------
  const email = String(draft.email || '').trim();
  if (email && !EMAIL.test(email)) return fail('contact', t('settings_invalid_email'));

  const phone = String(draft.phone || '').trim();
  if (phone && !PHONE.test(phone)) return fail('contact', t('settings_invalid_phone'));

  const website = String(draft.website || '').trim();
  if (website && !URL.test(website)) return fail('social', t('settings_invalid_url'));

  // ---- Social networks ------------------------------------------------------
  // A value with whitespace is never a usable link; anything else is left as the
  // user typed it (handles, wa.me numbers and pasted app URLs are all accepted).
  for (const value of Object.values(draft.socials || {})) {
    const link = String(value || '').trim();
    if (!link) continue;
    if (/\s/.test(link)) return fail('social', t('settings_invalid_url'));
    if (/^https?:/i.test(link) && !URL.test(link)) return fail('social', t('settings_invalid_url'));
  }

  // ---- Best-selling recommendations ----------------------------------------
  const best = draft.menu_settings?.best_selling || {};
  if (best.enabled) {
    const count = Number(best.count);
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      return fail('best', t('settings_best_count_invalid'));
    }
  }

  // ---- Receipt printing -----------------------------------------------------
  const receipt = draft.receipt_settings || {};
  if (receipt.paper_width === 'custom') {
    const width = num(receipt.custom_width, NaN);
    if (!(width >= 40 && width <= 120)) return fail('receipt', t('settings_receipt_custom_invalid'));
  }
  const scale = num(receipt.print_scale, 100);
  if (scale < 50 || scale > 150) return fail('receipt', t('settings_receipt_scale_invalid'));
  for (const key of ['margin_left', 'margin_right', 'margin_bottom']) {
    const margin = num(receipt[key], 0);
    if (margin < 0 || margin > 20) return fail('receipt', t('settings_receipt_margin_invalid'));
  }

  return null;
}
