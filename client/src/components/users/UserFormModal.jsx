import { useEffect, useId, useMemo, useState } from 'react';
import HeaderBackdrop from '../../headers/HeaderBackdrop';
import Icon from '../Icon';
import { Select } from '../ui';
import { useI18n } from '../../i18n';
import UsersArtwork from './UsersArtwork';
import UserPhotoField from './UserPhotoField';
import ModalActions from '../ModalActions';
import DiscardChangesDialog from '../confirm/DiscardChangesDialog';
import {
  PERMISSION_CARDS,
  actionLabelKey,
  cardGrantable,
} from '../../permissions';

/*
 * Add / Edit User dialog.
 *
 * Three fixed zones — the illustrated cream header, the independently
 * scrolling light form body, and the white sticky footer — so the permission
 * list can be long without ever hiding Save or covering the last card.
 *
 * The permission matrix renders the canonical catalog; which checkboxes are
 * editable comes from the server (`grantable` per role). A locked card is
 * visibly muted with a lock icon and its inputs are disabled, so it cannot be
 * turned on from the page. The server validates the same rules again on save.
 */

/*
 * The login identifier is composed from a username the administrator types and
 * the business's own suffix — `rebar@lilyanpert.app`. Only the username is
 * editable: the suffix is generated from the brand name in the Business
 * Profile and locked here and on the server (lib/identity.js). The rule below
 * mirrors the server's so a typo is reported before the request.
 */
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62})$/;

function Section({ title, children, aside }) {
  return (
    <section className="um-sec">
      <div className="um-sec__head">
        <span className="um-sec__bar" aria-hidden="true" />
        <h3 className="um-sec__title">{title}</h3>
        {aside ? <div className="um-sec__aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/* The red asterisk every required field carries; the label itself stays the
   accessible name, so the mark is decoration and the input is aria-required. */
function FieldLabel({ label, required }) {
  return (
    <span className="um-field__label">
      {label}
      {required ? <span className="um-field__req" aria-hidden="true">*</span> : null}
    </span>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return <span className="um-field__error" id={id} role="alert">{message}</span>;
}

function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
  required = false,
  error = null,
}) {
  const { t } = useI18n();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [shown, setShown] = useState(false);
  return (
    <label className="um-field">
      <FieldLabel label={label} required={required} />
      <span className="um-field__wrap">
        <input
          id={inputId}
          className={`um-input ${error ? 'is-invalid' : ''}`}
          type={shown ? 'text' : 'password'}
          dir="ltr"
          autoComplete={autoComplete}
          value={value}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="um-field__eye"
          onClick={() => setShown((s) => !s)}
          aria-label={t(shown ? 'user_hide_password' : 'user_show_password')}
          title={t(shown ? 'user_hide_password' : 'user_show_password')}
        >
          <Icon name={shown ? 'eyeOff' : 'eye'} size={15} />
        </button>
      </span>
      <FieldError id={errorId} message={error} />
    </label>
  );
}

function PermissionCard({ card, permissions, grantable, mandatory, onToggle }) {
  const { t } = useI18n();
  const groups = card.subgroups || [{ label: null, perms: card.perms }];
  const editable = cardGrantable(card, grantable);

  const renderCheck = (key) => {
    const locked = !grantable.includes(key);
    const required = mandatory.includes(key);
    const checked = Boolean(permissions[key]);
    return (
      <label key={key} className={`um-check ${locked ? 'is-locked' : ''} ${required ? 'is-required' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={locked}
          onChange={(e) => onToggle(key, e.target.checked)}
        />
        <span className="um-check__box" aria-hidden="true">
          <Icon name="check" size={11} />
        </span>
        <span className="um-check__label">{t(actionLabelKey(key))}</span>
      </label>
    );
  };

  return (
    <div className={`um-permcard ${editable ? '' : 'is-locked'}`}>
      <div className="um-permcard__head">
        <h4 className="um-permcard__title">{t(card.label)}</h4>
        {editable ? null : <Icon name="lock" size={13} className="um-permcard__lock" />}
      </div>
      {groups.map((group, index) => (
        <div className="um-permgroup" key={group.label || index}>
          {group.label ? <span className="um-permgroup__label">{t(group.label)}</span> : null}
          <div className="um-permgroup__checks">{group.perms.map(renderCheck)}</div>
        </div>
      ))}
    </div>
  );
}

export default function UserFormModal({
  mode = 'create',
  user,
  business,
  grantable = {},
  presets = {},
  mandatory = {},
  loginSuffix = '',
  busy,
  onClose,
  onSubmit,
}) {
  const { t } = useI18n();
  const titleId = useId();

  const [fullName, setFullName] = useState(user?.full_name || '');
  /*
   * Only the username is state. The suffix is read from business configuration
   * — an existing account keeps the suffix it was created with, a new one gets
   * the business's current brand suffix — and is never editable.
   */
  const [username, setUsername] = useState(user?.username || '');
  const suffix = user?.suffix || loginSuffix || '';
  // An account created before the brand was renamed keeps its own suffix, so
  // its live sign-in is never changed behind anyone's back.
  const suffixKept = Boolean(user?.suffix && loginSuffix && user.suffix !== loginSuffix);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'staff');
  const [active, setActive] = useState(user ? user.status === 'active' : true);
  // Appearance is always optional: a new account starts with no photo and the
  // neutral avatar, and the fallback choice is never guessed from the name.
  const [profileImage, setProfileImage] = useState(user?.profile_image_url || null);
  const [avatarType, setAvatarType] = useState(user?.avatar_type || 'default');
  const [uploading, setUploading] = useState(false);
  const [permissions, setPermissions] = useState(() =>
    Object.fromEntries((user?.permissions || []).map((key) => [key, true])),
  );
  const [roleNotice, setRoleNotice] = useState(false);
  const [error, setError] = useState(null);
  // Required-field validation. A field reports itself once it has been left or
  // the form was submitted — never while the first character is being typed.
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  // One discard confirmation at a time: the flag is the single owner, so a
  // double click on Cancel can never stack two dialogs.
  const [askDiscard, setAskDiscard] = useState(false);

  const roleOptions = useMemo(
    () => ['owner', 'manager', 'staff', 'customer'].filter((key) => (grantable[key] || []).length > 0),
    [grantable],
  );
  const currentGrantable = grantable[role] || [];
  const currentMandatory = mandatory[role] || [];

  const cleanUsername = username.trim().toLowerCase();
  const identifier = cleanUsername && suffix ? `${cleanUsername}${suffix}` : '';

  /*
   * Required information, checked in one place so the asterisks, the inline
   * messages and the disabled Save button can never disagree. Creating an
   * account always needs a password (and its confirmation); editing one never
   * asks for the current password unless a new one is typed.
   */
  const passwordNeeded = mode === 'create';
  const confirmNeeded = passwordNeeded || password.length > 0;
  const errors = useMemo(() => {
    const found = {};
    if (!fullName.trim()) found.fullName = t('user_name_required');
    if (!cleanUsername) found.username = t('user_required_field');
    else if (!USERNAME_RE.test(cleanUsername)) found.username = t('user_invalid_username');
    if (passwordNeeded && !password) found.password = t('user_required_field');
    else if (password && password.length < 8) found.password = t('auth_weak_password');
    if (confirmNeeded && !confirmPassword) found.confirm = t('user_confirm_required');
    else if (confirmNeeded && confirmPassword !== password) found.confirm = t('user_password_mismatch');
    if (!role) found.role = t('user_required_field');
    return found;
  }, [fullName, cleanUsername, password, confirmPassword, passwordNeeded, confirmNeeded, role, t]);

  const hasErrors = Object.keys(errors).length > 0;
  const touch = (field) => setTouched((current) => ({ ...current, [field]: true }));
  // A message is visible once its field was left, or after a save attempt.
  const errorFor = (field) => ((touched[field] || submitted) ? errors[field] : null);

  const dirty =
    fullName !== (user?.full_name || '')
    || cleanUsername !== (user?.username || '')
    || password.length > 0
    || role !== (user?.role || 'staff')
    || active !== (user ? user.status === 'active' : true)
    || profileImage !== (user?.profile_image_url || null)
    || avatarType !== (user?.avatar_type || 'default')
    || JSON.stringify(permissions)
      !== JSON.stringify(Object.fromEntries((user?.permissions || []).map((key) => [key, true])));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // The confirmation owns Escape while it is up; closing it keeps the data.
      if (askDiscard) return setAskDiscard(false);
      if (dirty) return setAskDiscard(true);
      onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, askDiscard, dirty]);

  // A form with meaningful unsaved input asks before closing. The custom
  // dialog owns the decision, so the data survives "Continue editing".
  const close = () => {
    if (dirty) {
      setAskDiscard(true);
      return;
    }
    onClose?.();
  };

  /*
   * Selecting a role loads that role's canonical preset inside the scope this
   * administrator may actually grant. A change is announced, never silent, so
   * custom permissions that fall outside the new role are visible before save.
   */
  const changeRole = (next) => {
    if (next === role) return;
    const allowed = grantable[next] || [];
    const preset = (presets[next] || []).filter((key) => allowed.includes(key));
    setPermissions(Object.fromEntries(preset.map((key) => [key, true])));
    setRole(next);
    setRoleNotice(mode === 'edit');
  };

  const toggle = (key, on) => {
    if (!currentGrantable.includes(key)) return;
    setPermissions((current) => {
      if (on) return { ...current, [key]: true };
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const selectAll = () => {
    setPermissions(Object.fromEntries(currentGrantable.map((key) => [key, true])));
  };

  const clearAll = () => {
    // Mandatory abilities stay: an account must never be locked out of its shell.
    setPermissions(Object.fromEntries(currentMandatory.map((key) => [key, true])));
  };

  const submit = () => {
    // Every required field is now on show, and an incomplete form never leaves.
    setSubmitted(true);
    if (hasErrors) {
      setError(null);
      return undefined;
    }
    if (uploading) return setError(t('user_photo_wait'));
    setError(null);
    // Only the username is sent: the server appends the locked business suffix.
    return onSubmit({
      full_name: fullName.trim(),
      username: cleanUsername,
      password: password || undefined,
      role,
      status: active ? 'active' : 'disabled',
      permissions,
      profile_image_url: profileImage,
      avatar_type: avatarType,
    });
  };

  const activeGrantableCount = currentGrantable.length;

  return (
    <div
      className="um-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="um-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="um-modal__head">
          <HeaderBackdrop />
          <div className="um-modal__art" aria-hidden="true">
            <UsersArtwork />
          </div>
          <div className="um-modal__identity">
            <span className="um-modal__glyph">
              <Icon name="users" size={19} />
            </span>
            <h2 className="um-modal__title" id={titleId}>
              {mode === 'edit' ? t('user_edit_title') : t('user_create')}
            </h2>
          </div>
          <button
            type="button"
            className="um-modal__close"
            onClick={close}
            aria-label={t('action_close')}
            title={t('action_close')}
            data-tip-hover-only
            data-tip-side="top"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="um-modal__body">
          {error ? <div className="um-error">{error}</div> : null}

          <p className="um-note um-note--req">{t('user_required_note')}</p>

          <Section title={t('user_section_general')}>
            <div className="um-fields">
              <label className="um-field">
                <FieldLabel label={t('label_full_name')} required />
                <input
                  className={`um-input ${errorFor('fullName') ? 'is-invalid' : ''}`}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => touch('fullName')}
                  autoComplete="name"
                  required
                  aria-required="true"
                  aria-invalid={errorFor('fullName') ? 'true' : undefined}
                  aria-describedby={errorFor('fullName') ? 'um-full-name-error' : undefined}
                />
                <FieldError id="um-full-name-error" message={errorFor('fullName')} />
              </label>
              <div className="um-fields--2">
                <label className="um-field">
                  <FieldLabel label={t('user_username')} required />
                  <input
                    className={`um-input ${errorFor('username') ? 'is-invalid' : ''}`}
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => touch('username')}
                    autoComplete="off"
                    spellCheck={false}
                    required
                    aria-required="true"
                    aria-invalid={errorFor('username') ? 'true' : undefined}
                    aria-describedby={errorFor('username') ? 'um-username-error' : undefined}
                  />
                  <FieldError id="um-username-error" message={errorFor('username')} />
                </label>
                {/* Business-owned suffix: shown, never editable or clearable. */}
                <div className="um-field">
                  <FieldLabel label={t('user_login_suffix')} />
                  <span className="um-field__wrap um-field__wrap--locked">
                    <input
                      className="um-input um-input--locked"
                      dir="ltr"
                      value={suffix}
                      placeholder={loginSuffix || '@lilyanpert.app'}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      aria-describedby="um-suffix-locked"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <span className="um-field__lock" aria-hidden="true">
                      <Icon name="lock" size={13} />
                    </span>
                  </span>
                  <span className="um-field__hint" id="um-suffix-locked">
                    <Icon name="lock" size={11} />
                    {t(suffixKept ? 'user_suffix_kept' : 'user_suffix_locked')}
                  </span>
                </div>
              </div>
              {/* The identifier the person will actually sign in with. */}
              <div className="um-preview" dir="ltr">
                <Icon name="mail" size={13} />
                <span className={identifier ? '' : 'um-preview__empty'}>
                  {identifier || t('user_login_preview_empty')}
                </span>
              </div>
            </div>
          </Section>

          <Section title={t('user_section_profile')}>
            <UserPhotoField
              photo={profileImage}
              avatarType={avatarType}
              name={fullName}
              onPhotoChange={setProfileImage}
              onAvatarChange={setAvatarType}
              onUploading={setUploading}
            />
          </Section>

          <Section title={t('user_section_password')}>
            <div className="um-fields um-fields--2">
              <PasswordField
                label={t('label_password')}
                value={password}
                onChange={setPassword}
                onBlur={() => touch('password')}
                autoComplete="new-password"
                required={passwordNeeded}
                error={errorFor('password')}
              />
              <PasswordField
                label={t('user_confirm_password')}
                value={confirmPassword}
                onChange={setConfirmPassword}
                onBlur={() => touch('confirm')}
                autoComplete="new-password"
                required={confirmNeeded}
                error={errorFor('confirm')}
              />
            </div>
            <p className="um-note">{t('user_password_notice')}</p>
          </Section>

          <Section title={t('user_section_role')}>
            <div className="um-fields um-fields--2">
              <label className="um-field">
                <FieldLabel label={t('user_role')} required />
                <Select
                  value={role}
                  onChange={changeRole}
                  aria-label={t('user_role')}
                  options={roleOptions.map((key) => ({ value: key, label: t(`role_${key}`) }))}
                />
              </label>
              <label className="um-field">
                <span className="um-field__label">{t('user_assigned_business')}</span>
                <input className="um-input" value={business?.name || ''} readOnly disabled />
              </label>
            </div>

            <div className="um-status">
              <div className="um-status__text">
                <span className="um-status__label">{t('label_status')}</span>
                <span className="um-status__hint">{t(active ? 'user_active' : 'user_disabled')}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                aria-label={t('label_status')}
                className={`um-switch ${active ? 'is-on' : ''}`}
                onClick={() => setActive((v) => !v)}
              >
                <span className="um-switch__dot" />
              </button>
            </div>
            {roleNotice ? <p className="um-note">{t('user_role_preset_notice')}</p> : null}
          </Section>

          <Section
            title={t('user_section_permissions')}
            aside={
              <div className="um-perm-actions">
                <button type="button" className="um-mini" onClick={selectAll} disabled={!activeGrantableCount}>
                  {t('user_select_all')}
                </button>
                <button type="button" className="um-mini" onClick={clearAll}>
                  {t('user_clear_all')}
                </button>
              </div>
            }
          >
            <div className="um-perm-list">
              {PERMISSION_CARDS.map((card) => (
                <PermissionCard
                  key={card.id}
                  card={card}
                  permissions={permissions}
                  grantable={currentGrantable}
                  mandatory={currentMandatory}
                  onToggle={toggle}
                />
              ))}
            </div>
            <p className="um-note">{t('user_locked_hint')}</p>
          </Section>
        </div>

        <footer className="um-modal__foot">
          <ModalActions
            primaryLabel={t('action_save')}
            onPrimary={submit}
            primaryDisabled={hasErrors}
            loading={busy || uploading}
            secondaryLabel={t('action_cancel')}
            onSecondary={close}
            secondaryDisabled={busy || uploading}
          />
        </footer>
      </div>

      <DiscardChangesDialog
        open={askDiscard}
        onContinue={() => setAskDiscard(false)}
        onDiscard={() => {
          setAskDiscard(false);
          onClose?.();
        }}
      />
    </div>
  );
}
