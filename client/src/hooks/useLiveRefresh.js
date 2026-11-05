import { useEffect, useRef } from 'react';
import { subscribeDataChange } from '../dataChange';

/** Background reconciliation for the live counters of data-bearing panels. */
const POLL_MS = 15000;

/**
 * Keeps a panel's authoritative counts current without a reload.
 *
 * The callback is always called with `{ quiet: true }`, so the page updates its
 * numbers in place: open dialogs, ticked modules, scroll position and the
 * current language are left exactly as they are. It runs when
 *
 *   • any write succeeds in this window (`lilyan:admin-change`),
 *   • a write succeeds in another tab (BroadcastChannel),
 *   • the tab becomes visible again or regains focus,
 *   • and on a slow poll while the tab is visible,
 *
 * and never while the tab is hidden.
 */
export function useLiveRefresh(run, { interval = POLL_MS } = {}) {
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const fire = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      runRef.current?.({ quiet: true });
    };
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) fire();
    };

    window.addEventListener('lilyan:admin-change', fire);
    window.addEventListener('focus', fire);
    document.addEventListener('visibilitychange', onVisible);
    const unsubscribe = subscribeDataChange(fire);
    const timer = window.setInterval(fire, interval);

    return () => {
      window.removeEventListener('lilyan:admin-change', fire);
      window.removeEventListener('focus', fire);
      document.removeEventListener('visibilitychange', onVisible);
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [interval]);
}
