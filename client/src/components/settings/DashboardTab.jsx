import { useI18n } from '../../i18n';
import { SettingsCard, SettingsToggleRow } from './SettingsCard';

/*
 * Which dashboard sections are displayed. Only visibility is controlled here —
 * order processing and notifications keep running whatever is hidden.
 * A missing key means "shown", so an untouched business keeps its dashboard.
 */
const SECTIONS = [
  'show_overview',
  'show_insights',
  'show_order_notifications',
  'show_recent_orders',
  'show_notification_settings',
];

export default function DashboardTab({ draft, setJson, canManage }) {
  const { t } = useI18n();
  const settings = draft.dashboard_settings || {};

  return (
    <SettingsCard
      icon="dashboard"
      tone="blue"
      title={t('settings_dashboard_title')}
      subtitle={t('settings_dashboard_subtitle')}
    >
      {SECTIONS.map((key) => (
        <SettingsToggleRow
          key={key}
          title={t(`settings_dash_${key}`)}
          checked={settings[key] !== false}
          disabled={!canManage}
          onChange={(value) => setJson('dashboard_settings', key, value)}
        />
      ))}
    </SettingsCard>
  );
}
