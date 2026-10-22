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
 * Each arrow is a physical control: the left one always reveals tabs hidden on
 * the left, the right one tabs hidden on the right, in every language. Both the
 * scroll limits and the scroll direction are read from measured screen
 * geometry — plus a one-off probe of which way `scrollLeft` moves the content —
 * so no browser's RTL coordinate model can turn them around.
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
  const slopeRef = useRef(-1);
  const overflowRef = useRef(false);
  const [edge, setEdge] = useState({ overflow: false, atStart: true, atEnd: false });

  /*
   * Everything is measured in screen pixels: how much tab content still sits
   * beyond each physical edge of the viewport. Nothing here assumes a sign for
   * `scrollLeft`, so no browser's RTL model can turn an arrow around.
   */
  const geometry = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return { hiddenLeft: 0, hiddenRight: 0, overflow: false };
    const view = el.getBoundingClientRect();
    const strip = track.getBoundingClientRect();
    return {
      hiddenLeft: Math.max(0, Math.round(view.left - strip.left)),
      hiddenRight: Math.max(0, Math.round(strip.right - view.right)),
      viewLeft: view.left,
      viewRight: view.right,
      page: Math.max(160, view.width * 0.66),
      overflow: el.scrollWidth > el.clientWidth + 1,
    };
  }, []);

  const sync = useCallback(() => {
    const { hiddenLeft, hiddenRight, overflow } = geometry();
    overflowRef.current = overflow;
    const rtlNow = domRtl();
    setEdge((prev) => {
      /* `atStart`/`atEnd` stay reading-order words: RTL starts on the right. */
      const next = {
        overflow,
        atStart: (rtlNow ? hiddenRight : hiddenLeft) <= 1,
        atEnd: (rtlNow ? hiddenLeft : hiddenRight) <= 1,
      };
      return prev.overflow === next.overflow &&
        prev.atStart === next.atStart &&
        prev.atEnd === next.atEnd
        ? prev
        : next;
    });
  }, [geometry]);

  /* Which sign of `scrollLeft` slides the content which way — measured, never
     assumed, so a mirrored axis can never reverse the arrows. */
  const calibrate = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const raw = el.scrollLeft;
    const base = track.getBoundingClientRect().left;
    const probe = (delta) => {
      el.scrollLeft = raw + delta;
      const moved = el.scrollLeft !== raw;
      const slope = (track.getBoundingClientRect().left - base) / delta;
      el.scrollLeft = raw;
      return moved && slope !== 0 ? slope : 0;
    };
    slopeRef.current = probe(1) || probe(-1) || slopeRef.current;
  }, []);

  /* Slides the content by `dx` screen pixels (+ right, − left) and stops at the
     edge, so an arrow can never scroll past the last visible tab. */
  const slide = useCallback(
    (dx, smooth) => {
      const el = scrollRef.current;
      if (!el) return;
      const { hiddenLeft, hiddenRight } = geometry();
      const reach = dx > 0 ? hiddenLeft : hiddenRight;
      const move = Math.sign(dx) * Math.min(Math.abs(dx), reach);
      if (Math.abs(move) < 1) return;
      el.scrollTo({
        left: el.scrollLeft + move / slopeRef.current,
        behavior: smooth && !reducedMotion() ? 'smooth' : 'auto',
      });
    },
    [geometry],
  );

  /** Nudges the strip only as far as needed to show one tab. */
  const reveal = useCallback(
    (node, smooth) => {
      if (!node) return;
      const { viewLeft, viewRight } = geometry();
      const rect = node.getBoundingClientRect();
      const pad = 10;
      if (rect.left < viewLeft + pad) slide(viewLeft + pad - rect.left, smooth);
      else if (rect.right > viewRight - pad) slide(viewRight - pad - rect.right, smooth);
    },
    [geometry, slide],
  );

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
      calibrate();
      sync();
      reveal(refs.current[value], true);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, rtl, calibrate, reveal, sync]);

  /* A vertical wheel over the strip drives it sideways instead of the page. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (!overflowRef.current) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? el.clientWidth : 1;
      slide(event.deltaY * unit * (domRtl() ? 1 : -1), false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [slide]);

  /* `physical` is the arrow's own direction on screen, never the reading
     direction: in RTL the start edge is the right one, so moving physically
     right walks back toward it. */
  const step = (physical) => {
    const { page } = geometry();
    slide(physical > 0 ? -page : page, true);
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
