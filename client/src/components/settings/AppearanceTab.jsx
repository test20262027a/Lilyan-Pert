import { useI18n } from '../../i18n';
import { PRESETS, primaryFor } from '../../theme';
import { SettingsCard } from './SettingsCard';

/*
 * Five themes in the reference order. The first cell is the physical right one
 * in a right-to-left layout, matching the screenshot (Default … Midnight).
 * Selection only changes the draft; the saved theme is applied by the business
 * context after Save, so pending choices never repaint the panel mid-edit.
 */
const THEMES = [
  { preset: 'default', swatch: '#D9A227' },
  { preset: 'ocean', swatch: PRESETS.ocean.primary },
  { preset: 'forest', swatch: PRESETS.forest.primary },
  { preset: 'sunset', swatch: PRESETS.sunset.primary },
  { preset: 'midnight', swatch: PRESETS.midnight.primary },
];

export default function AppearanceTab({ draft, patch, canManage }) {
  const { t } = useI18n();
  const theme = draft.theme || {};
  const activePreset = theme.preset || 'default';
  const mode = theme.mode === 'dark' ? 'dark' : 'light';

  return (
    <SettingsCard
      icon="palette"
      tone="purple"
      title={t('settings_theme_title')}
      subtitle={t('settings_theme_subtitle')}
    >
      <div className="set-themes" role="radiogroup" aria-label={t('settings_theme_title')}>
        {THEMES.map((item) => {
          // A saved custom colour that is not one of the presets marks no card.
          const active = activePreset === item.preset;
          return (
            <button
              key={item.preset}
              type="button"
              role="radio"
              aria-checked={active}
              className={`set-theme ${active ? 'is-active' : ''}`}
              disabled={!canManage}
              onClick={() => patch('theme', { preset: item.preset, primary: item.swatch })}
            >
              {active ? (
                <span className="set-theme__check" aria-hidden="true">
                  <IconCheck />
                </span>
              ) : null}
              <span className="set-theme__swatch" style={{ background: item.swatch }} aria-hidden="true" />
              <span>{t(`theme_name_${item.preset}`)}</span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="set-group-label">{t('settings_theme_mode')}</div>
        <div className="set-choices">
          {['light', 'dark'].map((value) => (
            <button
              key={value}
              type="button"
              className={`set-choice ${mode === value ? 'is-active' : ''}`}
              aria-pressed={mode === value}
              disabled={!canManage}
              onClick={() => patch('theme', { mode: value })}
            >
              {t(`theme_${value}`)}
            </button>
          ))}
        </div>
        <p className="set-hint">{t('settings_theme_hint')}</p>
        <p className="set-hint">
          {t('theme_primary_color')}: <span dir="ltr">{primaryFor(theme)}</span>
        </p>
      </div>
    </SettingsCard>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5 6.2 11.7 13 4.6" />
    </svg>
  );
}
