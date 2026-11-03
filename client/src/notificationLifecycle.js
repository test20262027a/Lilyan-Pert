/*
 * The one lifecycle controller of an order notification pair.
 *
 * A new order can be announced twice at the same moment: the small alert at the
 * top of the screen and the large "order received" popup. Both paint the SAME
 * countdown, so neither may own a timer of its own — one deadline is created per
 * order event here and every surface joins it:
 *
 *   const record = ensureOrderNotification(order.id)
 *   → { id, orderId, startedAt, expiresAt, durationMs }
 *
 * `startedAt` / `expiresAt` are read from the monotonic clock
 * (`performance.now`), so a wall-clock change cannot stretch the burn, and a
 * surface that appears a moment late joins the countdown already in progress
 * instead of restarting it from 100%.
 *
 * Exactly ONE timeout is armed per event and it notifies every watcher in the
 * same tick, which is what makes the toast and the popup leave together in one
 * coordinated state transition. Hover, focus, pointer movement and ordinary
 * re-renders never touch the deadline. A throttled or suspended timer is caught
 * up the instant the tab is visible again: an expired event is closed at once,
 * never replayed.
 */

export const ORDER_NOTIFICATION_MS = 3000;

const records = new Map();
const watchers = new Map();
const timers = new Map();

// Monotonic in a browser; `Date.now` only for a non-browser render.
const clock = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

function disarm(key) {
  const timer = timers.get(key);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(key);
  }
}

/** Close one event. Its fixed deadline is the only thing that decides when. */
function finish(key) {
  const record = records.get(key);
  if (!record) return;
  // A busy main thread can fire a timer a hair early: wait for the real end
  // rather than cutting the countdown short.
  if (record.expiresAt - clock() > 2) {
    arm(key);
    return;
  }
  records.delete(key);
  disarm(key);
  const set = watchers.get(key);
  watchers.delete(key);
  if (set) [...set].forEach((notify) => notify(record));
}

/** Arm the single timeout of one event, from that event's deadline. */
function arm(key) {
  disarm(key);
  const record = records.get(key);
  if (!record) return;
  const remaining = record.expiresAt - clock();
  if (remaining <= 0) {
    finish(key);
    return;
  }
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      finish(key);
    }, remaining),
  );
}

/**
 * The record of one order event, created on first use and shared afterwards.
 * A live record is handed back untouched, so two surfaces rendering at the same
 * time always receive the same deadline; an expired one is replaced, because a
 * later order for the same id is a new event.
 */
export function ensureOrderNotification(orderId, durationMs = ORDER_NOTIFICATION_MS) {
  if (orderId === null || orderId === undefined || orderId === '') return null;
  const key = `order:${orderId}`;
  const startedAt = clock();
  const live = records.get(key);
  if (live && startedAt < live.expiresAt) return live;
  if (live) records.delete(key);
  const record = {
    id: key,
    orderId,
    durationMs,
    startedAt,
    expiresAt: startedAt + durationMs,
  };
  records.set(key, record);
  arm(key);
  return record;
}

/** Subscribe to the coordinated close of one event; returns its unsubscribe. */
export function watchOrderNotification(key, onExpire) {
  if (!key || typeof onExpire !== 'function') return () => {};
  const set = watchers.get(key) || new Set();
  set.add(onExpire);
  watchers.set(key, set);
  // A watcher that joins late must not lose the event it is waiting for.
  if (records.has(key) && !timers.has(key)) arm(key);
  return () => {
    const current = watchers.get(key);
    if (!current) return;
    current.delete(onExpire);
    if (!current.size) watchers.delete(key);
  };
}

/** The live record of an event, or null once it has closed. */
export const orderNotification = (orderId) => records.get(`order:${orderId}`) || null;

/*
 * A background tab throttles timers, so a deadline can pass unnoticed. Coming
 * back closes whatever expired, in one pass, and re-arms whatever is still
 * running from its own deadline — nothing is restarted.
 */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    [...records.keys()].forEach(finish);
  });
}
