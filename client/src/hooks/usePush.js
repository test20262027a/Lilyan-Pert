import { useCallback, useEffect, useRef, useState } from 'react';
import { get, post } from '../api';

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
export function usePush() {
  const [state, setState] = useState({
    ...notificationContext(),
    subscribed: false,
    devices: 0,
    busy: false,
  });
  const regRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    const ctx = notificationContext();

    let devices = 0;
    try {
      const status = await get('/manage/push/status');
      devices = status.devices;
    } catch {
      devices = 0;
    }

    let subscribed = false;
    if (ctx.supported) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        subscribed = Boolean(sub);
        // The browser holds the subscription; the server holds the row it sends
        // to. Re-posting the same endpoint keeps the two in step after a reload
        // (the endpoint itself can rotate) and is an upsert, never a duplicate.
        if (sub) {
          await post('/manage/push/subscribe', { subscription: sub.toJSON() }).catch(() => {});
        }
      } catch {
        subscribed = false;
      }
    }

    setState((s) => ({ ...s, ...ctx, devices, subscribed }));
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
      await post('/manage/push/subscribe', { subscription: sub.toJSON() });
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

  return { ...state, enable, disable, refreshStatus };
}
