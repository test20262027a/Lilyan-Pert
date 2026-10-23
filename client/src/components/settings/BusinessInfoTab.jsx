import { LOCALES, useI18n } from '../../i18n';
import { Select } from '../ui';
import { SettingsCard } from './SettingsCard';
import { SetField } from './fields';

/*
 * The four localized business names in the reference order: on a right-to-left
 * page the first cell sits on the physical right, so English/Kurdish make the
 * first row and Persian/Arabic the second.
 */
const NAME_ORDER = ['en', 'ku', 'fa', 'ar'];
const BUSINESS_TYPES = ['cafe', 'restaurant', 'fast_food', 'bakery', 'juice_bar'];

export default function BusinessInfoTab({ draft, setField, setVal, canManage }) {
  const { t, enabledLanguages } = useI18n();
  const locales = NAME_ORDER
    .filter((code) => enabledLanguages.includes(code))
    .map((code) => LOCALES.find((l) => l.code === code))
    .filter(Boolean);

  return (
    <>
      <SettingsCard icon="building" tone="green" title={t('settings_business_card')}>
        <div className="set-grid">
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
        </div>

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
          <SetField label={t('settings_currency')}>
            <input className="input" dir="ltr" value={draft.currency || ''} onChange={setField('currency')} disabled={!canManage} />
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
            <SetField label="Latitude">
              <input className="input" dir="ltr" value={draft.latitude ?? ''} onChange={setField('latitude')} disabled={!canManage} />
            </SetField>
            <SetField label="Longitude">
              <input className="input" dir="ltr" value={draft.longitude ?? ''} onChange={setField('longitude')} disabled={!canManage} />
            </SetField>
          </div>
        </div>
      </SettingsCard>
    </>
  );
}
