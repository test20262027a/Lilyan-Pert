import { EmptyState } from '../ui';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/* Green, teal, lime, blue, purple — soft and equally weighted. */
const COLORS = ['#43c45b', '#2bb5a0', '#8fd23f', '#4f8df7', '#8056f5'];

/**
 * The five most ordered products by units sold. Bar lengths are relative to the
 * best seller of the same list, and the names come from the frozen order-item
 * snapshot, so editing or deleting a product never rewrites the ranking.
 */
export default function TopProductsChart({ rows = [], locale }) {
  const { t } = useI18n();
  const max = rows.reduce((m, row) => Math.max(m, Number(row.units) || 0), 0);

  if (rows.length === 0) {
    return <EmptyState icon="chart" title={t('dash_no_data_yet')} />;
  }

  return (
    <div className="stats-top">
      {rows.map((row, i) => {
        const units = Number(row.units) || 0;
        const width = max > 0 ? Math.max(3, Math.round((units / max) * 100)) : 0;
        return (
          <div className="stats-top__row" key={`${row.name}-${i}`}>
            <span className="stats-top__name" title={row.name}>
              {row.name}
            </span>
            <span
              className="stats-top__track"
              role="img"
              aria-label={`${row.name}: ${fmtNumber(units, locale)} ${t('dash_units')}`}
            >
              <span
                className="stats-top__fill"
                style={{ width: `${width}%`, background: COLORS[i % COLORS.length] }}
              />
            </span>
            <span className="stats-top__value">{fmtNumber(units, locale)}</span>
          </div>
        );
      })}
    </div>
  );
}
