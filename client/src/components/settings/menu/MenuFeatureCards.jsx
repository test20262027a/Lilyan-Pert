import Icon from '../../Icon';
import { useI18n } from '../../../i18n';
import { SwitchControl } from '../SettingsCard';

/*
 * General Menu Features — the twelve switches, in the owner's fixed reading
 * order.
 *
 * One raised card per feature: an individual 3D icon surface, the localized
 * title and description, and TWO independent switches — the main ordering menu
 * and the QR table menu. Each switch writes only its own side, so a feature can
 * be on in one customer interface and off in the other.
 *
 * The header above the list repeats the same three columns (feature, main
 * menu, QR menu) so both switch columns line up from the first row to the last.
 * On narrow screens the row folds into the feature line above two labelled
 * switch chips.
 */
export default function MenuFeatureCards({ rows, value, onChange, disabled }) {
  const { t } = useI18n();

  return (
    <div className="ms-cards">
      <div className="ms-cards__head" aria-hidden="true">
        <span className="ms-cards__col">{t('menu_col_feature')}</span>
        <span className="ms-cards__col">{t('menu_col_main')}</span>
        <span className="ms-cards__col">{t('menu_col_qr')}</span>
      </div>

      {rows.map((row) => {
        const mainOn = value[row.key]?.main !== false;
        const qrOn = value[row.key]?.qr !== false;
        /* The card only greys out when the feature is off in BOTH menus; a
           feature that still runs in one interface keeps its identity colour. */
        const enabled = mainOn || qrOn;
        return (
          <div
            key={row.key}
            className={`ms-card ${enabled ? 'is-on' : 'is-off'} ${row.note ? 'has-note' : ''}`.trim()}
            style={{ '--ms-tone': row.tone }}
          >
            <div className="ms-card__feature">
              <span className="ms-card__icon" aria-hidden="true">
                <Icon name={row.icon} size={20} />
              </span>

              <div className="ms-card__text">
                <div className="ms-card__title">{row.title}</div>
                <div className="ms-card__hint">{row.hint}</div>
                {row.note ? (
                  <div className="ms-card__note">
                    <Icon name="info" size={12} />
                    {row.note}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ms-card__cell">
              <span className="ms-card__cell-label">{t('menu_col_main')}</span>
              <SwitchControl
                checked={mainOn}
                disabled={disabled}
                label={`${row.title} — ${t('menu_col_main')}`}
                onChange={(next) => onChange(row.key, 'main', next)}
              />
            </div>

            <div className="ms-card__cell">
              <span className="ms-card__cell-label">{t('menu_col_qr')}</span>
              <SwitchControl
                checked={qrOn}
                disabled={disabled}
                label={`${row.title} — ${t('menu_col_qr')}`}
                onChange={(next) => onChange(row.key, 'qr', next)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
