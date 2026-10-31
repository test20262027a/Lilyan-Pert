import { useLayoutEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import UserAvatar from '../UserAvatar';
import { useI18n } from '../../i18n';
import { permissionSummaryKey } from '../../permissions';

/*
 * One card of the User Management list.
 *
 * The card is a single CSS Grid: avatar, identity, role, status, permissions and
 * the three actions each own a named area, so every field sits in the same
 * column on every row no matter how long a name, email or permission summary is.
 * Nothing is positioned with content-dependent spacing — long text is clamped
 * (two lines for a name, one line with an ellipsis everywhere else) and the
 * complete value is handed to the global tooltip layer only when it is actually
 * cut off.
 *
 * The same markup is reused for the loading skeleton, so the placeholder rows
 * have exactly the shape the real rows will take when they arrive.
 */

/**
 * Reports whether the referenced element currently clips its own content.
 * `data-tip` is only attached while that is true, so a short value never grows a
 * redundant tooltip.
 */
function useTruncated(text) {
  const ref = useRef(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const cut = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      setTruncated((previous) => (previous === cut ? previous : cut));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return [ref, truncated];
}

export default function UserListRow({
  member,
  self,
  busy,
  canEdit,
  canDelete,
  onEdit,
  onVisibility,
  onDelete,
}) {
  const { t } = useI18n();

  const displayName = member.full_name || member.email;
  const activeMember = member.status === 'active';
  const permsLabel = t('user_permissions_label');
  const permsSummary = t(permissionSummaryKey(member));

  const [nameRef, nameCut] = useTruncated(displayName);
  const [emailRef, emailCut] = useTruncated(member.email || '');
  const [permsRef, permsCut] = useTruncated(permsSummary);

  return (
    <div className="um-row">
      <div className="um-row__identity">
        <span className="um-row__avatar">
          <UserAvatar user={member} size={46} alt={displayName} />
        </span>
        <div className="um-row__who">
          <span className="um-row__name" ref={nameRef} data-tip={nameCut ? displayName : undefined}>
            {displayName}
          </span>
          <span
            className="um-row__email"
            dir="ltr"
            ref={emailRef}
            data-tip={emailCut ? member.email : undefined}
          >
            {member.email}
          </span>
        </div>
      </div>

      <div className="um-row__badges">
        <span className={`um-badge um-row__role um-badge--${member.role}`}>{t(`role_${member.role}`)}</span>
        <span className={`um-badge um-row__status ${activeMember ? 'um-badge--active' : 'um-badge--off'}`}>
          <span className="um-badge__dot" aria-hidden="true" />
          {t(activeMember ? 'user_active' : 'user_disabled')}
        </span>
      </div>

      <span
        className="um-row__perms"
        ref={permsRef}
        data-tip={permsCut ? `${permsLabel} ${permsSummary}` : undefined}
      >
        <span className="um-row__perms-label">{permsLabel}</span> <strong>{permsSummary}</strong>
      </span>

      <div className="um-row__actions">
        {canEdit ? (
          <button
            type="button"
            className="um-iconbtn"
            onClick={onEdit}
            title={t('user_edit_title')}
            aria-label={t('user_edit_title')}
          >
            <Icon name="pencil" size={15} />
          </button>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            className="um-iconbtn"
            disabled={self || busy}
            onClick={onVisibility}
            title={self
              ? t('user_cannot_modify_self')
              : t(activeMember ? 'user_deactivate' : 'user_activate')}
            aria-label={t(activeMember ? 'user_deactivate' : 'user_activate')}
          >
            <Icon name={activeMember ? 'eyeOff' : 'eye'} size={15} />
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className="um-iconbtn um-iconbtn--danger"
            disabled={self || busy}
            onClick={onDelete}
            title={self ? t('user_cannot_modify_self') : t('action_delete')}
            aria-label={t('action_delete')}
          >
            <Icon name="trash" size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
