import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * The way back from the main ordering menu into the admin dashboard.
 *
 * One compact 3D plate holding a single LayoutDashboard glyph — no arrow, no
 * label: the localized tooltip explains it on hover and `aria-label` explains
 * it to a screen reader on a touch screen. It is a router link, so returning
 * keeps the running app: the language, the theme, the session and the guest's
 * basket are never lost to a reload.
 *
 * The parent decides whether it exists at all — only the main ordering menu
 * renders it, and only for a signed-in user who may open the admin panel. The
 * dashboard route checks the same permission again on its own.
 */
export default function AdminReturnButton() {
  const { t, dir } = useI18n();
  const label = t('customer_menu_return_to_admin');

  return (
    <Link
      to="/"
      className="cui-return"
      dir={dir}
      data-tip={label}
      data-tip-side="bottom"
      aria-label={label}
    >
      <Icon name="dashboard" size={18} className="cui-return__glyph" />
    </Link>
  );
}
