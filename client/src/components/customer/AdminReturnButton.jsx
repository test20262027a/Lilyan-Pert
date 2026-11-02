import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { adminReturnRoute } from '../../adminReturn';

/*
 * The way back from the customer ordering menu into the admin panel.
 *
 * One control, three widths: label beside the icon from a desktop width, a
 * compact icon plate on a tablet and a small rounded-square icon on a phone.
 * It is a router link, so returning keeps the running app — the language, the
 * theme, the session and the guest's basket are never lost to a reload — and it
 * lands on the last admin screen the user was on when they may still open it,
 * otherwise on the dashboard.
 *
 * The parent decides whether it exists at all: it is only rendered for an
 * authenticated user who may open the admin panel, so a guest never receives a
 * door to the back office. The destination route checks the same permission
 * again on its own.
 */
export default function AdminReturnButton() {
  const { t, dir } = useI18n();
  const { can } = useAuth();
  const label = t('customer_menu_return_to_admin');

  return (
    <Link
      to={adminReturnRoute(can)}
      className="cui-return"
      dir={dir}
      data-tip={label}
      data-tip-side="bottom"
      aria-label={label}
    >
      <span className="cui-return__stage" aria-hidden="true">
        <Icon name="dashboard" size={17} className="cui-return__glyph" />
        <span className="cui-return__arrow">
          <Icon name="arrowLeft" size={9} />
        </span>
      </span>
      <span className="cui-return__label">{label}</span>
    </Link>
  );
}
