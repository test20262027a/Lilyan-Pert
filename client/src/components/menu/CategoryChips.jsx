import { useEffect, useRef } from 'react';
import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';
import { appearanceOf } from './categoryIcons';
import CategoryIdentityIcon from './CategoryIdentityIcon';

/*
 * Narrow-screen category navigation: one sticky, horizontally scrollable row of
 * chips instead of the desktop sidebar. Every chip keeps its category's own
 * saved glyph and accent; only the selected chip's surface and border follow
 * the business theme.
 *
 * Selection is the page's single `selectedId`, so the list, the products and
 * the stats all move together however the user got there. The chip strip owns
 * no data of its own.
 */
export default function CategoryChips({ categories, selectedId, onSelect, onManage }) {
  const { t, locale } = useI18n();
  const scrollerRef = useRef(null);
  const chipRefs = useRef({});

  // Bring the selected chip into view without moving the page itself.
  useEffect(() => {
    const chip = chipRefs.current[selectedId];
    if (!chip || !scrollerRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chip.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedId, categories.length]);

  if (!categories.length) return null;

  return (
    <nav className="mchipbar" aria-label={t('menu_tab_categories')}>
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
      {/* Category management stays reachable on narrow screens. */}
      <button
        type="button"
        className="mchipbar__manage"
        onClick={onManage}
        aria-label={t('menu_tab_categories')}
        title={t('menu_tab_categories')}
      >
        <Icon name="layers" size={17} />
      </button>
    </nav>
  );
}
