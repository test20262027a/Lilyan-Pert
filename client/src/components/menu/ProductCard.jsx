import Icon from '../Icon';
import { useI18n, localized } from '../../i18n';
import { fmtMoneyParts } from '../../format';

/*
 * One image-first product card.
 *
 * The photograph fills the card; a frosted panel sits over its lower edge with
 * the product name, the category and the price, closed by the real availability
 * pill. The two equal action buttons follow underneath.
 *
 * Both buttons follow the app-wide rule for labelled actions: label first, icon
 * last, so the pencil/trash sits at the logical end of the word — physical left
 * in RTL, physical right in LTR.
 *
 * `state` is the *effective* state: a product only counts as available when it
 * is active, available and its category is active too. An inactive parent
 * category never rewrites the product's own stored flag — it is only reflected
 * in the badge and label here.
 */
function productState(product) {
  if (!product.active) return 'inactive';
  if (!product.available) return 'unavailable';
  if (product.category_active === false) return 'hidden';
  return 'available';
}

const STATE_LABEL = {
  available: 'menu_badge_available',
  unavailable: 'menu_badge_unavailable',
  inactive: 'label_inactive',
  hidden: 'menu_stats_hidden',
};

export default function ProductCard({ product, categoryName, currency, canManage, onEdit, onDelete }) {
  const { t, locale } = useI18n();
  const name = localized(product, 'name', locale);
  const state = productState(product);
  const { number, symbol } = fmtMoneyParts(product.price, currency, locale);

  return (
    <article className="mcard">
      <div className="mcard__media">
        {product.image_url ? (
          <img className="mcard__img" src={product.image_url} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="mcard__placeholder">
            <Icon name="image" size={34} />
          </span>
        )}

        <div className="mcard__panel">
          <div className="mcard__name" title={name}>
            {name}
          </div>
          <div className="mcard__meta">
            {categoryName ? <span className="mcard__cat">{categoryName}</span> : null}
            <span className="mcard__price">
              <span className="mcard__amount">{number}</span>
              <span className="mcard__currency">{symbol}</span>
            </span>
          </div>
          <span className={`mcard__state mcard__state--${state}`}>
            <i className="mcard__dot" />
            {t(STATE_LABEL[state])}
          </span>
        </div>
      </div>

      <div className="mcard__actions">
        <button
          type="button"
          className="mcard__btn mcard__btn--edit app-action-button"
          onClick={onEdit}
          disabled={!canManage}
        >
          <span className="button-label">{t('action_edit')}</span>
          <Icon name="pencil" size={16} className="button-icon" />
        </button>
        <button
          type="button"
          className="mcard__btn mcard__btn--delete app-action-button"
          onClick={onDelete}
          disabled={!canManage}
        >
          <span className="button-label">{t('action_delete')}</span>
          <Icon name="trash" size={16} className="button-icon" />
        </button>
      </div>
    </article>
  );
}
