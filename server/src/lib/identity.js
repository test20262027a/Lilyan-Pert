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
 * The suffix suggested from the business's own slug ("Lilyan Pert" →
 * `@lilyanpert.app`). It is only a suggestion: the owner approves or edits it,
 * because the application cannot know whether the domain is registered.
 */
export function suggestedSuffix(business) {
  const fromSlug = String(business?.slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const fromName = String(business?.name_en || business?.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const base = fromSlug || fromName;
  return base ? `@${base}.app` : '@work.app';
}

/**
 * Resolves what a user-creation request asks for: either an explicit
 * username + suffix, or a complete identifier in `email` (the shape older
 * clients and the edit form send). Returns nulls for values the caller omitted
 * so an update can keep what is stored.
 */
export function resolveIdentity(body, fallbackSuffix) {
  const rawUsername = body?.username;
  const rawSuffix = body?.login_suffix ?? body?.suffix;
  const rawEmail = body?.email;

  const explicitUsername = rawUsername === undefined || rawUsername === null || rawUsername === ''
    ? null
    : normalizeUsername(rawUsername);

  const explicitSuffix = rawSuffix === undefined || rawSuffix === null || rawSuffix === ''
    ? null
    : normalizeSuffix(rawSuffix);

  const emailWasSent = rawEmail !== undefined && rawEmail !== null && String(rawEmail).trim() !== '';

  if (explicitUsername !== null || explicitSuffix !== null) {
    if (rawUsername !== undefined && String(rawUsername ?? '').trim() !== '' && explicitUsername === null) {
      return { error: 'INVALID_USERNAME' };
    }
    if (explicitSuffix === null && rawSuffix !== undefined && String(rawSuffix ?? '').trim() !== '') {
      return { error: 'INVALID_SUFFIX' };
    }
    // A username without a suffix falls back to the business's saved/suggested
    // one; a suffix alone is only meaningful together with a username.
    const suffix = explicitSuffix ?? fallbackSuffix ?? '';
    if (!explicitUsername) return { error: 'INVALID_USERNAME' };
    if (!suffix) return { error: 'INVALID_SUFFIX' };
    const identifier = composeIdentifier(explicitUsername, suffix);
    if (!isIdentifier(identifier)) return { error: 'INVALID_IDENTIFIER' };
    return { username: explicitUsername, suffix, identifier };
  }

  if (emailWasSent) {
    const identifier = String(rawEmail).trim().toLowerCase();
    if (!isIdentifier(identifier)) return { error: 'INVALID_EMAIL' };
    return { ...splitIdentifier(identifier), identifier };
  }

  return { username: null, suffix: null, identifier: null };
}
