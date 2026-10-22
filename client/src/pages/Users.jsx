import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, ConfirmDialog, EmptyState, Field, Modal, Select, useToast } from '../components/ui';
import DeleteConfirmationDialog from '../components/confirm/DeleteConfirmationDialog';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { del, get, patch, post } from '../api';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import UsersArtwork from '../components/users/UsersArtwork';
import UserFormModal from '../components/users/UserFormModal';
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

const ERROR_KEYS = {
  LAST_OWNER: 'user_last_owner',
  CANNOT_MODIFY_SELF: 'user_cannot_modify_self',
  ROLE_NOT_ASSIGNABLE: 'user_role_not_assignable',
  PERMISSION_NOT_GRANTABLE: 'user_permission_not_grantable',
  PERMISSION_DENIED: 'access_denied',
  ALREADY_MEMBER: 'user_already_member',
  WEAK_PASSWORD: 'auth_weak_password',
  INVALID_EMAIL: 'user_invalid_email',
  NAME_REQUIRED: 'user_name_required',
};

export default function Users() {
  const { t } = useI18n();
  const { business } = useBusiness();
  const { user: me, can, updateProfile } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
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
  const requestId = useRef(0);

  const canCreate = can('users.create');
  const canEdit = can('users.edit');
  const canDelete = can('users.delete');

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (role !== 'all') params.set('role', role);
      if (status !== 'all') params.set('status', status);
      const query = params.toString();
      const res = await get(`/manage/users${query ? `?${query}` : ''}`);
      // Only the newest request may write the list (a slow older search must not
      // overwrite a newer one).
      if (id === requestId.current) setData({ ...EMPTY, ...res });
    } catch {
      if (id === requestId.current) setFailed(true);
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
          role: values.role,
          status: values.status,
          permissions: values.permissions,
        });
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
        {canCreate ? (
          <button type="button" className="um-add" onClick={openCreate}>
            <span className="um-add__plus" aria-hidden="true">
              <Icon name="plus" size={14} />
            </span>
            <span>{t('user_create')}</span>
          </button>
        ) : null}
      </PageHeroBanner>

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

      {failed ? (
        <Alert kind="error">
          {t('error_generic')}{' '}
          <button type="button" className="btn btn--sm" onClick={load}>
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
                  <span className="um-row__name">{member.full_name || member.email}</span>
                  <span className="um-row__email" dir="ltr">
                    {member.email}
                  </span>
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
          onClose={() => setProfileOpen(false)}
          updateProfile={updateProfile}
          onSaved={() => toast.success(t('state_saved'))}
        />
      ) : null}
    </div>
  );
}

function ChangePasswordModal({ onClose, onSaved }) {
  const { t } = useI18n();
  const [values, setValues] = useState({ current_password: '', new_password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await post('/auth/change-password', values);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.code === 'CURRENT_PASSWORD_INCORRECT' ? t('user_current_password_wrong') : t('auth_weak_password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('user_change_password')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </>
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
      </div>
    </Modal>
  );
}

function ProfileModal({ user, onClose, updateProfile, onSaved }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    locale: user?.locale || 'ku',
  });
  return (
    <Modal
      title={t('user_my_account')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('action_cancel')}
          </button>
          <button
            className="btn btn--primary"
            onClick={async () => {
              await updateProfile(values);
              onSaved();
              onClose();
            }}
          >
            <Icon name="check" size={16} />
            {t('action_save')}
          </button>
        </>
      }
    >
      <div className="form-grid">
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
