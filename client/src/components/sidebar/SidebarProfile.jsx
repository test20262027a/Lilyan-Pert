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
 * Collapsed to the icon rail the card narrows to the portrait alone. The role
 * is never repeated as a floating badge or tooltip over the avatar: it stays
 * inside the card, and on the rail it remains in the accessibility tree for
 * screen readers.
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

  return (
    <div className="sidebar__user">
      {/* No tooltip, badge or popover repeats the role here: the label lives
          inside the card, and on the collapsed rail it stays in the
          accessibility tree for screen readers instead of floating over the
          avatar. */}
      <div className="sprofile">
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
