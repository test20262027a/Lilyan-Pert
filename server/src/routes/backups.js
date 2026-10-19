import express from 'express';
import { q, tx } from '../db.js';
import { requireAuth, withBusiness } from '../auth.js';
import { ah, bad, isUuid, notFound } from '../lib/http.js';
import {
  BACKUP_MODULES,
  FORMAT_VERSION,
  GROUPS,
  SCHEMA_VERSION,
  moduleByKey,
  sortByDependencies,
} from '../lib/backup-modules.js';

const router = express.Router();
router.use(requireAuth);
router.use(withBusiness('owner'));

/** Never backed up: password hashes, sessions, private keys, device secrets. */
const EXCLUDED_NOTE =
  'Passwords, sessions, authentication tokens, private keys, database credentials, caches and device push-subscription secrets are never included.';

async function exportModule(businessId, mod) {
  if (mod.exportMode === 'rows') {
    const cols = mod.columns.join(', ');
    const order = mod.orderBy ? ` ORDER BY ${mod.orderBy}` : '';
    const { rows } = await q(
      `SELECT ${cols} FROM ${mod.table} WHERE business_id = $1${order}`,
      [businessId],
    );
    return rows;
  }
  const cols = mod.columns.join(', ');
  const { rows } = await q(`SELECT ${cols} FROM ${mod.table} WHERE id = $1`, [businessId]);
  return rows[0] || null;
}

async function recordCount(businessId, mod) {
  if (mod.exportMode === 'rows') {
    const { rows } = await q(`SELECT count(*)::int AS c FROM ${mod.table} WHERE business_id = $1`, [
      businessId,
    ]);
    return rows[0].c;
  }
  return 1;
}

/** Canonical registry + live counts for the backup picker. */
router.get(
  '/modules',
  ah(async (req, res) => {
    const counts = await Promise.all(
      BACKUP_MODULES.map((m) => recordCount(req.businessId, m)),
    );
    res.json({
      groups: GROUPS,
      modules: BACKUP_MODULES.map((m, i) => ({
        key: m.key,
        group: m.group,
        dependencies: m.dependsOn || [],
        record_count: counts[i],
        included_in_full: true,
      })),
      format_version: FORMAT_VERSION,
      schema_version: SCHEMA_VERSION,
      excluded_note: EXCLUDED_NOTE,
    });
  }),
);

router.get(
  '/',
  ah(async (req, res) => {
    const { rows } = await q(
      `SELECT id, name, backup_type, status, format_version, manifest, size_bytes,
              created_by_name, created_at, restored_at
         FROM backups WHERE business_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.businessId],
    );
    res.json({ backups: rows });
  }),
);

router.get(
  '/:id/download',
  ah(async (req, res) => {
    const { rows } = await q(
      'SELECT * FROM backups WHERE id = $1 AND business_id = $2',
      [req.params.id, req.businessId],
    );
    if (!rows[0]) throw notFound('BACKUP_NOT_FOUND');
    const backup = rows[0];
    const file = {
      manifest: backup.manifest,
      modules: backup.payload,
    };
    res.set('Content-Type', 'application/json');
    res.set(
      'Content-Disposition',
      `attachment; filename="lilyan-backup-${backup.created_at.toISOString().slice(0, 10)}-${backup.id.slice(0, 8)}.json"`,
    );
    res.send(JSON.stringify(file, null, 2));
  }),
);

/** Creates a full (all modules) or custom (selected modules) backup. */
router.post(
  '/',
  ah(async (req, res) => {
    const mode = req.body?.mode === 'custom' ? 'custom' : 'full';
    let modules = BACKUP_MODULES;
    if (mode === 'custom') {
      const keys = Array.isArray(req.body?.modules) ? req.body.modules.filter((k) => moduleByKey(k)) : [];
      if (!keys.length) throw bad('NO_MODULES_SELECTED');
      modules = BACKUP_MODULES.filter((m) => keys.includes(m.key));
    }
    modules = sortByDependencies(modules);

    const business = (
      await q('SELECT id, name, slug FROM businesses WHERE id = $1', [req.businessId])
    ).rows[0];

    const payload = {};
    const moduleManifest = [];
    let records = 0;
    for (const mod of modules) {
      const data = await exportModule(req.businessId, mod);
      payload[mod.key] = data;
      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      records += count;
      moduleManifest.push({ key: mod.key, group: mod.group, record_count: count });
    }

    const serialized = JSON.stringify(payload);
    const manifest = {
      format_version: FORMAT_VERSION,
      schema_version: SCHEMA_VERSION,
      app: 'Lilyan Pert (QR Menu Pro)',
      business_id: business.id,
      business: { name: business.name, slug: business.slug },
      backup_type: mode,
      created_at: new Date().toISOString(),
      created_by: req.user.id,
      created_by_name: req.user.full_name || req.user.email,
      modules: moduleManifest,
      record_counts: Object.fromEntries(moduleManifest.map((m) => [m.key, m.record_count])),
      totals: { records, bytes: Buffer.byteLength(serialized) },
      media: {
        included: modules.some((m) => m.key === 'media'),
        note: 'Images stored in the media module are included inline.',
      },
      excludes: EXCLUDED_NOTE,
    };

    const { rows } = await q(
      `INSERT INTO backups (business_id, name, backup_type, manifest, payload, size_bytes, created_by, created_by_name)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)
       RETURNING id, name, backup_type, created_at, size_bytes`,
      [
        req.businessId,
        mode === 'full'
          ? `Full backup ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`
          : `Custom backup (${modules.length} modules) ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
        mode,
        JSON.stringify(manifest),
        serialized,
        Buffer.byteLength(serialized),
        req.user.id,
        req.user.full_name || req.user.email,
      ],
    );

    res.status(201).json({ backup: { ...rows[0], manifest } });
  }),
);

/**
 * Accepts an exported backup file. Validated, but stored as `uploaded` until a
 * restore is requested — nothing is written into live tables here.
 */
router.post(
  '/upload',
  ah(async (req, res) => {
    const file = req.body?.file;
    if (!file || typeof file !== 'object') throw bad('INVALID_BACKUP_FILE');
    const manifest = file.manifest;
    if (!manifest || typeof manifest !== 'object') throw bad('INVALID_MANIFEST');
    if (String(manifest.format_version || '').split('.')[0] !== FORMAT_VERSION.split('.')[0]) {
      throw bad('INCOMPATIBLE_FORMAT');
    }
    if (manifest.business_id && manifest.business_id !== req.businessId) {
      throw bad('CROSS_BUSINESS_RESTORE');
    }
    const modules = file.modules && typeof file.modules === 'object' ? file.modules : {};
    const knownKeys = Object.keys(modules).filter((k) => moduleByKey(k));
    if (!knownKeys.length) throw bad('NO_KNOWN_MODULES');

    const size = Buffer.byteLength(JSON.stringify(file));
    const { rows } = await q(
      `INSERT INTO backups (business_id, name, backup_type, manifest, payload, size_bytes, created_by, created_by_name)
       VALUES ($1,$2,'uploaded',$3::jsonb,$4::jsonb,$5,$6,$7)
       RETURNING id, name, created_at, size_bytes, manifest, status, backup_type`,
      [
        req.businessId,
        String(req.body?.name || manifest.name || 'Uploaded backup').slice(0, 160),
        JSON.stringify({ ...manifest, uploaded_at: new Date().toISOString(), available_modules: knownKeys }),
        JSON.stringify(modules),
        size,
        req.user.id,
        req.user.full_name || req.user.email,
      ],
    );
    res.status(201).json({ backup: rows[0] });
  }),
);

router.delete(
  '/:id',
  ah(async (req, res) => {
    const { rowCount } = await q('DELETE FROM backups WHERE id = $1 AND business_id = $2', [
      req.params.id,
      req.businessId,
    ]);
    if (!rowCount) throw notFound('BACKUP_NOT_FOUND');
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------ restore */

const FK_FIELDS = {
  menu_products: { category_id: 'categories' },
  orders: { table_id: 'tables' },
  order_items: { product_id: 'products', order_id: 'orders' },
  order_audit: { order_id: 'orders' },
  receipt_prints: { order_id: 'orders' },
  promotions: { product_id: 'products' },
  reviews: { order_id: 'orders' },
};

async function fkExists(client, table, id) {
  if (!id) return false;
  const { rows } = await client.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id]);
  return rows.length > 0;
}

/**
 * Restores a stored or uploaded backup into the caller's own business.
 * Order is dependency-safe, everything runs inside one transaction, and every
 * business_id is forced to the target tenant.
 */
router.post(
  '/:id/restore',
  ah(async (req, res) => {
    const { rows } = await q('SELECT * FROM backups WHERE id = $1 AND business_id = $2', [
      req.params.id,
      req.businessId,
    ]);
    const backup = rows[0];
    if (!backup) throw notFound('BACKUP_NOT_FOUND');

    const manifest = backup.manifest || {};
    if (String(manifest.format_version || '').split('.')[0] !== FORMAT_VERSION.split('.')[0]) {
      throw bad('INCOMPATIBLE_FORMAT');
    }
    if (manifest.business_id && manifest.business_id !== req.businessId) {
      throw bad('CROSS_BUSINESS_RESTORE');
    }

    const payload = backup.payload && typeof backup.payload === 'object' ? backup.payload : {};
    const availableKeys = Object.keys(payload).filter((k) => moduleByKey(k));
    if (!availableKeys.length) throw bad('NO_KNOWN_MODULES');

    const modules = sortByDependencies(
      BACKUP_MODULES.filter((m) => availableKeys.includes(m.key)),
    );

    const summary = [];
    const warnings = [];

    await tx(async (c) => {
      for (const mod of modules) {
        const data = payload[mod.key];
        if (!data) continue;

        if (mod.exportMode === 'rows') {
          await c.query(`DELETE FROM ${mod.table} WHERE business_id = $1`, [req.businessId]);
          const list = Array.isArray(data) ? data : [data];
          const fks = FK_FIELDS[mod.key] || {};
          let restored = 0;
          let skipped = 0;
          for (const raw of list) {
            const record = { ...raw };
            for (const [field, table] of Object.entries(fks)) {
              const value = record[field];
              if (value && !(await fkExists(c, table, value))) {
                record[field] = null;
                warnings.push(`${mod.key}.${field}`);
              }
            }
            const cols = mod.columns.filter((col) => col in record || col === 'id');
            const values = cols.map((col) => record[col] ?? null);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            try {
              await c.query(
                `INSERT INTO ${mod.table} (${cols.join(', ')}) VALUES (${placeholders})`,
                values,
              );
              restored += 1;
            } catch {
              skipped += 1;
            }
          }
          summary.push({ key: mod.key, restored, skipped });
        } else {
          // Single-row business modules: only safe columns are written back.
          const record = Array.isArray(data) ? data[0] : data;
          if (!record) continue;
          const cols = mod.columns.filter((col) => col in record);
          if (!cols.length) continue;
          const values = [req.businessId, ...cols.map((col) => {
            const v = record[col];
            if (mod.exportMode === 'jsonColumns') return JSON.stringify(v ?? {});
            return v ?? null;
          })];
          const sets = cols.map((col, i) => `${col} = $${i + 2}`).join(', ');
          await c.query(
            `UPDATE businesses SET ${sets}, updated_at = now() WHERE id = $1`,
            values,
          );
          summary.push({ key: mod.key, restored: 1, skipped: 0 });
        }
      }

      // Keep the order counter ahead of anything that was restored.
      await c.query(
        `UPDATE businesses SET order_seq = GREATEST(order_seq, coalesce((SELECT max(order_number) FROM orders WHERE business_id = $1), 0) + 1)
          WHERE id = $1`,
        [req.businessId],
      );
    });

    await q('UPDATE backups SET status = $2, restored_at = now() WHERE id = $1', [
      backup.id,
      'restored',
    ]);

    res.json({
      ok: true,
      summary,
      warnings: [...new Set(warnings)],
      modules_restored: summary.length,
      business_id: req.businessId,
    });
  }),
);

/* ------------------------------------------------- reset sample data */

const SAMPLE_GROUPS = {
  menu: { tables: ['categories', 'products'] },
  orders: { tables: ['orders'] }, // items/history/prints cascade
  operations: { tables: ['tables', 'reviews'] },
  marketing: { tables: ['advertisements', 'promotions'] },
  analytics: { tables: ['business_views'] },
  backups: { tables: ['backups'] },
};

const PROTECTED = [
  'users',
  'memberships',
  'businesses',
];

router.post(
  '/reset-sample',
  ah(async (req, res) => {
    const requested = Array.isArray(req.body?.groups) ? req.body.groups : [];
    const groups = requested.filter((g) => SAMPLE_GROUPS[g]);
    if (!groups.length) throw bad('NO_GROUPS_SELECTED');

    const deleted = {};
    await tx(async (c) => {
      for (const group of groups) {
        for (const table of SAMPLE_GROUPS[group].tables) {
          if (PROTECTED.includes(table)) continue; // belt and braces
          const { rowCount } = await c.query(
            `DELETE FROM ${table} WHERE business_id = $1 AND is_sample = true`,
            [req.businessId],
          );
          deleted[table] = rowCount;
        }
      }
    });

    const alive = await q(
      `SELECT
         (SELECT count(*)::int FROM businesses WHERE id = $1) AS business,
         (SELECT count(*)::int FROM users WHERE id IN (SELECT user_id FROM memberships WHERE business_id = $1)) AS members,
         (SELECT count(*)::int FROM memberships WHERE business_id = $1 AND role = 'owner') AS owners`,
      [req.businessId],
    );

    res.json({
      ok: true,
      deleted,
      protected: PROTECTED,
      still_present: alive.rows[0],
    });
  }),
);

export default router;
