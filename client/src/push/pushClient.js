/*
 * Web Push subscription, shared by the notification provider and the settings
 * card.
 *
 * The provider calls `syncPushDevice` on every app start, so a subscription is
 * restored (or renewed after the endpoint rotated) no matter which page the
 * administrator opened — not only the dashboard. The settings card calls
 * `subscribeDevice` with `prompt: true`, because that one runs on a real click
 * and may ask for the browser permission.
 *
 * The VAPID public key is also written to IndexedDB: the service worker cannot
 * read a session or a config file, so that copy is what lets it renew a lost
 * subscription while no page is open.
 */
import { get, post } from '../api';

const DB_NAME = 'lilyan-push';
const STORE = 'keys';
const VAPID_KEY = 'vapid';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/** True when this browser can hold a real push subscription at all. */
export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('NO_IDB'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Keeps the VAPID key where the service worker can find it after a rotation. */
export async function rememberVapidKey(key) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(key, VAPID_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* renewal is best-effort; the next page load re-registers instead */
  }
}

/** The worker that owns this origin, registered if it is not there yet. */
async function readyRegistration() {
  const existing = await navigator.serviceWorker.getRegistration();
  const reg = existing || (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Subscribes this device and registers it with the backend under the active
 * business. `prompt` is only ever true from a click, so the browser prompt is
 * raised directly from the user gesture the policy requires.
 */
export async function subscribeDevice(locale, { prompt = false } = {}) {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  if (window.isSecureContext === false) return { ok: false, reason: 'insecure' };

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      if (!prompt) return { ok: false, reason: 'no-permission' };
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      return { ok: false, reason: permission === 'denied' ? 'denied' : 'dismissed' };
    }

    const reg = await readyRegistration();
    const { public_key: publicKey } = await get('/manage/push/public-key');
    if (!publicKey) return { ok: false, reason: 'no-key' };
    await rememberVapidKey(publicKey);

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // The server owns the registry: re-posting an existing subscription keeps
    // the business, the language and the keys in step after a reload.
    await post('/manage/push/subscribe', {
      subscription: subscription.toJSON(),
      locale,
    });
    return { ok: true, subscription };
  } catch (err) {
    return { ok: false, reason: 'failed', error: String(err?.message || err) };
  }
}

/**
 * The silent restore. It never asks for a permission the user has not already
 * granted, so it is safe to run on every app start and whenever the network
 * comes back.
 */
export async function syncPushDevice(locale) {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  if (Notification.permission !== 'granted') return { ok: false, reason: 'no-permission' };
  return subscribeDevice(locale, { prompt: false });
}

/** Unsubscribes this device and forgets it on the server. */
export async function unsubscribeDevice() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = reg ? await reg.pushManager.getSubscription() : null;
    if (!subscription) return { ok: true };
    await post('/manage/push/unsubscribe', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}
