import { useI18n } from '../../i18n';
import { SettingsCard } from './SettingsCard';
import MediaCard from './MediaCard';

/**
 * Branding images.
 *
 * Three cards, one row: the business logo, the customer panel's background and
 * the sign-in page's backdrop. They share one structure — a colored 3D tile and
 * title, one landscape preview frame, the theme's upload control and the
 * recommendation under it — so the row reads as one system rather than three
 * unrelated upload widgets. Every card writes its own field of the same draft;
 * nothing is saved until the page's own Save.
 */
export default function LogoCoverTab({ draft, setVal, canManage }) {
  const { t } = useI18n();
  return (
    <SettingsCard icon="image" title={t('settings_branding_title')} subtitle={t('settings_branding_hint')}>
      <div className="set-media-grid">
        <MediaCard
          shape="logo"
          icon="store"
          tone="violet"
          label={t('settings_media_logo_title')}
          hint={t('settings_media_logo_desc')}
          dims={t('settings_media_logo_dims')}
          uploadLabel={t('settings_upload_logo')}
          value={draft.logo_url}
          onChange={(value) => setVal('logo_url', value)}
          canManage={canManage}
          removeTitle={t('settings_remove_logo_title')}
          removeMessage={t('settings_remove_logo_message')}
        />
        <MediaCard
          shape="cover"
          icon="image"
          tone="teal"
          label={t('settings_media_cover_title')}
          hint={t('settings_media_cover_desc')}
          dims={t('settings_media_cover_dims')}
          uploadLabel={t('settings_upload_cover')}
          value={draft.cover_url}
          onChange={(value) => setVal('cover_url', value)}
          canManage={canManage}
          removeTitle={t('settings_remove_cover_title')}
          removeMessage={t('settings_remove_cover_message')}
        />
        <MediaCard
          shape="login"
          icon="lock"
          tone="amber"
          label={t('settings_media_login_title')}
          hint={t('settings_media_login_desc')}
          dims={t('settings_media_login_dims')}
          uploadLabel={t('settings_upload_login')}
          value={draft.login_bg_url}
          onChange={(value) => setVal('login_bg_url', value)}
          canManage={canManage}
          removeTitle={t('settings_remove_login_title')}
          removeMessage={t('settings_remove_login_message')}
        />
      </div>
    </SettingsCard>
  );
}
