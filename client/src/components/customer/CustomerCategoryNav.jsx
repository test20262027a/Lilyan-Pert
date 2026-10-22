import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';
import { appearanceOf } from '../menu/categoryIcons';

/*
 * Category browsing for the customer menu: one horizontally scrolling strip of
 * icon cards, sticky under the menu header, with a circular arrow at each end.
 *
 * The strip replaces the old desktop rail / tablet drawer / mobile chips, so a
 * single selection state drives every breakpoint and the products keep the full
 * content width.
 *
 * A category's glyph and accent come from `appearanceOf()` — the same engine the
 * admin category list uses — so each card shows the icon and colour saved with
 * that category in the panel.
 *
 * The arrows are *physical*: the left button always moves the strip leftwards,
 * in RTL too, so their meaning never flips with the language.
 */
function CategoryCard({ row, active, onSelect }) {
  const appearance = row.category ? appearanceOf(row.category) : null;
  return (
    <button
      type="button"
      className={`cui-cat ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      onClick={(event) => {
        onSelect(row.id);
        // Keep the chosen card in view when the strip is scrolled.
        event.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }}
    >
      <span
        className={`cui-cat__icon ${row.category ? '' : 'cui-cat__icon--all'}`}
        style={appearance ? { '--cic': appearance.color } : undefined}
        aria-hidden="true"
      >
        <Icon name={row.category ? appearance.icon : 'grid'} size={24} />
      </span>
      <span className="cui-cat__label">{row.label}</span>
    </button>
  );
}

export default function CustomerCategoryNav({ categories, activeCat, onSelect }) {
  const { t, locale, rtl } = useI18n();
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ start: false, end: false, more: false });

  const rows = [
    { id: null, label: t('customer_menu_all') },
    ...categories.map((c) => ({ id: c.id, label: localized(c, 'name', locale), category: c })),
  ];

  /* Measured from real element boxes, so "is there more that way?" is correct
     in both directions without relying on scrollLeft's RTL sign convention. */
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const items = [...el.children];
    if (items.length === 0) {
      setEdges({ start: false, end: false, more: false });
      return;
    }
    const box = el.getBoundingClientRect();
    const first = items[0].getBoundingClientRect();
    const last = items[items.length - 1].getBoundingClientRect();
    const more = el.scrollWidth - el.clientWidth > 2;
    setEdges({
      more,
      start: more && (rtl ? first.right > box.right + 2 : first.left < box.left - 2),
      end: more && (rtl ? last.left < box.left - 2 : last.right > box.right + 2),
    });
  }, [rtl]);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return undefined;
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, rows.length]);

  /* `next` walks towards the end of the list (leftwards in RTL). An RTL scroller
     counts negative offsets, so the step follows the browser's own model: the
     arrow that was clicked always moves the strip the way it points. */
  const step = (towards) => {
    const el = scroller.current;
    if (!el) return;
    const amount = Math.max(140, Math.round(el.clientWidth * 0.8));
    const sign = towards === 'next' ? 1 : -1;
    el.scrollBy({ left: sign * amount * (rtl ? -1 : 1), behavior: 'smooth' });
  };

  return (
    <nav className="cui-catbar" aria-label={t('customer_menu_categories')}>
      {edges.more ? (
        <button
          type="button"
          className="cui-catbar__arrow cui-catbar__arrow--left"
          onClick={() => step(rtl ? 'next' : 'prev')}
          disabled={rtl ? !edges.end : !edges.start}
          aria-label={t('customer_menu_scroll_left')}
        >
          <Icon name="chevronLeft" size={17} />
        </button>
      ) : null}

      <div className="cui-catbar__scroll" ref={scroller}>
        {rows.map((row) => (
          <CategoryCard key={row.id || 'all'} row={row} active={activeCat === row.id} onSelect={onSelect} />
        ))}
      </div>

      {edges.more ? (
        <button
          type="button"
          className="cui-catbar__arrow cui-catbar__arrow--right"
          onClick={() => step(rtl ? 'prev' : 'next')}
          disabled={rtl ? !edges.start : !edges.end}
          aria-label={t('customer_menu_scroll_right')}
        >
          <Icon name="chevronRight" size={17} />
        </button>
      ) : null}
    </nav>
  );
}
