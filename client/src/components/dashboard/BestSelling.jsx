import { EmptyState, SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/**
 * Best-selling products: real units sold from the frozen order items of this
 * business — editing or deleting a product never rewrites history. Every bar is
 * drawn relative to the best seller shown, so the lengths carry real meaning,
 * and each row ends in a fixed-width value column holding nothing but the
 * quantity, so the badges line up down the card in both directions.
 *
 * The list fills whatever height the card is given (`best-wrap`/`best-list`
 * share the leftover space evenly between the rows), and its own container
 * decides the row shape: a wide card puts the name beside its bar, a narrow one
 * stacks the name above a full-width bar. Neither depends on the viewport, so
 * the same widget reads correctly in a half-width dashboard row and full width.
 */
export default function BestSelling({ rows = [], locale }) {
  const { t } = useI18n();
  const max = rows.reduce((m, row) => Math.max(m, Number(row.units) || 0), 0);

  return (
    <SectionCard icon="trophy" iconClass="ic-purple" title={t('dash_best_selling')}>
      {rows.length === 0 ? (
        <EmptyState icon="chart" title={t('dash_no_data_yet')} />
      ) : (
        <div className="best-wrap">
          <ol className="best-list">
            {rows.map((row, i) => {
              const units = Number(row.units) || 0;
              const width = max > 0 ? Math.max(3, Math.round((units / max) * 100)) : 0;
              const amount = fmtNumber(units, locale);
              return (
                <li className="best-row" key={`${row.name}-${i}`}>
                  <div className="best-row__top">
                    <span className="best-row__rank">{fmtNumber(i + 1, locale)}</span>
                    <span className="best-row__name" title={row.name}>
                      {row.name}
                    </span>
                  </div>
                  <div className="best-row__line">
                    <span
                      className="best-row__track"
                      role="img"
                      aria-label={`${row.name}: ${amount} ${t('dash_units')}`}
                    >
                      <span className="best-row__fill" style={{ width: `${width}%` }} />
                    </span>
                    {/* The count only: a number that fits its circle, however
                        many digits the locale writes it with. */}
                    <span className={`best-row__badge ${amount.length > 2 ? 'is-tight' : ''}`.trim()}>
                      {amount}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </SectionCard>
  );
}
