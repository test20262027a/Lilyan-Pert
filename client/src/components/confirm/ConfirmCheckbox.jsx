import Icon from '../Icon';

/*
 * The acknowledgement control shared by every destructive dialog — the delete
 * confirmation and the Data Reset confirmation both mount this one component.
 *
 * Two clearly distinguishable states: an empty neutral glass square, and the
 * ACTIVE THEME colour as a glossy raised plate with a white check. The real
 * <input type="checkbox"> sits on top of the drawn box (transparent, same
 * 24px), so the label, a pointer and the keyboard all drive the same native
 * control — no state is faked in the DOM, and the visible focus ring lands on
 * the drawn box.
 *
 * `children` is the localized acknowledgement text; it is always rendered
 * exactly as given, so a short safety statement is never shortened.
 */
export default function ConfirmCheckbox({ checked, onChange, disabled = false, children, className = '' }) {
  return (
    <label
      className={['dcd-ack', checked ? 'is-checked' : '', disabled ? 'is-disabled' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="dcd-ack__control">
        <input
          type="checkbox"
          className="dcd-ack__input"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="dcd-ack__box" aria-hidden="true">
          <Icon name="check" size={14} />
        </span>
      </span>
      <span className="dcd-ack__text">{children}</span>
    </label>
  );
}
