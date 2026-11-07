import { useRef } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { ConfirmSurface } from './DeleteConfirmationDialog';

/*
 * Unsaved-changes confirmation — the one dialog every form uses instead of the
 * browser's native `window.confirm`.
 *
 * It reuses the shared confirmation surface (backdrop, glass card, focus trap,
 * Escape handling), adds a soft three-dimensional warning mark and states the
 * consequence in the reader's language.
 *
 * The secondary action sits first in the DOM, so under RTL the destructive
 * "Discard" lands on the physical left and "Continue editing" on the right,
 * exactly as the design requires.
 */
export default function DiscardChangesDialog({
  open = true,
  title,
  description,
  confirmLabel,
  cancelLabel,
  busy = false,
  onDiscard,
  onContinue,
}) {
  const { t } = useI18n();
  const continueRef = useRef(null);

  if (!open) return null;

  return (
    <ConfirmSurface
      tone="amber"
      icon="alert"
      // No entity badge here: the warning mark itself is the whole story.
      badge={null}
      className="dcd--discard"
      title={title || t('discard_title')}
      description={description || t('discard_message')}
      onCancel={onContinue}
      busy={busy}
      initialFocusRef={continueRef}
      footer={
        <>
          {/* Cancel first in the DOM: physical right under RTL, left under LTR. */}
          <button
            ref={continueRef}
            type="button"
            className="dcd__btn dcd__btn--cancel"
            onClick={onContinue}
            disabled={busy}
          >
            <span>{cancelLabel || t('discard_continue')}</span>
          </button>
          <button
            type="button"
            className="dcd__btn dcd__btn--danger"
            onClick={onDiscard}
            disabled={busy}
          >
            <span>{confirmLabel || t('discard_confirm')}</span>
            <Icon name="close" size={15} />
          </button>
        </>
      }
    />
  );
}
