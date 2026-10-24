import Icon from './Icon';
import './modalActions.css';

/*
 * The app's single primary/secondary action row for forms and dialogs.
 *
 * DOM order is always [secondary, primary]. The row is a flex line that follows
 * the document direction and packs to its `flex-end`, so:
 *
 *   RTL (Kurdish / Persian / Arabic) → primary on the physical LEFT,
 *                                      Cancel on the physical RIGHT.
 *   LTR (English)                   → mirrored: primary on the physical RIGHT,
 *                                      Cancel on the physical LEFT.
 *
 * Because the order comes from the markup rather than from per-page CSS, a
 * language switch re-lays the same footer out with no jump and no reversing
 * code in any page.
 *
 * It only positions and styles: every callback, disabled condition and
 * validation rule stays the caller's own.
 */
export default function ModalActions({
  primaryLabel,
  onPrimary,
  primaryVariant = 'primary',
  primaryIcon,
  primaryDisabled = false,
  primaryTitle,
  secondaryLabel,
  onSecondary,
  secondaryIcon,
  secondaryDisabled = false,
  secondaryTitle,
  loading = false,
  className = '',
}) {
  return (
    <div className={`modal-actions ${className}`.trim()}>
      {secondaryLabel ? (
        <button
          type="button"
          className="ma-btn ma-btn--secondary"
          onClick={onSecondary}
          disabled={loading || secondaryDisabled}
          title={secondaryTitle}
        >
          <span className="ma-btn__label">{secondaryLabel}</span>
          {secondaryIcon ? <Icon name={secondaryIcon} size={15} /> : null}
        </button>
      ) : null}

      <button
        type="button"
        className={`ma-btn ma-btn--${primaryVariant}`}
        onClick={onPrimary}
        disabled={loading || primaryDisabled}
        aria-busy={loading || undefined}
        title={primaryTitle}
      >
        <span className="ma-btn__label">{primaryLabel}</span>
        {loading ? (
          <span className="spinner ma-btn__spinner" />
        ) : primaryIcon ? (
          <Icon name={primaryIcon} size={15} />
        ) : null}
      </button>
    </div>
  );
}
