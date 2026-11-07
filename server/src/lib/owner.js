import crypto from 'node:crypto';
import { q } from '../db.js';

/*
 * The one protected system owner.
 *
 * `superadmin@work.app` is the platform's single Owner identity. It is stored
 * on the identity record itself (`users.is_super_admin`), never derived from a
 * role name the browser sends, and the database refuses any other address from
 * carrying the flag (see schema.sql) — so the identity cannot be duplicated by
 * a request, a restore or a second insert.
 *
 * Every authorization decision about *who is the owner* goes through this
 * module, so there is exactly one definition of it on the server.
 */
export const PROTECTED_OWNER_EMAIL = 'superadmin@work.app';

/** The protected owner record, read from the database (null if none exists). */
export async function protectedOwner() {
  const { rows } = await q(
    `SELECT id, email, full_name, phone, locale, profile_image_url, avatar_type,
            password_hash, created_at
       FROM users
      WHERE is_super_admin = true AND lower(email) = $1
      ORDER BY created_at
      LIMIT 1`,
    [PROTECTED_OWNER_EMAIL],
  );
  return rows[0] || null;
}

/** True when the authenticated session is the protected owner. */
export const isProtectedActor = (req) => Boolean(req.user?.is_super_admin);

/** True when a user row (or a row joined from `users`) is the protected owner. */
export const isProtectedRow = (row) => Boolean(row?.is_super_admin);

/**
 * A temporary credential an administrator hands over once. It is only ever
 * returned in the response of the request that generated it — what is stored is
 * the same scrypt hash every other password uses, and the account is flagged so
 * its new password must be chosen before the panel opens.
 */
const TEMP_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function temporaryPassword(length = 14) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += TEMP_ALPHABET[crypto.randomInt(TEMP_ALPHABET.length)];
  }
  return out;
}
