import express from 'express';
import { pool, q, tx } from '../db.js';
import { requireAuth, withBusiness, perm } from '../auth.js';
import { ah, bad, isUuid, notFound } from '../lib/http.js';
import {
  BACKUP_CATEGORIES,
  BACKUP_MODULES,
  BACKUP_SECTIONS,
  FORMAT_VERSION,
  SCHEMA_VERSION,
  archiveChecksum,
  categoryByKey,
  moduleByKey,
  modulesForCategories,
  sectionsCoveredBy,
  sortByDependencies,
} from '../lib/backup-modules.js';
import { recordActivity } from '../lib/activity.js';
import { EXECUTION_ORDER, PROTECTED, moduleByKey as resetModule, resetStats } from '../lib/reset-modules.js';

const router = express.Router();
router.use(requireAuth);
router.use(withBusiness('owner'));
// The elevated backup/restore privilege is its own permission: a role that
// cannot hold it never reaches these routes, whatever the client asks for.
router.use(perm('backup.full'));

/** Never backed up: password hashes, sessions, private keys, device secrets. */
const EXCLUDED_NOTE =
  'Passwords, sessions, authentication tokens, private keys, database credentials, caches and device push-subscription secrets are never included.';

/** Images are referenced by their public URL; their binary bytes are not copied. */
const IMAGE_POLICY = 'urls';

/** Protected by every restore, whatever the archive contains. */
const PROTECTED_DATA = ['owner_account', 'team_memberships', 'activity_log', 'credentials'];

const MAX_UPLOAD_BYTES = 11 * 1024 * 1024; // express.json() allows 12mb

/* ------------------------------------------------------------- export helpers */

async function exportModule(businessId, mod) {
  if (mod.query) return (await q(mod.query, [businessId])).rows;
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
  if (mod.countQuery) {
    const { rows } = await q(mod.countQuery, [businessId]);
    return rows[0].c;
  }
  if (mod.exportMode === 'rows') {
    const { rows } = await q(`SELECT count(*)::int AS c FROM ${mod.table} WHERE business_id = $1`, [
      businessId,
    ]);
    return rows[0].c;
  }
  return 1;
}

const countOf = (data) => (Array.isArray(data) ? data.length : data ? 1 : 0);

/** The manifest sections of an archive, with real record counts. */
function buildSections(modules, payload) {
  return sectionsCoveredBy(modules.map((m) => m.key)).map((section) => {
    const primary = section.modules[0];
    const restorable = section.restorable === false || section.modules.some((k) => !moduleByKey(k)?.restorable);
    return {
      key: section.key,
      category: section.category,
      restorable: !restorable,
      implied_by: section.impliedBy || null,
      record_count: countOf(payload[primary]),
    };
  });
}

/** Creates and persists a real archive. Returns the stored row plus manifest. */
async function createBackup({ businessId, user, mode, categoryKeys }) {
  let modules = BACKUP_MODULES;
  if (mode === 'custom') {
    modules = modulesForCategories(categoryKeys || []);
    if (!modules.length) throw bad('NO_MODULES_SELECTED');
  }
  modules = sortByDependencies(modules);

  const business = (
    await q('SELECT id, name, slug FROM businesses WHERE id = $1', [businessId])
  ).rows[0];

  const payload = {};
  const moduleManifest = [];
  let records = 0;
  for (const mod of modules) {
    const data = await exportModule(businessId, mod);
    payload[mod.key] = data;
    const count = countOf(data);
    records += count;
    moduleManifest.push({
      key: mod.key,
      section: mod.section,
      group: mod.category,
      record_count: count,
      restorable: mod.restorable !== false,
    });
  }

  const sections = buildSections(modules, payload);
  const manifest = {
    format_version: FORMAT_VERSION,
    schema_version: SCHEMA_VERSION,
    app: 'Lilyan Pert (QR Menu Pro)',
    business_id: business.id,
    business: { name: business.name, slug: business.slug },
    backup_type: mode,
    categories: [...new Set(sections.map((s) => s.category))],
    created_at: new Date().toISOString(),
    created_by: user.id,
    created_by_name: user.full_name || user.email,
    sections,
    modules: moduleManifest,
    record_counts: Object.fromEntries(moduleManifest.map((m) => [m.key, m.record_count])),
    totals: { records, bytes: 0 },
    media: {
      included: false,
      policy: IMAGE_POLICY,
      note: 'Pictures are referenced by their permanent public URLs; their binary bytes are not copied into the archive.',
    },
    excludes: EXCLUDED_NOTE,
  };

  // The checksum is taken over exactly what a JSONB round trip will return
  // (dates become strings there), so a download verifies to the same value.
  const payloadJson = JSON.stringify(payload);
  manifest.checksum = archiveChecksum(manifest, JSON.parse(payloadJson));

  // The archive is what a download returns: the manifest plus the payload. Its
  // byte length is the size the page shows — measured, never estimated.
  manifest.totals.bytes = Buffer.byteLength(JSON.stringify({ manifest, modules: payload }));
  let size = Buffer.byteLength(JSON.stringify({ manifest, modules: payload }));
  if (size !== manifest.totals.bytes) {
    manifest.totals.bytes = size;
    size = Buffer.byteLength(JSON.stringify({ manifest, modules: payload }));
  }

  const name = mode === 'full' ? 'Full Backup' : `Selective Backup (${sections.length})`;

  const { rows } = await q(
    `INSERT INTO backups (business_id, name, backup_type, manifest, payload, size_bytes, created_by, created_by_name)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)
     RETURNING id, name, backup_type, status, created_at, size_bytes, manifest`,
    [
      businessId,
      name,
      mode,
      JSON.stringify(manifest),
      JSON.stringify(payload),
      size,
      user.id,
      user.full_name || user.email,
    ],
  );

  return { ...rows[0], manifest, payload };
}

const activity = (req, action, backup, extra = {}) =>
  recordActivity({
    businessId: req.businessId,
    actorId: req.user.id,
    actorName: req.user.full_name || req.user.email,
    entity: 'backup',
    action,
    entityId: backup?.id || null,
    entityLabel: backup?.name ? String(backup.name).slice(0, 120) : null,
    path: req.path,
    ...extra,
  });

async function loadBackup(req) {
  if (!isUuid(req.params.id)) throw notFound('BACKUP_NOT_FOUND');
  const { rows } = await q('SELECT * FROM backups WHERE id = $1 AND business_id = $2', [
    req.params.id,
    req.businessId,
  ]);
  if (!rows[0]) throw notFound('BACKUP_NOT_FOUND');
  return rows[0];
}

/* ------------------------------------------------------------ image references */

const IMAGE_FIELDS = {
  business_profile: ['logo_url', 'cover_url'],
  menu_products: ['image_url'],
  advertisements: ['image_url'],
};

/** Image references the archive carries, so a restore can report dead ones. */
async function imageReport(payload, businessId) {
  const refs = new Set();
  for (const [key, fields] of Object.entries(IMAGE_FIELDS)) {
    const data = payload?.[key];
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    for (const row of rows) {
      for (const field of fields) {
        const value = row?.[field];
        if (typeof value === 'string' && value.trim()) refs.add(value.trim());
      }
    }
  }

  const localIds = [...refs]
    .map((url) => {
      const match = url.match(/\/api\/manage\/media\/([0-9a-fA-F-]{36})/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  let missingLocal = [];
  if (localIds.length) {
    const { rows } = await q(
      'SELECT id FROM media WHERE business_id = $1 AND id = ANY($2::uuid[])',
      [businessId, localIds],
    );
    const alive = new Set(rows.map((r) => r.id));
    missingLocal = localIds.filter((id) => !alive.has(id));
  }

  return {
    policy: IMAGE_POLICY,
    references: refs.size,
    stored_locally: localIds.length,
    missing_local: missingLocal.length,
    // External URLs are not fetched: the archive only keeps the address.
    external_unverified: refs.size - localIds.length,
  };
}

/* ----------------------------------------------------------------- registry */

/** Canonical registry + live counts for both backup panels. */
router.get(
  '/modules',
  ah(async (req, res) => {
    const counts = {};
    for (const mod of BACKUP_MODULES) counts[mod.key] = await recordCount(req.businessId, mod);

    res.json({
      categories: BACKUP_CATEGORIES,
      sections: BACKUP_SECTIONS.map((section) => ({
        key: section.key,
        category: section.category,
        modules: section.modules,
        record_count: counts[section.modules[0]] ?? 0,
        restorable:
          section.restorable === false
            ? false
            : section.modules.every((key) => moduleByKey(key)?.restorable !== false),
        implied_by: section.impliedBy || null,
      })),
      modules: BACKUP_MODULES.map((mod) => ({
        key: mod.key,
        section: mod.section,
        group: mod.category,
        dependencies: mod.dependsOn || [],
        restorable: mod.restorable !== false,
        record_count: counts[mod.key] ?? 0,
      })),
      format_version: FORMAT_VERSION,
      schema_version: SCHEMA_VERSION,
      excluded_note: EXCLUDED_NOTE,
      image_policy: IMAGE_POLICY,
      protected_data: PROTECTED_DATA,
    });
  }),
);

/* --------------------------------------------------------------- list/create */

router.get(
  '/',
  ah(async (req, res) => {
    const { rows } = await q(
      `SELECT b.id, b.name, b.backup_type, b.status, b.format_version, b.manifest, b.size_bytes,
              b.created_by, b.created_by_name, b.created_at, b.restored_at,
              m.role AS creator_role
         FROM backups b
         LEFT JOIN memberships m ON m.business_id = b.business_id AND m.user_id = b.created_by
        WHERE b.business_id = $1 ORDER BY b.created_at DESC LIMIT 100`,
      [req.businessId],
    );
    res.json({ backups: rows });
  }),
);

/** Creates a full (every section) or selective (chosen cards) backup. */
router.post(
  '/',
  ah(async (req, res) => {
    const requested = Array.isArray(req.body?.categories)
      ? req.body.categories.filter((key) => categoryByKey(key))
      : [];
    const legacyModules = Array.isArray(req.body?.modules)
      ? req.body.modules.filter((key) => moduleByKey(key))
      : [];
    const mode = req.body?.mode === 'custom' || requested.length || legacyModules.length ? 'custom' : 'full';

    let categoryKeys = requested;
    if (mode === 'custom' && !categoryKeys.length && legacyModules.length) {
      // Older clients sent module keys; map them back onto their cards.
      const sections = sectionsCoveredBy(legacyModules);
      categoryKeys = [...new Set(sections.map((s) => s.category))];
    }

    const created = await createBackup({
      businessId: req.businessId,
      user: req.user,
      mode,
      categoryKeys,
    });

    const { payload, ...backup } = created;
    res.status(201).json({
      backup,
      sections: backup.manifest?.sections || [],
      images: await imageReport(payload, req.businessId),
    });
  }),
);

/* ----------------------------------------------------------------- download */

router.get(
  '/:id/download',
  ah(async (req, res) => {
    const backup = await loadBackup(req);
    const artifact = { manifest: backup.manifest, modules: backup.payload };
    const body = JSON.stringify(artifact);
    const stamp = new Date(backup.created_at).toISOString().slice(0, 10);

    activity(req, 'exported', backup);

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Content-Length', String(Buffer.byteLength(body)));
    res.set(
      'Content-Disposition',
      `attachment; filename="lilyan-backup-${stamp}-${backup.id.slice(0, 8)}.json"`,
    );
    res.send(body);
  }),
);

/* ------------------------------------------------------- upload / validation */

function validateArchive(file) {
  if (!file || typeof file !== 'object' || Array.isArray(file)) throw bad('INVALID_BACKUP_FILE');
  const manifest = file.manifest;
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw bad('INVALID_MANIFEST');
  if (!/^\d+(\.\d+)*$/.test(String(manifest.format_version || ''))) throw bad('INVALID_MANIFEST');
  const modules = file.modules;
  if (!modules || typeof modules !== 'object' || Array.isArray(modules)) throw bad('INVALID_BACKUP_FILE');
  return { manifest, modules };
}

/**
 * Accepts an exported backup file. Fully validated first, stored as `uploaded`
 * and never written into live tables here — a restore needs its own confirmation.
 */
router.post(
  '/upload',
  ah(async (req, res) => {
    const rawSize = Buffer.byteLength(JSON.stringify(req.body || {}));
    if (rawSize > MAX_UPLOAD_BYTES) throw bad('BACKUP_TOO_LARGE');

    const { manifest, modules } = validateArchive(req.body?.file);

    if (String(manifest.format_version).split('.')[0] !== FORMAT_VERSION.split('.')[0]) {
      throw bad('INCOMPATIBLE_FORMAT');
    }
    if (manifest.business_id && manifest.business_id !== req.businessId) {
      throw bad('CROSS_BUSINESS_RESTORE');
    }

    const known = Object.keys(modules).filter((key) => moduleByKey(key));
    if (!known.length) throw bad('NO_KNOWN_MODULES');

    // Every included section must arrive as records or a single record object.
    for (const key of known) {
      const value = modules[key];
      const ok = value === null || Array.isArray(value) || (typeof value === 'object' && value !== null);
      if (!ok) throw bad('INVALID_BACKUP_FILE');
    }

    if (manifest.checksum) {
      const actual = archiveChecksum(manifest, modules);
      if (actual !== manifest.checksum) throw bad('INTEGRITY_FAILED');
    }

    const sections = BACKUP_SECTIONS.filter((section) =>
      section.modules.some((key) => known.includes(key)),
    ).map((section) => {
      const primary = section.modules[0];
      return {
        key: section.key,
        category: section.category,
        restorable: section.restorable !== false,
        implied_by: section.impliedBy || null,
        record_count: countOf(modules[primary]),
      };
    });

    const { rows } = await q(
      `INSERT INTO backups (business_id, name, backup_type, status, manifest, payload, size_bytes, created_by, created_by_name)
       VALUES ($1,$2,'uploaded','ready',$3::jsonb,$4::jsonb,$5,$6,$7)
       RETURNING id, name, backup_type, status, created_at, size_bytes, manifest`,
      [
        req.businessId,
        String(req.body?.name || `${manifest.backup_type === 'custom' ? 'Selective Backup' : 'Full Backup'} (uploaded)`)
          .slice(0, 160),
        JSON.stringify({
          ...manifest,
          uploaded_at: new Date().toISOString(),
          uploaded_by_name: req.user.full_name || req.user.email,
          available_modules: known,
          sections,
          checksum_verified: Boolean(manifest.checksum),
        }),
        JSON.stringify(modules),
        rawSize,
        req.user.id,
        req.user.full_name || req.user.email,
      ],
    );

    res.status(201).json({
      backup: rows[0],
      sections,
      images: await imageReport(modules, req.businessId),
      checksum_verified: Boolean(manifest.checksum),
    });
  }),
);

/* ------------------------------------------------------------------- delete */

router.delete(
  '/:id',
  ah(async (req, res) => {
    const backup = await loadBackup(req);
    const { rowCount } = await q('DELETE FROM backups WHERE id = $1 AND business_id = $2', [
      backup.id,
      req.businessId,
    ]);
    if (!rowCount) throw notFound('BACKUP_NOT_FOUND');
    // The audit row for this deletion is written by the activity logger.
    res.json({ ok: true, id: backup.id });
  }),
);

/* --------------------------------------------------------- restore preview */

/**
 * Read-only inspection of an archive: everything the confirmation screen shows
 * comes from here, never from the browser's own reading of the file.
 */
router.get(
  '/:id/verify',
  ah(async (req, res) => {
    const backup = await loadBackup(req);
    const manifest = backup.manifest || {};
    const payload = backup.payload && typeof backup.payload === 'object' ? backup.payload : {};
    const known = Object.keys(payload).filter((key) => moduleByKey(key));

    const checks = {
      readable: true,
      has_manifest: Object.keys(manifest).length > 0,
      format_ok: String(manifest.format_version || '').split('.')[0] === FORMAT_VERSION.split('.')[0],
      business_match: !manifest.business_id || manifest.business_id === req.businessId,
      has_modules: known.length > 0,
      integrity: null,
    };
    if (manifest.checksum) {
      checks.integrity = archiveChecksum(manifest, payload) === manifest.checksum;
    }
    const valid = Object.entries(checks).every(([key, value]) => key === 'integrity' || value === true)
      && checks.integrity !== false;

    const sections = (manifest.sections || []).length
      ? manifest.sections
      : sectionsCoveredBy(known).map((section) => ({
          key: section.key,
          category: section.category,
          restorable: section.restorable !== false,
          implied_by: section.impliedBy || null,
          record_count: countOf(payload[section.modules[0]]),
        }));

    // What the restore would actually replace, counted from the live database.
    const replaces = [];
    for (const mod of sortByDependencies(BACKUP_MODULES.filter((m) => known.includes(m.key)))) {
      if (mod.restorable === false) continue;
      replaces.push({ key: mod.key, section: mod.section, existing: await recordCount(req.businessId, mod) });
    }

    const warnings = [];
    if (!checks.format_ok) warnings.push('format');
    if (!checks.business_match) warnings.push('business');
    if (checks.integrity === false) warnings.push('integrity');
    if (sections.some((s) => s.restorable === false && !s.implied_by)) warnings.push('reference_only');

    res.json({
      id: backup.id,
      name: backup.name,
      backup_type: backup.backup_type,
      status: backup.status,
      created_at: backup.created_at,
      created_by_name: backup.created_by_name,
      size_bytes: backup.size_bytes,
      format_version: manifest.format_version || backup.format_version,
      schema_version: manifest.schema_version || null,
      checks,
      valid,
      sections,
      replaces,
      protected_data: PROTECTED_DATA,
      warnings,
      media: await imageReport(payload, req.businessId),
    });
  }),
);

/* ------------------------------------------------------------------ restore */

const FK_FIELDS = {
  menu_products: { category_id: 'categories' },
  orders: { table_id: 'tables' },
  order_items: { product_id: 'products', order_id: 'orders' },
  order_audit: { order_id: 'orders' },
  receipt_prints: { order_id: 'orders' },
  promotions: { product_id: 'products', category_id: 'categories' },
  advertisements: { product_id: 'products', category_id: 'categories' },
  reviews: { order_id: 'orders' },
};

async function fkExists(client, table, id) {
  if (!id) return false;
  const { rows } = await client.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id]);
  return rows.length > 0;
}

/**
 * Restores a stored or uploaded backup into the caller's own business.
 * Order is dependency-safe, everything runs inside one transaction, every
 * business_id is forced to the target tenant, and reference-only sections
 * (memberships, audit trail) are never written back.
 */
router.post(
  '/:id/restore',
  ah(async (req, res) => {
    if (req.body?.confirm !== true) throw bad('CONFIRMATION_REQUIRED');
    const backup = await loadBackup(req);

    const manifest = backup.manifest || {};
    if (String(manifest.format_version || '').split('.')[0] !== FORMAT_VERSION.split('.')[0]) {
      throw bad('INCOMPATIBLE_FORMAT');
    }
    if (manifest.business_id && manifest.business_id !== req.businessId) {
      throw bad('CROSS_BUSINESS_RESTORE');
    }
    if (manifest.checksum && archiveChecksum(manifest, backup.payload) !== manifest.checksum) {
      throw bad('INTEGRITY_FAILED');
    }

    const payload = backup.payload && typeof backup.payload === 'object' ? backup.payload : {};
    const availableKeys = Object.keys(payload).filter((key) => moduleByKey(key));
    if (!availableKeys.length) throw bad('NO_KNOWN_MODULES');

    // A verified safety copy of the current data, created before anything changes.
    let preRestoreBackupId = null;
    if (req.body?.pre_restore_backup !== false) {
      const safety = await createBackup({
        businessId: req.businessId,
        user: req.user,
        mode: 'full',
      });
      preRestoreBackupId = safety.id;
    }

    const modules = sortByDependencies(BACKUP_MODULES.filter((m) => availableKeys.includes(m.key)));
    const restorable = modules.filter((m) => m.restorable !== false);
    const skipped = modules.filter((m) => m.restorable === false).map((m) => m.key);

    const summary = [];
    const warnings = [];

    await tx(async (c) => {
      for (const mod of restorable) {
        const data = payload[mod.key];
        if (data === null || data === undefined) continue;

        if (mod.exportMode === 'rows') {
          await c.query(`DELETE FROM ${mod.table} WHERE business_id = $1`, [req.businessId]);
          const list = Array.isArray(data) ? data : [data];
          const fks = FK_FIELDS[mod.key] || {};
          let restored = 0;
          let skippedRows = 0;
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
              skippedRows += 1;
            }
          }
          summary.push({ key: mod.key, section: mod.section, restored, skipped: skippedRows });
        } else {
          // Business columns: only the columns this module owns are written back.
          const record = Array.isArray(data) ? data[0] : data;
          if (!record) continue;
          const allowed = mod.restoreColumns || mod.columns;
          const cols = allowed.filter((col) => col in record);
          if (!cols.length) continue;
          const values = [req.businessId, ...cols.map((col) => {
            const v = record[col];
            // JSONB columns arrive as objects; numeric columns arrive as strings
            // and must not be quoted a second time.
            if (v !== null && typeof v === 'object') return JSON.stringify(v);
            return v ?? null;
          })];
          const sets = cols.map((col, i) => `${col} = $${i + 2}`).join(', ');
          await c.query(
            `UPDATE businesses SET ${sets}, updated_at = now() WHERE id = $1`,
            values,
          );
          summary.push({ key: mod.key, section: mod.section, restored: 1, skipped: 0 });
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
      skipped_sections: skipped,
      modules_restored: summary.length,
      pre_restore_backup_id: preRestoreBackupId,
      business_id: req.businessId,
    });
  }),
);

/* ------------------------------------------------- reset sample data */

/*
 * What may be removed lives in lib/reset-modules.js — one entry per card of the
 * Reset Sample Data page, every one of them scoped to `is_sample = true`. This
 * route only validates the request, re-counts inside the transaction, runs the
 * selected modules and reports exactly what happened.
 */

// A prepared reset is submitted with a request id. A double click or a network
// retry of the same confirmation must not remove data twice, so a repeat of the
// same id answers with the first run's result instead of deleting again.
const RUN_TTL_MS = 5 * 60 * 1000;
const recentRuns = new Map();

const rememberRun = (key, result) => {
  const now = Date.now();
  for (const [id, entry] of recentRuns) if (now - entry.at > RUN_TTL_MS) recentRuns.delete(id);
  recentRuns.set(key, { at: now, result });
};

/** Modules of one business with their live eligible / blocked / total counts. */
router.get(
  '/reset-sample',
  perm('reset_sample.full'),
  ah(async (req, res) => {
    res.json({
      modules: await resetStats(pool, req.businessId),
      protected: PROTECTED,
    });
  }),
);

router.post(
  '/reset-sample',
  perm('reset_sample.full'),
  ah(async (req, res) => {
    const requested = Array.isArray(req.body?.modules) ? req.body.modules : [];
    const keys = [...new Set(requested.filter((k) => typeof k === 'string' && resetModule(k)))];
    if (!keys.length) throw bad('NO_MODULES_SELECTED');

    const requestId = typeof req.body?.request_id === 'string' ? req.body.request_id.slice(0, 80) : '';
    const runKey = requestId ? `${req.businessId}:${requestId}` : null;
    if (runKey && recentRuns.has(runKey)) {
      const hit = recentRuns.get(runKey);
      if (Date.now() - hit.at <= RUN_TTL_MS) return res.json({ ...hit.result, duplicate: true });
    }

    // One transaction: either every selected module really ran, or nothing was
    // removed and the client is told which modules were affected by the failure.
    const results = [];
    await tx(async (c) => {
      for (const key of EXECUTION_ORDER) {
        if (!keys.includes(key)) continue;
        const mod = resetModule(key);
        const { eligible = 0, blocked = 0 } = await mod.stats(c, req.businessId);
        if (!eligible) {
          results.push({ key, status: blocked ? 'blocked' : 'empty', removed: 0, blocked });
          continue;
        }
        results.push({ key, status: 'done', removed: await mod.remove(c, req.businessId), blocked });
      }
    });

    // Proof the protected core survived, read back from the database.
    const alive = await q(
      `SELECT
         (SELECT count(*)::int FROM businesses WHERE id = $1) AS business,
         (SELECT count(*)::int FROM memberships WHERE business_id = $1 AND role = 'owner') AS owners,
         (SELECT count(*)::int FROM users WHERE id IN (SELECT user_id FROM memberships WHERE business_id = $1)) AS members,
         (SELECT count(*)::int FROM activity_log WHERE business_id = $1) AS audit`,
      [req.businessId],
    );

    const payload = {
      ok: true,
      results,
      removed: results.reduce((sum, r) => sum + r.removed, 0),
      blocked: results.filter((r) => r.status === 'blocked').map((r) => r.key),
      protected: PROTECTED,
      still_present: alive.rows[0],
      modules: await resetStats(pool, req.businessId),
    };
    if (runKey) rememberRun(runKey, payload);
    res.json(payload);
  }),
);

export default router;
