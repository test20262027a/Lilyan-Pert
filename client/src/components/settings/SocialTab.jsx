import Icon from '../Icon';
import BrandIcon, { hasBrandIcon } from '../customer/BrandIcon';
import { useI18n } from '../../i18n';
import { SettingsCard } from './SettingsCard';

/*
 * The owner's social profiles. Each row's mark is the platform's own Simple
 * Icons silhouette, so the tile reads as WhatsApp / Instagram / Facebook /
 * TikTok at a glance instead of a generic glyph on a coloured square; the
 * website row keeps the globe because it is not a platform.
 *
 * The stored values are plain `socials[key]` strings on the business profile —
 * the same object the customer menu renders from, so a save here is what the
 * guest sees. An emptied field is simply not shown to the guest.
 */
function SocialGlyph({ network }) {
  if (network === 'website') return <Icon name="globe" size={20} />;
  if (hasBrandIcon(network)) return <BrandIcon name={network} size={20} />;
  return <Icon name="link" size={20} />;
}

const NETWORKS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…', className: 'is-instagram' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…', className: 'is-facebook' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@username', className: 'is-tiktok' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/…', className: 'is-x' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+964 …', className: 'is-whatsapp' },
  { key: 'website', label: 'Website', placeholder: 'https://…', className: 'is-website' },
];

export default function SocialTab({ draft, setVal, setJson, canManage }) {
  const { t } = useI18n();

  return (
    <SettingsCard
      icon="share"
      tone="purple"
      title={t('settings_social_title')}
      subtitle={t('settings_social_hint')}
    >
      <div className="set-stack">
        {NETWORKS.map((network) => {
          const isSite = network.key === 'website';
          const value = isSite ? draft.website || '' : draft.socials?.[network.key] || '';
          const label = isSite ? t('settings_social_website') : network.label;
          return (
            <label key={network.key} className="set-social" aria-label={label}>
              <span className={`set-social__icon ${network.className}`} aria-hidden="true">
                <SocialGlyph network={network.key} />
              </span>
              <input
                className="input"
                dir="ltr"
                value={value}
                placeholder={network.placeholder}
                disabled={!canManage}
                aria-label={label}
                onChange={(event) =>
                  isSite
                    ? setVal('website', event.target.value)
                    : setJson('socials', network.key, event.target.value)
                }
              />
            </label>
          );
        })}
      </div>
    </SettingsCard>
  );
}
