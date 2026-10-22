import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';
import { appearanceOf } from '../menu/categoryIcons';

/*
 * Category browsing for the customer menu, in the three shapes the same menu
 * needs:
 *
 *   ≥1200px  a sticky rail beside the products, always visible
 *   768–1199 a sticky trigger that opens a drawer
 *   <768px   a sticky horizontal chip strip
 *
 * One component renders all three and the stylesheet decides which is visible,
 * so all of them share the same selection state and the same identity glyph.
 *
 * A category's glyph and accent come from `appearanceOf()` — the same engine the
 * admin category list uses — so a category called "پیتزا" or "Pizza" shows the
 * pizza glyph here without anyone picking an icon, and a newly created category
 * is recognised the moment its name is saved.
 */
function CatIcon({ category, size = 17 }) {
  const appearance = appearanceOf(category);
  return (
    <span className="cui-cat-icon" style={{ '--cic': appearance.color }} aria-hidden="true">
      <Icon name={appearance.icon} size={size} />
    </span>
  );
}

const AllIcon = ({ size = 16 }) => (
  <span className="cui-cat-icon cui-cat-icon--all" aria-hidden="true">
    <Icon name="grid" size={size} />
  </span>
);

export default function CustomerCategoryNav({ categories, activeCat, onSelect }) {
  const { t, locale } = useI18n();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setDrawer(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const pick = (id) => {
    onSelect(id);
    setDrawer(false);
  };

  const current = categories.find((c) => c.id === activeCat) || null;
  const rows = [
    { id: null, label: t('customer_menu_all') },
    ...categories.map((c) => ({ id: c.id, label: localized(c, 'name', locale), category: c })),
  ];

  return (
    <>
      <aside className="cui-rail" aria-label={t('customer_menu_categories')}>
        <div className="cui-rail__inner">
          <p className="cui-rail__title">
            <Icon name="listFilter" size={14} />
            {t('customer_menu_categories')}
          </p>
          <nav className="cui-rail__list">
            {rows.map((row) => {
              const active = activeCat === row.id;
              return (
                <button
                  key={row.id || 'all'}
                  type="button"
                  className={`cui-rail__row ${active ? 'is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => pick(row.id)}
                >
                  {row.category ? <CatIcon category={row.category} /> : <AllIcon />}
                  <span className="cui-rail__name">{row.label}</span>
                  {active ? <Icon name="check" size={14} className="cui-rail__mark" /> : null}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="cui-navbtn">
        <button
          type="button"
          className="cui-navbtn__btn"
          onClick={() => setDrawer(true)}
          aria-expanded={drawer}
          aria-label={t('customer_menu_categories')}
        >
          {current ? <CatIcon category={current} size={16} /> : <AllIcon />}
          <span className="cui-navbtn__label">{current ? localized(current, 'name', locale) : t('customer_menu_all')}</span>
          <span className="cui-navbtn__hint">{t('customer_menu_categories')}</span>
          <Icon name="chevronDown" size={15} />
        </button>
      </div>

      {drawer ? (
        <div
          className="cui-drawer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDrawer(false);
          }}
        >
          <div className="cui-drawer__panel" role="dialog" aria-modal="true" aria-label={t('customer_menu_categories')}>
            <header className="cui-drawer__head">
              <span>{t('customer_menu_categories')}</span>
              <button
                type="button"
                className="cui-drawer__close"
                onClick={() => setDrawer(false)}
                aria-label={t('action_close')}
              >
                <Icon name="close" size={16} />
              </button>
            </header>
            <nav className="cui-drawer__list">
              {rows.map((row) => {
                const active = activeCat === row.id;
                return (
                  <button
                    key={row.id || 'all'}
                    type="button"
                    className={`cui-rail__row ${active ? 'is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => pick(row.id)}
                  >
                    {row.category ? <CatIcon category={row.category} /> : <AllIcon />}
                    <span className="cui-rail__name">{row.label}</span>
                    {active ? <Icon name="check" size={14} className="cui-rail__mark" /> : null}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      <div className="cui-chips">
        <div className="cui-chips__scroll">
          {rows.map((row) => {
            const active = activeCat === row.id;
            return (
              <button
                key={row.id || 'all'}
                type="button"
                className={`cui-chip ${active ? 'is-active' : ''}`}
                aria-pressed={active}
                onClick={() => pick(row.id)}
              >
                {row.category ? <CatIcon category={row.category} size={15} /> : <AllIcon size={15} />}
                <span>{row.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
