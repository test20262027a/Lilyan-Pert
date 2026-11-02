import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import DashIcon from './DashIcon';
import { Alert, Select, SwitchRow } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';
import { playSound, soundSupported, SOUND_OPTIONS, DEFAULT_SOUND, DEFAULT_VOLUME } from '../../sound';
import { isStandalone } from '../../pwa';
import './notifSettings.css';

/* The app's own address, so "open in a new tab" leaves the preview frame. */
const appHref = () => (typeof window === 'undefined' ? '#' : window.location.href);

/*
 * A registered device is described by what its browser reports, so staff can
 * tell their counter tablet from their phone. Product names are not translated;
 * they are what the device calls itself.
 */
function deviceName(userAgent = '') {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : '';
  const system = /iPhone|iPad|iPod/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Windows/.test(userAgent)
        ? 'Windows'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';
  return [browser, system].filter(Boolean).join(' · ');
}

/**
 * Notification settings — the dashboard's full-width card.
 *
 * Structure only: the two switches persist through the dashboard's whitelisted
 * endpoint, the ringtone dropdown drives real synthesised sounds, and the
 * browser switch is never faked — it is on only while a real push subscription
 * exists. When the browser itself refuses to ask (inside the preview frame, on
 * an insecure origin, or because the user blocked the site) the card says
 * exactly which one it is and offers the way out, while in-app alerts and the
 * sound keep working.
 *
 * The illustration panel is purely decorative and holds no control, so the
 * artwork can never sit on top of a switch, a select or a button.
 */
export default function NotificationSettings({
  settings = {},
  onChange,
  push,
  onPushToggle,
  onRemoveDevice,
  pushError,
}) {
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

  /*
   * The device permission pill speaks the browser's own vocabulary: Allowed,
   * Blocked, Not allowed yet. It is never green without a real grant.
   */
  const permissionTone = !push.supported
    ? 'muted'
    : push.permission === 'granted'
      ? 'ok'
      : push.permission === 'denied'
        ? 'bad'
        : push.permission === 'default'
          ? 'warn'
          : 'muted';
  const permissionText =
    push.permission === 'granted'
      ? t('dash_push_allowed')
      : push.permission === 'denied'
        ? t('dash_push_blocked')
        : push.permission === 'default'
          ? t('dash_push_ask')
          : t('dash_push_unsupported');

  return (
    <section className="card notif-card">
      <div className="notif-card__panel">
        <header className="notif-card__head">
          <DashIcon name="bell" tone="pink" size={44} />
          <div className="notif-card__titles">
            <h2 className="notif-card__title">{t('dash_notification_settings')}</h2>
            <p className="notif-card__sub">{t('dash_notification_sub')}</p>
          </div>
        </header>

        <div className="notif-rows">
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
        </div>

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
                  target={isStandalone() ? undefined : '_blank'}
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

        {/* The activation switch above is the single source of truth: turned on
            it registers this device, turned off it stops delivery again. This
            list only reports the devices the server will really push to. */}
        <div className={`push-devices${push.subscribed ? '' : ' is-off'}`}>
          {push.deviceList?.length ? (
            <ul className="push-devices__list">
              {push.deviceList.map((device) => (
                <li key={device.id} className="push-device">
                  <DashIcon name="laptop" tone="indigo" size={30} />
                  <span className="push-device__main">
                    <span className="push-device__name">
                      {deviceName(device.user_agent) || t('dash_push_device_unknown')}
                    </span>
                    {device.endpoint === push.thisEndpoint ? (
                      <span className="push-device__this">{t('dash_push_device_this')}</span>
                    ) : null}
                    {device.endpoint === push.thisEndpoint && push.permission ? (
                      <span className={`push-device__perm push-device__perm--${permissionTone}`}>{permissionText}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="push-device__remove"
                    onClick={() => onRemoveDevice(device)}
                    aria-label={t('dash_push_device_remove')}
                    title={t('dash_push_device_remove')}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="push-devices__empty">{t('dash_push_devices_empty')}</p>
          )}
        </div>

        {/* Ringtone first, then volume: in Kurdish, Persian and Arabic that
            puts the picker on the right and the groove on the left, and the
            order mirrors in English. */}
        <div className="sound-picker">
          <div className="sound-picker__col">
            <span className="sound-picker__label">
              <Icon name="music" size={14} style={{ color: 'var(--dashic-pink-ink)' }} />
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
                <Icon name="volume" size={20} />
              </button>
            </div>
          </div>

          <div className="sound-picker__col">
            <span className="sound-picker__label">
              <Icon name="volume" size={14} style={{ color: 'var(--dashic-pink-ink)' }} />
              {t('dash_sound_volume')}
            </span>
            <div className="sound-volume">
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

      {/* Open space that keeps the uploaded artwork (drawn as the card's own
          background) clear of every control. */}
      <div className="notif-card__art" aria-hidden="true">
        <img className="notif-card__art-img" src="/headers/notif-bell.webp" alt="" draggable="false" />
      </div>
    </section>
  );
}
