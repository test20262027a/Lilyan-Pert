import { useEffect, useId } from 'react';
import Icon from '../Icon';
import MenuArtwork from './MenuArtwork';
import { useI18n } from '../../i18n';
import './menuModal.css';

/*
 * The menu module's dialog shell.
 *
 * Three parts, in the reference's order: the illustrated Menu banner header
 * carrying the title on the language's reading edge, the scrolling form body,
 * and the white action footer. Exactly one close control exists, on the corner
 * opposite the title (`inset-inline-end` is the physical left under RTL and the
 * physical right under English) — the same rule the app's other modals follow.
 *
 * The shell only lays out; validation, unsaved-changes guarding and submission
 * belong to the form inside it.
 */
export default function MenuModalFrame({ title, icon = 'package', wide = false, onClose, children, footer }) {
  const { t } = useI18n();
  const titleId = useId();

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
      className="mcmodal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`mcmodal ${wide ? 'mcmodal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="mcmodal__head">
          {/* Decorative: the banner illustration never carries UI text. */}
          <div className="mcmodal__art" aria-hidden="true">
            <MenuArtwork />
          </div>

          <div className="mcmodal__identity">
            <span className="mcmodal__glyph">
              <Icon name={icon} size={20} />
            </span>
            <h2 className="mcmodal__title" id={titleId}>
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="mcmodal__close"
            onClick={onClose}
            aria-label={t('action_close')}
            title={t('action_close')}
          >
            <Icon name="close" size={17} />
          </button>
        </header>

        <div className="mcmodal__body">{children}</div>

        {footer ? <div className="mcmodal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}
