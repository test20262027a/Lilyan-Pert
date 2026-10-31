/**
 * Backend side of the new-order push notification. Only new orders are pushed;
 * status changes never reach Web Push.
 */
import webpush from 'web-push';
import { q } from '../db.js';

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

const TITLES = {
  ku: 'داواکاری نوێ',
  fa: 'سفارش جدید',
  ar: 'طلب جديد',
  en: 'New order',
};

export function newOrderTitle(locale) {
  return TITLES[locale] || TITLES.en;
}

/**
 * Sends the new-order push to every device subscribed for this business.
 * Expired endpoints (404/410) are pruned. Returns a truthful delivery report —
 * callers must not report success when nothing was delivered.
 */
export async function pushNewOrder(businessId, order) {
  await getVapidKeys();

  const subs = await q(
    `SELECT s.id, s.endpoint, s.p256dh, s.auth, u.locale
       FROM push_subscriptions s JOIN users u ON u.id = s.user_id
      WHERE s.business_id = $1`,
    [businessId],
  );

  const report = { total: subs.rowCount, sent: 0, failed: 0, pruned: 0 };
  if (subs.rowCount === 0) return report;

  for (const s of subs.rows) {
    const title = newOrderTitle(s.locale);
    const body = order.table_name
      ? `#${order.order_number} · ${order.table_name}`
      : `#${order.order_number}`;
    const payload = JSON.stringify({
      type: 'new_order',
      title,
      body,
      orderId: order.id,
      orderNumber: order.order_number,
      // The order list opens the details modal from `?order=…`; there is no
      // standalone order page any more, so a `/orders/:id` link would only
      // redirect and lose the order the notification was about.
      url: `/orders?order=${order.id}`,
    });
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
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

export async function pushDeliverable() {
  const keys = await getVapidKeys();
  return Boolean(keys.publicKey && keys.privateKey);
}
