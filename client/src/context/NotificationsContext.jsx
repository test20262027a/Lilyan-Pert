import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { localizedFallback, useI18n } from '../i18n';
import { get, post } from '../api';
import { playSound, unlockAudio, DEFAULT_SOUND, DEFAULT_VOLUME } from '../sound';
import { syncPushDevice } from '../push/pushClient';
import NotificationAlertHost from '../components/notifications/NotificationAlertHost';

/*
 * The one notification listener of the application.
 *
 * It is mounted at the root, above the router and every page, so an order is
 * announced while the administrator is on the dashboard, inside the customer
 * ordering panel, in menu management, in settings — anywhere. Nothing here is
 * tied to the dashboard being open:
 *
 *   • the feed is polled while the page is visible, so the badge and the
 *     alert never wait for a dashboard mount;
 *   • a background push wakes the same feed through the service worker, which
 *     is also the path that delivers while no page is open at all;
 *   • the device's push subscription is restored on every start and after the
 *     network returns, so a rotated endpoint does not silently stop delivery;
 *   • one order rings once: the order id is claimed in localStorage, so a
 *     poll and a push, or two open tabs, can never raise two sounds.
 *
 * The feed endpoint already scopes rows to this business and the caller's
 * staff membership; an account without order access never starts the poll.
 */
const NotificationsContext = createContext(null);

const POLL_MS = 20000;
const EMPTY_COUNTS = { orders: 0, reviews: 0, activities: 0, total: 0 };
const EMPTY_LISTS = { orders: [], reviews: [], activities: [] };
const CLAIM_PREFIX = 'lilyan.notif.alert.';
const CLAIM_TTL = 24 * 60 * 60 * 1000;
const SOUND_GAP_MS = 900;

/**
 * Cross-tab claim: the first tab to write the order id owns the sound and the
 * toast, every other tab only refreshes its badge. Entries are bounded and
 * expired claims are dropped, so the store cannot grow without limit.
 */
function claimAlert(key) {
  try {
    const full = `${CLAIM_PREFIX}${key}`;
    if (localStorage.getItem(full)) return false;
    localStorage.setItem(full, String(Date.now()));
    if (localStorage.length > 120) {
      const now = Date.now();
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const name = localStorage.key(i);
        if (!name || !name.startsWith(CLAIM_PREFIX)) continue;
        if (now - Number(localStorage.getItem(name) || 0) > CLAIM_TTL) localStorage.removeItem(name);
      }
    }
    return true;
  } catch {
    // Storage can be unavailable (private windows, blocked cookies): a
    // duplicate sound is better than a missed order.
    return true;
  }
}

export function NotificationsProvider({ children }) {
  const { user, businessId, can } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [lists, setLists] = useState(EMPTY_LISTS);
  const [unread, setUnread] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [alerts, setAlerts] = useState([]);

  // Staff membership with order access is the audience of this listener.
  const enabled = Boolean(user && businessId && can('orders.view'));
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const settingsRef = useRef({});
  const nameRef = useRef(null);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const tRef = useRef(t);
  tRef.current = t;

  // A first answer only establishes the baseline: orders that were already in
  // the feed when the app opened are history, not an arrival.
  const baseRef = useRef(false);
  const seenRef = useRef(new Set());
  const lastSoundRef = useRef(0);

  const raiseAlert = useCallback((row) => {
    const settings = settingsRef.current || {};
    const soundOn = settings.sound_enabled !== false;
    const savedVolume = Number(settings.sound_volume);
    const volume = Number.isFinite(savedVolume) ? savedVolume : DEFAULT_VOLUME;

    if (soundOn && volume > 0) {
      const now = Date.now();
      // Two orders in the same second share one ringtone instead of stacking
      // two tones on top of each other.
      if (now - lastSoundRef.current > SOUND_GAP_MS) {
        lastSoundRef.current = now;
        // 'blocked' means the browser has not had a gesture yet; the toast
        // below is still the honest, visible announcement.
        playSound(settings.sound_key || DEFAULT_SOUND, volume);
      }
    }

    const businessName = localizedFallback(nameRef.current, 'name', localeRef.current) || nameRef.current?.name || '';
    const label = tRef.current('dash_new_orders');
    const title = row.title ? `${label} · ${row.title}` : label;
    // The stored body is the table name; the placeholder used when an order
    // has no table is not worth printing next to the business name.
    const detail = row.body && row.body !== '—' ? row.body : '';
    const body = [detail, businessName].filter(Boolean).join(' · ');
    const id = row.order_id || row.id;

    setAlerts((list) => [
      ...list.filter((alert) => alert.id !== id).slice(-2),
      {
        id,
        orderId: row.order_id || null,
        title,
        body,
        closeLabel: tRef.current('action_close'),
      },
    ]);
  }, []);

  const dismissAlert = useCallback((id) => {
    setAlerts((list) => list.filter((alert) => alert.id !== id));
  }, []);

  const openAlert = useCallback(
    (alert) => {
      dismissAlert(alert.id);
      navigate(alert.orderId ? `/orders?order=${alert.orderId}` : '/orders');
    },
    [dismissAlert, navigate],
  );

  /**
   * One feed read. `silent` is the background-push refresh: the system card
   * already announced the order, so only the badge catches up.
   */
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabledRef.current) return null;
      try {
        const data = await get('/manage/notifications');
        const nextLists = data.lists || EMPTY_LISTS;
        // Settings and the business name arrive with the same answer, so the
        // ringtone never lags behind a saved preference.
        settingsRef.current = data.settings || settingsRef.current;
        nameRef.current = data.name || nameRef.current;

        const fresh = (nextLists.orders || []).filter(
          (row) => row.type === 'new_order' && !seenRef.current.has(row.id),
        );
        for (const row of [...(nextLists.orders || []), ...(nextLists.reviews || []), ...(nextLists.activities || [])]) {
          seenRef.current.add(row.id);
        }

        setItems(data.notifications || []);
        setLists(nextLists);
        setUnread({ ...EMPTY_COUNTS, ...(data.unread || {}) });
        setFailed(false);

        if (baseRef.current && !silent && !document.hidden) {
          // Oldest first, so a burst is announced in the order it happened.
          for (const row of fresh.reverse()) {
            if (!claimAlert(row.order_id || row.id)) continue;
            raiseAlert(row);
          }
        }
        baseRef.current = true;
        return data;
      } catch {
        setFailed(true);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [raiseAlert],
  );

  const refresh = useCallback(() => load(), [load]);

  // Listen once, wherever the router currently is.
  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLists(EMPTY_LISTS);
      setUnread(EMPTY_COUNTS);
      setLoading(false);
      baseRef.current = false;
      seenRef.current = new Set();
      settingsRef.current = {};
      nameRef.current = null;
      return undefined;
    }

    setLoading(true);
    baseRef.current = false;
    seenRef.current = new Set();
    load();

    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    // Coming back to the tab (or back online) reads immediately instead of
    // waiting for the next tick.
    const onVisible = () => {
      if (!document.hidden) load();
    };
    const onOnline = () => load();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [enabled, businessId, load]);

  /*
   * A push that arrives through the service worker wakes the same feed. The
   * visible case rings here; the hidden case was already announced by the OS,
   * so the page only refreshes its badge.
   */
  useEffect(() => {
    const onArrival = () => {
      if (enabledRef.current) load();
    };
    const onBackground = () => {
      if (enabledRef.current) load({ silent: true });
    };
    window.addEventListener('lilyan:new-order', onArrival);
    window.addEventListener('lilyan:order-arrived', onBackground);
    return () => {
      window.removeEventListener('lilyan:new-order', onArrival);
      window.removeEventListener('lilyan:order-arrived', onBackground);
    };
  }, [load]);

  /* The first gesture unlocks Web Audio, so the ringtone for an order that
     arrives later can start on its own. */
  useEffect(() => {
    if (!enabled) return undefined;
    const unlock = () => {
      unlockAudio();
    };
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, [enabled]);

  /*
   * Restores this device's push subscription on every start and after the
   * network returns. It only runs once a permission is already granted —
   * asking is the settings card's job, on its own click.
   */
  useEffect(() => {
    if (!enabled) return undefined;
    const sync = () => {
      if (document.hidden) return;
      syncPushDevice(localeRef.current).catch(() => {});
    };
    sync();
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', sync);
    };
    // A business switch must move this device to the new business's registry.
  }, [enabled, locale, businessId]);

  const markAll = useCallback(async () => {
    await post('/manage/notifications/read', {});
    await load();
  }, [load]);

  const markRead = useCallback(
    async (id) => {
      await post('/manage/notifications/read', { id });
      await load();
    },
    [load],
  );

  const value = useMemo(
    () => ({ items, lists, unread, loading, failed, refresh, markAll, markRead }),
    [items, lists, unread, loading, failed, refresh, markAll, markRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationAlertHost alerts={alerts} onDismiss={dismissAlert} onOpen={openAlert} />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
