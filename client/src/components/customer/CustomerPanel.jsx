import Icon from '../Icon';

/*
 * The shared shell of the customer content cards: one theme-tinted header with
 * its contextual icon and title, then the section's own body. Both the About
 * and the Contact cards use it, so their headers always read as a pair.
 *
 * The icon comes first in the markup, which puts it at the inline-start edge —
 * the right side in RTL, exactly like the reference.
 */
export default function CustomerPanel({ icon, title, children, className = '' }) {
  return (
    <section className={`cui-panel ${className}`.trim()}>
      <header className="cui-panel__head">
        <span className="cui-panel__icon">
          <Icon name={icon} size={19} />
        </span>
        <h2 className="cui-panel__title">{title}</h2>
      </header>
      <div className="cui-panel__body">{children}</div>
    </section>
  );
}
