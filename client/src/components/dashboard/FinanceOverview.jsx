import { useState } from 'react';
import Icon from '../Icon';
import { Alert, Field, Modal } from '../ui';
import { useI18n } from '../../i18n';
import { fmtMoney, fmtNumber } from '../../format';

const RANGES = [
  { key: 'today', i18n: 'dash_range_today' },
  { key: 'week', i18n: 'dash_range_week' },
  { key: 'month', i18n: 'dash_range_month' },
  { key: 'year', i18n: 'dash_range_year' },
  { key: 'all', i18n: 'dash_range_alltime' },
  { key: 'custom', i18n: 'dash_range_custom' },
];

const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

function Stat({ icon, label, value, delta }) {
  const { t, locale } = useI18n();
  return (
    <div className="fstat">
      <span className="fstat__icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="fstat__label">{label}</span>
      <span className="fstat__value">{value}</span>
      {delta === null || delta === undefined ? (
        <span className="fstat__delta fstat__delta--empty" aria-hidden="true" />
      ) : (
        <span className={`fstat__delta ${delta < 0 ? 'is-down' : delta > 0 ? 'is-up' : ''}`}>
          {t(delta < 0 ? 'dash_delta_down' : 'dash_delta_up', { pct: fmtNumber(Math.abs(delta), locale) })}
        </span>
      )}
    </div>
  );
}

/**
 * Business overview: the period filter and four financial metrics. The figures
 * are recomputed by the API for the chosen window (business timezone) — the
 * client never calculates money, and comparisons come from the API too, so a
 * period with no previous data shows nothing instead of an invented -100%.
 */
export default function FinanceOverview({ finance, range, onRange, custom, onCustom, busy, currency, locale }) {
  const { t } = useI18n();
  const f = finance || {};
  const [picker, setPicker] = useState(null); // { from, to } | null
  const [error, setError] = useState('');

  const openPicker = () => {
    setError('');
    setPicker({ from: custom?.from || '', to: custom?.to || '' });
  };

  const applyCustom = () => {
    if (!isDay(picker.from) || !isDay(picker.to)) {
      setError(t('dash_range_required'));
      return;
    }
    if (picker.from > picker.to) {
      setError(t('dash_range_invalid'));
      return;
    }
    onCustom({ from: picker.from, to: picker.to });
    setPicker(null);
  };

  return (
    <section className="card finance">
      <header className="card__head finance__head">
        <span className="card__icon ic-blue">
          <Icon name="chart" size={18} />
        </span>
        <div className="card__titles">
          <div className="card__title">{t('dash_business_overview')}</div>
        </div>
        <div className="finance-filters" role="group" aria-label={t('dash_business_overview')}>
          {RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`range-pill ${range === item.key ? 'is-active' : ''}`}
              aria-pressed={range === item.key}
              disabled={busy}
              onClick={() => (item.key === 'custom' ? openPicker() : onRange(item.key))}
            >
              {item.key === 'custom' ? <Icon name="calendar" size={13} /> : null}
              {t(item.i18n)}
            </button>
          ))}
        </div>
      </header>

      <div className="card__body">
        <div className="fstat-row">
          <Stat
            icon="banknote"
            label={t('dash_revenue_label')}
            value={fmtMoney(f.revenue, currency, locale)}
          />
          <Stat icon="cart" label={t('dash_orders')} value={fmtNumber(f.orders || 0, locale)} />
          <Stat
            icon="eye"
            label={t('dash_menu_views')}
            value={fmtNumber(f.views || 0, locale)}
            delta={f.views_pct}
          />
          <Stat
            icon="receipt"
            label={t('dash_avg_order_value')}
            value={fmtMoney(f.avg_order, currency, locale)}
          />
        </div>
      </div>

      {picker ? (
        <Modal
          title={t('dash_range_custom')}
          subtitle={t('dash_range_hint')}
          onClose={() => setPicker(null)}
          footer={
            <>
              <button className="btn" onClick={() => setPicker(null)}>
                {t('action_cancel')}
              </button>
              <button className="btn btn--primary" onClick={applyCustom}>
                {t('action_apply')}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label={t('dash_range_from')}>
              <input
                className="input"
                type="date"
                value={picker.from}
                onChange={(e) => setPicker((p) => ({ ...p, from: e.target.value }))}
              />
            </Field>
            <Field label={t('dash_range_to')}>
              <input
                className="input"
                type="date"
                value={picker.to}
                onChange={(e) => setPicker((p) => ({ ...p, to: e.target.value }))}
              />
            </Field>
          </div>
          {error ? (
            <div style={{ marginTop: 12 }}>
              <Alert kind="error">{error}</Alert>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </section>
  );
}
