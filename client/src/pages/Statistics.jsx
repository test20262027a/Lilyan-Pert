import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, Loading, SectionCard } from '../components/ui';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import StatisticsArtwork from '../components/statistics/StatisticsArtwork';
import StatCards from '../components/statistics/StatCards';
import StatPanel from '../components/statistics/StatPanel';
import VisitsOrdersChart from '../components/statistics/VisitsOrdersChart';
import TopProductsChart from '../components/statistics/TopProductsChart';
import RevenuePanel from '../components/statistics/RevenuePanel';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { get } from '../api';
import { fmtNumber } from '../format';
import '../menu.css';
import '../dashboard.css';
import '../statistics.css';

/*
 * Statistics.
 *
 * `/dashboard/statistics` returns every figure on this page from the same
 * tables and definitions the dashboard uses: unique menu sessions per local
 * day, revenue from stored order totals excluding cancellations, the seven
 * most recent business days zero-filled, and the five most ordered products by
 * units. The business timezone decides every day boundary on the server.
 *
 * The menu counters below reuse `/catalog/stats`, whose "active" figure combines
 * a product's own state with its category's — the same rule the public menu uses.
 */
export default function Statistics() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { businessId } = useAuth();

  const [stats, setStats] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, catalog] = await Promise.all([get('/dashboard/statistics'), get('/catalog/stats')]);
      setStats(summary);
      setMenu(catalog);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, businessId]);

  const currency = stats?.business?.currency || business?.currency;

  return (
    <div className="stats-page">
      <PageHeroBanner
        icon="chartBars"
        title={t('statistics_title')}
        subtitle={t('statistics_subtitle')}
        art={<StatisticsArtwork />}
      />

      {failed ? <Alert kind="error">{t('error_generic')}</Alert> : null}

      {loading && !stats ? (
        <Loading />
      ) : stats ? (
        <>
          <StatCards totals={stats.totals} currency={currency} locale={locale} />

          <div className="stats-grid">
            <StatPanel icon="trendUp" tone="blue" title={t('statistics_visits_orders')}>
              <VisitsOrdersChart days={stats.daily} locale={locale} />
            </StatPanel>

            <StatPanel icon="flame" tone="orange" title={t('statistics_top_products')}>
              <TopProductsChart rows={stats.best_selling} locale={locale} />
            </StatPanel>
          </div>

          <RevenuePanel revenue={stats.revenue} currency={currency} locale={locale} />

          {menu ? (
            <SectionCard icon="utensils" iconClass="ic-green" title={t('statistics_menu')}>
              <div className="fstat-row fstat-row--six">
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
