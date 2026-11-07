import { useEffect, useRef } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * Side drawer that hosts the very same CategoryPanel between the desktop rail
 * breakpoint and the chip-strip breakpoint. It is a modal surface: Escape and a
 * backdrop click close it, focus is trapped inside while it is open and returns
 * to the control that opened it afterwards. It sits below the app's modals, and
 * it never reacts to an Escape that belongs to an open form/confirmation dialog.
 */
export default function CategoryDrawer({ open, onClose, children }) {
  const { t } = useI18n();
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const focusables = () =>
      Array.from(
        drawerRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((node) => node.offsetParent !== null);

    const onKeyDown = (event) => {
      // A category form or a delete confirmation opened from the drawer owns
      // Escape first; closing the drawer underneath would discard that context.
      if (document.querySelector('.modal-backdrop, .mcmodal-backdrop, [role="alertdialog"]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
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
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  // Rendered in place (not portalled) so the panel keeps the page's own theme
  // tokens; the layer itself is fixed and covers the viewport.
  return (
    <div className="mdrawer-layer">
      <div className="mdrawer-scrim" onMouseDown={onClose} />
      <aside
        ref={drawerRef}
        className="mdrawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('menu_tab_categories')}
      >
        <div className="mdrawer__bar">
          <button
            ref={closeRef}
            type="button"
            className="mdrawer__close"
            onClick={onClose}
            aria-label={t('action_close')}
            title={t('action_close')}
            data-tip-hover-only
            data-tip-side="top"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="mdrawer__body">{children}</div>
      </aside>
    </div>
  );
}
