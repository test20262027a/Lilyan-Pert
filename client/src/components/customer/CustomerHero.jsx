import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * The menu's front door.
 *
 * The business cover is the backdrop, dimmed by a soft scrim so the logo and the
 * name stay readable on any photograph; without a cover the same block falls
 * back to a theme-tinted gradient, so the page never opens on an empty band.
 * The state pill is the server's own open/closed verdict, not a browser guess.
 */
export default function CustomerHero({ business, brandName, menuTitle, table, hours }) {
  const { t, locale } = useI18n();
  const cover = business?.cover_url || '';
  const address =
    business?.addresses?.[locale] || business?.addresses?.en || business?.address || business?.city || '';

  return (
    <section
      className={`cui-hero ${cover ? 'has-cover' : ''}`}
      style={cover ? { '--cui-cover': `url("${cover}")` } : undefined}
    >
      <div className="cui-hero__bg" aria-hidden="true" />
      <div className="cui-hero__body">
        <span className="cui-hero__logo">
          {business?.logo_url ? <img src={business.logo_url} alt="" /> : <span>{brandName.slice(0, 2)}</span>}
        </span>
        {menuTitle ? <p className="cui-hero__kicker">{menuTitle}</p> : null}
        <h1 className="cui-hero__name">{brandName}</h1>
        <div className="cui-hero__meta">
          {hours?.valid ? (
            <span className={`cui-state ${hours.is_open ? 'is-open' : 'is-closed'}`}>
              <i aria-hidden="true" />
              {hours.is_open ? t('dash_open_now') : t('dash_closed_now')}
            </span>
          ) : null}
          {address ? (
            <span className="cui-hero__place">
              <Icon name="pin" size={13} />
              {address}
            </span>
          ) : null}
          {table ? (
            <span className="cui-hero__place">
              <Icon name="table" size={13} />
              {table.name}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
