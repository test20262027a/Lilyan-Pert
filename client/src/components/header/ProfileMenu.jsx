import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import UserAvatar from '../UserAvatar';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';

/*
 * Profile trigger + overlay menu. Every row points at a real route and the
 * sign-out row calls the app's actual logout; the menu is an overlay, so it
 * never pushes page content down.
 */
export default function ProfileMenu() {
  const { t } = useI18n();
  const { user, memberships, businessId, isManager, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  const membership = memberships.find((m) => m.business_id === businessId);
  const roleKey = membership
    ? `role_${membership.role}`
    : isSuperAdmin
      ? 'role_super_admin'
      : null;
  const displayName = user?.full_name || user?.email?.split('@')[0] || t('auth_account');

  // Outside click closes the overlay; Escape closes it and returns focus.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      btnRef.current?.focus();
      return;
    }
    if (!open || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    const items = Array.from(wrapRef.current?.querySelectorAll('[data-menu-item]') || []);
    if (items.length === 0) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown'
      ? (at + 1) % items.length
      : (at <= 0 ? items.length - 1 : at - 1);
    items[next].focus();
  };

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <span className="hdr-user" ref={wrapRef} onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        className="hdr-user__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('auth_account')}
        title={user?.email || t('auth_account')}
        onClick={() => setOpen((v) => !v)}
      >
        <UserAvatar user={user} size={32} />
        <Icon name="chevronDown" size={14} className={`hdr-user__caret ${open ? 'is-open' : ''}`} />
      </button>

      {open ? (
        <div className="hdr-menu" role="menu" aria-label={t('auth_account')}>
          <div className="hdr-menu__user">
            <UserAvatar user={user} size={50} />
            <span className="hdr-menu__who">
              <span className="hdr-menu__name" title={displayName}>{displayName}</span>
              <span className="hdr-menu__mail" title={user?.email}>{user?.email}</span>
              {roleKey ? <span className="hdr-menu__role">{t(roleKey)}</span> : null}
            </span>
          </div>

          <div className="hdr-menu__nav">
            <button
              type="button"
              role="menuitem"
              data-menu-item
              className="hdr-menu__row"
              onClick={() => go('/settings')}
            >
              <span>{t('nav_settings')}</span>
              <Icon name="chevronRight" size={14} className="hdr-menu__caret icon--dir" />
            </button>
            {isManager ? (
              <button
                type="button"
                role="menuitem"
                data-menu-item
                className="hdr-menu__row"
                onClick={() => go('/users')}
              >
                <span>{t('nav_users')}</span>
                <Icon name="chevronRight" size={14} className="hdr-menu__caret icon--dir" />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            role="menuitem"
            data-menu-item
            className="hdr-menu__logout"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <span className="hdr-menu__logout-icon">
              <Icon name="logout" size={15} className="icon--dir" />
            </span>
            <span>{t('auth_logout')}</span>
          </button>
        </div>
      ) : null}
    </span>
  );
}
