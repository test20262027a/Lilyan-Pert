import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * The white action toolbar under the banner: a flexible search field plus the
 * two green create buttons. Read order is physical — the field takes the
 * remaining width on one side and the buttons sit on the other, so the layout
 * mirrors correctly for Kurdish/Persian/Arabic and English.
 */
export default function MenuToolbar({
  query,
  onQuery,
  onAddCategory,
  onAddProduct,
  canManage,
  searching = false,
}) {
  const { t } = useI18n();

  return (
    <div className="mtoolbar">
      <div className="msearch">
        <Icon name="search" size={18} />
        <input
          className="msearch__input"
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t('menu_search_placeholder')}
          aria-label={t('action_search')}
        />
        {searching ? <span className="spinner" /> : null}
        {!searching && query ? (
          <button
            type="button"
            className="msearch__clear"
            onClick={() => onQuery('')}
            aria-label={t('action_clear')}
            title={t('action_clear')}
          >
            <Icon name="close" size={15} />
          </button>
        ) : null}
      </div>

      <div className="mtoolbar__actions">
        <button type="button" className="mbtn mbtn--green" onClick={onAddCategory} disabled={!canManage}>
          <span className="mbtn__plus">
            <Icon name="plus" size={15} />
          </span>
          {t('menu_add_category')}
        </button>
        <button type="button" className="mbtn mbtn--green" onClick={onAddProduct} disabled={!canManage}>
          <span className="mbtn__plus">
            <Icon name="plus" size={15} />
          </span>
          {t('menu_add_product')}
        </button>
      </div>
    </div>
  );
}
