import crypto from 'node:crypto';
import { q } from './db.js';
import { ALL_PERMISSIONS, effectivePermissions } from './lib/permissions.js';

const SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
export const COOKIE_NAME = 'lp_session';

if (!process.env.SESSION_SECRET) {
  console.warn(
    '[auth] SESSION_SECRET is not set — using an ephemeral key (sessions reset on restart).',
  );
}

/* ---------------------------------------------------------------- passwords */

/*
 * An account whose password has not been chosen yet carries this marker instead
 * of a hash. It is not a valid scrypt record, so verifyPassword() refuses it:
 * the record can exist (and already hold the Super Admin role) without anybody
 * being able to sign in until its owner sets a real password.
 */
export const UNCLAIMED_PASSWORD = 'unclaimed';

/** True while the account still waits for its owner to set a password. */
export const needsPasswordSetup = (hash) => !hash || hash === UNCLAIMED_PASSWORD;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [algo, salt, key] = String(stored).split('$');
  if (algo !== 'scrypt' || !salt || !key) return false;
  const candidate = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const a = Buffer.from(key, 'hex');
  const b = Buffer.from(candidate, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ tokens */

const b64 = (v) => Buffer.from(v).toString('base64url');

export function signToken(payload) {
  const body = b64(
    JSON.stringify({ ...payload, exp: Date.now() + TTL_DAYS * 86400000 }),
  );
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(body)
    .digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- cookies */

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function setSessionCookie(res, token) {
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${TTL_DAYS * 86400}`,
    'Secure',
  ];
  res.append('Set-Cookie', attrs.join('; '));
}

export function clearSessionCookie(res) {
  res.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`,
  );
}

/* ------------------------------------------------------------- middlewares */

export async function attachSession(req, _res, next) {
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    const payload = verifyToken(token);
    if (payload?.uid) {
      const { rows } = await q(
        `SELECT id, email, full_name, phone, is_super_admin, locale,
                profile_image_url, avatar_type
           FROM users WHERE id = $1`,
        [payload.uid],
      );
      if (rows[0]) {
        req.user = rows[0];
        const m = await q(
          `SELECT m.business_id, m.role, m.status, m.permissions,
                  b.name AS business_name, b.slug, b.theme
             FROM memberships m JOIN businesses b ON b.id = m.business_id
            WHERE m.user_id = $1 AND m.status = 'active'
            ORDER BY (m.role = 'owner') DESC, m.created_at`,
          [payload.uid],
        );
        // A membership carries its effective permission list, never the raw
        // stored object: the client can only ever be told what is really allowed.
        req.memberships = m.rows.map((row) => ({
          ...row,
          permissions: effectivePermissions(row.role, row.permissions),
        }));

        /*
         * The platform's own Super Admin belongs to no single business, but the
         * whole admin panel is business-scoped. It therefore acts as owner of
         * the platform's primary (first-created) business — the business its
         * users, orders and settings live in.
         */
        if (rows[0].is_super_admin && req.memberships.length === 0) {
          const first = await q(
            `SELECT id, name AS business_name, slug, theme
               FROM businesses ORDER BY created_at LIMIT 1`,
          );
          if (first.rows[0]) {
            req.memberships = [
              {
                ...first.rows[0],
                business_id: first.rows[0].id,
                role: 'owner',
                status: 'active',
                permissions: effectivePermissions('owner', null),
              },
            ];
          }
        }
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  next();
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user?.is_super_admin)
    return res.status(403).json({ error: 'SUPER_ADMIN_REQUIRED' });
  next();
}

const RANK = { customer: 0, staff: 1, manager: 2, owner: 3 };

export function rankOf(role) {
  return RANK[role] ?? -1;
}

/**
 * Resolves which business this request operates on and refuses anything the
 * caller has no active membership for. The client can *ask* for a business,
 * but only a real membership (or super-admin) grants access — business_id from
 * the client is never trusted on its own.
 */
export function withBusiness(minRole = 'staff') {
  return (req, res, next) => {
    const requested =
      req.headers['x-business-id'] ||
      req.query.business_id ||
      (req.body && req.body.business_id) ||
      null;

    const list = req.memberships || [];
    let chosen = null;

    if (requested && req.user?.is_super_admin) {
      chosen = { business_id: requested, role: 'owner' };
    } else if (requested) {
      chosen = list.find((m) => m.business_id === requested) || null;
      if (!chosen) return res.status(403).json({ error: 'NO_BUSINESS_ACCESS' });
    } else {
      chosen = list.find((m) => rankOf(m.role) >= 1) || list[0] || null;
    }

    if (!chosen) return res.status(403).json({ error: 'NO_BUSINESS_ACCESS' });

    const effectiveRank = req.user?.is_super_admin
      ? 4
      : rankOf(chosen.role);
    if (effectiveRank < rankOf(minRole)) {
      return res.status(403).json({ error: 'INSUFFICIENT_ROLE' });
    }

    req.businessId = chosen.business_id;
    req.role = req.user?.is_super_admin ? 'super_admin' : chosen.role;
    /*
     * Module permissions are resolved from the server's own membership record
     * (never from the request), so a client that sends an edited permission set
     * still gets exactly what its membership says.
     */
    req.permissions = req.user?.is_super_admin
      ? ALL_PERMISSIONS.slice()
      : chosen.permissions || effectivePermissions(chosen.role, null);
    next();
  };
}

/**
 * Route guard for one module permission. Always mounted AFTER withBusiness, so
 * the business and the caller's effective permissions are already resolved.
 * The role rank remains the outer boundary; this is the finer check inside it.
 */
export function perm(key) {
  return (req, res, next) => {
    if (!req.permissions?.includes(key)) {
      return res.status(403).json({ error: 'PERMISSION_DENIED' });
    }
    return next();
  };
}

/** True when this request may perform `key` (for optional in-handler branches). */
export function can(req, key) {
  return Boolean(req.permissions?.includes(key));
}
