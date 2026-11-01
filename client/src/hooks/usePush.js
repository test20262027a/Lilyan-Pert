import { useCallback, useEffect, useRef, useState } from 'react';
import { del, get, post } from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * What this browser context can actually do about system notifications.
 *
 * The preview renders the app inside an iframe. Browsers only let a
 * cross-origin frame ask for the notification permission when the frame carries
 * an explicit `notifications` permission policy; without it Notification.permission
 * already reads "denied" and requestPermission() resolves "denied" instantly.
 * That is a limitation of the frame, not a choice the user made, so it is
 * reported separately and never treated as a permanent denial.
 */
export function notificationContext() {
  if (typeof window === 'undefined') {
    return { supported: false, embedded: false, secure: false, permission: 'unsupported' };
  }
  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch {
    embedded = true; // a cross-origin parent we are not allowed to inspect
  }
  return {
    supported:
      'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
    embedded,
    secure: window.isSecureContext !== false,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
  };
}

/**
 * Real Web Push subscription flow. Every failure mode is reported honestly so
 * the UI never shows a success state that did not happen, and the surrounding
 * context (iframe, insecure origin, denied permission) is distinguished from a
 * genuine subscription error.
 */
export function usePush(locale) {
  /*
   * The panel's language travels with every subscription call, so a push is
   * localized from the device's own record rather than from whatever page the
   * server happens to receive. The ref keeps the callbacks stable.
   */
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const [state, setState] = useState({
    ...notificationContext(),
    subscribed: false,
    devices: 0,
    deviceList: [],
    thisEndpoint: '',
    busy: false,
    testing: false,
  });
  const regRef = useRef(null);

  /*
   * The browser is the authority on this device's subscription; the server is
   * the authority on which devices it will push to. Reading the browser first
   * and re-posting its subscription keeps the two in step after a reload (the
   * endpoint can rotate), so the device list below is never stale.
   */
  const refreshStatus = useCallback(async () => {
    const ctx = notificationContext();

    let thisEndpoint = '';
    if (ctx.supported) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          thisEndpoint = sub.endpoint;
          await post('/manage/push/subscribe', {
            subscription: sub.toJSON(),
            locale: localeRef.current,
          }).catch(() => {});
        }
      } catch {
        thisEndpoint = '';
      }
    }

    let devices = 0;
    let deviceList = [];
    try {
      const status = await get('/manage/push/status');
      devices = status.devices;
      deviceList = status.mine || [];
    } catch {
      devices = 0;
    }

    setState((s) => ({
      ...s,
      ...ctx,
      devices,
      deviceList,
      thisEndpoint,
      subscribed: Boolean(thisEndpoint),
    }));
  }, []);

  // Initial read, then a fresh read whenever the app regains focus — the user
  // may have changed the permission in the browser UI while it was away.
  useEffect(() => {
    refreshStatus();
    const recheck = () => refreshStatus();
    const onVisible = () => {
      if (!document.hidden) recheck();
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshStatus]);

  /*
   * A language switch reaches this account's registered devices immediately —
   * including a tablet whose panel is closed — so the next card arrives in the
   * language the owner just chose.
   */
  const sentLocale = useRef(locale);
  useEffect(() => {
    if (!locale || locale === sentLocale.current) return;
    sentLocale.current = locale;
    post('/manage/push/language', { locale }).catch(() => {});
  }, [locale]);

  const enable = useCallback(async () => {
    const ctx = notificationContext();
    if (!ctx.supported) return { ok: false, reason: 'unsupported' };
    if (!ctx.secure) return { ok: false, reason: 'insecure' };

    // No prompt can appear in the frame: explain it instead of letting the
    // browser hand back a "denied" the user never chose.
    if (ctx.embedded && ctx.permission !== 'granted') {
      setState((s) => ({ ...s, ...ctx, busy: false }));
      return { ok: false, reason: 'preview' };
    }

    setState((s) => ({ ...s, ...ctx, busy: true }));
    try {
      // Called straight from the click — nothing is awaited before it.
      const permission =
        ctx.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((s) => ({ ...s, permission, busy: false }));
        return { ok: false, reason: permission === 'denied' ? 'denied' : 'dismissed' };
      }

      const reg = regRef.current || (await navigator.serviceWorker.register('/sw.js'));
      regRef.current = reg;
      await navigator.serviceWorker.ready;

      const { public_key } = await get('/manage/push/public-key');
      if (!public_key) throw new Error('NO_VAPID_KEY');

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(public_key),
        });
      }
      await post('/manage/push/subscribe', {
        subscription: sub.toJSON(),
        locale: localeRef.current,
      });
      setState((s) => ({ ...s, permission, subscribed: true, busy: false }));
      await refreshStatus();
      return { ok: true };
    } catch (err) {
      setState((s) => ({ ...s, busy: false }));
      return { ok: false, reason: 'failed', error: String(err?.message || err) };
    }
  }, [refreshStatus]);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, busy: true }));
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await post('/manage/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState((s) => ({ ...s, subscribed: false, busy: false }));
      await refreshStatus();
      return { ok: true };
    } catch (err) {
      setState((s) => ({ ...s, busy: false }));
      return { ok: false, error: String(err?.message || err) };
    }
  }, [refreshStatus]);

  const sendTest = useCallback(async () => {
    setState((s) => ({ ...s, testing: true }));
    try {
      const report = await post('/manage/push/test', {});
      setState((s) => ({ ...s, testing: false }));
      return { ok: (report?.sent || 0) > 0, ...report };
    } catch (err) {
      setState((s) => ({ ...s, testing: false }));
      return { ok: false, sent: 0, total: 0, error: String(err?.code || err?.message || err) };
    }
  }, []);

  /** Forgets one of this account's own devices on the server. */
  const removeDevice = useCallback(
    async (id) => {
      try {
        await del(`/manage/push/devices/${id}`);
        await refreshStatus();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: String(err?.code || err?.message || err) };
      }
    },
    [refreshStatus],
  );

  return { ...state, enable, disable, refreshStatus, sendTest, removeDevice };
}
