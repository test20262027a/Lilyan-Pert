import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { Alert } from '../ui';
import { useI18n } from '../../i18n';
import { entityVisual } from './entityVisuals';
import './deleteConfirm.css';

/*
 * One delete-confirmation surface for the whole admin panel.
 *
 * `ConfirmSurface` is the visual + behavioural shell: portaled full-screen
 * backdrop, centred glass card, entity circle with the small red trash badge,
 * title/description, close control, focus trap and Escape handling. Every
 * destructive dialog renders it, so they cannot drift apart.
 *
 * It never mutates anything: `onConfirm` is the page's own existing delete
 * handler, and the dialog stays open (with the error shown) until that handler
 * reports success.
 */
export function ConfirmSurface({
  tone = 'pink',
  icon = 'trash',
  title,
  description,
  onCancel,
  busy = false,
  error,
  children,
  footer,
  initialFocusRef,
  maxWidth,
}) {
  const { t } = useI18n();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const busyRef = useRef(busy);
  const cancelRef = useRef(onCancel);
  const titleId = useId();
  const descId = useId();

  // Keep the latest values readable inside the once-only effect below without
  // re-running it (re-running would steal focus mid-deletion).
  busyRef.current = busy;
  cancelRef.current = onCancel;

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((node) => node.offsetParent !== null || node === document.activeElement);

    // The safe control gets focus — never the destructive button.
    const start = initialFocusRef?.current || closeRef.current;
    start?.focus?.();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (busyRef.current) return;
        event.preventDefault();
        cancelRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Return focus to the control that opened the dialog, when it still exists.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
    // Mount/unmount only: a deletion in flight must not move focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className="dcd-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`dcd dcd--tone-${tone}`}
        style={maxWidth ? { maxWidth } : undefined}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <button
          ref={closeRef}
          type="button"
          className="dcd__close"
          onClick={onCancel}
          disabled={busy}
          aria-label={t('action_close')}
          title={t('action_close')}
        >
          <Icon name="close" size={15} />
        </button>

        <span className="dcd__mark" aria-hidden="true">
          <Icon name={icon} size={32} />
          <span className="dcd__badge">
            <Icon name="trash" size={13} />
          </span>
        </span>

        <h2 className="dcd__title" id={titleId}>
          {title}
        </h2>
        {description ? (
          <p className="dcd__desc" id={descId}>
            {description}
          </p>
        ) : (
          <span id={descId} hidden />
        )}

        {error ? (
          <div className="dcd__error">
            <Alert kind="error">{error}</Alert>
          </div>
        ) : null}

        {children ? <div className="dcd__body">{children}</div> : null}

        {footer ? <div className="dcd__actions">{footer}</div> : null}

        {busy ? (
          <span className="dcd__status" role="status" aria-live="polite">
            <span className="spinner" />
            {t('state_saving')}
          </span>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/*
 * A single-record destructive confirmation.
 *
 * The preview box always describes the record the caller actually selected —
 * its name, its secondary line, its thumbnail or its own glyph — so the dialog
 * never shows an example or another row's data. `children` adds dialog-specific
 * detail (dependency notes, extra facts); `warning` states a consequence.
 */
export default function DeleteConfirmationDialog({
  open = true,
  entityType = 'generic',
  title,
  description,
  entityName,
  entitySubtitle,
  entityImage,
  entityIcon,
  icon,
  tone,
  warning,
  confirmLabel,
  cancelLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
  children,
  maxWidth,
}) {
  const { t } = useI18n();
  const cancelRef = useRef(null);
  const visual = entityVisual(entityType);

  if (!open) return null;

  const heading = title || t(visual.titleKey);
  const message = description || t(visual.messageKey);
  const previewIcon = entityIcon || icon || visual.icon;
  const hasPreview = Boolean(entityName || entityImage);

  return (
    <ConfirmSurface
      tone={tone || visual.tone}
      icon={icon || visual.icon}
      title={heading}
      description={message}
      onCancel={onCancel}
      busy={busy}
      error={error}
      initialFocusRef={cancelRef}
      maxWidth={maxWidth}
      footer={
        <>
          {/* Cancel first in the DOM: physical right under RTL, left under LTR. */}
          <button
            ref={cancelRef}
            type="button"
            className="dcd__btn dcd__btn--cancel"
            onClick={onCancel}
            disabled={busy}
          >
            <span>{cancelLabel || t('action_cancel')}</span>
          </button>
          <button
            type="button"
            className="dcd__btn dcd__btn--danger"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            <span>{busy ? t('state_saving') : confirmLabel || t('action_delete')}</span>
            {busy ? <span className="spinner" /> : <Icon name="trash" size={15} />}
          </button>
        </>
      }
    >
      {hasPreview ? (
        <div className="dcd__preview">
          {entityImage ? (
            <img className="dcd__thumb" src={entityImage} alt="" />
          ) : (
            <span className="dcd__thumb dcd__thumb--icon" aria-hidden="true">
              <Icon name={previewIcon} size={19} />
            </span>
          )}
          <span className="dcd__preview-text">
            <span className="dcd__preview-name">{entityName}</span>
            {entitySubtitle ? <span className="dcd__preview-sub">{entitySubtitle}</span> : null}
          </span>
        </div>
      ) : null}

      {warning ? (
        <p className="dcd__warn">
          <Icon name="alert" size={14} />
          <span>{warning}</span>
        </p>
      ) : null}

      {children}
    </ConfirmSurface>
  );
}
