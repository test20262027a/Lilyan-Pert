import Icon, { hasIcon } from '../Icon';
import BrandIcon, { hasBrandIcon } from './BrandIcon';
import CustomerPanel from './CustomerPanel';
import { useI18n } from '../../i18n';

/*
 * Contact as a grid of icon tiles: the platform mark on top, its short label
 * underneath, the saved address/number/URL only used as the destination so the
 * row stays scannable instead of turning into a wall of raw links.
 *
 * Only what the owner actually stored is rendered, and every destination is
 * validated before it becomes a link.
 */

/* The known platforms in the order the tiles should read. Anything else the
   owner saved is appended after these, never dropped. */
const BRANDS = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
];
const BRAND_KEYS = BRANDS.map((b) => b.key);

/** A saved social URL, normalised to http(s) or rejected as unusable. */
function webHref(url) {
  const value = String(url || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/\//.test(value)) return `https:${value}`;
  if (/^[\w-]+(\.[\w-]+)+/.test(value)) return `https://${value}`;
  return null;
}

export default function CustomerContact({ business, locale, onReview }) {
  const { t } = useI18n();
  const socials = business?.socials || {};
  const address =
    business?.addresses?.[locale] || business?.addresses?.en || business?.address || business?.city || '';
  const hasPoint = Number.isFinite(Number(business?.latitude)) && Number.isFinite(Number(business?.longitude));

  const tiles = [];

  const social = (key, label) => {
    const href = webHref(socials[key]);
    if (!href) return;
    tiles.push({ key, label, icon: key, tone: key, href });
  };

  if (address) {
    tiles.push({
      key: 'address',
      label: t('label_address'),
      icon: 'pin',
      tone: 'rose',
      href: hasPoint
        ? `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`
        : null,
      title: t('customer_menu_open_map'),
    });
  }

  const phone = String(business?.phone || '').replace(/[^\d+]/g, '');
  if (phone) {
    tiles.push({ key: 'phone', label: t('label_phone'), icon: 'phone', tone: 'blue', href: `tel:${phone}` });
  }

  BRANDS.forEach(({ key, label }) => social(key, label));

  Object.keys(socials).forEach((key) => {
    if (BRAND_KEYS.includes(key) || key === 'website') return;
    if (!webHref(socials[key])) return;
    tiles.push({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      icon: key,
      tone: key,
      href: webHref(socials[key]),
    });
  });

  const email = String(business?.email || '').trim();
  if (email) {
    tiles.push({ key: 'email', label: t('label_email'), icon: 'mail', tone: 'violet', href: `mailto:${email}` });
  }

  const site = webHref(business?.website) || webHref(socials.website);
  if (site) {
    tiles.push({ key: 'website', label: t('label_website'), icon: 'globe', tone: 'website', href: site });
  }

  if (onReview) {
    tiles.push({ key: 'review', label: t('customer_menu_write_review'), icon: 'message', tone: 'review', onSelect: onReview });
  }

  if (!tiles.length) return null;

  return (
    <CustomerPanel icon="share" title={t('customer_menu_contact')}>
      <div className="cui-links">
        {tiles.map((tile) => {
          const inner = (
            <>
              <span className={`cui-link__icon cui-link__icon--${tile.tone}`}>
                {hasBrandIcon(tile.icon) ? (
                  <BrandIcon name={tile.icon} size={24} />
                ) : (
                  /* An unknown saved network still gets a link mark, never a
                     blank coloured square. */
                  <Icon name={hasIcon(tile.icon) ? tile.icon : 'link'} size={22} />
                )}
              </span>
              <span className="cui-link__label">{tile.label}</span>
            </>
          );
          const className = 'cui-link';

          if (tile.onSelect) {
            return (
              <button key={tile.key} type="button" className={className} onClick={tile.onSelect} title={tile.label}>
                {inner}
              </button>
            );
          }
          if (tile.href) {
            const external = /^https?:/i.test(tile.href);
            return (
              <a
                key={tile.key}
                className={className}
                href={tile.href}
                title={tile.title || tile.label}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
              >
                {inner}
              </a>
            );
          }
          return (
            <div key={tile.key} className={className} title={tile.title || tile.label}>
              {inner}
            </div>
          );
        })}
      </div>
    </CustomerPanel>
  );
}
