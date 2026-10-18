import express from 'express';
import { q, tx } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} from '../auth.js';
import { ah, bad, conflict } from '../lib/http.js';

const router = express.Router();

router.post(
  '/register',
  ah(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const fullName = String(req.body?.full_name || '').trim() || email.split('@')[0];
    const businessName = String(req.body?.business_name || '').trim();

    if (!email.includes('@')) throw bad('INVALID_EMAIL');
    if (password.length < 8) throw bad('WEAK_PASSWORD');
    if (!businessName) throw bad('BUSINESS_NAME_REQUIRED');

    const dup = await q('SELECT 1 FROM users WHERE email = $1', [email]);
    if (dup.rowCount > 0) throw conflict('EMAIL_TAKEN');

    const created = await tx(async (c) => {
      const user = await c.query(
        `INSERT INTO users (email, password_hash, full_name) VALUES ($1,$2,$3) RETURNING id`,
        [email, hashPassword(password), fullName],
      );
      const slugBase = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'business';
      const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
      const biz = await c.query(
        `INSERT INTO businesses (slug, name, name_en, business_type) VALUES ($1,$2,$2,'cafe') RETURNING id`,
        [slug, businessName],
      );
      await c.query(
        `INSERT INTO memberships (business_id, user_id, role) VALUES ($1,$2,'owner')`,
        [biz.rows[0].id, user.rows[0].id],
      );
      return { userId: user.rows[0].id, businessId: biz.rows[0].id };
    });

    setSessionCookie(res, signToken({ uid: created.userId }));
    res.status(201).json({ ok: true });
  }),
);

router.post(
  '/login',
  ah(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const { rows } = await q('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    setSessionCookie(res, signToken({ uid: user.id }));
    res.json({ ok: true });
  }),
);

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get(
  '/me',
  requireAuth,
  ah(async (req, res) => {
    const requested = req.headers['x-business-id'];
    let active = null;
    if (requested && req.user.is_super_admin) {
      const b = await q('SELECT id FROM businesses WHERE id = $1', [requested]);
      if (b.rowCount) active = requested;
    } else if (requested) {
      active = req.memberships.find((m) => m.business_id === requested)?.business_id ?? null;
    }
    if (!active) active = req.memberships[0]?.business_id ?? null;

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        phone: req.user.phone,
        is_super_admin: req.user.is_super_admin,
        locale: req.user.locale,
      },
      memberships: req.memberships,
      active_business_id: active,
    });
  }),
);

router.patch(
  '/me',
  requireAuth,
  ah(async (req, res) => {
    const { full_name, phone, locale } = req.body || {};
    await q(
      `UPDATE users SET full_name = COALESCE($2, full_name),
                        phone = COALESCE($3, phone),
                        locale = COALESCE($4, locale),
                        updated_at = now()
        WHERE id = $1`,
      [req.user.id, full_name ?? null, phone ?? null, locale ?? null],
    );
    res.json({ ok: true });
  }),
);

router.post(
  '/change-password',
  requireAuth,
  ah(async (req, res) => {
    const current = String(req.body?.current_password || '');
    const next = String(req.body?.new_password || '');
    if (next.length < 8) throw bad('WEAK_PASSWORD');
    const { rows } = await q('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!verifyPassword(current, rows[0]?.password_hash)) {
      return res.status(400).json({ error: 'CURRENT_PASSWORD_INCORRECT' });
    }
    await q('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [
      req.user.id,
      hashPassword(next),
    ]);
    res.json({ ok: true });
  }),
);

export default router;
