import Icon from '../Icon';
import { Alert, Select, SwitchRow } from '../ui';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';
import { playSound, SOUND_OPTIONS, DEFAULT_SOUND } from '../../sound';

/**
 * Notification settings. Both switches persist through the dashboard's
 * whitelisted endpoint, the sound dropdown drives real synthesised sounds and
 * previews exactly the sound that is stored. A warning appears only when the
 * Service Worker or the permission request actually failed.
 */
export default function NotificationSettings({ settings = {}, onChange, push, onPushToggle, pushError, locale }) {
  const { t } = useI18n();
  const soundOn = settings.sound_enabled !== false;
  const soundKey = SOUND_OPTIONS.includes(settings.sound_key) ? settings.sound_key : DEFAULT_SOUND;

  // A browser without the Web Audio API can never make a sound, and one whose
  // permission was denied cannot raise a system notification. Both are said
  // plainly instead of showing a switch that pretends to work.
  const audioUnavailable =
    typeof window !== 'undefined' && !(window.AudioContext || window.webkitAudioContext);

  const pushHint = !push.supported
    ? t('dash_push_unsupported')
    : push.subscribed
      ? `${t('dash_push_devices')}: ${fmtNumber(push.devices, locale)}`
      : push.permission === 'denied'
        ? t('dash_push_denied')
        : t('dash_enable_push');

  return (
    <section className="card notif-card">
      <header className="card__head">
        <span className="card__icon ic-amber">
          <Icon name="bell" size={18} />
        </span>
        <div className="card__titles">
          <div className="card__title">{t('dash_notification_settings')}</div>
        </div>
      </header>

      <div className="card__body">
        <SwitchRow
          icon="volume"
          title={t('dash_sound_new_order')}
          hint={audioUnavailable ? t('dash_sound_unsupported') : undefined}
          checked={soundOn}
          onChange={(v) => onChange({ sound_enabled: v })}
        />
        <SwitchRow
          icon="bell"
          iconClass="switch-row__icon--muted"
          title={t('dash_push_background')}
          hint={pushHint}
          checked={push.subscribed}
          disabled={!push.supported || push.busy}
          onChange={onPushToggle}
        />

        {pushError ? (
          <div className="notif-card__warning">
            <Alert kind="error">{pushError}</Alert>
          </div>
        ) : null}

        {/* Pushed to the bottom of the card so it lines up with the clock in the
            neighbouring Date & working hours card. */}
        <div className="sound-picker">
          <span className="sound-picker__label">
            <Icon name="volume" size={13} />
            {t('dash_sound')}
          </span>
          <div className="sound-picker__row">
            <Select
              className="sound-picker__select"
              value={soundKey}
              onChange={(next) => onChange({ sound_key: next })}
              aria-label={t('dash_sound')}
              options={SOUND_OPTIONS.map((key) => ({ value: key, label: t(`dash_sound_${key}`) }))}
            />
            <button
              type="button"
              className="sound-play"
              onClick={() => playSound(soundKey)}
              aria-label={t('dash_sound_preview')}
              title={t('dash_sound_preview')}
            >
              <Icon name="volume" size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
