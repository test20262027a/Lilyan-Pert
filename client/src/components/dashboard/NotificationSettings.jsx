import Icon from '../Icon';
import { Alert, Select, SwitchRow } from '../ui';
import { useI18n } from '../../i18n';
import { playSound, SOUND_OPTIONS, DEFAULT_SOUND } from '../../sound';

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
  const { t } = useI18n();
  const soundOn = settings.sound_enabled !== false;
  const soundKey = SOUND_OPTIONS.includes(settings.sound_key) ? settings.sound_key : DEFAULT_SOUND;

  // A browser without the Web Audio API can never make a sound, and one whose
  // permission was denied cannot raise a system notification. Both are said
  // plainly instead of showing a switch that pretends to work.
  const audioUnavailable =
    typeof window !== 'undefined' && !(window.AudioContext || window.webkitAudioContext);

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
