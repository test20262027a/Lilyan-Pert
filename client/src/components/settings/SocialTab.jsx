import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { SettingsCard } from './SettingsCard';

/*
 * Brand marks in the platform colours from the reference. They are decorative,
 * so every row keeps its accessible label on the input itself.
 */
function SocialGlyph({ network }) {
  if (network === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (network === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M14.2 21v-7.6h2.6l.4-3h-3V8.5c0-.9.25-1.5 1.5-1.5H17V4.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.2H8v3h2.6V21z" />
      </svg>
    );
  }
  if (network === 'twitter') {
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
        <path d="M17.6 3h3.1l-6.8 7.8L22 21h-6.2l-4.4-5.8L6 21H2.9l7.2-8.2L2.4 3h6.4l4 5.3zm-1.1 16.1h1.7L7.6 4.8H5.8z" />
      </svg>
    );
  }
  if (network === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2.4a9.5 9.5 0 0 0-8 14.6L2.5 21.6l4.7-1.4A9.5 9.5 0 1 0 12 2.4zm0 1.8a7.7 7.7 0 1 1-3.9 14.3l-.4-.2-2.6.8.8-2.5-.2-.4A7.7 7.7 0 0 1 12 4.2zm-3 3.6c-.2 0-.5.1-.7.3-.3.3-.8.9-.8 1.8 0 1 .7 2 1.1 2.5.4.5 1.7 2.3 4.1 3.1 1.9.7 2.3.6 2.7.5.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.4-.3l-1.5-.7c-.2 0-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.3.1-.4l.6-.8c.1-.1 0-.3 0-.4l-.7-1.6c-.1-.3-.2-.4-.4-.4z" />
      </svg>
    );
  }
  return <Icon name="globe" size={17} />;
}

const NETWORKS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…', className: 'is-instagram' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…', className: 'is-facebook' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'Twitter / X (@twitter)', className: 'is-x' },
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
