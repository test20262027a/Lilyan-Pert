import Icon from '../Icon';

/**
 * The card every settings tab is built from: pale mint header with a small
 * raised icon container, an optional subtitle and action cluster, and a white
 * softly-shadowed body. `tone` only tints the icon container.
 */
export function SettingsCard({ icon, tone = 'green', title, subtitle, actions, children, footer }) {
  return (
    <section className="set-card">
      <header className="set-card__head">
        {icon ? (
          <span className={`set-card__icon is-${tone}`} aria-hidden="true">
            <Icon name={icon} size={17} />
          </span>
        ) : null}
        <div className="set-card__titles">
          <h2 className="set-card__title">{title}</h2>
          {subtitle ? <p className="set-card__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="set-card__actions">{actions}</div> : null}
      </header>
      <div className="set-card__body">{children}</div>
      {footer ? <div className="set-card__foot">{footer}</div> : null}
    </section>
  );
}

/** A compact label + toggle row with a thin divider, as in the references. */
export function SettingsToggleRow({ title, hint, checked, onChange, disabled, icon }) {
  return (
    <div className={`set-toggle ${disabled ? 'is-disabled' : ''}`}>
      <div className="set-toggle__text">
        <div className="set-toggle__title">
          {icon ? <Icon name={icon} size={14} /> : null}
          {title}
        </div>
        {hint ? <div className="set-toggle__hint">{hint}</div> : null}
      </div>
      <SwitchControl checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  );
}

/** The green pill switch used throughout the settings workspace. */
export function SwitchControl({ checked, onChange, disabled, label }) {
  return (
    <span className={`set-switch ${disabled ? 'is-disabled' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        checked={Boolean(checked)}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span className="set-switch__track" aria-hidden="true" />
    </span>
  );
}

/** One choice inside a segmented group (paper width, logo size, alignment). */
export function ChoiceCard({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      className={`set-choice ${active ? 'is-active' : ''} ${className}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
      {active ? (
        <span className="set-choice__tick" aria-hidden="true">
          <Icon name="check" size={12} />
        </span>
      ) : null}
    </button>
  );
}
