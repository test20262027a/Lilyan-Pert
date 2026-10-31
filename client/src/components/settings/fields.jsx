/*
 * Small form primitives shared by every settings tab. They wrap the existing
 * `.input` / `.select` controls so the tabs stay visually identical without
 * restyling form controls elsewhere in the admin panel.
 */

export function SetField({ label, hint, error, required, children, className = '' }) {
  return (
    <div className={`set-field ${className}`}>
      <span className="set-field__label">
        {label}
        {required ? (
          <span className="set-field__req" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="set-field__error">{error}</span>
      ) : hint ? (
        <span className="set-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

/** A labelled group heading inside a card, used where a card holds two groups. */
export function SetGroupLabel({ children }) {
  return <div className="set-group-label">{children}</div>;
}
