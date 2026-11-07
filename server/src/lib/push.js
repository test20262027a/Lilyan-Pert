/**
 * Backend side of the new-order push notification.
 *
 * Only a new order and an explicit test are pushed; order status changes stay
 * in the Activity feed. The payload carries everything the system notification
 * shows — business name, order number, table, order time and a one-line order
 * summary — so the service worker renders it without asking the API (a push
 * handler has no session).
 */
import webpush from 'web-push';
import { q } from '../db.js';
import { resolveLanguage } from './languages.js';
import { effectivePermissions } from './permissions.js';
import { newOrderMessage, testMessage } from './notification-text.js';

let cachedKeys = null;

export async function getVapidKeys() {
  if (cachedKeys) return cachedKeys;
  const rows = await q(
    `SELECT key, value FROM app_settings WHERE key IN ('vapid_public','vapid_private')`,
  );
  const map = Object.fromEntries(rows.rows.map((r) => [r.key, r.value]));
  if (map.vapid_public && map.vapid_private) {
    cachedKeys = { publicKey: map.vapid_public, privateKey: map.vapid_private };
  } else {
    const generated = webpush.generateVAPIDKeys();
    await q(
      `INSERT INTO app_settings (key, value) VALUES ('vapid_public',$1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [generated.publicKey],
    );
    await q(
      `INSERT INTO app_settings (key, value) VALUES ('vapid_private',$1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [generated.privateKey],
    );
    cachedKeys = generated;
  }
  webpush.setVapidDetails(
    'mailto:hello@lilyan.app',
    cachedKeys.publicKey,
    cachedKeys.privateKey,
  );
  return cachedKeys;
}

/**
 * The language one device is written to.
 *
 * The subscription's own saved language wins, then the language stored on the
 * account, and either is dropped when the owner has since disabled it — a
 * disabled language must never be printed. The business's configured default
 * enabled language is the fallback, so a card is never English by accident.
 */
function localeOf(business, ...candidates) {
  const settings = business?.menu_settings?.language_settings;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = resolveLanguage(settings, candidate);
    if (resolved === candidate) return resolved;
  }
  return resolveLanguage(settings, null);
}

/** The language of the text, so the OS lays out its own labels correctly. */
function languageOf(locale) {
  return { lang: locale, dir: ['ku', 'fa', 'ar'].includes(locale) ? 'rtl' : 'ltr' };
}

/*
 * The one picture the OS renders. A logo stored as media is reachable through
 * the public media route, which is what a push service can fetch without a
 * session; anything else falls back to the installed app icon.
 */
function iconUrl(business) {
  const logo = String(business?.logo_url || '');
  const media = logo.match(/\/api\/(?:manage|public)\/media\/([0-9a-f-]{36})/i);
  return media ? `/api/public/media/${media[1]}` : '/apple-touch-icon.png';
}

/** Order time in the business's own timezone; digits follow the language later. */
function orderTime(value, timeZone) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '';
  }
}

/*
 * A push service can answer 429 or 5xx for a moment; those are worth retrying.
 * A 404/410 means the browser really threw the subscription away, and any
 * other answer (403 = this server's VAPID key is not the one the browser
 * subscribed to) is not fixed by repeating the send.
 */
const retryable = (status) => status === 429 || (typeof status === 'number' && status >= 500);

/** The push service host — enough to identify a failing device in a log line. */
function endpointHost(endpoint) {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'unknown-host';
  }
}

async function sendOnce(subscription, body, options) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await webpush.sendNotification(subscription, body, options);
      return;
    } catch (err) {
      if (!retryable(err?.statusCode) || attempt >= 2) throw err;
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    }
  }
}

/**
 * Sends one payload per subscription. Expired endpoints (404/410) are pruned so
 * the registry stays truthful, and every other failure is logged with its push
 * service answer — a silently dropped card is impossible to diagnose on a real
 * device, so the reason is always on the server's own record.
 * Returns a delivery report — callers must not claim success when nothing was
 * delivered.
 */
async function deliver(subscriptions, build) {
  const report = { total: subscriptions.length, sent: 0, failed: 0, pruned: 0 };
  for (const s of subscriptions) {
    const { body, options } = build(s);
    try {
      await sendOnce({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, options);
      report.sent += 1;
    } catch (err) {
      report.failed += 1;
      const status = Number(err?.statusCode) || 0;
      console.warn(
        `[push] device ${s.id} (${endpointHost(s.endpoint)}) not delivered: ${
          status ? `HTTP ${status}` : err?.message || 'no status'
        }`,
      );
      if (status === 404 || status === 410) {
        // The browser threw this subscription away (app uninstalled, data
        // cleared, endpoint expired): forget it instead of retrying forever.
        await q('DELETE FROM push_subscriptions WHERE id = $1', [s.id]);
        report.pruned += 1;
      } else if (status === 401 || status === 403) {
        // This device subscribed with a different VAPID key (the server's keys
        // were regenerated). Only a fresh subscribe from the device fixes it.
        console.warn('[push] this device must re-subscribe: VAPID key mismatch');
      } else if (status === 413) {
        console.warn('[push] payload too large for this push service');
      }
    }
  }
  return report;
}

/**
 * The new-order push for every device subscribed to this business. The order id
 * is the notification tag, so a retried or repeated send for one order replaces
 * the previous card instead of stacking a second one.
 */
export async function pushNewOrder(business, order) {
  await getVapidKeys();

  /*
   * Every device subscribed to THIS business is considered, then filtered the
   * same way the panel itself authorizes a request (see attachSession): an
   * active membership holding `orders.view` receives the order, and the
   * platform's Super Admin acts as owner of the business it subscribed from —
   * that account belongs to no membership row, so a JOIN on memberships used to
   * drop it and every new-order push was addressed to nobody. A removed or
   * disabled account, and a membership without order access (a customer login
   * on the same device), still never receive private order information.
   */
  const { rows } = await q(
    `SELECT s.id, s.endpoint, s.p256dh, s.auth, s.locale,
            u.locale AS user_locale, u.is_super_admin,
            m.role, m.permissions, m.status
       FROM push_subscriptions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN memberships m ON m.user_id = s.user_id AND m.business_id = s.business_id
      WHERE s.business_id = $1`,
    [business.id],
  );
  const recipients = rows.filter(
    (s) =>
      s.is_super_admin ||
      (s.status === 'active' &&
        effectivePermissions(s.role, s.permissions).includes('orders.view')),
  );
  if (!recipients.length) return { total: 0, sent: 0, failed: 0, pruned: 0 };

  const icon = iconUrl(business);
  const time = orderTime(order.created_at, business.timezone);
  const money = `${Number(order.total || 0).toLocaleString('en-US')} ${business.currency || ''}`.trim();
  const url = `/orders?order=${order.id}`;

  return deliver(recipients, (s) => {
    const locale = localeOf(business, s.locale, s.user_locale);
    const { title, body } = newOrderMessage(locale, {
      businessName: business.name,
      orderNumber: order.order_number,
      tableName: order.table_name,
      time,
      itemCount: order.item_count || 0,
      total: money,
    });
    return {
      body: JSON.stringify({
        type: 'new_order',
        category: 'orders',
        orderId: order.id,
        title,
        body,
        icon,
        url,
        ...languageOf(locale),
      }),
      /*
       * A new order matters now: `high` urgency asks the push service to wake a
       * dozing/locked phone immediately instead of batching it, and the one-hour
       * TTL drops the card rather than delivering a stale order a day later.
       */
      options: { TTL: 3600, urgency: 'high', timeout: 8000 },
    };
  });
}

/** A real push to the asking user's own devices only — nobody else is woken. */
export async function pushTest(userId, businessId) {
  await getVapidKeys();
  const { rows } = await q(
    `SELECT s.id, s.endpoint, s.p256dh, s.auth, s.locale, u.locale AS user_locale
       FROM push_subscriptions s JOIN users u ON u.id = s.user_id
      WHERE s.user_id = $1 AND s.business_id = $2`,
    [userId, businessId],
  );
  if (!rows.length) return { total: 0, sent: 0, failed: 0, pruned: 0 };

  const [business] = (
    await q('SELECT name, logo_url, menu_settings FROM businesses WHERE id = $1', [businessId])
  ).rows;
  const icon = iconUrl(business);
  return deliver(rows, (s) => {
    const locale = localeOf(business, s.locale, s.user_locale);
    const { title, body } = testMessage(locale, business?.name);
    return {
      body: JSON.stringify({
        type: 'test',
        title,
        body,
        icon,
        url: '/',
        ...languageOf(locale),
      }),
      options: { TTL: 300, urgency: 'high', timeout: 8000 },
    };
  });
}

export async function pushDeliverable() {
  const keys = await getVapidKeys();
  return Boolean(keys.publicKey && keys.privateKey);
}
