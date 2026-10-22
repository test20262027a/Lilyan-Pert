import { q } from '../db.js';
import { isUuid } from './http.js';

/*
 * Admin activity log.
 *
 * The app already records two audit streams of its own — `order_status_history`
 * (every real status change) and `receipt_prints` (every "user pressed Print").
 * Everything else an authorized member changes (a product, a table, a promotion,
 * a business setting, a membership) was not recorded anywhere, so this module
 * writes those into `activity_log`.
 *
 * It deliberately logs only what actually happened: a row is written after a
 * mutation answered with a success status, from the authenticated member that
 * made the request. Nothing is back-filled, so the log has no invented history —
 * it starts the moment this module is deployed.
 */

/** Which admin mutation belongs to which entity. Longest match wins. */
const ROUTES = [
  { re: /^\/api\/catalog\/categories/, entity: 'category' },
  { re: /^\/api\/catalog\/products/, entity: 'product' },
  { re: /^\/api\/manage\/tables/, entity: 'table' },
  { re: /^\/api\/manage\/ads/, entity: 'ad' },
  { re: /^\/api\/manage\/promotions/, entity: 'promotion' },
  { re: /^\/api\/manage\/reviews/, entity: 'review' },
  { re: /^\/api\/manage\/users/, entity: 'user' },
  { re: /^\/api\/business/, entity: 'settings' },
  // A reset logs the modules it touched — never the records it removed.
  {
    re: /^\/api\/backups\/reset-sample/,
    entity: 'reset',
    action: 'deleted',
    label: (body) =>
      Array.isArray(body?.modules)
        ? body.modules.filter((k) => typeof k === 'string').slice(0, 10).join(', ').slice(0, 120)
        : null,
  },
  { re: /^\/api\/backups\/[^/]+\/restore/, entity: 'backup', action: 'restored' },
  { re: /^\/api\/backups\/upload/, entity: 'backup', action: 'created' },
  { re: /^\/api\/backups/, entity: 'backup' },
];

const ACTIONS = { POST: 'created', PUT: 'updated', PATCH: 'updated', DELETE: 'deleted' };

/** The human label of the record, taken from the payload the client just saved. */
function labelFrom(body) {
  for (const key of ['name', 'name_en', 'name_ku', 'title', 'title_en', 'full_name', 'email']) {
    const value = body?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 120);
  }
  return null;
}

/**
 * Which recorded changes also raise a notification in the header feed.
 *
 * Only changes an owner must not miss — access, business configuration,
 * backups and sample-data resets — are delivered. Routine catalogue edits stay
 * in the activity report alone, so the unread badge keeps meaning something.
 */
const NOTIFY_ENTITIES = new Set(['user', 'settings', 'backup', 'reset']);

/** Writes one row. Best-effort: an audit failure never breaks the request. */
export async function recordActivity({
  businessId,
  actorId,
  actorName,
  entity,
  action,
  entityId,
  entityLabel,
  path,
}) {
  try {
    await q(
      `INSERT INTO activity_log (business_id, actor_id, actor_name, entity, action, entity_id, entity_label, path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        businessId,
        isUuid(actorId) ? actorId : null,
        actorName ? String(actorName).slice(0, 120) : null,
        entity,
        action,
        isUuid(entityId) ? entityId : null,
        entityLabel,
        path ? String(path).slice(0, 200) : null,
      ],
    );

    /*
     * The notification stores the machine fields (`entity:action`) plus the
     * record label, so the client renders it in the viewer's own language
     * instead of freezing prose in one language for every reader.
     */
    if (NOTIFY_ENTITIES.has(entity)) {
      await q(
        `INSERT INTO notifications (business_id, type, title, body)
         VALUES ($1,'activity',$2,$3)`,
        [
          businessId,
          entityLabel ? String(entityLabel).slice(0, 120) : actorName || '',
          `${entity}:${action}`,
        ],
      );
    }
  } catch (err) {
    console.warn('[activity] could not record entry:', err?.message || err);
  }
}

/**
 * Express middleware: records a successful authenticated mutation of a
 * business-owned module. Mounted app-wide, before the routers, so it sees the
 * real path; the session and business are read on response finish, once the
 * routers' own middleware has resolved them.
 */
export function activityLogger(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const route = ROUTES.find((r) => r.re.test(req.path));
  if (!route) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return; // only changes that really happened
    // No session or no business means this was not an authorized member action.
    if (!req.user || !req.businessId) return;
    recordActivity({
      businessId: req.businessId,
      actorId: req.user.id,
      actorName: req.user.full_name || req.user.email,
      entity: route.entity,
      action: route.action || ACTIONS[req.method],
      entityId: req.params?.id || null,
      entityLabel: route.label ? route.label(req.body) : route.entity === 'settings' ? labelFrom(req.body) : null,
      path: req.path,
    });
  });

  return next();
}
