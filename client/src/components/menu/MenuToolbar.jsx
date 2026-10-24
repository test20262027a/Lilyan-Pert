import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * The white action toolbar under the banner: a flexible search field plus the
 * two green create buttons. Read order is physical — the field takes the
 * remaining width on one side and the buttons sit on the other, so the layout
 * mirrors correctly for Kurdish/Persian/Arabic and English.
 *
 * Both create buttons follow the app-wide rule for labelled actions: the label
 * is the first child and the icon the last, so the plus sits at the logical end
 * of the label — physical left in RTL, physical right in LTR. `direction` is
 * inherited from the document, never hardcoded here.
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
      <div className="msearch lilyan-search">
        <span className="lilyan-search__icon">
          <Icon name="search" size={15} />
        </span>
        <input
          className="msearch__input lilyan-search__input"
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
            className="msearch__clear lilyan-search__clear"
            onClick={() => onQuery('')}
            aria-label={t('action_clear')}
            title={t('action_clear')}
          >
            <Icon name="close" size={15} />
          </button>
        ) : null}
      </div>

      <div className="mtoolbar__actions">
        <button
          type="button"
          className="mbtn mbtn--green app-action-button"
          onClick={onAddCategory}
          disabled={!canManage}
        >
          <span className="button-label">{t('menu_add_category')}</span>
          <span className="mbtn__plus button-icon" aria-hidden="true">
            <Icon name="plus" size={15} />
          </span>
        </button>
        <button
          type="button"
          className="mbtn mbtn--green app-action-button"
          onClick={onAddProduct}
          disabled={!canManage}
        >
          <span className="button-label">{t('menu_add_product')}</span>
          <span className="mbtn__plus button-icon" aria-hidden="true">
            <Icon name="plus" size={15} />
          </span>
        </button>
      </div>
    </div>
  );
}
