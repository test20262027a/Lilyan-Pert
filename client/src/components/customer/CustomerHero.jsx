import Icon from '../Icon';

/* The business type the owner saved decides the mark drawn when no logo file
   exists, so the banner is never an empty placeholder square. */
const TYPE_ICON = {
  cafe: 'coffee',
  restaurant: 'utensils',
  fast_food: 'utensils',
  bakery: 'coffee',
  juice_bar: 'coffee',
};

/*
 * The menu's front door: the business cover as a wide banner, dimmed by a soft
 * scrim so the logo and the welcome line stay readable on any photograph;
 * without a cover the same block falls back to a theme-tinted gradient, so the
 * page never opens on an empty band.
 *
 * The logo sits in a frosted-glass frame (never an opaque white tile) and keeps
 * its own artwork untouched, and the welcome line is the main heading — the
 * owner's saved welcome message, or the business name when none was written.
 *
 * `children` is the overlay row of controls (basket / language / admin return),
 * rendered on top of the banner exactly like the reference composition.
 */
export default function CustomerHero({ business, brandName, welcome, table, heroRef, children }) {
  const cover = business?.cover_url || '';
  const icon = TYPE_ICON[business?.business_type] || 'store';

  return (
    <section
      ref={heroRef}
      className={`cui-hero ${cover ? 'has-cover' : ''}`}
      style={cover ? { '--cui-cover': `url("${cover}")` } : undefined}
    >
      <div className="cui-hero__bg" aria-hidden="true" />
      {children}
      <div className="cui-hero__body">
        <span className="cui-hero__logo">
          {business?.logo_url ? <img src={business.logo_url} alt="" /> : <Icon name={icon} size={36} />}
        </span>
        <h1 className="cui-hero__name">{welcome || brandName}</h1>
        {table ? (
          <span className="cui-hero__place">
            <Icon name="table" size={13} />
            {table.name}
          </span>
        ) : null}
      </div>
    </section>
  );
}
