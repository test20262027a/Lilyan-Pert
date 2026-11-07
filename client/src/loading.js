/*
 * The application's one global loading signal.
 *
 * The loader is driven by real work, never by a page reload: any code that is
 * genuinely blocking the screen calls `beginLoading(key)` and ends it with
 * `endLoading(key)` in a `finally`. Keys are counted, so two simultaneous
 * critical jobs (session + business settings) keep the overlay up until both
 * are done, and a repeated begin on the same key never stacks overlays.
 *
 * Two timings keep it honest:
 *  - SHOW_DELAY: work that finishes almost at once never flashes the overlay,
 *  - MIN_VISIBLE: once it has appeared it stays long enough to read, so a fast
 *    tail end cannot make it blink away.
 */

const SHOW_DELAY = 180;
const MIN_VISIBLE = 320;

const pending = new Set();
const listeners = new Set();

let visible = false;
let shownAt = 0;
let showTimer = null;
let hideTimer = null;

function emit() {
  for (const listener of listeners) listener();
}

function clearTimers() {
  if (showTimer) window.clearTimeout(showTimer);
  if (hideTimer) window.clearTimeout(hideTimer);
  showTimer = null;
  hideTimer = null;
}

function show() {
  showTimer = null;
  if (visible || pending.size === 0) return;
  visible = true;
  shownAt = Date.now();
  emit();
}

function hide() {
  hideTimer = null;
  if (!visible || pending.size > 0) return;
  visible = false;
  emit();
}

export function beginLoading(key = 'default') {
  pending.add(key);
  if (hideTimer) {
    // Still inside the minimum visible window: finish that, don't restart it.
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (visible || showTimer) return;
  showTimer = window.setTimeout(show, SHOW_DELAY);
}

export function endLoading(key = 'default') {
  if (!pending.delete(key)) return;
  if (pending.size > 0) return;
  if (showTimer) {
    // Finished before the overlay ever appeared — nothing to show.
    window.clearTimeout(showTimer);
    showTimer = null;
    return;
  }
  if (!visible) return;
  const left = MIN_VISIBLE - (Date.now() - shownAt);
  if (left > 0) {
    if (!hideTimer) hideTimer = window.setTimeout(hide, left);
    return;
  }
  hide();
}

/** The blocking overlay is visible right now (after the show delay). */
export function isLoadingVisible() {
  return visible;
}

/**
 * Work is still pending, even inside the show delay. The pre-paint splash in
 * index.html reads this, so it never disappears before something replaces it.
 */
export function isLoadingPending() {
  return pending.size > 0;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders only when the overlay actually appears or disappears. */
export function subscribeLoading(listener) {
  return subscribe(listener);
}

export function getLoadingSnapshot() {
  return visible;
}

/** Drop every pending key — used when a route's work is abandoned. */
export function resetLoading() {
  pending.clear();
  clearTimers();
  if (visible) {
    visible = false;
    emit();
  }
}
