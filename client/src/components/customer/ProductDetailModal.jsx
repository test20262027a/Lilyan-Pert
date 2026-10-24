import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';
import { productPrice } from '../../languages';
import { fmtMoneyParts } from '../../format';
import { appearanceOf } from '../menu/categoryIcons';
import ProductQuantityControl from './ProductQuantityControl';
import ProductImageViewer from './ProductImageViewer';

/*
 * The product sheet opened by tapping a product card.
 *
 * Physically two columns — the product's own information on the LEFT and its
 * photograph on the RIGHT, exactly like the reference — while the text inside
 * follows the reading direction of the chosen language. The shell is forced to
 * `direction: ltr` and the columns are placed explicitly, so a right-to-left
 * text direction can never silently swap the picture and the copy.
 *
 * The sheet reads the menu payload only: the real saved photograph, the
 * category's own glyph and identity colour, the saved price (and its promotion)
 * and the same cart quantity the product card shows. Closing it returns the
 * guest to the menu with the cart untouched.
 */
export default function ProductDetailModal({
  product,
  category,
  currency,
  showPrices = true,
  canAdd = true,
  addLabel,
  promoLabel,
  quantity = 0,
  onAdd,
  onDecrease,
  onClose,
}) {
  const { t, locale, dir } = useI18n();
  const titleId = useId();
  const sheetRef = useRef(null);
  const closeRef = useRef(null);
  const restoreRef = useRef(null);
  const [zoomed, setZoomed] = useState(false);

  const name = localized(product, 'name', locale);
  const description = localized(product, 'description', locale);
  const categoryName = localized(category, 'name', locale);
  const appearance = appearanceOf(category);
  const available = product.available !== false;
  /* The sheet prices the product in the language the guest is reading. */
  const price = productPrice(product, locale, currency);
  const priced = price.valid;
  const buyable = available && priced;
  const onSale = priced && Boolean(product.has_promotion);
  const amount = fmtMoneyParts(priced ? price.amount : 0, currency, locale);

  /* Escape closes the magnification first, then the sheet itself. */
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setZoomed((open) => {
        if (open) return false;
        onClose?.();
        return false;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Focus moves into the sheet and comes back to whatever opened it. */
  useEffect(() => {
    restoreRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const target = restoreRef.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) target.focus();
    };
  }, []);

  return createPortal(
    <div
      className="cui-pd-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="cui-pd"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="cui-pd__info" dir={dir}>
          <header className="cui-pd__head">
            <span
              className="cui-pd__caticon"
              style={{ '--pd-ink': appearance.color }}
              aria-hidden="true"
            >
              <Icon name={appearance.icon} size={22} />
            </span>
            <div className="cui-pd__heading">
              <h2 className="cui-pd__name" id={titleId}>
                {name}
              </h2>
              {categoryName ? <span className="cui-pd__cat">{categoryName}</span> : null}
            </div>
          </header>

          <div className="cui-pd__status">
            {buyable ? (
              <span className="cui-pd__stock">
                <i aria-hidden="true" />
                {t('customer_menu_in_stock')}
              </span>
            ) : (
              <span className="cui-pd__stock cui-pd__stock--out">
                <i aria-hidden="true" />
                {t('customer_menu_unavailable_item')}
              </span>
            )}
          </div>

          {description ? <p className="cui-pd__desc">{description}</p> : null}

          <div className="cui-pd__foot">
            {showPrices ? (
              <div className="cui-pd__price">
                <span className="cui-pd__coin" aria-hidden="true">
                  <Icon name="banknote" size={17} />
                </span>
                {priced ? (
                  <>
                    <span className="cui-pd__amount">{amount.number}</span>
                    <span className="cui-pd__curr">{amount.symbol}</span>
                    {onSale && price.base !== null && price.base !== price.amount ? (
                      <s className="cui-pd__was">
                        {fmtMoneyParts(price.base, currency, locale).number}
                      </s>
                    ) : null}
                    {onSale && promoLabel ? (
                      <span className="cui-pd__promo">
                        <Icon name="percent" size={11} />
                        {promoLabel}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="cui-pd__offlabel">{t('customer_menu_price_unavailable')}</span>
                )}
              </div>
            ) : (
              <span />
            )}

            {canAdd ? (
              <div className="cui-pd__action" onClick={(event) => event.stopPropagation()}>
                {quantity > 0 ? (
                  <ProductQuantityControl
                    quantity={quantity}
                    size="lg"
                    onIncrease={() => onAdd?.(product)}
                    onDecrease={() => onDecrease?.(product)}
                    disabled={!buyable}
                  />
                ) : (
                  <button
                    type="button"
                    className="cui-pd__add"
                    onClick={() => onAdd?.(product)}
                    disabled={!buyable}
                  >
                    <Icon name="plus" size={18} />
                    <span>{addLabel || t('customer_menu_add_to_cart')}</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="cui-pd__media">
          {product.image_url ? (
            <button
              type="button"
              className="cui-pd__shot"
              onClick={() => setZoomed(true)}
              aria-label={t('customer_menu_zoom_open')}
              title={t('customer_menu_zoom_open')}
            >
              <img src={product.image_url} alt={name} draggable="false" />
              <span className="cui-pd__zoomhint" aria-hidden="true">
                <Icon name="search" size={15} />
                <span>{t('customer_menu_zoom_open')}</span>
              </span>
            </button>
          ) : (
            <span className="cui-pd__ph">
              <Icon name="coffee" size={40} />
            </span>
          )}
        </div>

        <button
          ref={closeRef}
          type="button"
          className="cui-pd__close"
          onClick={onClose}
          aria-label={t('action_close')}
          title={t('action_close')}
        >
          <Icon name="close" size={17} />
        </button>
      </div>

      {zoomed && product.image_url ? (
        <ProductImageViewer
          src={product.image_url}
          alt={name}
          onClose={() => setZoomed(false)}
        />
      ) : null}
    </div>,
    document.body,
  );
}
