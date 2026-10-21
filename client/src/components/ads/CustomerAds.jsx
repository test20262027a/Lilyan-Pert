import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';
import '../../ads.css';

/*
 * The customer-menu advertisement strip.
 *
 * Receives only the advertisements the API already judged publicly eligible
 * (enabled and inside their schedule) for one placement, in priority order, and
 * renders them exactly as the management preview shows them. A card with a
 * destination — a related product or category, or a stored link — is interactive;
 * nothing else is.
 */
export default function CustomerAds({ ads, locale, onOpen }) {
  const { t } = useI18n();
  if (!ads || ads.length === 0) return null;

  return (
    <section className="card">
      <header className="card__head">
        <span className="card__icon ic-coral">
          <Icon name="megaphone" size={18} />
        </span>
        <div className="card__titles">
          <div className="card__title">{t('marketing_ads')}</div>
        </div>
      </header>
      <div className="card__body">
        <div className="ads-grid">
          {ads.map((ad) => {
            const title = localized(ad, 'title', locale);
            const description = localized(ad, 'subtitle', locale);
            const interactive = Boolean(onOpen && (ad.product_id || ad.category_id || ad.link_url));
            return (
              <article
                key={ad.id}
                className={`ad-card ${ad.image_url ? '' : 'is-plain'} ${interactive ? 'is-clickable' : ''}`}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onClick={interactive ? () => onOpen(ad) : undefined}
                onKeyDown={
                  interactive
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onOpen(ad);
                        }
                      }
                    : undefined
                }
              >
                {ad.image_url ? <img className="ad-card__img" src={ad.image_url} alt="" loading="lazy" /> : null}
                <div className="ad-card__scrim">
                  <div className="ad-card__title">{title || t('marketing_ads')}</div>
                  {description ? <div className="ad-card__sub">{description}</div> : null}
                  {interactive ? <span className="ad-card__cta">{t('ads_view_offer')}</span> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
