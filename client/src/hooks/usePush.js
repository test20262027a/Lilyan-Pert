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
 * Real Web Push subscription flow. Every failure mode is reported honestly so
 * the UI never shows a success state that did not happen.
 */
export function usePush() {
  const [state, setState] = useState({
    supported: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window,
    permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
    subscribed: false,
    devices: 0,
    busy: false,
  });
  const regRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    let devices = 0;
    try {
      const status = await get('/manage/push/status');
      devices = status.devices;
    } catch {
      devices = 0;
    }
    let subscribed = false;
    if (state.supported) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        subscribed = Boolean(sub);
      } catch {
        subscribed = false;
      }
    }
    setState((s) => ({ ...s, devices, subscribed }));
  }, [state.supported]);

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = useCallback(async () => {
    if (!state.supported) return { ok: false, reason: 'unsupported' };
    setState((s) => ({ ...s, busy: true }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((s) => ({ ...s, permission, busy: false }));
        return { ok: false, reason: 'denied' };
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
  }, [state.supported, refreshStatus]);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, busy: true }));
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
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
