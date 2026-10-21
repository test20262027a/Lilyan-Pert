import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/**
 * Rule-based recommendations built only from the facts the API verified for the
 * selected period (top product, busiest hour, period-over-period change). When
 * a fact is missing that sentence is simply not shown — nothing is invented,
 * and an honest unavailable state appears when no fact exists at all.
 */
export default function BusinessInsights({ insights, finance, locale }) {
  const { t } = useI18n();
  const rows = [];

  const top = insights?.top_product;
  if (top && Number(top.units) > 0) {
    rows.push(
      t('dash_insight_best_seller', {
        name: top.name,
        units: fmtNumber(top.units, locale),
      }),
    );
  }

  const peak = insights?.busiest_hour;
  if (peak && Number(peak.count) > 0) {
    rows.push(
      t('dash_insight_busy_hour', {
        hour: `${String(peak.hour).padStart(2, '0')}:00`,
      }),
    );
  }

  /* An unchanged period is not an insight, and a null base is not a number. */
  const ordersPct = finance?.orders_pct;
  if (rows.length < 3 && Number.isFinite(ordersPct) && ordersPct !== 0) {
    rows.push(
      t(ordersPct > 0 ? 'dash_insight_orders_up' : 'dash_insight_orders_down', {
        pct: fmtNumber(Math.abs(ordersPct), locale),
      }),
    );
  }

  const viewsPct = finance?.views_pct;
  if (rows.length < 3 && Number.isFinite(viewsPct) && viewsPct !== 0) {
    rows.push(
      t(viewsPct > 0 ? 'dash_insight_views_up' : 'dash_insight_views_down', {
        pct: fmtNumber(Math.abs(viewsPct), locale),
      }),
    );
  }

  return (
    <div className="insights">
      <div className="insights__head">
        <span className="insights__badge">
          <Icon name="bulb" size={15} />
        </span>
        {t('dash_insights')}
      </div>
      {rows.length === 0 ? (
        <span className="insights__empty">{t('dash_insights_empty')}</span>
      ) : (
        rows.map((text, i) => (
          <div className="insights__row" key={`${i}-${text}`}>
            <span className="insights__dot" aria-hidden="true" />
            <span>{text}</span>
          </div>
        ))
      )}
    </div>
  );
}
