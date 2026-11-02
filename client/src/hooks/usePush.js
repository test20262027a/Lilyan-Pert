import { useCallback, useEffect, useRef, useState } from 'react';
import { del, get, post } from '../api';
import { subscribeDevice, unsubscribeDevice } from '../push/pushClient';

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

  /*
   * The browser is the authority on this device's subscription; the server is
   * the authority on which devices it will push to. Reading the browser first
   * and re-posting its subscription keeps the two in step after a reload (the
   * endpoint can rotate), so the device list below is never stale.
   */
  const refreshStatus = useCallback(async () => {
    const ctx = notificationContext();

    let thisEndpoint = '';
    if (ctx.supported && ctx.permission === 'granted') {
      // The shared client re-posts an existing subscription (and stores the
      // VAPID key for the worker), so this device stays registered after a
      // reload or an endpoint rotation without asking for anything new.
      await subscribeDevice(localeRef.current).catch(() => {});
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        thisEndpoint = sub ? sub.endpoint : '';
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
      // Called straight from the click — the helper asks for the permission
      // before it awaits anything else, which is what the browser requires.
      const result = await subscribeDevice(localeRef.current, { prompt: true });
      if (!result.ok) {
        const permission = 'Notification' in window ? Notification.permission : ctx.permission;
        setState((s) => ({ ...s, permission, busy: false }));
        return result;
      }
      setState((s) => ({ ...s, permission: 'granted', subscribed: true, busy: false }));
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
      const result = await unsubscribeDevice();
      if (!result.ok) throw new Error(result.error || 'UNSUBSCRIBE_FAILED');
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
