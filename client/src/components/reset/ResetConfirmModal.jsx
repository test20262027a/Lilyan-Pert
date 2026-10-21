import { useState } from 'react';
import Icon from '../Icon';
import { Field, Modal } from '../ui';
import { useI18n } from '../../i18n';

/*
 * Confirmation for one module or for a bulk selection.
 *
 * Nothing here deletes anything: the modal only gathers the deliberate
 * acknowledgement the server requires. A reset that includes at least one
 * high-risk module (products, categories, staff members, suggestions) cannot be
 * confirmed until the business name is typed, and the optional backup is a real
 * full backup created before the reset — if it fails, the reset does not run.
 */
export default function ResetConfirmModal({ modules, businessName, busy, onCancel, onConfirm }) {
  const { t } = useI18n();
  const [backup, setBackup] = useState(false);
  const [typed, setTyped] = useState('');

  const needsAck = modules.some((m) => m.risk);
  const expected = (businessName || '').trim();
  const ackOk = !needsAck || (expected && typed.trim().toLowerCase() === expected.toLowerCase());
  const warnings = [...new Set(modules.map((m) => m.warning).filter(Boolean))];

  return (
    <Modal
      wide
      title={t('reset_confirm_title')}
      onClose={busy ? undefined : onCancel}
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={busy || !ackOk}
            onClick={() => onConfirm({ backup })}
          >
            {busy ? <span className="spinner" /> : <Icon name="trash" size={15} />}
            {t('reset_confirm_go')}
          </button>
        </>
      }
    >
      <div className="rs-modal__lead">
        <span className="rs-modal__mark" aria-hidden="true">
          <Icon name="alert" size={18} />
        </span>
        <p>{t('reset_confirm_lead')}</p>
      </div>

      <ul className="rs-modal__list">
        {modules.map((m) => (
          <li key={m.key}>
            <span className={`rs-modal__icon rs-tone--${m.tone}`} aria-hidden="true">
              <Icon name={m.icon} size={15} />
            </span>
            <span className="rs-modal__name">{m.label}</span>
            <span className="rs-modal__count">{t('reset_count', { count: m.eligible })}</span>
            {m.blocked > 0 ? (
              <span className="rs-modal__blocked">{t('reset_blocked_note', { count: m.blocked })}</span>
            ) : null}
          </li>
        ))}
      </ul>

      {warnings.length ? (
        <ul className="rs-modal__warnings">
          {warnings.map((key) => (
            <li key={key}>
              <Icon name="alert" size={13} />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="rs-modal__irreversible">
        <Icon name="alert" size={14} />
        {t('reset_confirm_irreversible')}
      </p>

      <label className="rs-modal__backup">
        <input type="checkbox" checked={backup} onChange={(e) => setBackup(e.target.checked)} disabled={busy} />
        <span>
          <strong>{t('reset_confirm_backup')}</strong>
          <em>{t('reset_confirm_backup_hint')}</em>
        </span>
      </label>

      {needsAck ? (
        <Field label={t('reset_confirm_type_label', { name: expected })} hint={t('reset_confirm_type_hint')}>
          <input
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </Field>
      ) : null}
    </Modal>
  );
}
