import Icon from '../Icon';
import { useI18n, localized } from '../../i18n';
import { appearanceOf } from './categoryIcons';
import CategoryIdentityIcon from './CategoryIdentityIcon';

/*
 * The category management panel: heading, the three compact statistic cards and
 * the selectable category list. Only the list scrolls, so the heading and the
 * counters stay put while long menus are browsed.
 *
 * The list never carries an independent active/inactive switch — status is
 * edited inside the create/edit form only.
 *
 * Every row renders the category's own saved icon (`categoryIcons` maps that key
 * to a glyph and a pastel container), so each category keeps its identity
 * instead of sharing one generic symbol.
 */
export default function CategoryPanel({
  categories,
  stats,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  canManage,
}) {
  const { t, locale } = useI18n();

  // The header identity follows the selected row: its own saved glyph and
  // accent, or the neutral Categories glyph while nothing is selected.
  const selected = categories.find((c) => c.id === selectedId) || null;
  const appearance = selected ? appearanceOf(selected) : null;

  return (
    <section className="mpanel">
      {/*
       * Heading at the inline start and its icon in the opposite far corner
       * (physical right / physical left under RTL, mirrored in LTR), both
       * vertically centred on the same line.
       */}
      <header className="mpanel__head">
        <div className="mpanel__text">
          <h2 className="mpanel__title">{t('menu_tab_categories')}</h2>
          <p className="mpanel__sub">{t('menu_categories_hint')}</p>
        </div>
        {appearance ? (
          <CategoryIdentityIcon
            icon={appearance.icon}
            color={appearance.color}
            size={46}
            variant="raised"
          />
        ) : (
          <span className="mpanel__icon">
            <Icon name="layers" size={22} />
          </span>
        )}
      </header>

      <div className="mcstats">
        <div className="mcstat mcstat--total">
          <span className="mcstat__icon">
            <Icon name="layers" size={14} />
          </span>
          <span className="mcstat__body">
            <span className="mcstat__value">{stats.total}</span>
            <span className="mcstat__label">{t('menu_total_categories')}</span>
          </span>
        </div>
        <div className="mcstat mcstat--active">
          <span className="mcstat__icon">
            <Icon name="checkCircle" size={14} />
          </span>
          <span className="mcstat__body">
            <span className="mcstat__value">{stats.active}</span>
            <span className="mcstat__label">{t('menu_active_categories')}</span>
          </span>
        </div>
        <div className="mcstat mcstat--inactive">
          <span className="mcstat__icon">
            <Icon name="xCircle" size={14} />
          </span>
          <span className="mcstat__body">
            <span className="mcstat__value">{stats.inactive}</span>
            <span className="mcstat__label">{t('menu_inactive_categories')}</span>
          </span>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="empty">
          <span className="empty__icon">
            <Icon name="layers" size={20} />
          </span>
          <span className="empty__title">{t('menu_no_categories')}</span>
        </div>
      ) : (
        <ul className="mclist">
          {categories.map((c) => {
            const name = localized(c, 'name', locale);
            const selected = c.id === selectedId;
            const appearance = appearanceOf(c);
            return (
              <li key={c.id}>
                <div className={`mrow ${selected ? 'is-selected' : ''}`}>
                  {/* Selecting happens on the row itself, never on the pencil. */}
                  <button
                    type="button"
                    className="mrow__pick"
                    aria-pressed={selected}
                    onClick={() => onSelect(c.id)}
                  >
                    <CategoryIdentityIcon
                      icon={appearance.icon}
                      color={appearance.color}
                      size={34}
                    />
                    <span className="mrow__name" title={name}>
                      {name}
                    </span>
                  </button>
                  <div className="mrow__actions">
                    <button
                      type="button"
                      className="mrow__btn"
                      onClick={() => onEdit(c)}
                      disabled={!canManage}
                      aria-label={`${t('action_edit')} — ${name}`}
                      title={t('action_edit')}
                    >
                      <Icon name="pencil" size={15} />
                    </button>
                    <button
                      type="button"
                      className="mrow__btn mrow__btn--danger"
                      onClick={() => onDelete(c)}
                      disabled={!canManage}
                      aria-label={`${t('action_delete')} — ${name}`}
                      title={t('action_delete')}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
