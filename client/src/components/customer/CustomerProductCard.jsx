import Icon from '../Icon';
import { Money } from '../ui';
import { localized, useI18n } from '../../i18n';

/*
 * One sellable product, as a guest sees it. The card is the tallest thing on the
 * page, so it leads with the photograph, keeps the name on one line and puts the
 * price and the add action together at the bottom — the same place in every
 * card, whatever the name's length.
 *
 * Tapping the card opens the detail sheet when the owner enabled product details;
 * the add button is its own control and never opens the sheet.
 */
export default function CustomerProductCard({
  product,
  categoryName,
  locale,
  currency,
  showPrices = true,
  canAdd = true,
  addLabel,
  promoLabel,
  badge,
  onAdd,
  onOpen,
}) {
  const { t } = useI18n();
  const name = localized(product, 'name', locale);
  const open = () => onOpen?.(product);

  return (
    <article
      className={`cui-prod ${onOpen ? 'is-openable' : ''}`}
      onClick={onOpen ? open : undefined}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
              }
            }
          : undefined
      }
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? name : undefined}
    >
      <div className="cui-prod__media">
        {product.image_url ? (
          <img src={product.image_url} alt="" loading="lazy" />
        ) : (
          <span className="cui-prod__ph">
            <Icon name="coffee" size={28} />
          </span>
        )}
        <div className="cui-prod__badges">
          {badge ? (
            <span className="cui-prod__badge cui-prod__badge--star">
              <Icon name="crown" size={11} />
              {badge}
            </span>
          ) : null}
          {product.promo_price ? (
            <span className="cui-prod__badge cui-prod__badge--promo">
              <Icon name="percent" size={11} />
              {promoLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="cui-prod__body">
        {categoryName ? <span className="cui-prod__cat">{categoryName}</span> : null}
        <h3 className="cui-prod__name" title={name}>
          {name}
        </h3>
        <div className="cui-prod__foot">
          {showPrices ? (
            <span className="cui-prod__price">
              {product.promo_price ? (
                <s>
                  <Money value={product.price} currency={currency} />
                </s>
              ) : null}
              <strong>
                <Money value={product.promo_price ?? product.price} currency={currency} />
              </strong>
            </span>
          ) : (
            <span />
          )}
          {canAdd ? (
            <button
              type="button"
              className="cui-prod__add"
              onClick={(event) => {
                event.stopPropagation();
                onAdd(product);
              }}
              aria-label={`${addLabel} — ${name}`}
              title={addLabel || t('customer_menu_add')}
            >
              <Icon name="plus" size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
