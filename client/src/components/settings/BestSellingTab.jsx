import { useI18n } from '../../i18n';
import { SettingsCard, SettingsToggleRow } from './SettingsCard';
import { SetField } from './fields';

/*
 * Best sellers come from the business's own order history (public API), never
 * from invented data. The tab only stores whether the section is shown and how
 * many products it lists; the ranking stays server-side.
 */
export default function BestSellingTab({ draft, setJson, canManage }) {
  const { t } = useI18n();
  const best = draft.menu_settings?.best_selling || {};
  const enabled = best.enabled === true;

  return (
    <SettingsCard
      icon="trophy"
      tone="pink"
      title={t('settings_best_title')}
      subtitle={t('settings_best_subtitle')}
    >
      <SettingsToggleRow
        title={t('settings_best_enable')}
        hint={t('settings_best_enable_hint')}
        checked={enabled}
        disabled={!canManage}
        onChange={(value) => setJson('menu_settings', 'best_selling', { ...best, enabled: value })}
      />
      <div style={{ marginTop: 14 }}>
        <SetField label={t('settings_best_count')} hint={t('settings_best_count_hint')}>
          <input
            className="input"
            type="number"
            min="1"
            max="20"
            step="1"
            dir="ltr"
            disabled={!canManage || !enabled}
            value={best.count ?? 6}
            onChange={(event) =>
              setJson('menu_settings', 'best_selling', {
                ...best,
                enabled,
                count: event.target.value === '' ? '' : Number(event.target.value),
              })
            }
          />
        </SetField>
      </div>
    </SettingsCard>
  );
}
