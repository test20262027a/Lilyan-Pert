import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';
import { appearanceOf } from './categoryIcons';
import CategoryIdentityIcon from './CategoryIdentityIcon';

/*
 * Narrow-screen category navigation: one sticky, horizontally scrollable row of
 * chips instead of the desktop sidebar.
 *
 *   [ scroll left ]  [ scrollable chips ]  [ scroll right ]
 *
 * Every chip keeps its category's own saved glyph and accent; only the selected
 * chip's surface and border follow the business theme. The two round controls
 * are real navigation: they scroll the chip list in the physical direction their
 * arrow points (so they work identically in RTL and LTR), and each one is
 * disabled while there is nothing hidden on its side.
 *
 * Edge detection reads chip and container rectangles instead of `scrollLeft`,
 * because RTL scroll offsets differ between browser scroll models; the same
 * geometry centres the selected chip without moving the page itself.
 */
export default function CategoryChips({ categories, selectedId, onSelect }) {
  const { t, locale } = useI18n();
  const scrollerRef = useRef(null);
  const chipRefs = useRef({});
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const chips = Array.from(el.children);
    if (!chips.length) {
      setEdges({ left: false, right: false });
      return;
    }
    const box = el.getBoundingClientRect();
    const rects = chips.map((chip) => chip.getBoundingClientRect());
    const leftMost = Math.min(...rects.map((r) => r.left));
    const rightMost = Math.max(...rects.map((r) => r.right));
    setEdges({
      left: leftMost < box.left - 1,
      right: rightMost > box.right + 1,
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, categories.length, locale]);

  // Bring the selected chip into view — only the strip scrolls, never the page.
  useEffect(() => {
    const el = scrollerRef.current;
    const chip = chipRefs.current[selectedId];
    if (!el || !chip) return;
    const box = el.getBoundingClientRect();
    const rect = chip.getBoundingClientRect();
    if (rect.left >= box.left && rect.right <= box.right) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: rect.left - box.left - (box.width - rect.width) / 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [selectedId, categories.length]);

  // Physical scroll: a positive offset moves the content leftwards in both
  // writing directions, so each button keeps matching its own arrow.
  const nudge = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(160, Math.round(el.clientWidth * 0.7));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * step, behavior: reduced ? 'auto' : 'smooth' });
  };

  if (!categories.length) return null;

  return (
    <nav className="mchipbar" aria-label={t('menu_tab_categories')}>
      <button
        type="button"
        className="mchipbar__nav mchipbar__nav--left"
        onClick={() => nudge(-1)}
        disabled={!edges.left}
        aria-label={t('menu_categories_scroll_left')}
        title={t('menu_categories_scroll_left')}
      >
        <Icon name="caretLeft" size={16} />
      </button>

      <div className="mchipbar__scroll" ref={scrollerRef}>
        {categories.map((c) => {
          const appearance = appearanceOf(c);
          const selected = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              ref={(node) => {
                chipRefs.current[c.id] = node;
              }}
              className={`mchip ${selected ? 'is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(c.id)}
            >
              <CategoryIdentityIcon icon={appearance.icon} color={appearance.color} size={26} />
              <span className="mchip__label">{localized(c, 'name', locale)}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="mchipbar__nav mchipbar__nav--right"
        onClick={() => nudge(1)}
        disabled={!edges.right}
        aria-label={t('menu_categories_scroll_right')}
        title={t('menu_categories_scroll_right')}
      >
        <Icon name="caretRight" size={16} />
      </button>
    </nav>
  );
}
