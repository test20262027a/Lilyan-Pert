import UserAvatar from '../UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import './sidebarProfile.css';

/*
 * The signed-in person at the foot of the admin rail: ONE horizontal card that
 * holds the real avatar on the inline-start side and, directly beside it, the
 * person's own full name with the role localized in the interface language as
 * quieter secondary text underneath.
 *
 * Everything comes from the auth context, so a name, photo or avatar saved in
 * My Account repaints the card immediately — no reload, no sign-out.
 *
 * Collapsed to the icon rail the card narrows to the portrait alone; the name
 * and role stay in the accessibility tree as the account label instead of
 * floating over the avatar as a badge or tooltip.
 */
export default function SidebarProfile() {
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
  // The person's real name; the sign-in identifier only when no name is set.
  const displayName = user.full_name || user.email || t('auth_account');

  return (
    <div className="sidebar__user">
      <div className="sprofile" title={displayName}>
        <span className="sprofile__avatar">
          <UserAvatar
            user={user}
            size={38}
            alt={displayName}
          />
        </span>
        <span className="sprofile__text">
          <span className="sprofile__name" title={displayName}>{displayName}</span>
          <span className="sprofile__role">{roleLabel}</span>
        </span>
      </div>
    </div>
  );
}
