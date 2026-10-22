import Icon from '../Icon';
import CustomerCarousel from '../customer/CustomerCarousel';
import { localized, useI18n } from '../../i18n';
import { fmtNumber } from '../../format';
import '../../customer-ads.css';

/*
 * The customer-menu advertisement section.
 *
 * Receives only the advertisements the API already judged publicly eligible
 * (enabled and inside their schedule) for one placement, in priority order.
 * Each one renders as an image-led promo card: picture, status pill, title,
 * description and the two bottom actions — the CTA that opens the related
 * product / category / link, and a soft pill naming that destination.
 */
function destinationLabel(ad, locale) {
  const product = localized(ad, 'product_name', locale);
  if (product) return { label: product, icon: 'package' };
  const category = localized(ad, 'category_name', locale);
  if (category) return { label: category, icon: 'grid' };
  if (ad.link_url) {
    try {
      return { label: new URL(ad.link_url).hostname.replace(/^www\./, ''), icon: 'link' };
    } catch {
      return null;
    }
  }
  return null;
}

export default function CustomerAds({ ads, locale, onOpen }) {
  const { t } = useI18n();
  if (!ads || ads.length === 0) return null;

  return (
    <section className="cui-ads" aria-labelledby="cui-ads-title">
      {/* The mark leads the title, so it sits on the right in RTL and on the
          left in LTR — always before the text it belongs to. */}
      <header className="cui-ads__head">
        <span className="cui-ads__icon" aria-hidden="true">
          <Icon name="megaphone" size={20} />
        </span>
        <h2 className="cui-ads__title" id="cui-ads-title">
          {t('marketing_ads')}
        </h2>
        {/* How many ads this strip really holds — the eligible list the API
            already filtered, never the cards currently on screen. */}
        <span className="cui-count">{fmtNumber(ads.length, locale)}</span>
      </header>

      <CustomerCarousel className="cui-car--ads" trackClassName="cui-ads__grid" count={ads.length}>
        {ads.map((ad) => {
          const title = localized(ad, 'title', locale) || t('marketing_ads');
          const description = localized(ad, 'subtitle', locale);
          const destination = destinationLabel(ad, locale);
          const interactive = Boolean(onOpen && (ad.product_id || ad.category_id || ad.link_url));
          const state = ad.active === false ? 'inactive' : 'active';

          return (
            <article
              key={ad.id}
              className={`cui-adcard is-${state} ${interactive ? 'is-clickable' : ''}`}
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
              <div className="cui-adcard__media">
                {ad.image_url ? (
                  <img className="cui-adcard__img" src={ad.image_url} alt="" loading="lazy" />
                ) : (
                  <div className="cui-adcard__placeholder" aria-hidden="true">
                    <span className="cui-adcard__ph-badge">
                      <Icon name="megaphone" size={30} />
                    </span>
                  </div>
                )}
              </div>

              <div className="cui-adcard__body">
                <div className="cui-adcard__top">
                  <h3 className="cui-adcard__title">{title}</h3>
                  <span className={`cui-adcard__status is-${state}`}>
                    <i className="cui-adcard__dot" aria-hidden="true" />
                    {t(`ads_state_${state}`)}
                  </span>
                </div>

                {description ? <p className="cui-adcard__desc">{description}</p> : null}

                {interactive || destination ? (
                  <div className="cui-adcard__foot">
                    {destination ? (
                      <span className="cui-adcard__related" title={destination.label}>
                        <Icon name={destination.icon} size={15} />
                        <span className="cui-adcard__related-label">{destination.label}</span>
                      </span>
                    ) : (
                      <span />
                    )}

                    {interactive ? (
                      <button
                        type="button"
                        className="cui-adcard__cta"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen(ad);
                        }}
                      >
                        {t('customer_ads_view')}
                        <Icon name="arrowRight" size={16} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </CustomerCarousel>
    </section>
  );
}
