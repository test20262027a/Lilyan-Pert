import Icon from '../../Icon';
import { SwitchControl } from '../SettingsCard';

/*
 * General Menu Features — the twelve independent customer-menu switches, in the
 * owner's fixed reading order.
 *
 * One raised card per feature: an individual 3D icon surface, the localized
 * title and description, and the switch on the opposite edge (physically left
 * of the text on an RTL page, right of it in English), so the layout mirrors
 * with the language.
 *
 * A setting applies to the whole customer experience, so its one switch writes
 * the same value to the main ordering menu and the QR table menu — the customer
 * surfaces can never disagree about what the owner allows. A feature is shown
 * as on only when both contexts are on.
 */
export default function MenuFeatureCards({ rows, value, onChange, disabled }) {
  return (
    <div className="ms-cards">
      {rows.map((row) => {
        const enabled = value[row.key]?.main !== false && value[row.key]?.qr !== false;
        return (
          <div
            key={row.key}
            className={`ms-card ${enabled ? 'is-on' : 'is-off'} ${row.note ? 'has-note' : ''}`.trim()}
            style={{ '--ms-tone': row.tone }}
          >
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

            <div className="ms-card__switch">
              <SwitchControl
                checked={enabled}
                disabled={disabled}
                label={row.title}
                onChange={(next) => onChange(row.key, next)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
