import Icon from '../Icon';

/**
 * One analytics surface: a soft mint header that belongs to the same rounded
 * card as its chart, never a separate detached title block.
 */
export default function StatPanel({ icon, tone = 'purple', title, children, className = '' }) {
  return (
    <section className={`stat-panel ${className}`}>
      <header className="stat-panel__head">
        <span className={`stat-panel__icon stat-panel__icon--${tone}`}>
          <Icon name={icon} size={18} />
        </span>
        <h2 className="stat-panel__title">{title}</h2>
      </header>
      <div className="stat-panel__body">{children}</div>
    </section>
  );
}
