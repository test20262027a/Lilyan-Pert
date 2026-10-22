import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * Contact and social tiles. Only what the owner actually stored is rendered —
 * a phone number that was never entered does not become an empty tile — and each
 * platform keeps its own accent so the row is scannable at a glance.
 */
const PLATFORM_ICON = { whatsapp: 'message', website: 'globe' };

export default function CustomerContact({ business, locale }) {
  const { t } = useI18n();
  const address =
    business?.addresses?.[locale] || business?.addresses?.en || business?.address || business?.city || '';
  const socials = business?.socials || {};

  const items = [];
  if (business?.phone) {
    items.push({
      key: 'phone',
      icon: 'phone',
      tone: 'blue',
      label: t('label_phone'),
      value: business.phone,
      href: `tel:${business.phone}`,
      ltr: true,
    });
  }
  Object.entries(socials).forEach(([network, url]) => {
    if (!url) return;
    items.push({
      key: network,
      icon: PLATFORM_ICON[network] || 'link',
      tone: network,
      label: network.charAt(0).toUpperCase() + network.slice(1),
      value: String(url).replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      href: url,
      ltr: true,
    });
  });
  if (business?.email) {
    items.push({
      key: 'email',
      icon: 'mail',
      tone: 'violet',
      label: t('label_email'),
      value: business.email,
      href: `mailto:${business.email}`,
      ltr: true,
    });
  }
  if (address) {
    const hasPoint = Number.isFinite(Number(business?.latitude)) && Number.isFinite(Number(business?.longitude));
    items.push({
      key: 'address',
      icon: 'pin',
      tone: 'rose',
      label: t('label_address'),
      value: address,
      href: hasPoint
        ? `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`
        : null,
      title: t('customer_menu_open_map'),
    });
  }

  if (!items.length) return null;

  return (
    <section className="cui-block">
      <header className="cui-block__head">
        <span className="cui-block__icon">
          <Icon name="message" size={16} />
        </span>
        <h2>{t('customer_menu_contact')}</h2>
      </header>
      <div className="cui-contact">
        {items.map((item) => {
          const inner = (
            <>
              <span className={`cui-contact__icon cui-contact__icon--${item.tone}`}>
                <Icon name={item.icon} size={18} />
              </span>
              <span className="cui-contact__text">
                <strong>{item.label}</strong>
                <small dir={item.ltr ? 'ltr' : undefined}>{item.value}</small>
              </span>
            </>
          );
          const className = `cui-contact__card cui-contact__card--${item.tone}`;
          return item.href ? (
            <a
              key={item.key}
              className={className}
              href={item.href}
              title={item.title}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
            >
              {inner}
            </a>
          ) : (
            <div key={item.key} className={className}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
