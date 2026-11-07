import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import CategoryIdentityIcon from './CategoryIdentityIcon';
import { groupLabel, iconLabel, searchIconGroups } from './categoryIconCatalog';
import { useFloatingPanel } from './useFloatingPanel';

/*
 * Category icon dropdown.
 *
 * Closed: the chosen glyph (in the category's own identity colour), its name and
 * a chevron. Open: a portalled, searchable, grouped glyph grid. The chosen
 * glyph's colour is the category's identity colour and is never taken from the
 * business theme — only the control chrome (borders, focus ring, hover, check)
 * follows `--primary`.
 */
export default function CategoryIconPicker({ value, color, onChange, disabled, id }) {
  const { t, locale, dir } = useI18n();
  const rtl = dir === 'rtl';
  const { open, pos, triggerRef, panelRef, toggle, close } = useFloatingPanel({
    rtl,
    width: 392,
    height: 420,
  });
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  const bodyRef = useRef(null);

  const groups = useMemo(() => searchIconGroups(query), [query]);
  const total = groups.reduce((n, g) => n + g.icons.length, 0);

  // Fresh search each time; focus the field and bring the current glyph into view.
  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    const frame = requestAnimationFrame(() => {
      searchRef.current?.focus({ preventScroll: true });
      const body = bodyRef.current;
      const node = body?.querySelector('[data-current="true"]');
      if (body && node) body.scrollTop = Math.max(0, node.offsetTop - body.clientHeight / 2);
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const pick = (key) => {
    onChange(key);
    close(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`ccpick__trigger ${open ? 'is-open' : ''}`.trim()}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CategoryIdentityIcon icon={value} color={color} size={34} variant="row" />
        <span className="ccpick__value">{iconLabel(value, locale)}</span>
        <Icon name="chevronDown" size={16} className="ccpick__chev" />
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              className={`ccpick__panel ${pos.openUp ? 'is-up' : ''}`.trim()}
              dir={dir}
              role="dialog"
              aria-label={t('menu_category_icon')}
              style={{
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                top: pos.top,
                bottom: pos.bottom,
              }}
            >
              <div className="ccpick__search">
                <Icon name="search" size={15} />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('menu_icon_search')}
                  aria-label={t('menu_icon_search')}
                  autoComplete="off"
                />
                {query ? (
                  <button
                    type="button"
                    className="ccpick__clear"
                    onClick={() => {
                      setQuery('');
                      searchRef.current?.focus();
                    }}
                    aria-label={t('action_clear')}
                  >
                    <Icon name="close" size={13} />
                  </button>
                ) : null}
              </div>

              <div className="ccpick__body" ref={bodyRef}>
                {total === 0 ? (
                  <div className="ccpick__empty">
                    <Icon name="search" size={22} />
                    <span>{t('menu_icon_none')}</span>
                  </div>
                ) : (
                  groups.map((group) => (
                    <section key={group.id} className="ccpick__group">
                      <h4 className="ccpick__group-title">{groupLabel(group, locale)}</h4>
                      <div className="ccpick__grid">
                        {group.icons.map((glyph) => {
                          const selected = glyph.key === value;
                          const name = glyph.label[locale] || glyph.label.en;
                          return (
                            <button
                              key={glyph.key}
                              type="button"
                              className={`ccpick__glyph ${selected ? 'is-selected' : ''}`.trim()}
                              onClick={() => pick(glyph.key)}
                              aria-pressed={selected}
                              aria-label={name}
                              title={name}
                              data-current={selected ? 'true' : undefined}
                            >
                              <Icon name={glyph.key} size={20} />
                              {selected ? (
                                <span className="ccpick__tick" aria-hidden="true">
                                  <Icon name="check" size={9} />
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
