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

/**
 * Sends one payload per subscription. Expired endpoints (404/410) are pruned so
 * the registry stays truthful. Returns a delivery report — callers must not
 * claim success when nothing was delivered.
 */
async function deliver(subscriptions, build) {
  const report = { total: subscriptions.length, sent: 0, failed: 0, pruned: 0 };
  for (const s of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        build(s),
      );
      report.sent += 1;
    } catch (err) {
      report.failed += 1;
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await q('DELETE FROM push_subscriptions WHERE id = $1', [s.id]);
        report.pruned += 1;
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

  const { rows } = await q(
    `SELECT s.id, s.endpoint, s.p256dh, s.auth, s.locale, u.locale AS user_locale
       FROM push_subscriptions s JOIN users u ON u.id = s.user_id
      WHERE s.business_id = $1`,
    [business.id],
  );
  if (!rows.length) return { total: 0, sent: 0, failed: 0, pruned: 0 };

  const icon = iconUrl(business);
  const time = orderTime(order.created_at, business.timezone);
  const money = `${Number(order.total || 0).toLocaleString('en-US')} ${business.currency || ''}`.trim();
  const url = `/orders?order=${order.id}`;

  return deliver(rows, (s) => {
    const locale = localeOf(business, s.locale, s.user_locale);
    const { title, body } = newOrderMessage(locale, {
      businessName: business.name,
      orderNumber: order.order_number,
      tableName: order.table_name,
      time,
      itemCount: order.item_count || 0,
      total: money,
    });
    return JSON.stringify({
      type: 'new_order',
      orderId: order.id,
      title,
      body,
      icon,
      url,
      ...languageOf(locale),
    });
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
    return JSON.stringify({ type: 'test', title, body, icon, url: '/', ...languageOf(locale) });
  });
}

export async function pushDeliverable() {
  const keys = await getVapidKeys();
  return Boolean(keys.publicKey && keys.privateKey);
}
