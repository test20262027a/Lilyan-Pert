import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Loading,
  Modal,
  SectionCard,
  Select,
  Switch,
  useToast,
} from '../components/ui';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { del, get, patch, post } from '../api';
import { fmtDate, zoneFor } from '../format';
import { useBusiness } from '../context/BusinessContext';

const ROLES = ['owner', 'manager', 'staff', 'customer'];

export default function Users() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { user, isOwner, updateProfile } = useAuth();
  const toast = useToast();
  const timeZone = zoneFor(locale, business?.timezone);

  const [users, setUsers] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/manage/users');
      setUsers(res.users || []);
      setCanManage(res.can_manage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (membershipId, role) => {
    setBusy(true);
    try {
      await patch(`/manage/users/${membershipId}`, { role });
      await load();
    } catch (err) {
      toast.error(err.code === 'LAST_OWNER' ? t('user_last_owner') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (membershipId, status) => {
    setBusy(true);
    try {
      await patch(`/manage/users/${membershipId}`, { status });
      await load();
    } catch (err) {
      toast.error(err.code === 'LAST_OWNER' ? t('user_last_owner') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (membershipId) => {
    setBusy(true);
    try {
      await del(`/manage/users/${membershipId}`);
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(err.code === 'LAST_OWNER' ? t('user_last_owner') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const addUser = async (values) => {
    setBusy(true);
    try {
      await post('/manage/users', values);
      toast.success(t('state_saved'));
      setAddOpen(false);
      await load();
    } catch (err) {
      const map = {
        ALREADY_MEMBER: t('user_already_member'),
        WEAK_PASSWORD: t('auth_weak_password'),
        INVALID_EMAIL: t('error_generic'),
      };
      toast.error(map[err.code] || t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('user_title')}</h1>
          <p>{t('user_subtitle')}</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--sm" onClick={() => setProfileOpen(true)}>
            <Icon name="users" size={15} />
            {t('user_my_account')}
          </button>
          <button className="btn btn--sm" onClick={() => setPasswordOpen(true)}>
            <Icon name="key" size={15} />
            {t('user_change_password')}
          </button>
          {isOwner ? (
            <button className="btn btn--primary btn--sm" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={15} />
              {t('user_create')}
            </button>
          ) : null}
        </div>
      </div>

      {!canManage ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      <SectionCard icon="users" iconClass="ic-blue" title={t('user_title')}>
        {loading ? (
          <Loading />
        ) : users.length === 0 ? (
          <EmptyState icon="users" title={t('user_no_users')} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('label_full_name')}</th>
                  <th>{t('label_email')}</th>
                  <th>{t('label_phone')}</th>
                  <th>{t('user_role')}</th>
                  <th>{t('label_status')}</th>
                  <th>{t('label_created_at')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.membership_id}>
                    <td style={{ fontWeight: 650 }}>{u.full_name || '—'}</td>
                    <td dir="ltr">{u.email}</td>
                    <td dir="ltr">{u.phone || '—'}</td>
                    <td>
                      {canManage ? (
                        <div style={{ minWidth: 130 }}>
                          <Select
                            value={u.role}
                            onChange={(v) => changeRole(u.membership_id, v)}
                            aria-label={t('user_role')}
                            options={ROLES.map((r) => ({ value: r, label: t(`role_${r}`) }))}
                          />
                        </div>
                      ) : (
                        <span className={`badge ${u.role === 'owner' ? 'badge--completed' : ''}`}>{t(`role_${u.role}`)}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge--${u.status === 'active' ? 'active' : 'inactive'}`}>
                        {u.status === 'active' ? t('user_active') : t('user_disabled')}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(u.created_at, locale, timeZone, { short: true })}</td>
                    <td>
                      {canManage ? (
                        <div className="btn-row">
                          <button
                            className="btn btn--sm"
                            disabled={busy}
                            onClick={() => toggleStatus(u.membership_id, u.status === 'active' ? 'disabled' : 'active')}
                          >
                            <Icon name={u.status === 'active' ? 'close' : 'check'} size={13} />
                          </button>
                          <button className="btn btn--sm btn--danger-soft" disabled={busy} onClick={() => setConfirm(u)}>
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {addOpen ? <AddUserModal busy={busy} onClose={() => setAddOpen(false)} onSave={addUser} /> : null}

      {passwordOpen ? (
        <ChangePasswordModal
          onClose={() => setPasswordOpen(false)}
          onSaved={() => toast.success(t('user_password_changed'))}
        />
      ) : null}

      {profileOpen ? (
        <ProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onSave={async (values) => {
            await updateProfile(values);
            setProfileOpen(false);
            toast.success(t('state_saved'));
          }}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={t('user_delete_confirm')}
          message={confirm.full_name || confirm.email}
          danger
          busy={busy}
          confirmLabel={t('action_delete')}
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm.membership_id)}
        />
      ) : null}
    </>
  );
}

function AddUserModal({ busy, onClose, onSave }) {
  const { t } = useI18n();
  const [values, setValues] = useState({ email: '', full_name: '', phone: '', password: '', role: 'staff' });
  return (
    <Modal
      title={t('user_create')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={() => onSave(values)} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_create')}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label={t('label_email')}>
          <input className="input" type="email" dir="ltr" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
        </Field>
        <Field label={t('label_full_name')}>
          <input className="input" value={values.full_name} onChange={(e) => setValues((v) => ({ ...v, full_name: e.target.value }))} />
        </Field>
        <Field label={t('label_phone')}>
          <input className="input" dir="ltr" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
        </Field>
        <Field label={t('user_role')}>
          <Select
            value={values.role}
            onChange={(v) => setValues((s) => ({ ...s, role: v }))}
            options={['manager', 'staff', 'customer'].map((r) => ({ value: r, label: t(`role_${r}`) }))}
          />
        </Field>
        <Field label={t('label_password')} hint={t('auth_weak_password')} className="span-2">
          <input className="input" type="password" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} />
        </Field>
      </div>
    </Modal>
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
          <input className="input" type="password" value={values.current_password} onChange={(e) => setValues((v) => ({ ...v, current_password: e.target.value }))} />
        </Field>
        <Field label={t('label_new_password')}>
          <input className="input" type="password" value={values.new_password} onChange={(e) => setValues((v) => ({ ...v, new_password: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
}

function ProfileModal({ user, onClose, onSave }) {
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
          <button className="btn btn--primary" onClick={() => onSave(values)}>
            <Icon name="check" size={16} />
            {t('action_save')}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label={t('label_full_name')}>
          <input className="input" value={values.full_name} onChange={(e) => setValues((v) => ({ ...v, full_name: e.target.value }))} />
        </Field>
        <Field label={t('label_phone')}>
          <input className="input" dir="ltr" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
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
