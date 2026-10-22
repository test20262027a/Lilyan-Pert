import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import LanguageSelect from '../header/LanguageSelect';
// The one language dropdown of the app, so the public menu's control looks and
// behaves exactly like the admin panel's.
import '../header/header.css';

/*
 * The two controls that float over the business banner: the basket on one end
 * and, on the other, the language dropdown plus the in-store "back to the admin
 * panel" pill. They sit on the hero itself (not in a bar above it), so the
 * banner opens the page edge to edge exactly like the reference layout.
 *
 * `adminReturn` is the in-store "main" context only — the public customer menu
 * never receives it, so a guest is never shown a way back into the admin panel.
 */
export default function CustomerTopBar({ cartEnabled, cartCount, onCart, adminReturn }) {
  const { t } = useI18n();

  return (
    <div className="cui-hero__top">
      <div className="cui-hero__top-side">
        {adminReturn ? (
          <Link className="cui-hero__back" to="/">
            <Icon name="arrowLeft" size={15} />
            <span>{t('customer_menu_return_to_admin')}</span>
          </Link>
        ) : null}
        <span className="cui-hero__lang">
          <LanguageSelect />
        </span>
      </div>

      {cartEnabled ? (
        <button
          type="button"
          className="cui-hero__cart"
          onClick={onCart}
          aria-label={t('customer_menu_cart')}
          title={t('customer_menu_cart')}
        >
          <Icon name="cart" size={18} />
          <span className="cui-hero__cartlabel">{t('customer_menu_cart')}</span>
          {cartCount > 0 ? <span className="cui-hero__count">{cartCount}</span> : null}
        </button>
      ) : null}
    </div>
  );
}
