import UserAvatar from '../UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import './sidebarProfile.css';

/*
 * The signed-in person at the foot of the admin rail: ONE horizontal card that
 * holds the real avatar on the inline-start side and, directly opposite it
 * inside the same card, the role localized in the interface language. Nothing
 * sits above the role.
 *
 * The record comes from the auth context, so a photo or avatar saved in My
 * Account repaints the card immediately — no reload, no sign-out.
 *
 * Collapsed to the icon rail the card narrows to the portrait alone; the same
 * localized role is revealed as a tooltip on hover or keyboard focus, and stays
 * in the accessibility tree either way.
 */
export default function SidebarProfile({ collapsed = false }) {
  const { t } = useI18n();
  const { user, memberships, businessId } = useAuth();

  if (!user) return null;

  const membership = memberships.find((m) => m.business_id === businessId);
  // This business's role, or the platform role when the person holds no
  // membership here — translated like every other role label.
  const roleKey = membership
    ? `role_${membership.role}`
    : user.is_super_admin
      ? 'role_super_admin'
      : null;
  const roleLabel = roleKey ? t(roleKey) : t('auth_account');

  return (
    <div className="sidebar__user">
      <div
        className="sprofile"
        data-tip={roleLabel}
        tabIndex={collapsed ? 0 : undefined}
      >
        <span className="sprofile__avatar">
          <UserAvatar
            user={user}
            size={38}
            alt={user.full_name || user.email || ''}
          />
        </span>
        <span className="sprofile__role">{roleLabel}</span>
      </div>
    </div>
  );
}
