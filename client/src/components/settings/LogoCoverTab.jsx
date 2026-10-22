import { useI18n } from '../../i18n';
import { SettingsCard } from './SettingsCard';
import MediaCard from './MediaCard';

/**
 * Logo & cover.
 *
 * Both media cards are cells of one grid row, so they start and end on exactly
 * the same line and their upload controls share one footer baseline. The cover
 * keeps the wide cell — first in the DOM, which puts it on the physical right
 * of an RTL page — and the logo sits in the narrower one, never stretched.
 */
export default function LogoCoverTab({ draft, setVal, canManage }) {
  const { t } = useI18n();
  return (
    <SettingsCard icon="image" title={t('settings_branding_title')} subtitle={t('settings_branding_hint')}>
      <div className="set-media-grid">
        <MediaCard
          shape="cover"
          label={t('settings_cover')}
          hint={t('settings_cover_hint')}
          uploadLabel={t('settings_upload_cover')}
          value={draft.cover_url}
          onChange={(value) => setVal('cover_url', value)}
          canManage={canManage}
          removeTitle={t('settings_remove_cover_title')}
          removeMessage={t('settings_remove_cover_message')}
        />
        <MediaCard
          shape="logo"
          label={t('settings_logo')}
          hint={t('settings_logo_hint')}
          uploadLabel={t('settings_upload_logo')}
          value={draft.logo_url}
          onChange={(value) => setVal('logo_url', value)}
          canManage={canManage}
          removeTitle={t('settings_remove_logo_title')}
          removeMessage={t('settings_remove_logo_message')}
        />
      </div>
    </SettingsCard>
  );
}
