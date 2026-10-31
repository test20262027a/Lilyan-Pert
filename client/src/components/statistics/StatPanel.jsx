import DashIcon from '../dashboard/DashIcon';

/**
 * One analytics surface: a soft mint header that belongs to the same rounded
 * card as its chart, never a separate detached title block.
 *
 * `tone` is the shared 3D category colour — the panel header is static, so its
 * tile never lifts and never looks like a control.
 */
export default function StatPanel({ icon, tone = 'turquoise', title, children, className = '' }) {
  return (
    <section className={`stat-panel ${className}`}>
      <header className="stat-panel__head">
        <DashIcon name={icon} tone={tone} size={34} />
        <h2 className="stat-panel__title">{title}</h2>
      </header>
      <div className="stat-panel__body">{children}</div>
    </section>
  );
}
