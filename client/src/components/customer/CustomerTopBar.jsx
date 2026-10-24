import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import LanguageSelect from '../header/LanguageSelect';
// The one language dropdown of the app, so the public menu's control looks and
// behaves exactly like the admin panel's.
import '../header/header.css';

/*
 * The menu's action row: the basket on one end and, on the other, the language
 * dropdown next to the in-store "back to the admin panel" pill. The compact state
 * also carries the business's own identity in the middle, so the guest always
 * knows which menu they are reading after the banner scrolled away.
 *
 * The same component renders both states of the header — floating over the
 * banner (`hero`) and as the compact bar that takes over once the banner has
 * scrolled away (`bar`) — so there is exactly one cart control, one language
 * control and one admin return at any time, always reading the same state.
 *
 * The row lays out physically: basket left, identity centred, tools right, in
 * every language, exactly like the reference screenshots. Only each control's
 * own contents follow the reading direction.
 *
 * `cartDisabled` is the paused ordering state: the basket stays visible so the
 * layout never changes, but it cannot be opened while the business is closed.
 *
 * `adminReturn` is the in-store "main" context of an authenticated admin only —
 * the public customer menu never receives it, so a guest is never shown a way
 * back into the admin panel.
 */
export default function CustomerTopBar({
  variant = 'hero',
  cartEnabled,
  cartDisabled = false,
  cartCount,
  onCart,
  adminReturn,
  brand = null,
}) {
  const { t, dir } = useI18n();
  const showBrand = variant === 'bar' && Boolean(brand?.name);

  return (
    <div className={`cui-nav cui-nav--${variant}`}>
      {cartEnabled ? (
        <button
          type="button"
          className="cui-nav__cart"
          onClick={onCart}
          disabled={cartDisabled}
          aria-label={t('customer_menu_cart')}
          title={t('customer_menu_cart')}
        >
          <Icon name="cart" size={18} />
          <span className="cui-nav__cartlabel">{t('customer_menu_cart')}</span>
          {cartCount > 0 ? <span className="cui-nav__count">{cartCount}</span> : null}
        </button>
      ) : (
        <span />
      )}

      {showBrand ? (
        <span className="cui-nav__brand" dir={dir} title={brand.name}>
          <span className={`cui-nav__brandmark ${brand.logoUrl ? 'has-image' : ''}`.trim()} aria-hidden="true">
            {brand.logoUrl ? <img src={brand.logoUrl} alt="" /> : <Icon name="store" size={15} />}
          </span>
          <span className="cui-nav__brandname">{brand.name}</span>
        </span>
      ) : null}

      <div className="cui-nav__tools">
        {adminReturn ? (
          <Link className="cui-nav__back" to="/" dir={dir}>
            <Icon name="arrowLeft" size={15} />
            <span>{t('customer_menu_return_to_admin')}</span>
          </Link>
        ) : null}
        <span className="cui-nav__lang" dir={dir}>
          <LanguageSelect />
        </span>
      </div>
    </div>
  );
}
