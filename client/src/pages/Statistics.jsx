import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, Loading, SectionCard } from '../components/ui';
import KpiCards from '../components/dashboard/KpiCards';
import FinanceOverview from '../components/dashboard/FinanceOverview';
import OrderFlow from '../components/dashboard/OrderFlow';
import BestSelling from '../components/dashboard/BestSelling';
import StatusBreakdown from '../components/dashboard/StatusBreakdown';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { get } from '../api';
import { fmtNumber, zoneFor } from '../format';
import '../dashboard.css';

/*
 * Statistics.
 *
 * The same server-aggregated figures the dashboard shows, read on a period the
 * reader picks: the API recomputes revenue, orders, views, the order-flow series
 * and the best sellers for that window in the business timezone, so no number on
 * this page is calculated on the client.
 *
 * Alongside them sit the menu counters, whose "active" figure combines a
 * product's own state with its category's — the same rule the public menu uses.
 */
export default function Statistics() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { businessId } = useAuth();

  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState('week');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const query =
    range === 'custom' && custom.from && custom.to
      ? `range=custom&from=${custom.from}&to=${custom.to}`
      : `range=${range}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, catalog] = await Promise.all([get(`/dashboard?${query}`), get('/catalog/stats')]);
      setData(stats);
      setMenu(catalog);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load, businessId]);

  const timeZone = zoneFor(locale, data?.business?.timezone || business?.timezone);
  const currency = data?.business?.currency || business?.currency;

  return (
    <div className="dash">
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('statistics_title')}</h1>
          <p>{t('statistics_subtitle')}</p>
        </div>
      </div>

      {failed ? <Alert kind="error">{t('error_generic')}</Alert> : null}

      {loading && !data ? (
        <Loading />
      ) : data ? (
        <>
          <KpiCards kpi={data.kpi} locale={locale} />

          <FinanceOverview
            finance={data.finance}
            range={range}
            onRange={setRange}
            custom={custom}
            onCustom={(next) => {
              setCustom(next);
              setRange('custom');
            }}
            busy={loading}
            currency={currency}
            locale={locale}
          />

          <div className="dash-row dash-row--analytics">
            <OrderFlow series={data.series} locale={locale} timeZone={timeZone} />
            <BestSelling rows={data.best_selling} currency={currency} locale={locale} />
          </div>

          <StatusBreakdown flow={data.order_flow} />

          {menu ? (
            <SectionCard icon="utensils" iconClass="ic-green" title={t('statistics_menu')}>
              <div className="fstat-row">
                <MenuCounter icon="layers" label={t('menu_stats_categories')} value={menu.categories.total} locale={locale} />
                <MenuCounter icon="checkCircle" label={t('menu_stats_active')} value={menu.categories.active} locale={locale} />
                <MenuCounter icon="xCircle" label={t('menu_stats_inactive')} value={menu.categories.inactive} locale={locale} />
                <MenuCounter icon="package" label={t('menu_stats_products')} value={menu.products.total} locale={locale} />
                <MenuCounter icon="checkCircle" label={t('menu_stats_active')} value={menu.products.active} locale={locale} />
                <MenuCounter icon="eye" label={t('menu_stats_hidden')} value={menu.products.hidden_by_category} locale={locale} />
              </div>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** One menu counter: a real stored count, never an estimate. */
function MenuCounter({ icon, label, value, locale }) {
  return (
    <div className="fstat">
      <span className="fstat__icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="fstat__label">{label}</span>
      <span className="fstat__value">{fmtNumber(value, locale)}</span>
    </div>
  );
}
