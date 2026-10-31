import Icon from '../../Icon';
import Select from '../../select/Select';
import LanguageFlag from '../../header/LanguageFlag';
import { useI18n } from '../../../i18n';
import { LANGUAGE_CODES, normalizeLanguageSettings } from '../../../languages';
import { SettingsCard, SwitchControl } from '../SettingsCard';

/*
 * Language Management — the owner's switchboard for the four languages.
 *
 * It edits the same `menu_settings.language_settings` object the rest of the
 * platform reads (via the shared language store), so turning a language off here
 * removes it from every selector and every multilingual form, and leaving it on
 * changes nothing else. Disabling never deletes anything: translations, product
 * prices and saved menu text stay in the database and come back untouched when
 * the language is enabled again.
 *
 * Two invariants are enforced as the switches move, matching the API:
 *  - at least one language always stays enabled, and
 *  - the default language is always one of the enabled ones.
 */
export default function LanguageManagementCard({ value, disabled, onChange }) {
  const { t } = useI18n();
  const settings = normalizeLanguageSettings(value);
  const enabled = LANGUAGE_CODES.filter((code) => settings.languages[code].enabled);
  const nameOf = (code) => t(`menu_lang_name_${code}`);

  const commit = (defaultLanguage, languages) =>
    onChange({ default_language: defaultLanguage, languages });

  const toggle = (code, next) => {
    // The last enabled language owns the interface, so it cannot be switched off.
    if (disabled || (!next && enabled.length === 1)) return;
    const languages = { ...settings.languages, [code]: { enabled: next } };
    // Turning off the current default hands the role to another enabled one.
    const fallback =
      !next && settings.default_language === code
        ? enabled.find((other) => other !== code) || settings.default_language
        : settings.default_language;
    commit(fallback, languages);
  };

  const setDefault = (code) => {
    if (disabled || !settings.languages[code]?.enabled) return;
    commit(code, settings.languages);
  };

  const options = enabled.map((code) => ({
    value: code,
    label: nameOf(code),
    leading: <LanguageFlag code={code} />,
  }));

  return (
    <SettingsCard
      icon="globe"
      tone="teal"
      title={t('menu_lang_title')}
      subtitle={t('menu_lang_subtitle')}
    >
      <div className="ms-lang">
        <ul className="ms-lang__list">
          {LANGUAGE_CODES.map((code) => {
            const on = settings.languages[code].enabled;
            const isDefault = settings.default_language === code;
            const isLast = on && enabled.length === 1;
            return (
              <li className={`ms-lang__row ${on ? '' : 'is-off'}`} key={code}>
                <span className="ms-lang__flag" aria-hidden="true">
                  <LanguageFlag code={code} />
                </span>
                <span className="ms-lang__name">
                  {nameOf(code)}
                  {isDefault ? <span className="ms-lang__badge">{t('menu_lang_default_badge')}</span> : null}
                </span>
                <SwitchControl
                  checked={on}
                  disabled={disabled || isLast}
                  label={t('menu_lang_toggle_label', { language: nameOf(code) })}
                  onChange={(next) => toggle(code, next)}
                />
              </li>
            );
          })}
        </ul>

        <div className="ms-lang__default">
          <div className="ms-lang__default-text">
            <div className="ms-lang__default-title">{t('menu_lang_default')}</div>
            <div className="ms-lang__default-hint">{t('menu_lang_default_hint')}</div>
          </div>
          <Select
            className="ms-lang__select"
            value={settings.default_language}
            onChange={setDefault}
            options={options}
            disabled={disabled}
            ariaLabel={t('menu_lang_default')}
          />
        </div>

        <p className="ms-lang__note">
          <Icon name="info" size={13} />
          {t('menu_lang_note')}
        </p>
      </div>
    </SettingsCard>
  );
}
