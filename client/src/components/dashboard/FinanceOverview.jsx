import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtMoney, fmtNumber } from '../../format';

const RANGES = ['today', '7d', '30d', 'all'];
const RANGE_KEY = {
  today: 'dash_range_today',
  '7d': 'dash_range_7d',
  '30d': 'dash_range_30d',
  all: 'dash_range_all',
};

/**
 * Financial overview: one header with the date window, then four aligned
 * statistic cards. Figures are recomputed by the API for the chosen window —
 * the client never calculates money itself.
 */
export default function FinanceOverview({ finance, range, onRangeChange, busy, currency, locale }) {
  const { t } = useI18n();
  const f = finance || {};
  const tax = Number(f.tax || 0) + Number(f.service_charge || 0);

  return (
    <section className="card finance">
      <header className="card__head">
        <span className="card__icon ic-green">
          <Icon name="wallet" size={18} />
        </span>
        <div className="card__titles">
          <div className="card__title">{t('dash_revenue')}</div>
          <div className="card__subtitle">{t('dash_finance_hint')}</div>
        </div>
        <div className="finance-filters" role="group" aria-label={t('dash_revenue')}>
          {RANGES.map((key) => (
            <button
              key={key}
              type="button"
              className={`range-pill ${range === key ? 'is-active' : ''}`}
              aria-pressed={range === key}
              disabled={busy}
              onClick={() => onRangeChange(key)}
            >
              {t(RANGE_KEY[key])}
            </button>
          ))}
        </div>
      </header>
      <div className="card__body">
        <div className="fstat-row">
          <div className="fstat">
            <div className="fstat__label">
              <Icon name="wallet" size={13} />
              <span>{t('dash_total_revenue')}</span>
            </div>
            <div className="fstat__value">{fmtMoney(f.revenue, currency, locale)}</div>
          </div>
          <div className="fstat">
            <div className="fstat__label">
              <Icon name="receipt" size={13} />
              <span>{t('dash_orders')}</span>
            </div>
            <div className="fstat__value">{fmtNumber(f.orders || 0, locale)}</div>
          </div>
          <div className="fstat">
            <div className="fstat__label">
              <Icon name="chart" size={13} />
              <span>{t('dash_avg_order')}</span>
            </div>
            <div className="fstat__value">{fmtMoney(f.avg_order, currency, locale)}</div>
          </div>
          <div className="fstat">
            <div className="fstat__label">
              <Icon name="tag" size={13} />
              <span>{t('dash_finance_tax')}</span>
            </div>
            <div className="fstat__value">{fmtMoney(tax, currency, locale)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
