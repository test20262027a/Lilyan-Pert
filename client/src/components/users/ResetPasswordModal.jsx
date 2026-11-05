import { useState } from 'react';
import Icon from '../Icon';
import { Alert, Modal } from '../ui';
import ModalActions from '../ModalActions';
import { useI18n } from '../../i18n';
import { post } from '../../api';
import './accountModals.css';

/*
 * Reset a member's credentials — the supported recovery path for an internal
 * login identifier (`rebar@lilyanpert.app`), which has no mailbox to send a
 * link to.
 *
 * Two steps, and the second one exists exactly once: the API generates the
 * temporary password itself and returns it in that response only. Nothing saves
 * the plaintext — the database keeps the same scrypt hash as any other
 * password — so this dialog never reads a credential back, and closing the
 * window ends every chance to see this one. The account is flagged at the same
 * time: its holder must choose a password of their own before the panel opens.
 */
export default function ResetPasswordModal({ member, onClose }) {
  const { t } = useI18n();
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await post(`/manage/users/${member.membership_id}/password`, {});
      setIssued(res.temporary_password || '');
    } catch (err) {
      if (err.code === 'PROTECTED_OWNER' || err.code === 'MEMBERSHIP_NOT_FOUND') {
        setError(t('user_protected_owner_hint'));
      } else if (err.code === 'CANNOT_MODIFY_SELF') {
        setError(t('user_cannot_modify_self'));
      } else if (err.code === 'ROLE_NOT_ASSIGNABLE') {
        setError(t('user_role_not_assignable'));
      } else {
        setError(t('error_generic'));
      }
    } finally {
      setBusy(false);
    }
  };

  /* The clipboard API needs a secure context and a user gesture; a browser
     without it still gets the value copied through a temporary selection. */
  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued);
      setCopied(true);
      return;
    } catch {
      /* fall through */
    }
    try {
      const field = document.createElement('textarea');
      field.value = issued;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      const okCopy = document.execCommand('copy');
      document.body.removeChild(field);
      setCopied(okCopy);
    } catch {
      setCopied(false);
    }
  };

  const who = member.full_name || member.email;

  return (
    <Modal
      title={t('user_reset_password')}
      subtitle={who}
      icon="key"
      section="users"
      className="modal--password"
      onClose={busy ? undefined : onClose}
      footer={
        issued ? (
          <ModalActions primaryLabel={t('action_done')} primaryIcon="check" onPrimary={onClose} />
        ) : (
          <ModalActions
            primaryLabel={t('user_temp_password_generate')}
            primaryIcon="key"
            onPrimary={generate}
            loading={busy}
            secondaryLabel={t('action_cancel')}
            onSecondary={onClose}
            secondaryDisabled={busy}
          />
        )
      }
    >
      <div className="amodal amodal--password">
        {error ? <Alert kind="error">{error}</Alert> : null}

        {issued ? (
          <div className="temp-pass">
            <p className="temp-pass__lead">{t('user_temp_password_once')}</p>
            <div className="temp-pass__value" dir="ltr">
              <code>{issued}</code>
              <button
                type="button"
                className="temp-pass__copy"
                onClick={copy}
                title={t('user_temp_password_copy')}
                aria-label={t('user_temp_password_copy')}
              >
                <Icon name={copied ? 'check' : 'copy'} size={15} />
                <span>{copied ? t('user_temp_password_copied') : t('user_temp_password_copy')}</span>
              </button>
            </div>
            <p className="temp-pass__note">
              <Icon name="shield" size={14} />
              <span>{t('user_must_change_password')}</span>
            </p>
          </div>
        ) : (
          <>
            <div className="amodal__notice">
              <span className="amodal__notice-icon" aria-hidden="true">
                <Icon name="shield" size={15} />
              </span>
              <span>{t('user_reset_password_hint')}</span>
            </div>
            <p className="temp-pass__note">
              <Icon name="key" size={14} />
              <span>{t('user_temp_password_never_shown')}</span>
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
