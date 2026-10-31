import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import './backToTop.css';

/*
 * The floating "back to top" control shared by the admin shell and both
 * ordering panels. One instance per screen — the shell renders it once for
 * every admin route, and the customer menu renders it for guests.
 */

/* How far the page must travel before the control is worth showing. */
const REVEAL_AT = 300;

/* The containers an admin or ordering layout scrolls instead of the window. */
const MAIN_SCROLLERS = 'main, .page, [data-scroll-root]';

/* The scroller that actually owns this page: the window when the document
   scrolls, otherwise the first main-content box that can scroll, so a nested
   admin layout (or a future one) never scrolls the wrong element. */
function activeScroller() {
  const root = document.scrollingElement || document.documentElement;
  if (root && root.scrollHeight - root.clientHeight > 4) {
    return { element: null, top: window.scrollY || root.scrollTop || 0 };
  }
  for (const node of document.querySelectorAll(MAIN_SCROLLERS)) {
    if (node.scrollHeight - node.clientHeight > 4) return { element: node, top: node.scrollTop };
  }
  return { element: null, top: 0 };
}

/* One chevron: a shade below the body and a gloss along its top edge give the
   ridge its depth, so it stays dimensional in both themes. */
function Chevron({ className }) {
  return (
    <svg
      className={`btt__arrow ${className}`}
      viewBox="0 0 32 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="btt__arrow-shade"
        d="M4.6 12.1 16 3.7l11.4 8.4"
        strokeWidth="4.6"
      />
      <path className="btt__arrow-body" d="M4.6 12.1 16 3.7l11.4 8.4" strokeWidth="4.6" />
      <path className="btt__arrow-gloss" d="M6 10.9 16 4.4l10 6.5" strokeWidth="1.4" />
    </svg>
  );
}

export default function AnimatedBackToTop() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  /* A second click while the smooth scroll is running would fight the first. */
  const clickedAt = useRef(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setVisible(activeScroller().top > REVEAL_AT);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    /* Captured, so a scroll inside any nested container is seen too. */
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    const now = Date.now();
    if (now - clickedAt.current < 600) return;
    clickedAt.current = now;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = reduce ? 'auto' : 'smooth';
    const root = document.scrollingElement || document.documentElement;

    if (window.scrollY || root.scrollTop) window.scrollTo({ top: 0, behavior });
    /* A nested layout keeps its own scroll position; bring that home as well,
       so the panel really is at the top when the animation ends. */
    for (const node of document.querySelectorAll(MAIN_SCROLLERS)) {
      if (node.scrollTop) node.scrollTo({ top: 0, behavior });
    }
  }, []);

  const label = t('dash_scroll_top');

  return (
    <button
      type="button"
      className={`btt no-print${visible ? ' is-visible' : ''}`}
      aria-label={label}
      title={label}
      aria-hidden={visible ? undefined : 'true'}
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
    >
      <span className="btt__arrows" aria-hidden="true">
        <Chevron className="btt__arrow--top" />
        <Chevron className="btt__arrow--middle" />
        <Chevron className="btt__arrow--bottom" />
      </span>
    </button>
  );
}
