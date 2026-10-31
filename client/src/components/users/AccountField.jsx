import Icon from '../Icon';

/*
 * One labelled field of the account dialogs.
 *
 * A soft rounded control with an optional leading icon, an optional helper line
 * underneath and a read-only variant for facts that come from the saved record
 * (the login identifier and the role). It only renders: every value, change
 * handler and validation rule stays with the dialog that owns it.
 */
export default function AccountField({
  icon,
  label,
  hint,
  type = 'text',
  value,
  onChange,
  disabled = false,
  readOnly = false,
  dir,
  autoComplete,
  name,
  placeholder,
}) {
  const locked = disabled || readOnly;
  return (
    <label className={`am-field ${locked ? 'is-readonly' : ''}`.trim()}>
      <span className="am-field__label">{label}</span>
      <span className="am-field__control">
        {icon ? <Icon name={icon} size={15} className="am-field__icon" /> : null}
        <input
          className="am-field__input"
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          dir={dir}
          autoComplete={autoComplete}
          name={name}
          placeholder={placeholder}
          aria-label={label}
        />
      </span>
      {hint ? <span className="am-field__hint">{hint}</span> : null}
    </label>
  );
}
