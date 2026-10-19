import { EmptyState, SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import { fmtMoney, fmtNumber } from '../../format';

/**
 * Best-selling products: units sold and the revenue they produced, taken from
 * the frozen order items of this business — so editing or deleting a product
 * never rewrites history. An empty result shows the real empty state.
 */
export default function BestSelling({ rows = [], currency, locale }) {
  const { t } = useI18n();

  return (
    <SectionCard icon="trophy" iconClass="ic-purple" title={t('dash_best_selling')}>
      {rows.length === 0 ? (
        <EmptyState icon="chart" title={t('dash_no_data_yet')} />
      ) : (
        rows.map((row, i) => (
          <div className="best-row" key={`${row.name}-${i}`}>
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
