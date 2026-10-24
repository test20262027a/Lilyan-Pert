import { useRef, useState } from 'react';
import Icon from '../Icon';
import { Field } from '../ui';
import { ConfirmSurface } from '../confirm/DeleteConfirmationDialog';
import { useI18n } from '../../i18n';

/*
 * Confirmation for the Reset Sample Data module — a bulk destructive action, so
 * it shares the delete dialog's surface and red action while keeping its own
 * guarded workflow.
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
  const cancelRef = useRef(null);

  const needsAck = modules.some((m) => m.risk);
  const expected = (businessName || '').trim();
  const ackOk = !needsAck || (expected && typed.trim().toLowerCase() === expected.toLowerCase());
  const warnings = [...new Set(modules.map((m) => m.warning).filter(Boolean))];

  return (
    <ConfirmSurface
      tone="amber"
      icon="database"
      title={t('reset_confirm_title')}
      description={t('reset_confirm_lead')}
      onCancel={onCancel}
      busy={busy}
      initialFocusRef={cancelRef}
      maxWidth={462}
      footer={
        <>
          <button
            ref={cancelRef}
            type="button"
            className="dcd__btn dcd__btn--cancel"
            onClick={onCancel}
            disabled={busy}
          >
            <span>{t('action_cancel')}</span>
          </button>
          <button
            type="button"
            className="dcd__btn dcd__btn--danger"
            disabled={busy || !ackOk}
            aria-busy={busy || undefined}
            onClick={() => onConfirm({ backup })}
          >
            <span>{busy ? t('state_saving') : t('reset_confirm_go')}</span>
            {busy ? <span className="spinner" /> : <Icon name="trash" size={15} />}
          </button>
        </>
      }
    >
      <ul className="dcd__modules">
        {modules.map((m) => (
          <li key={m.key} className="dcd__module">
            <span className="dcd__module-icon" aria-hidden="true">
              <Icon name={m.icon} size={14} />
            </span>
            <span className="dcd__module-name">{m.label}</span>
            {m.blocked > 0 ? (
              <span className="dcd__module-blocked">{t('reset_blocked_note', { count: m.blocked })}</span>
            ) : null}
            <span className="dcd__module-count">{t('reset_count', { count: m.eligible })}</span>
          </li>
        ))}
      </ul>

      {warnings.length ? (
        <ul className="dcd__notes">
          {warnings.map((key) => (
            <li key={key}>
              <Icon name="alert" size={13} />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="dcd__warn">
        <Icon name="alert" size={14} />
        <span>{t('reset_confirm_irreversible')}</span>
      </p>

      <label className="dcd__ack">
        <input type="checkbox" checked={backup} onChange={(e) => setBackup(e.target.checked)} disabled={busy} />
        <span>
          <strong>{t('reset_confirm_backup')}</strong>
          <em>{t('reset_confirm_backup_hint')}</em>
        </span>
      </label>

      {needsAck ? (
        <div className="dcd__ack-field">
          <Field label={t('reset_confirm_type_label', { name: expected })} hint={t('reset_confirm_type_hint')}>
            <input
              className="input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </Field>
        </div>
      ) : null}
    </ConfirmSurface>
  );
}
