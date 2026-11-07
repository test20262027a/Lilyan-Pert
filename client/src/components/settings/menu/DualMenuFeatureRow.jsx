import Icon from '../../Icon';
import { useI18n } from '../../../i18n';
import { SwitchControl } from '../SettingsCard';

/*
 * One premium 3D settings row, shared by every menu capability group.
 *
 * The same component renders "General menu features" and "Ordering & cart", so
 * the feature column and both switch columns keep identical widths and line up
 * from the top of the tab to the bottom. Each row owns TWO independent
 * switches — one for the main ordering menu, one for the QR table menu — and
 * writes only its own side.
 *
 * On narrow screens the feature line takes the full width and the two switches
 * sit side by side beneath it, each on its own labelled chip.
 */

export function DualMenuFeatureHeader() {
  const { t } = useI18n();

  return (
    <div className="ms-cards__head" aria-hidden="true">
      <span className="ms-cards__col">{t('menu_col_feature')}</span>
      <span className="ms-cards__col">{t('menu_col_main')}</span>
      <span className="ms-cards__col">{t('menu_col_qr')}</span>
    </div>
  );
}

export default function DualMenuFeatureRow({
  title,
  hint,
  note,
  icon,
  tone,
  mainOn,
  qrOn,
  disabled,
  onChange,
}) {
  const { t } = useI18n();
  /* The card only greys out when the feature is off in BOTH menus; a feature
     that still runs in one interface keeps its identity colour. */
  const enabled = mainOn || qrOn;

  return (
    <div
      className={`ms-card ${enabled ? 'is-on' : 'is-off'} ${note ? 'has-note' : ''}`.trim()}
      style={{ '--ms-tone': tone }}
    >
      <div className="ms-card__feature">
        <span className="ms-card__icon" aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>

        <div className="ms-card__text">
          <div className="ms-card__title">{title}</div>
          <div className="ms-card__hint">{hint}</div>
          {note ? (
            <div className="ms-card__note">
              <Icon name="info" size={12} />
              {note}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ms-card__cell">
        <span className="ms-card__cell-label">{t('menu_col_main')}</span>
        <SwitchControl
          checked={mainOn}
          disabled={disabled}
          label={`${title} — ${t('menu_col_main')}`}
          onChange={(next) => onChange('main', next)}
        />
      </div>

      <div className="ms-card__cell">
        <span className="ms-card__cell-label">{t('menu_col_qr')}</span>
        <SwitchControl
          checked={qrOn}
          disabled={disabled}
          label={`${title} — ${t('menu_col_qr')}`}
          onChange={(next) => onChange('qr', next)}
        />
      </div>
    </div>
  );
}
