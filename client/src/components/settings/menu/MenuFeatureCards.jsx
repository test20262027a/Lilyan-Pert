import Icon from '../../Icon';
import DualMenuFeatureRow, { DualMenuFeatureHeader } from './DualMenuFeatureRow';

/*
 * A menu capability group rendered as raised 3D cards — the twelve general
 * features and the ordering & cart capabilities share this list, so both
 * groups inherit the same card geometry and the two switch columns stay
 * aligned between them.
 */
export default function MenuFeatureCards({ rows, value, onChange, disabled, footNote }) {
  return (
    <div className="ms-cards">
      <DualMenuFeatureHeader />

      {rows.map((row) => (
        <DualMenuFeatureRow
          key={row.key}
          title={row.title}
          hint={row.hint}
          note={row.note}
          icon={row.icon}
          tone={row.tone}
          mainOn={value[row.key]?.main !== false}
          qrOn={value[row.key]?.qr !== false}
          disabled={disabled}
          onChange={(side, next) => onChange(row.key, side, next)}
        />
      ))}

      {footNote ? (
        <p className="ms-cards__foot">
          <Icon name="info" size={13} />
          {footNote}
        </p>
      ) : null}
    </div>
  );
}
