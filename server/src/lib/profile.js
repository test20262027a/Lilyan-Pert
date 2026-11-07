import { bad } from './http.js';

/*
 * A user's appearance: an uploaded photo plus the fallback avatar the
 * administrator picked.
 *
 * The photo always wins in the UI, but the avatar choice is stored beside it
 * and kept while a photo is set — removing the photo then restores the chosen
 * silhouette instead of leaving the account blank. Accounts created before this
 * feature have no photo and `avatar_type = 'default'`, so they keep rendering
 * exactly as before.
 */

export const AVATAR_TYPES = ['default', 'male', 'female'];

/** Only our own immutable media references may be stored as a profile photo. */
const MEDIA_URL = /^\/api\/manage\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `undefined` means "the caller did not send this field" — the column is left
 * untouched. An empty value clears the photo (the avatar takes over again).
 */
export function normalizeProfileImageUrl(raw) {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const value = String(raw).trim();
  if (!MEDIA_URL.test(value)) throw bad('INVALID_PROFILE_IMAGE');
  return value;
}

/** Same contract: an unknown value is rejected, never silently stored. */
export function normalizeAvatarType(raw) {
  if (raw === undefined) return undefined;
  const value = String(raw || '').toLowerCase();
  if (!AVATAR_TYPES.includes(value)) throw bad('INVALID_AVATAR_TYPE');
  return value;
}
