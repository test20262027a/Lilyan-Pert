import Icon from '../Icon';
import { Money } from '../ui';
import { localized, useI18n } from '../../i18n';
import { fmtMoneyParts } from '../../format';
import ProductQuantityControl from './ProductQuantityControl';
import '../../customerProduct.css';

/*
 * One sellable product, as a guest sees it: the photograph leads the card and a
 * frosted glass panel overlaps its lower edge with the name, the category and
 * availability, a price bar and a full-width Add to Cart button.
 *
 * Every card in a row keeps the same height, and the button sits at the bottom
 * edge of the panel whatever the name's length, so prices and actions line up
 * across the grid.
 *
 * Tapping the card opens the detail sheet when the owner enabled product
 * details; the add button and the quantity stepper are their own controls and
 * never open the sheet.
 *
 * `quantity` is the cart's own count of this product — the same number the cart
 * sheet and the badge show. It is never held locally, so a change made anywhere
 * (stepper, sheet, cart) is reflected here on the next render.
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
  quantity = 0,
  /* The business is paused (closed, not open yet, holiday): the card stays on
     screen but every gesture on it is blocked. */
  disabled = false,
  onAdd,
  onDecrease,
  onOpen,
}) {
  const { t } = useI18n();
  const name = localized(product, 'name', locale);
  const available = product.available !== false;
  const open = () => onOpen?.(product);
  const canOpen = Boolean(onOpen) && !disabled;
  const amount = fmtMoneyParts(product.promo_price ?? product.price, currency, locale);

  return (
    <article
      className={`cui-prod ${canOpen ? 'is-openable' : ''} ${available ? '' : 'is-out'} ${disabled ? 'is-locked' : ''}`.trim()}
      onClick={canOpen ? open : undefined}
      onKeyDown={
        canOpen
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
              }
            }
          : undefined
      }
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      aria-label={canOpen ? name : undefined}
      aria-disabled={disabled || undefined}
    >
      <div className="cui-prod__media">
        {product.image_url ? (
          <img src={product.image_url} alt="" loading="lazy" />
        ) : (
          <span className="cui-prod__ph">
            <Icon name="coffee" size={30} />
          </span>
        )}
        {badge || product.promo_price ? (
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
        ) : null}
      </div>

      <div className="cui-prod__glass">
        <h3 className="cui-prod__name" title={name}>
          {name}
        </h3>

        {categoryName || available ? (
          <div className="cui-prod__meta">
            {categoryName ? <span className="cui-prod__cat">{categoryName}</span> : <span />}
            {available ? (
              <span className="cui-prod__stock">
                <i aria-hidden="true" />
                {t('customer_menu_in_stock')}
              </span>
            ) : null}
          </div>
        ) : null}

        {showPrices ? (
          <div className="cui-prod__pricebar">
            <span className="cui-prod__priceicon" aria-hidden="true">
              <Icon name="banknote" size={16} />
            </span>
            <span className="cui-prod__amount">{amount.number}</span>
            <span className="cui-prod__curr">{amount.symbol}</span>
            {product.promo_price ? (
              <s className="cui-prod__was">
                <Money value={product.price} currency={currency} />
              </s>
            ) : null}
          </div>
        ) : null}

        {canAdd ? (
          <div
            className="cui-prod__actions"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {quantity > 0 ? (
              <ProductQuantityControl
                quantity={quantity}
                onIncrease={() => onAdd(product)}
                onDecrease={() => onDecrease?.(product)}
                disabled={!available || disabled}
              />
            ) : (
              <button
                type="button"
                className="cui-prod__add"
                disabled={!available || disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onAdd(product);
                }}
                aria-label={`${addLabel || t('customer_menu_add_to_cart')} — ${name}`}
              >
                <Icon name="cart" size={17} />
                <span>{addLabel || t('customer_menu_add_to_cart')}</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
