import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, ConfirmDialog, EmptyState, Field, Modal, Select, useToast } from '../components/ui';
import DeleteConfirmationDialog from '../components/confirm/DeleteConfirmationDialog';
import ModalActions from '../components/ModalActions';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { del, get, patch, post } from '../api';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import UsersArtwork from '../components/users/UsersArtwork';
import UserFormModal from '../components/users/UserFormModal';
import UserPhotoField from '../components/users/UserPhotoField';
import UserAvatar from '../components/UserAvatar';
import { permissionSummaryKey } from '../permissions';
import '../users.css';

/*
 * User Management.
 *
 * The list is business memberships, loaded from the server with the search and
 * filters applied there, so a search never only looks at what is on screen. The
 * rows show the fields the reference shows — name/email, role, status, an
 * effective-permission summary — with edit, access and delete actions on the
 * physical left. Every mutation goes through the membership endpoints, which
 * enforce role rank, module permissions and last-owner protection on their own.
 */

const EMPTY = { users: [], grantable: {}, presets: {}, mandatory: {}, business: null };

/* Why a list request can fail, in the reader's language. */
const LOAD_ERROR_KEYS = {
  AUTH_REQUIRED: 'user_session_expired',
  PERMISSION_DENIED: 'access_denied',
  INSUFFICIENT_ROLE: 'access_denied',
  NO_BUSINESS_ACCESS: 'access_denied',
};

const ERROR_KEYS = {
  LAST_OWNER: 'user_last_owner',
  CANNOT_MODIFY_SELF: 'user_cannot_modify_self',
  ROLE_NOT_ASSIGNABLE: 'user_role_not_assignable',
  PERMISSION_NOT_GRANTABLE: 'user_permission_not_grantable',
  PERMISSION_DENIED: 'access_denied',
  ALREADY_MEMBER: 'user_already_member',
  WEAK_PASSWORD: 'auth_weak_password',
  INVALID_EMAIL: 'user_invalid_email',
  INVALID_USERNAME: 'user_invalid_username',
  INVALID_SUFFIX: 'user_invalid_suffix',
  INVALID_IDENTIFIER: 'user_invalid_suffix',
  EMAIL_TAKEN: 'user_email_taken',
  NAME_REQUIRED: 'user_name_required',
};

export default function Users() {
  const { t } = useI18n();
  const { business } = useBusiness();
  const { user: me, can, role: myRole, isSuperAdmin, updateProfile, refresh } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  // The failed request itself, not just a flag: the alert can then say what
  // really went wrong instead of a generic message.
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  // `search` is what is typed; `query` is what the server was last asked for.
  // Typing settles into `query` after a short debounce, Enter commits at once.
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const requestId = useRef(0);

  const canCreate = can('users.create');
  const canEdit = can('users.edit');
  const canDelete = can('users.delete');

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (role !== 'all') params.set('role', role);
      if (status !== 'all') params.set('status', status);
      // Never name this `query`: that identifier is the state above, and a local
      // `const query` here would shadow it before its own initialisation and
      // throw on every load.
      const search = params.toString();
      const res = await get(`/manage/users${search ? `?${search}` : ''}`);
      // Only the newest request may write the list (a slow older search must not
      // overwrite a newer one).
      if (id === requestId.current) setData({ ...EMPTY, ...res });
    } catch (err) {
      if (id === requestId.current) setLoadError(err);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query, role, status]);

  // Live search: typing settles into the committed query. Clearing the field
  // restores the list straight away and never touches the role/status filters.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), search.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  // Enter searches now, without a page reload and without waiting for the debounce.
  const onSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    setQuery(search);
  };

  const failMessage = (err) => t(ERROR_KEYS[err.code] || 'error_generic');

  const openCreate = () => setModal({ mode: 'create' });

  const submitUser = async (values) => {
    setBusy(true);
    try {
      if (modal.mode === 'edit') {
        await patch(`/manage/users/${modal.user.membership_id}`, {
          full_name: values.full_name,
          username: values.username,
          login_suffix: values.login_suffix,
          role: values.role,
          status: values.status,
          permissions: values.permissions,
          profile_image_url: values.profile_image_url,
          avatar_type: values.avatar_type,
        });
        // Editing your own account must also refresh the header avatar.
        if (modal.user.id === me?.id) await refresh();
      } else {
        await post('/manage/users', values);
      }
      setModal(null);
      await load();
      toast.success(t('user_saved'));
    } catch (err) {
      toast.error(failMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const applyConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'delete') {
        await del(`/manage/users/${confirm.user.membership_id}`);
      } else {
        await patch(`/manage/users/${confirm.user.membership_id}`, {
          status: confirm.user.status === 'active' ? 'disabled' : 'active',
        });
      }
      setConfirm(null);
      await load();
      toast.success(t('state_saved'));
    } catch (err) {
      toast.error(failMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (member) => {
    setBusy(true);
    try {
      await patch(`/manage/users/${member.membership_id}`, {
        status: member.status === 'active' ? 'disabled' : 'active',
      });
      await load();
    } catch (err) {
      toast.error(failMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const roleOptions = [
    { value: 'all', label: t('user_filter_role_all') },
    ...['owner', 'manager', 'staff', 'customer'].map((key) => ({
      value: key,
      label: t(`role_${key}`),
    })),
  ];

  const statusOptions = [
    { value: 'all', label: t('user_filter_status_all') },
    { value: 'active', label: t('user_active') },
    { value: 'disabled', label: t('user_disabled') },
  ];

  const filtered = Boolean(search.trim() || role !== 'all' || status !== 'all');
  const creator = data.account?.creator || null;
  // The identifier a new account is composed with: the business's saved suffix,
  // or the one suggested from its name while none is saved yet.
  const loginSuffix = data.account?.login_suffix || data.account?.suggested_suffix || '';

  return (
    <div className="users-page">
      <PageHeroBanner
        icon="users"
        title={t('user_page_title')}
        subtitle={t('user_page_subtitle')}
        art={<UsersArtwork />}
      >
        <button type="button" className="btn btn--sm" onClick={() => setProfileOpen(true)}>
          <Icon name="users" size={14} />
          {t('user_my_account')}
        </button>
        <button type="button" className="btn btn--sm" onClick={() => setPasswordOpen(true)}>
          <Icon name="key" size={14} />
          {t('user_change_password')}
        </button>
        {creator?.can_set_password && creator?.needs_setup ? (
          <button type="button" className="btn btn--sm" onClick={() => setCreatorOpen(true)}>
            <Icon name="shield" size={14} />
            {t('user_creator_setup')}
          </button>
        ) : null}
        {canCreate ? (
          <button type="button" className="um-add" onClick={openCreate}>
            <span className="um-add__plus" aria-hidden="true">
              <Icon name="plus" size={14} />
            </span>
            <span>{t('user_create')}</span>
          </button>
        ) : null}
      </PageHeroBanner>

      {data.counts ? (
        <div className="um-stats">
          <div className="um-stat">
            <span className="um-stat__value">{data.counts.total}</span>
            <span className="um-stat__label">{t('user_count_total')}</span>
          </div>
          <div className="um-stat um-stat--active">
            <span className="um-stat__value">{data.counts.active}</span>
            <span className="um-stat__label">{t('user_active')}</span>
          </div>
          <div className="um-stat um-stat--off">
            <span className="um-stat__value">{data.counts.disabled}</span>
            <span className="um-stat__label">{t('user_inactive')}</span>
          </div>
        </div>
      ) : null}

      <div className="um-toolbar">
        <div className="um-search lilyan-search">
          <span className="lilyan-search__icon">
            <Icon name="search" size={15} />
          </span>
          <input
            className="um-search__input lilyan-search__input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={t('user_search_placeholder')}
            aria-label={t('user_search_placeholder')}
          />
          {search ? (
            <button
              type="button"
              className="um-search__clear lilyan-search__clear"
              onClick={() => setSearch('')}
              aria-label={t('action_clear')}
              title={t('action_clear')}
            >
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </div>
        <div className="um-filter">
          <Select value={role} onChange={setRole} options={roleOptions} aria-label={t('user_role')} />
        </div>
        <div className="um-filter">
          <Select value={status} onChange={setStatus} options={statusOptions} aria-label={t('label_status')} />
        </div>
      </div>

      {loadError ? (
        <Alert kind="error">
          {t(LOAD_ERROR_KEYS[loadError.code] || 'user_load_failed')}{' '}
          <button type="button" className="btn btn--sm" onClick={load} disabled={loading}>
            {t('action_retry')}
          </button>
        </Alert>
      ) : null}

      <div className="um-list" aria-busy={loading}>
        {loading ? (
          [0, 1, 2, 3].map((row) => (
            <div className="um-row um-row--skeleton" key={row} aria-hidden="true">
              <span className="um-skel" style={{ width: 170, height: 12 }} />
              <span className="um-skel" style={{ width: 60, height: 20, borderRadius: 999 }} />
              <span className="um-skel" style={{ width: 52, height: 20, borderRadius: 999 }} />
              <span className="um-skel" style={{ width: 130, height: 11 }} />
            </div>
          ))
        ) : loadError ? (
          // A failed request is never dressed up as "no members": the alert
          // above says what went wrong and the list stays out of the way.
          <EmptyState
            icon="alert"
            title={t('user_load_failed')}
            hint={t('user_load_failed_hint')}
          />
        ) : data.users.length === 0 ? (
          <EmptyState
            icon="users"
            title={filtered ? t('user_search_empty') : t('user_no_users')}
            hint={filtered ? t('user_search_empty_hint') : undefined}
          />
        ) : (
          data.users.map((member) => {
            const self = member.id === me?.id;
            const activeMember = member.status === 'active';
            return (
              <div className="um-row" key={member.membership_id}>
                <div className="um-row__identity">
                  <UserAvatar user={member} size={44} alt={member.full_name || member.email} />
                  <div className="um-row__who">
                    <span className="um-row__name">{member.full_name || member.email}</span>
                    <span className="um-row__email" dir="ltr">
                      {member.email}
                    </span>
                  </div>
                </div>

                <span className={`um-badge um-badge--${member.role}`}>{t(`role_${member.role}`)}</span>

                <span className={`um-badge ${activeMember ? 'um-badge--active' : 'um-badge--off'}`}>
                  {t(activeMember ? 'user_active' : 'user_disabled')}
                </span>

                <span className="um-row__perms">
                  {t('user_permissions_label')}{' '}
                  <strong>{t(permissionSummaryKey(member))}</strong>
                </span>

                <div className="um-row__actions">
                  {canEdit ? (
                    <button
                      type="button"
                      className="um-iconbtn"
                      onClick={() => setModal({ mode: 'edit', user: member })}
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
                      onClick={() =>
                        activeMember
                          ? setConfirm({ kind: 'access', user: member })
                          : toggleStatus(member)
                      }
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
                      onClick={() => setConfirm({ kind: 'delete', user: member })}
                      title={self ? t('user_cannot_modify_self') : t('action_delete')}
                      aria-label={t('action_delete')}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {modal ? (
        <UserFormModal
          mode={modal.mode}
          user={modal.user}
          business={data.business || business}
          grantable={data.grantable}
          presets={data.presets}
          mandatory={data.mandatory}
          loginSuffix={loginSuffix}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={submitUser}
        />
      ) : null}

      {confirm ? (
        confirm.kind === 'delete' ? (
          <DeleteConfirmationDialog
            entityType="user"
            entityName={confirm.user.full_name || confirm.user.email}
            entitySubtitle={confirm.user.full_name ? confirm.user.email : undefined}
            description={t('user_delete_confirm')}
            busy={busy}
            onCancel={() => setConfirm(null)}
            onConfirm={applyConfirm}
          />
        ) : (
          <ConfirmDialog
            title={t('user_disable_confirm')}
            message={confirm.user.full_name || confirm.user.email}
            busy={busy}
            confirmLabel={t('user_deactivate')}
            onCancel={() => setConfirm(null)}
            onConfirm={applyConfirm}
          />
        )
      ) : null}

      {passwordOpen ? (
        <ChangePasswordModal
          onClose={() => setPasswordOpen(false)}
          onSaved={() => toast.success(t('user_password_changed'))}
        />
      ) : null}

      {profileOpen ? (
        <ProfileModal
          user={me}
          role={isSuperAdmin ? 'super_admin' : myRole}
          onClose={() => setProfileOpen(false)}
          updateProfile={updateProfile}
          onSaved={() => toast.success(t('state_saved'))}
        />
      ) : null}

      {creatorOpen && creator ? (
        <CreatorSetupModal
          email={creator.email}
          onClose={() => setCreatorOpen(false)}
          onSaved={async () => {
            toast.success(t('user_creator_password_set'));
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function ChangePasswordModal({ onClose, onSaved }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    // Checked here first so the reader gets the exact problem without a round
    // trip; the server repeats every one of these checks on its own.
    if (!values.current_password) {
      setError(t('user_current_password_required'));
      return;
    }
    if (values.new_password.length < 8) {
      setError(t('auth_weak_password'));
      return;
    }
    if (values.new_password !== values.confirm_password) {
      setError(t('user_password_mismatch'));
      return;
    }
    setBusy(true);
    try {
      await post('/auth/change-password', {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err.code === 'CURRENT_PASSWORD_INCORRECT') setError(t('user_current_password_wrong'));
      else if (err.code === 'WEAK_PASSWORD') setError(t('auth_weak_password'));
      else setError(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('user_change_password')}
      onClose={onClose}
      footer={
        <ModalActions
          primaryLabel={t('action_save')}
          primaryIcon="check"
          onPrimary={submit}
          loading={busy}
          secondaryLabel={t('action_cancel')}
          onSecondary={onClose}
          secondaryDisabled={busy}
        />
      }
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
      <div className="form-grid">
        <Field label={t('label_current_password')}>
          <input
            className="input"
            type="password"
            value={values.current_password}
            onChange={(e) => setValues((v) => ({ ...v, current_password: e.target.value }))}
          />
        </Field>
        <Field label={t('label_new_password')}>
          <input
            className="input"
            type="password"
            value={values.new_password}
            onChange={(e) => setValues((v) => ({ ...v, new_password: e.target.value }))}
          />
        </Field>
        <Field label={t('user_confirm_new_password')}>
          <input
            className="input"
            type="password"
            value={values.confirm_password}
            onChange={(e) => setValues((v) => ({ ...v, confirm_password: e.target.value }))}
          />
        </Field>
      </div>
      <p className="um-note">{t('user_password_min_notice')}</p>
    </Modal>
  );
}

function ProfileModal({ user, role, onClose, updateProfile, onSaved }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    locale: user?.locale || 'ku',
    profile_image_url: user?.profile_image_url || null,
    avatar_type: user?.avatar_type || 'default',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setError(null);
    if (!values.full_name.trim()) {
      setError(t('user_name_required'));
      return;
    }
    setBusy(true);
    try {
      await updateProfile({ ...values, full_name: values.full_name.trim() });
      onSaved();
      onClose();
    } catch {
      setError(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('user_my_account')}
      onClose={onClose}
      footer={
        <ModalActions
          primaryLabel={t('action_save')}
          primaryIcon="check"
          onPrimary={save}
          loading={busy}
          secondaryLabel={t('action_cancel')}
          onSecondary={onClose}
          secondaryDisabled={busy}
        />
      }
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
      <UserPhotoField
        photo={values.profile_image_url}
        avatarType={values.avatar_type}
        name={values.full_name}
        onPhotoChange={(url) => setValues((v) => ({ ...v, profile_image_url: url }))}
        onAvatarChange={(kind) => setValues((v) => ({ ...v, avatar_type: kind }))}
      />
      <div className="form-grid">
        {/* Account facts, read from the signed-in record: the login identifier
            and role are shown, never edited from this card. */}
        <Field label={t('user_login_identifier')}>
          <input className="input" dir="ltr" value={user?.email || ''} readOnly disabled />
        </Field>
        <Field label={t('user_role')}>
          <input
            className="input"
            value={role ? (role === 'super_admin' ? t('user_super_admin') : t(`role_${role}`)) : ''}
            readOnly
            disabled
          />
        </Field>
        <Field label={t('label_full_name')}>
          <input
            className="input"
            value={values.full_name}
            onChange={(e) => setValues((v) => ({ ...v, full_name: e.target.value }))}
          />
        </Field>
        <Field label={t('label_phone')}>
          <input
            className="input"
            dir="ltr"
            value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
          />
        </Field>
        <Field label={t('label_language')}>
          <Select
            value={values.locale}
            onChange={(v) => setValues((s) => ({ ...s, locale: v }))}
            options={[
              { value: 'ku', label: 'کوردی' },
              { value: 'fa', label: 'فارسی' },
              { value: 'ar', label: 'العربية' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Field>
      </div>
    </Modal>
  );
}

/*
 * One-time initialization of the Creator (Super Admin) account.
 *
 * The record already exists and already carries its platform role; this dialog
 * only lets the verified owner give it a password, so the owner of
 * `superadmin@work.app` can sign in. The endpoint refuses anyone else and never
 * creates a second Creator, so the account cannot be duplicated from here.
 */
function CreatorSetupModal({ email, onClose, onSaved }) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError(t('auth_weak_password'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('user_password_mismatch'));
      return;
    }
    setBusy(true);
    try {
      await post('/manage/creator-password', { password });
      await onSaved?.();
      onClose();
    } catch (err) {
      if (err.code === 'CREATOR_SETUP_NOT_ALLOWED') setError(t('access_denied'));
      else if (err.code === 'CREATOR_ALREADY_CLAIMED') setError(t('user_creator_already_claimed'));
      else if (err.code === 'WEAK_PASSWORD') setError(t('auth_weak_password'));
      else setError(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('user_creator_setup')}
      subtitle={t('user_creator_setup_hint')}
      onClose={onClose}
      footer={
        <ModalActions
          primaryLabel={t('action_save')}
          primaryIcon="check"
          onPrimary={submit}
          loading={busy}
          secondaryLabel={t('action_cancel')}
          onSecondary={onClose}
          secondaryDisabled={busy}
        />
      }
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
      <div className="form-grid">
        <Field label={t('user_login_identifier')}>
          <input className="input" dir="ltr" value={email || 'superadmin@work.app'} readOnly disabled />
        </Field>
        <Field label={t('label_new_password')}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label={t('user_confirm_new_password')}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
      </div>
      <p className="um-note">{t('user_password_min_notice')}</p>
    </Modal>
  );
}
