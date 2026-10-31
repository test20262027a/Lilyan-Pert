import { useState } from 'react';
import Icon from '../Icon';
import { Alert, Modal } from '../ui';
import ModalActions from '../ModalActions';
import { useI18n } from '../../i18n';
import { post } from '../../api';
import AccountField from './AccountField';
import './accountModals.css';

/*
 * Change Password dialog.
 *
 * The three password fields share one visual language: a full-width control
 * with a leading icon, a clear label and a themed focus ring. The validation and
 * the endpoint call are unchanged — only the surface was redesigned.
 */
export default function ChangePasswordModal({ onClose, onSaved }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

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
      subtitle={t('user_password_subtitle')}
      icon="key"
      section="users"
      className="modal--password"
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
      <div className="amodal amodal--password">
        {error ? <Alert kind="error">{error}</Alert> : null}

        <div className="amodal__notice">
          <span className="amodal__notice-icon" aria-hidden="true">
            <Icon name="shield" size={15} />
          </span>
          <span>{t('user_password_tip')}</span>
        </div>

        <div className="amodal__stack">
          <AccountField
            icon="lock"
            label={t('label_current_password')}
            type="password"
            autoComplete="current-password"
            value={values.current_password}
            onChange={set('current_password')}
          />
          <AccountField
            icon="key"
            label={t('label_new_password')}
            type="password"
            autoComplete="new-password"
            value={values.new_password}
            onChange={set('new_password')}
          />
          <AccountField
            icon="checkCircle"
            label={t('user_confirm_new_password')}
            type="password"
            autoComplete="new-password"
            hint={t('user_password_min_notice')}
            value={values.confirm_password}
            onChange={set('confirm_password')}
          />
        </div>
      </div>
    </Modal>
  );
}
