import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * Compact language control: flag, current label and a chevron drawn on top of
 * the real <select>, so keyboard and touch behaviour stay native while the
 * closed state matches the reference design.
 */
const FLAGS = { ku: '🇮🇶', fa: '🇮🇷', ar: '🇸🇦', en: '🇬🇧' };

export default function LanguageSelect() {
  const { t, locale, setLocale, LOCALES } = useI18n();
  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <span className="hdr-lang" title={t('label_language')}>
      <span className="hdr-lang__flag" aria-hidden="true">{FLAGS[current.code]}</span>
      <span className="hdr-lang__label">{current.label}</span>
      <Icon name="chevronDown" size={14} className="hdr-lang__caret" />
      <select
        className="hdr-lang__native"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        aria-label={t('label_language')}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </span>
  );
}
