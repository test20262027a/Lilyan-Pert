/*
 * The compact header that slides in once the business banner has scrolled past.
 *
 * It is purely presentational: the controls it carries are the same
 * CustomerTopBar instance the banner uses, so cart state, the selected language
 * and the admin return never fork into a second copy. `visible` is driven by an
 * IntersectionObserver on the hero in the page, never by a scroll listener.
 */
export default function CustomerStickyHeader({ visible, children }) {
  return (
    /* `visibility` in the stylesheet keeps the hidden bar out of the tab order. */
    <div className={`cui-stickybar ${visible ? 'is-visible' : ''}`}>
      <div className="cui-stickybar__inner">{children}</div>
    </div>
  );
}
