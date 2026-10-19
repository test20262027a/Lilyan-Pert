import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';

/** Gentle café illustration — cream, warm yellow and pale green, nothing loud. */
function CafeArt() {
  return (
    <svg className="welcome__art" viewBox="0 0 260 110" aria-hidden="true" focusable="false">
      <circle cx="212" cy="26" r="19" fill="#fbe6b0" />
      <path d="M0 94c26 0 34-15 62-15s38 13 66 13 40-17 68-17 40 13 64 13v22H0z" fill="#dcefdd" />
      <path d="M0 103c30-8 52 3 84 3s52-11 88-11 56 7 88 3v12H0z" fill="#cbe7d3" />

      <path d="M40 60c-1-13 9-23 21-23 0 13-9 23-21 23z" fill="#bfe3c6" />
      <path d="M60 70c-9-2-15-10-13-19 9 2 15 10 13 19z" fill="#a7d9b6" />
      <rect x="42" y="72" width="27" height="22" rx="7" fill="#f0d59a" />

      <path d="M118 54h46v20a14 14 0 0 1-14 14h-18a14 14 0 0 1-14-14z" fill="#ffffff" stroke="#e8dcc4" strokeWidth="2.6" />
      <path d="M164 60h7a10 10 0 0 1 0 20h-7" fill="none" stroke="#e8dcc4" strokeWidth="4.2" strokeLinecap="round" />
      <rect x="118" y="54" width="46" height="10" rx="5" fill="#f7dc9c" />
      <path d="M133 45c0-5 5-5 5-10M147 44c0-5 5-5 5-10" fill="none" stroke="#dfd1b4" strokeWidth="3" strokeLinecap="round" />

      <path d="M178 92c-9-1-15-6-13-11 1-3 5-4 9-2 3-6 12-8 17-4 5-2 12 1 13 7 3 1 4 5 1 8-3 3-15 4-27 2z" fill="#f2cf88" />
      <circle cx="196" cy="82" r="1.7" fill="#e6bd71" />
      <circle cx="188" cy="85" r="1.7" fill="#e6bd71" />
      <circle cx="204" cy="85" r="1.7" fill="#e6bd71" />
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
      <CafeArt />
    </section>
  );
}
