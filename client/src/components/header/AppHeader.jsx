import { useState } from 'react';
import Icon from '../Icon';
import { Spinner, useToast } from '../ui';
import { localized, useI18n } from '../../i18n';
import { useBusiness } from '../../context/BusinessContext';
import { put } from '../../api';
import { applyTheme } from '../../theme';
import { playSound } from '../../sound';
import LanguageSelect from './LanguageSelect';
import NotificationBell from './NotificationBell';
import ProfileMenu from './ProfileMenu';
import './header.css';

/*
 * Shared application header, rendered once by the authenticated shell so every
 * management page shows the same chrome. Branding sits at the inline start (the
 * right in RTL) and the action controls follow the reference order:
 * profile, theme, notifications, sound, language.
 */
export default function AppHeader({ onOpenSidebar, sidebarOpen = false }) {
  const { t, locale } = useI18n();
  const { business, setBusiness } = useBusiness();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const businessName = localized(business, 'name', locale) || business?.name || t('app_name');
  const themeMode = business?.theme?.mode === 'dark' ? 'dark' : 'light';
  const soundEnabled = business?.notification_settings?.sound_enabled !== false;

  const toggleTheme = async () => {
    if (!business || busy) return;
    // The next mode follows what is actually applied, so a quick second click
    // can never flip back from a stale saved value.
    const applied = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = { ...(business.theme || {}), mode: applied === 'dark' ? 'light' : 'dark' };
    applyTheme(next); // instant feedback, then persisted
    setBusy(true);
    try {
      const saved = await put('/business', { theme: next });
      if (saved?.business) setBusiness(saved.business);
    } catch {
      applyTheme(business.theme);
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const toggleSound = async () => {
    if (!business) return;
    const next = { ...(business.notification_settings || {}), sound_enabled: !soundEnabled };
    setBusiness({ ...business, notification_settings: next });
    if (!soundEnabled) playSound(next.sound_key); // preview on the same gesture
    try {
      await put('/dashboard/notification-settings', { sound_enabled: !soundEnabled });
    } catch {
      setBusiness(business);
      toast.error(t('error_generic'));
    }
  };

  const themeLabel = themeMode === 'dark' ? t('theme_light') : t('theme_dark');

  return (
    <div className="hdr-wrap">
      <header className="hdr">
        {/* The drawer toggle is its own physical control: a sidebar glyph when
            the navigation is closed, the same panel with a collapse chevron and
            a filled accent state while it is open. */}
        <button
          type="button"
          className={`hdr-btn sidebar-mobile-toggle ${sidebarOpen ? 'is-open' : ''}`}
          aria-label={sidebarOpen ? t('nav_collapse') : t('nav_expand')}
          title={sidebarOpen ? t('nav_collapse') : t('nav_expand')}
          aria-expanded={sidebarOpen}
          aria-controls="admin-sidebar-nav"
          onClick={onOpenSidebar}
        >
          <Icon name={sidebarOpen ? 'sidebarOpen' : 'sidebar'} size={19} />
        </button>

        <div className="hdr__brand">
          <span className={`hdr__logo ${business?.logo_url ? 'has-image' : ''}`}>
            {business?.logo_url ? <img src={business.logo_url} alt="" /> : 'LP'}
          </span>
          <span className="hdr__name" title={businessName}>{businessName}</span>
        </div>

        <span className="hdr__spacer" />

        <div className="hdr__tools">
          {/* DOM order is the reverse of the visual one in RTL: the profile
              trigger ends up leftmost, the language control next to the middle. */}
          <LanguageSelect />

          <button
            type="button"
            className={`hdr-btn ${soundEnabled ? '' : 'is-off'}`}
            onClick={toggleSound}
            disabled={!business}
            aria-pressed={soundEnabled}
            aria-label={t('dash_sound')}
            title={`${t('dash_sound')}: ${soundEnabled ? t('label_active') : t('label_inactive')}`}
          >
            <Icon name={soundEnabled ? 'volume' : 'volumeOff'} size={18} />
          </button>

          <NotificationBell />

          <button
            type="button"
            className={`hdr-btn ${themeMode === 'dark' ? 'is-on' : ''}`}
            onClick={toggleTheme}
            disabled={busy || !business}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {busy ? <Spinner size={16} /> : <Icon name={themeMode === 'dark' ? 'sun' : 'moon'} size={18} />}
          </button>

          <ProfileMenu />
        </div>
      </header>
    </div>
  );
}
