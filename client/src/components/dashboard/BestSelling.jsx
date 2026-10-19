import { EmptyState, SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import { fmtMoney, fmtNumber } from '../../format';

/**
 * Best-selling products: units sold and the revenue they produced, both taken
 * from the aggregated order items of this business.
 */
export default function BestSelling({ rows = [], currency, locale }) {
  const { t } = useI18n();

  return (
    <SectionCard icon="star" iconClass="ic-amber" title={t('dash_best_selling')}>
      {rows.length === 0 ? (
        <EmptyState icon="chart" title={t('dash_no_products')} />
      ) : (
        rows.map((row, i) => (
          <div className="best-row" key={row.name}>
            <span className="best-row__num">{fmtNumber(i + 1, locale)}</span>
            <span className="best-row__name" title={row.name}>
              {row.name}
            </span>
            <span className="best-row__units">
              {fmtNumber(row.units, locale)} {t('dash_units')}
            </span>
            <span className="best-row__value">{fmtMoney(row.revenue, currency, locale)}</span>
          </div>
        ))
      )}
    </SectionCard>
  );
}
