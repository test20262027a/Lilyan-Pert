/*
 * One announcement for the whole application when business data changes.
 *
 * `api.js` fires the same-window event after every successful write. A
 * BroadcastChannel carries that change to the other tabs the administrator has
 * open, so the Backup counters and the Reset counters in a second tab catch up
 * on their own — no polling storm, no page reload.
 */

export const DATA_CHANNEL = 'lilyan:data-changed';

export function broadcastDataChange() {
  try {
    if (typeof window === 'undefined' || typeof window.BroadcastChannel !== 'function') return;
    const channel = new window.BroadcastChannel(DATA_CHANNEL);
    channel.postMessage({ at: Date.now() });
    channel.close();
  } catch {
    // A browser without channels still refreshes on focus and on its poll.
  }
}

export function subscribeDataChange(handler) {
  if (typeof window === 'undefined' || typeof window.BroadcastChannel !== 'function') return () => {};
  const channel = new window.BroadcastChannel(DATA_CHANNEL);
  channel.onmessage = () => handler();
  return () => channel.close();
}
