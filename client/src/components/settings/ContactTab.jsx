import { useI18n } from '../../i18n';
import { SettingsCard } from './SettingsCard';
import { SetField } from './fields';

/* The four addresses in the order the reference shows them. */
const ADDRESSES = [
  { code: 'en', labelKey: 'settings_address_en', rtl: false },
  { code: 'ku', labelKey: 'settings_address_ku', rtl: true },
  { code: 'fa', labelKey: 'settings_address_fa', rtl: true },
  { code: 'ar', labelKey: 'settings_address_ar', rtl: true },
];

export default function ContactTab({ draft, setField, setJson, canManage }) {
  const { t } = useI18n();

  return (
    <SettingsCard
      icon="phone"
      tone="blue"
      title={t('settings_contact_title')}
      subtitle={t('settings_contact_hint')}
    >
      <div className="set-stack">
        <SetField label={t('label_phone')}>
          {/* dir="ltr" keeps the digits in reading order inside an RTL page. */}
          <input
            className="input"
            dir="ltr"
            inputMode="tel"
            value={draft.phone || ''}
            onChange={setField('phone')}
            disabled={!canManage}
          />
        </SetField>
        <SetField label={t('label_email')}>
          <input
            className="input"
            dir="ltr"
            type="email"
            value={draft.email || ''}
            onChange={setField('email')}
            disabled={!canManage}
          />
        </SetField>

        {ADDRESSES.map((entry) => (
          <SetField key={entry.code} label={t(entry.labelKey)}>
            <input
              className="input"
              dir={entry.rtl ? 'rtl' : 'ltr'}
              value={draft.addresses?.[entry.code] || ''}
              onChange={(event) => setJson('addresses', entry.code, event.target.value)}
              disabled={!canManage}
            />
          </SetField>
        ))}
      </div>
    </SettingsCard>
  );
}
