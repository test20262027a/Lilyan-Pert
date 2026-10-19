import Icon from '../Icon';
import { useI18n, localized } from '../../i18n';
import { fmtMoneyParts } from '../../format';

/*
 * One image-first product card.
 *
 * The photograph dominates the card; a soft translucent panel sits over its
 * lower edge with the product name (always one line, never an ellipsis) and the
 * supporting category/availability labels. The price row and the two action
 * buttons follow underneath.
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

        <span className={`mcard__badge mcard__badge--${state}`}>
          <i className="mcard__dot" />
          {t(STATE_LABEL[state])}
        </span>

        <div className="mcard__panel">
          <div className="mcard__name" title={name}>
            {name}
          </div>
          <div className="mcard__labels">
            {categoryName ? <span className="mcard__cat">{categoryName}</span> : null}
            <span className={`mcard__state mcard__state--${state}`}>{t(STATE_LABEL[state])}</span>
          </div>
        </div>
      </div>

      <div className="mcard__price">
        <span>
          <span className="mcard__amount">{number}</span>
          <span className="mcard__currency">{symbol}</span>
        </span>
        <span className="mcard__coin">
          <Icon name="banknote" size={15} />
        </span>
      </div>

      <div className="mcard__actions">
        <button type="button" className="mcard__btn mcard__btn--edit" onClick={onEdit} disabled={!canManage}>
          <Icon name="pencil" size={15} />
          {t('action_edit')}
        </button>
        <button type="button" className="mcard__btn mcard__btn--delete" onClick={onDelete} disabled={!canManage}>
          <Icon name="trash" size={15} />
          {t('action_delete')}
        </button>
      </div>
    </article>
  );
}
