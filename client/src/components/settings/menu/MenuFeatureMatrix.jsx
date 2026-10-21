import Icon from '../../Icon';
import { useI18n } from '../../../i18n';
import { SwitchControl } from '../SettingsCard';

/*
 * The three-column settings matrix used by both "General menu features" and
 * "Ordering & cart".
 *
 * Column order follows the reading direction: the feature column is the first
 * grid track (physical right on an RTL page, left in English), then the main
 * ordering menu, then the customer QR menu. Each row owns two independent
 * switches — never a shared one — and on narrow screens the row folds into the
 * feature line above two labelled switches.
 */
export default function MenuFeatureMatrix({ rows, value, onChange, disabled, note }) {
  const { t } = useI18n();

  return (
    <div className="ms-matrix">
      <div className="ms-matrix__head" aria-hidden="true">
        <span className="ms-matrix__col">{t('menu_col_feature')}</span>
        <span className="ms-matrix__col">{t('menu_col_main')}</span>
        <span className="ms-matrix__col">{t('menu_col_qr')}</span>
      </div>

      {rows.map((row) => (
        <div className={`ms-matrix__row ${row.disabled ? 'is-muted' : ''}`} key={row.key}>
          <div className="ms-matrix__feature">
            <div className="ms-matrix__title">{row.title}</div>
            <div className="ms-matrix__hint">{row.hint}</div>
          </div>
          <div className="ms-matrix__cell">
            <span className="ms-matrix__cell-label">{t('menu_col_main')}</span>
            <SwitchControl
              checked={value[row.key]?.main !== false}
              disabled={disabled || row.disabled}
              label={`${row.title} — ${t('menu_col_main')}`}
              onChange={(next) => onChange(row.key, 'main', next)}
            />
          </div>
          <div className="ms-matrix__cell">
            <span className="ms-matrix__cell-label">{t('menu_col_qr')}</span>
            <SwitchControl
              checked={value[row.key]?.qr !== false}
              disabled={disabled || row.disabled}
              label={`${row.title} — ${t('menu_col_qr')}`}
              onChange={(next) => onChange(row.key, 'qr', next)}
            />
          </div>
          {row.note ? (
            <div className="ms-matrix__note">
              <Icon name="info" size={13} />
              {row.note}
            </div>
          ) : null}
        </div>
      ))}

      {note ? (
        <p className="ms-matrix__foot-note">
          <Icon name="info" size={13} />
          {note}
        </p>
      ) : null}
    </div>
  );
}
