import Select from '../select/Select';
import { useI18n, LOCALES } from '../../i18n';
import Flag from './Flags';

/*
 * Language switcher for the sign-in pages. It is the same portalled Select the
 * dashboard uses, so the panel always opens fully inside the viewport (flipping
 * above the trigger when there is no room below), follows the reading
 * direction and is keyboard operable — here dressed as a compact glass pill and
 * showing each language with its flag.
 */
const OPTIONS = LOCALES.map((language) => ({
  value: language.code,
  label: language.label,
  leading: <Flag code={language.code} />,
}));

export default function LanguageMenu() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className="au__lang">
      <Select
        className="au-lang"
        value={locale}
        onChange={setLocale}
        options={OPTIONS}
        ariaLabel={t('label_language')}
      />
    </div>
  );
}
