import CustomerSectionHead from './CustomerSectionHead';

/*
 * The shared shell of the customer content cards: one section header with its
 * colorful 3D icon and title, then the section's own body. Featured products,
 * Best sellers, About and Contact all use it, so their headers always read as
 * one family — only the icon and its color family differ per section.
 *
 * The tone is chosen by the caller (`rose`, `amber`, `violet`, `sky`, `teal`,
 * `mint`), which keeps the sections visually distinguishable while every header
 * keeps the same geometry.
 */
export default function CustomerPanel({ icon, tone = 'mint', title, count, children, className = '' }) {
  return (
    <section className={`cui-panel ${className}`.trim()}>
      <CustomerSectionHead icon={icon} tone={tone} title={title} count={count} />
      <div className="cui-panel__body">{children}</div>
    </section>
  );
}
