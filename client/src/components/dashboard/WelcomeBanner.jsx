import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';

/*
 * Café scene: sunrise over pale green hills with the illustrated storefront on
 * the left, plus the small business symbols (cart, settings, chart) that the
 * reference artwork weaves into the picture. Drawn inline so it ships with the
 * app instead of depending on an external asset.
 */
function CafeScene() {
  return (
    <svg className="welcome__art" viewBox="0 0 420 150" aria-hidden="true" focusable="false">
      {/* sunrise */}
      <circle cx="226" cy="104" r="44" fill="#fbe7b2" />
      <circle cx="226" cy="104" r="29" fill="#f8d98c" opacity="0.6" />

      {/* clouds */}
      <path d="M128 38c6-9 19-9 25-1 8-6 20-1 20 9 0 6-5 10-11 10h-27c-8 0-12-11-7-18z" fill="#fdf4e2" />
      <path d="M312 26c5-8 17-8 22-1 7-5 18-1 18 8 0 5-4 9-10 9h-24c-7 0-10-10-6-16z" fill="#fdf4e2" />

      {/* rolling landscape */}
      <path d="M0 118c46 0 62-18 104-18s58 16 106 16 58-20 106-20 74 12 104 12v42H0z" fill="#dcefdd" />
      <path d="M0 133c52-10 84 4 130 4s72-12 118-12 72 8 118 4v21H0z" fill="#cbe7d3" />

      {/* trees and plants */}
      <path d="M320 116c-1-13 9-23 21-23 0 13-9 23-21 23z" fill="#bfe3c6" />
      <path d="M340 126c-9-2-15-10-13-19 9 2 15 10 13 19z" fill="#a7d9b6" />
      <rect x="322" y="128" width="20" height="14" rx="5" fill="#f0d59a" />
      <path d="M368 112c-8-1-13-6-11-11 1-3 5-4 8-2 3-5 11-6 15-3 4-2 10 1 11 6 3 1 3 4 1 7-3 3-13 4-24 3z" fill="#f2cf88" />

      {/* storefront on the left, exactly as in the reference artwork */}
      <g>
        <rect x="44" y="72" width="150" height="60" rx="8" fill="#ffffff" stroke="#ebdfc8" strokeWidth="2.4" />
        <rect x="36" y="56" width="166" height="19" rx="7" fill="#f7dc9c" />
        <path d="M62 56v19M92 56v19M122 56v19M152 56v19M182 56v19" stroke="#eccf8c" strokeWidth="6" />
        <rect x="58" y="88" width="34" height="44" rx="5" fill="#f0d59a" />
        <circle cx="86" cy="112" r="2" fill="#dcbe83" />
        <rect x="104" y="88" width="72" height="30" rx="5" fill="#eef7f7" stroke="#ebdfc8" strokeWidth="2.2" />
        {/* chart symbol inside the shop window */}
        <path d="M116 112v-7M126 112v-13M136 112v-5M146 112v-9" stroke="#8fc9a8" strokeWidth="3.4" strokeLinecap="round" />
        <rect x="104" y="122" width="72" height="10" rx="4" fill="#f7f2e4" />
        {/* settings symbol on the roof */}
        <circle cx="62" cy="44" r="7.5" fill="none" stroke="#e0cba4" strokeWidth="3" />
        <path d="M62 32.5v4M62 51.5v4M50.5 44h4M69.5 44h4" stroke="#e0cba4" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* cart symbol on the hill */}
      <g stroke="#cda970" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M266 128h12l4 12h22" />
        <path d="M284 118h16l3 14" />
        <circle cx="291" cy="144" r="3" fill="#cda970" />
        <circle cx="305" cy="144" r="3" fill="#cda970" />
      </g>
    </svg>
  );
}

/** Wide, shallow welcome banner. The business name always comes from the API. */
export default function WelcomeBanner({ business }) {
  const { t, locale } = useI18n();
  const name = localized(business, 'name', locale) || business?.name || t('app_name');

  return (
    <section className="welcome">
      <div className="welcome__text">
        <span className="welcome__eyebrow">
          <Icon name="sparkles" size={13} />
          {t('dash_subtitle')}
        </span>
        <h1 className="welcome__title">{t('dash_welcome', { name })}</h1>
        <p className="welcome__sub">{t('dash_welcome_sub')}</p>
      </div>
      <CafeScene />
    </section>
  );
}
