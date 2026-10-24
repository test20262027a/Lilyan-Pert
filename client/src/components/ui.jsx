import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Icon from './Icon';
import ModalActions from './ModalActions';
import SectionHeader from '../headers/SectionHeader';
import { useI18n } from '../i18n';
import { fmtMoney } from '../format';

/* ------------------------------------------------------------------ cards */

export function Card({ children, className = '', pad = false }) {
  return <section className={`card ${pad ? 'card--pad' : ''} ${className}`}>{children}</section>;
}

/**
 * A card whose own header is part of the same container as its content —
 * sections never render a detached, header-only card.
 */
export function SectionCard({ icon, iconClass = 'ic-purple', title, subtitle, actions, children, footer, plain = false }) {
  return (
    <section className="card">
      <header className={`card__head ${plain ? 'card__head--plain' : ''}`}>
        {icon ? (
          <span className={`card__icon ${iconClass}`}>
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <div className="card__titles">
          <div className="card__title">{title}</div>
          {subtitle ? <div className="card__subtitle">{subtitle}</div> : null}
        </div>
        {actions ? <div className="btn-row">{actions}</div> : null}
      </header>
      <div className="card__body">{children}</div>
      {footer ? <div className="card__foot">{footer}</div> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ modal */

export function Modal({ title, subtitle, onClose, children, footer, wide = false, section }) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        {/* Exactly one close control per modal, positioned per the language rule. */}
        <button className="modal__close" onClick={onClose} aria-label={t('action_close')} title={t('action_close')}>
          <Icon name="close" size={17} />
        </button>
        <SectionHeader section={section} title={title} subtitle={subtitle} />
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, danger = false, onConfirm, onCancel, busy }) {
  const { t } = useI18n();
  return (
    <Modal
      title={title || t('confirm_title')}
      onClose={onCancel}
      footer={
        <ModalActions
          primaryLabel={confirmLabel || t('action_confirm')}
          primaryVariant={danger ? 'danger' : 'primary'}
          onPrimary={onConfirm}
          loading={busy}
          secondaryLabel={t('action_cancel')}
          onSecondary={onCancel}
          secondaryDisabled={busy}
        />
      }
    >
      <p style={{ fontSize: 14, color: 'var(--text-soft)' }}>{message}</p>
    </Modal>
  );
}

/* ----------------------------------------------------------------- inputs */

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label ? <span className="field__label">{label}</span> : null}
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
}

export function Switch({ checked, onChange, label, hint, disabled = false, ariaLabel }) {
  const { t } = useI18n();
  // A <label> wrapping the checkbox: the whole control (pill, label, hint) is
  // the hit target, and styles.css stretches the real checkbox over it.
  return (
    <label className={`switch ${disabled ? 'switch--disabled' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        checked={Boolean(checked)}
        disabled={disabled}
        aria-label={ariaLabel || label || t('label_status')}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="switch__track" aria-hidden="true" />
      {label ? <span className="switch__label">{label}</span> : null}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function SwitchRow({ title, hint, checked, onChange, disabled, icon, iconClass = '' }) {
  return (
    <div className="switch-row">
      {icon ? (
        <span className={`switch-row__icon ${iconClass}`} aria-hidden="true">
          <Icon name={icon} size={15} />
        </span>
      ) : null}
      <div className="switch-row__text">
        <div className="switch-row__title">{title}</div>
        {hint ? <div className="switch-row__hint">{hint}</div> : null}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} ariaLabel={title} />
    </div>
  );
}

/** Custom rounded selection marker — no default checkboxes anywhere. */
export function Marker({ on, danger = false }) {
  return (
    <span className={`marker ${on ? 'is-on' : ''} ${danger ? 'is-danger' : ''}`} aria-hidden="true">
      {on ? <Icon name="check" size={14} /> : null}
    </span>
  );
}

/*
 * The shared selection dropdown. Re-exported here so every page keeps importing
 * it from the UI kit while the premium surface lives in one component.
 */
export { default as Select } from './select/Select';

/* --------------------------------------------------------------- feedback */

export function Spinner({ size = 20 }) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}

export function Loading({ label }) {
  const { t } = useI18n();
  return (
    <div className="loading-block">
      <Spinner size={26} />
      <span style={{ fontSize: 13 }}>{label || t('state_loading')}</span>
    </div>
  );
}

export function EmptyState({ icon = 'info', title, hint, action }) {
  const { t } = useI18n();
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={20} />
      </span>
      <span className="empty__title">{title || t('state_empty')}</span>
      {hint ? <span style={{ fontSize: 12.5 }}>{hint}</span> : null}
      {action}
    </div>
  );
}

export function Alert({ kind = 'info', children, icon }) {
  const fallback = { error: 'alert', success: 'check', warning: 'alert', info: 'info' }[kind];
  return (
    <div className={`alert alert--${kind}`}>
      <Icon name={icon || fallback} size={17} />
      <span>{children}</span>
    </div>
  );
}

const STATUS_KEY = {
  pending: 'status_pending',
  preparing: 'status_preparing',
  ready: 'status_ready',
  completed: 'status_completed',
  cancelled: 'status_cancelled',
};

export function StatusBadge({ status }) {
  const { t } = useI18n();
  return <span className={`badge badge--${status}`}>{t(STATUS_KEY[status] || status)}</span>;
}

export function Badge({ children, kind }) {
  return <span className={`badge ${kind ? `badge--${kind}` : ''}`}>{children}</span>;
}

/* ------------------------------------------------------------------ toast */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, kind = 'info') => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo(
    () => ({ toast: push, success: (m) => push(m, 'success'), error: (m) => push(m, 'error') }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className={`toast toast--${x.kind}`}>
            <Icon name={x.kind === 'error' ? 'alert' : x.kind === 'success' ? 'check' : 'info'} size={16} />
            <span>{x.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

/* ------------------------------------------------------------------- misc */

export function Money({ value, currency }) {
  const { locale } = useI18n();
  return <span>{fmtMoney(value, currency, locale)}</span>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="category-bar__scroll" style={{ padding: 0, gap: 8 }} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          className={`cat-pill ${value === tab.value ? 'is-active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.icon ? <Icon name={tab.icon} size={15} /> : null}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
