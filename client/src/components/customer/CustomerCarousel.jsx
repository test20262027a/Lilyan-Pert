import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * A section's card list that becomes a horizontal carousel on tablet and phone
 * while keeping its desktop layout exactly as it was. Nothing here decides the
 * column count: the caller passes the section's own layout class as
 * `trackClassName` (a grid on desktop), and the stylesheet switches that same
 * element to a snapping scroller below 1024px.
 *
 * Arrows are *physical*: the left button always moves the cards leftwards and
 * the right one rightwards, in RTL too. `scrollBy` follows the browser's own
 * scroll model, where a negative offset means "towards the left" in both
 * directions, so the arrows never invert with the language.
 *
 * Each button is disabled at the end it cannot move towards, and both are
 * hidden entirely when the cards already fit the available width.
 */
export default function CustomerCarousel({ children, trackClassName = '', className = '', count = 0 }) {
  const { t, rtl } = useI18n();
  const track = useRef(null);
  const [edges, setEdges] = useState({ more: false, left: false, right: false });

  const measure = useCallback(() => {
    const el = track.current;
    const first = el?.firstElementChild;
    const last = el?.lastElementChild;
    if (!el || !first || !last) {
      setEdges({ more: false, left: false, right: false });
      return;
    }
    const box = el.getBoundingClientRect();
    const more = el.scrollWidth - el.clientWidth > 2;
    /* In RTL the first card sits at the right edge, so the content still
       hidden past the left edge is the last card. */
    const start = first.getBoundingClientRect();
    const end = last.getBoundingClientRect();
    setEdges({
      more,
      left: more && (rtl ? end.left < box.left - 2 : start.left < box.left - 2),
      right: more && (rtl ? start.right > box.right + 2 : end.right > box.right + 2),
    });
  }, [rtl]);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return undefined;
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [measure, count]);

  /* One card per click, measured from the real first card plus the track gap,
     so the step follows whatever card width the current breakpoint uses. */
  const step = (direction) => {
    const el = track.current;
    const card = el?.firstElementChild;
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const amount = Math.max(1, Math.round(card.getBoundingClientRect().width + gap));
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className={`cui-car ${className}`.trim()}>
      {edges.more ? (
        <button
          type="button"
          className="cui-car__nav cui-car__nav--left"
          onClick={() => step('left')}
          disabled={!edges.left}
          aria-label={t('customer_menu_scroll_left')}
        >
          <Icon name="caretLeft" size={17} />
        </button>
      ) : null}

      <div className={`cui-car__track ${trackClassName}`.trim()} ref={track}>
        {children}
      </div>

      {edges.more ? (
        <button
          type="button"
          className="cui-car__nav cui-car__nav--right"
          onClick={() => step('right')}
          disabled={!edges.right}
          aria-label={t('customer_menu_scroll_right')}
        >
          <Icon name="caretRight" size={17} />
        </button>
      ) : null}
    </div>
  );
}
