import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * The settings workspace tab strip.
 *
 * One horizontally scrollable row — never wrapped into uneven rows — so every
 * section stays reachable at any width. The browser's own scrollbar is hidden
 * (the row still scrolls by wheel, trackpad, touch and keyboard) and two
 * physical edge arrows plus soft fades take over as the affordance.
 *
 * RTL is handled by reading the browser's own `scrollLeft` model rather than
 * assuming a sign: current Chrome/Firefox/Safari count negative offsets from
 * the right edge, older WebKit counts backwards from the maximum. Both are
 * normalised here to "distance from the reading start edge", so the arrows keep
 * their physical meaning (left arrow reveals content to the left) in either
 * language.
 */

const reducedMotion = () =>
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/* The document's own direction — never the context flag, which flips one tick
   before `dir` is written and would measure the old layout as if mirrored. */
const domRtl = () => document.documentElement.dir === 'rtl';

export default function SettingsTabs({ tabs, value, onChange }) {
  const { rtl, t } = useI18n();
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const refs = useRef({});
  const modelRef = useRef('negative');
  const overflowRef = useRef(false);
  const [edge, setEdge] = useState({ overflow: false, atStart: true, atEnd: false });

  /** Current scroll position measured from the reading start edge. */
  const metrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return { pos: 0, max: 0, overflow: false };
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const raw = el.scrollLeft;
    const rtlNow = domRtl();
    const pos = !rtlNow ? raw : modelRef.current === 'reverse' ? max - raw : -raw;
    return { pos: Math.min(max, Math.max(0, pos)), max, overflow: max > 1 };
  }, []);

  const sync = useCallback(() => {
    const { pos, max, overflow } = metrics();
    overflowRef.current = overflow;
    setEdge((prev) => {
      const next = { overflow, atStart: pos <= 1, atEnd: pos >= max - 1 };
      return prev.overflow === next.overflow &&
        prev.atStart === next.atStart &&
        prev.atEnd === next.atEnd
        ? prev
        : next;
    });
  }, [metrics]);

  /** Scrolls to a distance-from-start, converting back to the browser's axis. */
  const goTo = useCallback(
    (pos, smooth) => {
      const el = scrollRef.current;
      if (!el) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const clamped = Math.min(max, Math.max(0, pos));
      const rtlNow = domRtl();
      const left = !rtlNow ? clamped : modelRef.current === 'reverse' ? max - clamped : -clamped;
      el.scrollTo({ left, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
    },
    [],
  );

  /** Nudges the strip only as far as needed to show one tab. */
  const reveal = useCallback(
    (node, smooth) => {
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track || !node) return;
      const { pos } = metrics();
      const view = el.clientWidth;
      const trackRect = track.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      const fromLeft = rect.left - trackRect.left;
      const fromRight = trackRect.right - rect.right;
      const startDist = domRtl() ? fromRight : fromLeft;
      const endDist = startDist + rect.width;
      const pad = 10;
      if (startDist < pos + pad) goTo(startDist - pad, smooth);
      else if (endDist > pos + view - pad) goTo(endDist - view + pad, smooth);
    },
    [goTo, metrics],
  );

  /* Which RTL offset model this browser uses — probed once, never assumed. */
  const detectModel = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!domRtl()) {
      modelRef.current = 'negative';
      return;
    }
    const raw = el.scrollLeft;
    el.scrollLeft = 1;
    modelRef.current = el.scrollLeft > 0 ? 'reverse' : 'negative';
    el.scrollLeft = raw;
  }, []);

  /* Overflow reacts to the viewport, the tab count and a language change. */
  useEffect(() => {
    sync();
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => sync());
    observer.observe(el);
    observer.observe(track);
    return () => observer.disconnect();
  }, [sync, tabs.length]);

  /* Reveal after the direction and the new labels are actually in the DOM. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      detectModel();
      sync();
      reveal(refs.current[value], true);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, rtl, detectModel, reveal, sync]);

  /* A vertical wheel over the strip drives it sideways instead of the page. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (!overflowRef.current) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? el.clientWidth : 1;
      goTo(metrics().pos + event.deltaY * unit, false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [goTo, metrics]);

  /* `physical` is the arrow's own direction on screen, never the reading
     direction: in RTL the start edge is the right one, so moving physically
     right walks back toward it. */
  const step = (physical) => {
    const el = scrollRef.current;
    if (!el) return;
    const page = Math.max(160, el.clientWidth * 0.66);
    goTo(metrics().pos + (domRtl() ? -physical : physical) * page, true);
  };

  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.value === value);
    if (index < 0) return;
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = null;
    if (event.key === forward) next = (index + 1) % tabs.length;
    else if (event.key === backward) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].value);
    refs.current[tabs[next].value]?.focus();
  };

  // Arrows and fades are physical on the left/right, so their limits mirror in RTL.
  const leftDone = rtl ? edge.atEnd : edge.atStart;
  const rightDone = rtl ? edge.atStart : edge.atEnd;

  return (
    <div className="set-tabs">
      <button
        type="button"
        className={`set-tabs__arrow is-left ${edge.overflow ? '' : 'is-hidden'}`}
        onClick={() => step(-1)}
        disabled={!edge.overflow || leftDone}
        tabIndex={edge.overflow ? 0 : -1}
        aria-label={t('settings_tabs_scroll_prev')}
      >
        <Icon name="chevronLeft" size={16} />
      </button>

      <div className="set-tabs__viewport">
        <div className="set-tabs__scroll" ref={scrollRef} onScroll={sync}>
          <div
            className="set-tabs__track"
            ref={trackRef}
            role="tablist"
            aria-orientation="horizontal"
            onKeyDown={onKeyDown}
          >
            {tabs.map((tab) => (
              <button
                key={tab.value}
                ref={(node) => {
                  refs.current[tab.value] = node;
                }}
                type="button"
                role="tab"
                id={`settings-tab-${tab.value}`}
                aria-selected={value === tab.value}
                aria-controls={`settings-panel-${tab.value}`}
                tabIndex={value === tab.value ? 0 : -1}
                className={`set-tab ${value === tab.value ? 'is-active' : ''}`}
                onClick={() => onChange(tab.value)}
              >
                <span className="set-tab__icon" aria-hidden="true">
                  <Icon name={tab.icon} size={16} />
                </span>
                <span className="set-tab__label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <span
          className={`set-tabs__fade is-start ${edge.overflow && !edge.atStart ? '' : 'is-off'}`}
          aria-hidden="true"
        />
        <span
          className={`set-tabs__fade is-end ${edge.overflow && !edge.atEnd ? '' : 'is-off'}`}
          aria-hidden="true"
        />
      </div>

      <button
        type="button"
        className={`set-tabs__arrow is-right ${edge.overflow ? '' : 'is-hidden'}`}
        onClick={() => step(1)}
        disabled={!edge.overflow || rightDone}
        tabIndex={edge.overflow ? 0 : -1}
        aria-label={t('settings_tabs_scroll_next')}
      >
        <Icon name="chevronRight" size={16} />
      </button>
    </div>
  );
}
