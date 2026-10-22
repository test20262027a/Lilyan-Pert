import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import LanguageSelect from '../header/LanguageSelect';
// The one language dropdown of the app, so the public menu's control looks and
// behaves exactly like the admin panel's.
import '../header/header.css';

/*
 * The compact bar pinned to the top of both ordering menus: the business mark,
 * the scanned table, the language control and the cart. It floats over the hero
 * on a glass surface, so the guest keeps the two actions they need (language and
 * cart) in reach at every scroll position without the bar ever feeling heavy.
 *
 * `adminReturn` is the in-store "main" context only — the public customer menu
 * never receives it, so a guest is never shown a way back into the admin panel.
 */
export default function CustomerTopBar({
  brandName,
  logoUrl,
  table,
  cartEnabled,
  cartCount,
  onCart,
  adminReturn,
}) {
  const { t } = useI18n();

  return (
    <div className="cui-bar">
      <div className="cui-bar__inner">
        <div className="cui-bar__brand">
          <span className="cui-bar__logo">
            {logoUrl ? <img src={logoUrl} alt="" /> : <span>{brandName.slice(0, 2)}</span>}
          </span>
          <span className="cui-bar__name" title={brandName}>
            {brandName}
          </span>
          {table ? (
            <span className="cui-bar__table">
              <Icon name="table" size={13} />
              {table.name}
            </span>
          ) : null}
        </div>

        <div className="cui-bar__actions">
          {adminReturn ? (
            <Link className="cui-bar__ghost" to="/">
              <span>{t('customer_menu_return_to_admin')}</span>
              <Icon name="arrowLeft" size={15} />
            </Link>
          ) : null}
          <LanguageSelect />
          {cartEnabled ? (
            <button
              type="button"
              className="cui-cart"
              onClick={onCart}
              aria-label={t('customer_menu_cart')}
              title={t('customer_menu_cart')}
            >
              <Icon name="cart" size={19} />
              {cartCount > 0 ? <span className="cui-cart__count">{cartCount}</span> : null}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
