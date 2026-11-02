import { LOCALES, useI18n } from '../../i18n';
import { Select } from '../ui';
import Icon from '../Icon';
import { SettingsCard } from './SettingsCard';
import { SetField } from './fields';
import LanguageFieldsGrid from '../language/LanguageFieldsGrid';

/*
 * The four localized business names in the reference order: on a right-to-left
 * page the first cell sits on the physical right, so English/Kurdish make the
 * first row and Persian/Arabic the second.
 */
const NAME_ORDER = ['en', 'ku', 'fa', 'ar'];
const BUSINESS_TYPES = ['cafe', 'restaurant', 'fast_food', 'bakery', 'juice_bar'];

/*
 * The business currency follows the interface language: a Kurdish or Arabic
 * owner works in Iraqi Dinar, a Persian owner in Rial, an English owner in US
 * Dollars. It is displayed only — the record's accounting currency is never
 * rewritten here, and no stored price or past order is ever converted.
 */
const CURRENCY_BY_LANGUAGE = { ku: 'IQD', ar: 'IQD', fa: 'IRR', en: 'USD' };

export default function BusinessInfoTab({ draft, setField, setVal, canManage }) {
  const { t, enabledLanguages, locale } = useI18n();
  const locales = NAME_ORDER
    .filter((code) => enabledLanguages.includes(code))
    .map((code) => LOCALES.find((l) => l.code === code))
    .filter(Boolean);

  /* The active language's currency, falling back to the configured one when a
     language has no mapping or is no longer enabled. */
  const activeLanguage = enabledLanguages.includes(locale) ? locale : enabledLanguages[0];
  const currency = CURRENCY_BY_LANGUAGE[activeLanguage] || draft.currency || '';

  return (
    <>
      <SettingsCard icon="building" tone="green" title={t('settings_business_card')}>
        {/* The shared language grid keeps the visible names in ONE filled row:
            three enabled languages share the width instead of leaving a hole
            next to two, and one language fills the card. */}
        <LanguageFieldsGrid count={locales.length}>
          {locales.map((l) => (
            <SetField
              key={l.code}
              /* The primary name is the one the app falls back to, so only it
                 is enforced — a business with one language can still save. */
              label={`${t('settings_business_card')} (${l.label})`}
              required={l.code === 'en'}
            >
              <input
                className="input"
                dir={l.rtl ? 'rtl' : 'ltr'}
                value={draft[`name_${l.code}`] || ''}
                onChange={setField(`name_${l.code}`)}
                disabled={!canManage}
              />
            </SetField>
          ))}
        </LanguageFieldsGrid>

        <div style={{ marginTop: 14 }}>
          <SetField label={t('settings_business_type')}>
            <Select
              value={draft.business_type || 'cafe'}
              onChange={(value) => setVal('business_type', value)}
              disabled={!canManage}
              options={BUSINESS_TYPES.map((value) => ({ value, label: t(`settings_type_${value}`) }))}
            />
          </SetField>
        </div>
      </SettingsCard>

      {/* Existing business record fields — kept editable so nothing the old page
          offered becomes unreachable in the tabbed workspace. */}
      <SettingsCard icon="info" tone="blue" title={t('settings_more_info')}>
        <div className="set-grid">
          <SetField label={t('label_description')} hint={t('settings_description_hint')} className="span-2">
            <textarea
              className="textarea"
              value={draft.description || ''}
              onChange={setField('description')}
              disabled={!canManage}
            />
          </SetField>
          {/* Read-only on purpose: the currency is chosen by the language, so it
              is shown in a locked field rather than a disabled control — the
              value stays visible and readable in any theme. */}
          <SetField label={t('settings_currency')} hint={t('settings_currency_auto')}>
            <span className="set-locked">
              <input
                className="input"
                dir="ltr"
                value={currency}
                readOnly
                aria-readonly="true"
                tabIndex={-1}
                aria-label={t('settings_currency')}
              />
              <span className="set-locked__icon" aria-hidden="true">
                <Icon name="lock" size={15} />
              </span>
            </span>
          </SetField>
          <SetField label={t('settings_timezone')}>
            <Select
              value={draft.timezone || 'Asia/Baghdad'}
              onChange={(value) => setVal('timezone', value)}
              disabled={!canManage}
              options={[
                { value: 'Asia/Baghdad', label: 'Asia/Baghdad' },
                { value: 'Asia/Tehran', label: 'Asia/Tehran' },
                { value: 'Asia/Dubai', label: 'Asia/Dubai' },
                { value: 'Europe/London', label: 'Europe/London' },
                { value: 'UTC', label: 'UTC' },
              ]}
            />
          </SetField>
          <SetField label={t('settings_tax_rate')}>
            <input className="input" type="number" min="0" step="0.5" dir="ltr" value={draft.tax_rate ?? 0} onChange={setField('tax_rate')} disabled={!canManage} />
          </SetField>
          <SetField label={t('settings_service_charge_rate')}>
            <input className="input" type="number" min="0" step="0.5" dir="ltr" value={draft.service_charge_rate ?? 0} onChange={setField('service_charge_rate')} disabled={!canManage} />
          </SetField>
          <SetField label={t('label_city')}>
            <input className="input" value={draft.city || ''} onChange={setField('city')} disabled={!canManage} />
          </SetField>
          <div className="set-grid">
            <SetField label={t('label_latitude')}>
              <input className="input" dir="ltr" value={draft.latitude ?? ''} onChange={setField('latitude')} disabled={!canManage} />
            </SetField>
            <SetField label={t('label_longitude')}>
              <input className="input" dir="ltr" value={draft.longitude ?? ''} onChange={setField('longitude')} disabled={!canManage} />
            </SetField>
          </div>
        </div>
      </SettingsCard>
    </>
  );
}
