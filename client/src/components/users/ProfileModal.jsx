import { useState } from 'react';
import Icon from '../Icon';
import { Alert, Modal } from '../ui';
import ModalActions from '../ModalActions';
import { useI18n } from '../../i18n';
import AccountField from './AccountField';
import UserPhotoField from './UserPhotoField';
import './accountModals.css';

/*
 * My Account dialog.
 *
 * Three calm sections under one section header: the profile picture with its
 * avatar picker, the editable personal details, and the account facts that come
 * from the saved record (login identifier and role, shown read-only). The saved
 * values and the update call are exactly what they were; only the layout was
 * redesigned. The language is not edited here — the header keeps the one global
 * language switch — so the saved locale is carried through untouched.
 */
export default function ProfileModal({ user, role, onClose, updateProfile, onSaved }) {
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
      subtitle={t('user_account_subtitle')}
      icon="users"
      section="users"
      className="modal--account"
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
      <div className="amodal">
        {error ? <Alert kind="error">{error}</Alert> : null}

        <section className="amodal__section">
          <div className="amodal__head">
            <span className="amodal__icon" aria-hidden="true">
              <Icon name="camera" size={15} />
            </span>
            <span className="amodal__title">{t('user_section_profile')}</span>
            <span className="amodal__rule" aria-hidden="true" />
          </div>
          <UserPhotoField
            className="uphoto--account"
            photo={values.profile_image_url}
            avatarType={values.avatar_type}
            name={values.full_name}
            onPhotoChange={(url) => setValues((v) => ({ ...v, profile_image_url: url }))}
            onAvatarChange={(kind) => setValues((v) => ({ ...v, avatar_type: kind }))}
          />
        </section>

        <section className="amodal__section">
          <div className="amodal__head">
            <span className="amodal__icon" aria-hidden="true">
              <Icon name="person" size={15} />
            </span>
            <span className="amodal__title">{t('user_section_general')}</span>
            <span className="amodal__rule" aria-hidden="true" />
          </div>
          <div className="amodal__grid">
            <AccountField
              icon="person"
              label={t('label_full_name')}
              autoComplete="name"
              value={values.full_name}
              onChange={(e) => setValues((v) => ({ ...v, full_name: e.target.value }))}
            />
            <AccountField
              icon="phone"
              label={t('label_phone')}
              dir="ltr"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            />
          </div>
        </section>

        <section className="amodal__section">
          <div className="amodal__head">
            <span className="amodal__icon" aria-hidden="true">
              <Icon name="shield" size={15} />
            </span>
            <span className="amodal__title">{t('user_section_account')}</span>
            <span className="amodal__rule" aria-hidden="true" />
          </div>
          <div className="amodal__grid">
            <AccountField
              icon="mail"
              label={t('user_login_identifier')}
              dir="ltr"
              value={user?.email || ''}
              readOnly
              disabled
            />
            <AccountField
              icon="shield"
              label={t('user_role')}
              value={role ? (role === 'super_admin' ? t('user_super_admin') : t(`role_${role}`)) : ''}
              readOnly
              disabled
            />
          </div>
        </section>
      </div>
    </Modal>
  );
}
