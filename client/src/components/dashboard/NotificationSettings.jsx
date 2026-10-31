import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import DashIcon from './DashIcon';
import { Alert, Select, SwitchRow } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';
import { playSound, soundSupported, SOUND_OPTIONS, DEFAULT_SOUND, DEFAULT_VOLUME } from '../../sound';

/* The app's own address, so "open in a new tab" leaves the preview frame. */
const appHref = () => (typeof window === 'undefined' ? '#' : window.location.href);

/**
 * Notification settings. Both switches persist through the dashboard's
 * whitelisted endpoint and the sound dropdown drives real synthesised sounds.
 *
 * The browser switch is never faked: it is on only while a real push
 * subscription exists. When the browser itself refuses to ask — inside the
 * preview frame, on an insecure origin, or because the user blocked the site —
 * the card says exactly which one it is and offers the way out, while in-app
 * alerts and the sound keep working.
 */
export default function NotificationSettings({ settings = {}, onChange, push, onPushToggle, pushError }) {
  const { t, locale } = useI18n();
  const soundOn = settings.sound_enabled !== false;
  const soundKey = SOUND_OPTIONS.includes(settings.sound_key) ? settings.sound_key : DEFAULT_SOUND;
  const savedVolume = Number.isFinite(Number(settings.sound_volume))
    ? Math.min(100, Math.max(0, Math.round(Number(settings.sound_volume))))
    : DEFAULT_VOLUME;

  /*
   * The slider keeps its own draft while the thumb moves, so one drag is ONE
   * saved value instead of a request per pixel; the saved record stays the
   * source of truth and re-seeds the thumb whenever it changes elsewhere.
   */
  const [volume, setVolume] = useState(savedVolume);
  useEffect(() => setVolume(savedVolume), [savedVolume]);

  // A browser that refused to start audio says so where the sound is chosen,
  // with the gesture that lifts the restriction.
  const [blocked, setBlocked] = useState(false);
  const previewTimer = useRef(null);
  const [previewing, setPreviewing] = useState(false);

  const preview = async (key, level) => {
    const status = await playSound(key, level);
    setBlocked(status === 'blocked');
    if (status !== 'ok') return;
    setPreviewing(true);
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => setPreviewing(false), 1100);
  };
  useEffect(() => () => clearTimeout(previewTimer.current), []);

  const commitVolume = () => {
    if (volume !== savedVolume) onChange({ sound_volume: volume });
  };

  // A browser without the Web Audio API can never make a sound, and one whose
  // permission was denied cannot raise a system notification. Both are said
  // plainly instead of showing a switch that pretends to work.
  const audioUnavailable = !soundSupported();

  const granted = push.permission === 'granted';

  /*
   * One reason at a time, most specific first. "preview" is a frame
   * restriction, not a user decision, so it never reads as a permanent denial.
   */
  const context = !push.supported
    ? 'unsupported'
    : !push.secure
      ? 'insecure'
      : push.embedded && !granted
        ? 'preview'
        : push.permission === 'denied' && !push.subscribed
          ? 'denied'
          : null;

  const NOTICES = {
    preview: {
      tone: 'warn',
      icon: 'bell',
      title: t('dash_push_preview_blocked'),
      body: `${t('dash_push_preview_help')} ${t('dash_push_inapp_note')}`,
      action: t('dash_push_open_tab'),
    },
    denied: {
      tone: 'danger',
      icon: 'lock',
      title: t('dash_push_denied'),
      body: `${t('dash_push_denied_help')} ${t('dash_push_inapp_note')}`,
    },
    insecure: {
      tone: 'warn',
      icon: 'shield',
      title: t('dash_push_insecure'),
      body: t('dash_push_inapp_note'),
    },
  };

  const notice = NOTICES[context];

  /* Only a real restriction earns a second line under the switch. The live
     device count is deliberately not repeated here: the browser switch itself
     already reads as on, and the extra line only added noise. */
  const pushHint = !push.supported
    ? t('dash_push_unsupported')
    : context === 'preview'
      ? t('dash_push_preview_hint')
      : context === 'denied'
        ? t('dash_push_denied')
        : context === 'insecure'
          ? t('dash_push_insecure')
          : undefined;

  return (
    <section className="card notif-card">
      <header className="card__head">
        <DashIcon name="bell" tone="pink" size={36} />
        <div className="card__titles">
          <div className="card__title">{t('dash_notification_settings')}</div>
        </div>
      </header>

      <div className="card__body">
        <SwitchRow
          icon="volume"
          tone="pink"
          title={t('dash_sound_new_order')}
          hint={audioUnavailable ? t('dash_sound_unsupported') : undefined}
          checked={soundOn}
          onChange={(v) => onChange({ sound_enabled: v })}
        />
        <SwitchRow
          icon="bell"
          tone="pink"
          title={t('dash_push_background')}
          hint={pushHint}
          checked={push.subscribed}
          // Deliberately stays clickable inside the preview: a frame restriction
          // must not lock the control for the real website behind it.
          disabled={!push.supported || !push.secure || push.busy}
          onChange={onPushToggle}
        />

        {notice ? (
          <div className={`notif-note notif-note--${notice.tone}`} role="status">
            <span className="notif-note__badge" aria-hidden="true">
              <Icon name={notice.icon} size={16} />
            </span>
            <div className="notif-note__main">
              <p className="notif-note__title">{notice.title}</p>
              <p className="notif-note__body">{notice.body}</p>
              {notice.action ? (
                <a
                  className="btn btn--sm btn--primary notif-note__action"
                  href={appHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="link" size={14} />
                  {notice.action}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {pushError ? (
          <div className="notif-card__warning">
            <Alert kind="error">{pushError}</Alert>
          </div>
        ) : null}

        {/* Pushed to the bottom of the card so it lines up with the clock in the
            neighbouring Date & working hours card. */}
        <div className="sound-picker">
          <span className="sound-picker__label">
            <Icon name="volume" size={13} style={{ color: 'var(--dashic-pink-ink)' }} />
            {t('dash_sound')}
          </span>
          <div className="sound-picker__row">
            <Select
              className="sound-picker__select"
              value={soundKey}
              // Picking a ringtone plays it on the same click, so the choice is
              // heard before it is saved.
              onChange={(next) => {
                onChange({ sound_key: next });
                preview(next, volume);
              }}
              aria-label={t('dash_sound')}
              menuMaxHeight={330}
              options={SOUND_OPTIONS.map((key) => ({ value: key, label: t(`dash_sound_${key}`) }))}
            />
            <button
              type="button"
              className={`sound-play dash-ic dash-ic--pink dash-ic--circle ${previewing ? 'is-playing' : ''}`.trim()}
              onClick={() => preview(soundKey, volume)}
              disabled={audioUnavailable}
              aria-label={t('dash_sound_preview')}
              title={t('dash_sound_preview')}
            >
              <Icon name="volume" size={19} />
            </button>
          </div>

          <div className="sound-volume">
            <label className="sound-volume__label" htmlFor="sound-volume-input">
              {t('dash_sound_volume')}
            </label>
            <input
              id="sound-volume-input"
              type="range"
              min="0"
              max="100"
              step="1"
              className="sound-range"
              style={{ '--sound-fill': `${volume}%` }}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              // One saved value per gesture: release, key press or blur.
              onPointerUp={commitVolume}
              onKeyUp={commitVolume}
              onBlur={commitVolume}
              aria-label={t('dash_sound_volume')}
              aria-valuetext={`${fmtDigits(volume, locale)}%`}
            />
            <span className="sound-volume__value" aria-hidden="true">{`${fmtDigits(volume, locale)}%`}</span>
          </div>

          {blocked ? (
            <div className="notif-note notif-note--warn" role="status">
              <span className="notif-note__badge" aria-hidden="true">
                <Icon name="volumeOff" size={16} />
              </span>
              <div className="notif-note__main">
                <p className="notif-note__body">{t('dash_sound_blocked')}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
