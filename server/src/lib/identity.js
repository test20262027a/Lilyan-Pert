/*
 * Custom login identifiers.
 *
 * An account signs in with an email-like identifier — `rebar@lilyanpert.app` —
 * that is composed from a username and a business-branded suffix. It is an
 * internal login name: it is NOT a mailbox and nothing is ever sent to it,
 * which is why nobody has to prove ownership of the domain before using one.
 *
 * The identifier itself is stored in `users.email`, which is the single unique
 * column the sign-in query already uses (and the column every existing account
 * keeps using), so adding custom identifiers needs no second identities table
 * and no duplicated login field.
 */

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62})$/;
const SUFFIX_RE = /^@[a-z0-9](?:[a-z0-9.-]{0,61}[a-z0-9])$/;

/** The full identifier the sign-in form sends. */
const IDENTIFIER_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62})@[a-z0-9](?:[a-z0-9.-]{0,61}[a-z0-9])$/;

/** Lowercased username, or null when it is not usable. */
export function normalizeUsername(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  return USERNAME_RE.test(value) ? value : null;
}

/**
 * Lowercased suffix with its leading `@`. A value typed without the `@`
 * (`lilyanpert.app`) is accepted and completed, so the owner never has to know
 * the exact syntax.
 */
export function normalizeSuffix(raw) {
  const value = String(raw ?? '').trim().toLowerCase().replace(/^@+/, '');
  if (!value) return '';
  const full = `@${value}`;
  return SUFFIX_RE.test(full) ? full : null;
}

/** `rebar` + `@lilyanpert.app` → `rebar@lilyanpert.app`. */
export const composeIdentifier = (username, suffix) => `${username}${suffix || ''}`;

/** The identifier split back into the two fields the form edits. */
export function splitIdentifier(identifier) {
  const value = String(identifier ?? '').trim().toLowerCase();
  const at = value.indexOf('@');
  if (at <= 0) return { username: value, suffix: '' };
  return { username: value.slice(0, at), suffix: value.slice(at) };
}

/** True when a whole identifier is well formed (login lookups stay exact). */
export const isIdentifier = (value) => IDENTIFIER_RE.test(String(value ?? '').trim().toLowerCase());

/**
 * The business's login suffix, derived from its own brand name ("Lilyan Pert"
 * → `@lilyanpert.app`) and never from a request: the suffix is business
 * configuration, so no user and no administrator can type, change or clear it.
 *
 * The name is normalized into a clean domain identifier — accents folded,
 * lowercased, spaces and punctuation dropped. A brand written only in a
 * non-Latin script falls back to the slug, which is always ASCII.
 */
export function brandSuffix(business) {
  for (const candidate of [business?.name_en, business?.name, business?.slug]) {
    const base = String(candidate ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 48);
    if (base) return `@${base}.app`;
  }
  return '@work.app';
}

/**
 * A suffix sent by a client is never applied. It is accepted only when it is
 * exactly the business's locked suffix, so an edited form that still posts the
 * field it displays keeps working, while any attempt to type or clear a
 * different one is refused instead of silently logging someone in elsewhere.
 */
export function suffixLocked(body, lockedSuffix) {
  const raw = body?.login_suffix ?? body?.suffix;
  if (raw === undefined || raw === null || String(raw).trim() === '') return false;
  return normalizeSuffix(raw) !== lockedSuffix;
}

/**
 * Resolves what a user request asks for: a username, which is always composed
 * with the suffix passed in — the account's own suffix on an update, the
 * business's brand suffix on a creation. A complete identifier in `email` is
 * accepted only when it already carries that same locked suffix; it is never
 * renamed here. Returns nulls when the caller sent no identity at all, so an
 * update can keep what is stored.
 */
export function resolveIdentity(body, lockedSuffix) {
  const suffix = normalizeSuffix(lockedSuffix);
  if (!suffix) return { error: 'INVALID_SUFFIX' };

  const rawUsername = body?.username;
  if (rawUsername !== undefined && rawUsername !== null && String(rawUsername).trim() !== '') {
    const username = normalizeUsername(rawUsername);
    if (!username) return { error: 'INVALID_USERNAME' };
    const identifier = composeIdentifier(username, suffix);
    if (!isIdentifier(identifier)) return { error: 'INVALID_IDENTIFIER' };
    return { username, suffix, identifier };
  }

  const rawEmail = String(body?.email ?? '').trim().toLowerCase();
  if (!rawEmail) return { username: null, suffix: null, identifier: null };
  if (!isIdentifier(rawEmail)) return { error: 'INVALID_EMAIL' };
  const parts = splitIdentifier(rawEmail);
  if (parts.suffix !== suffix) return { error: 'INVALID_IDENTIFIER' };
  return { ...parts, identifier: rawEmail };
}
