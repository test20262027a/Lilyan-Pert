import { useCallback, useEffect, useState } from 'react';
import { Alert, Loading, useToast } from '../components/ui';
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import NotificationSettings from '../components/dashboard/NotificationSettings';
import DateHours from '../components/dashboard/DateHours';
import KpiCards from '../components/dashboard/KpiCards';
import FinanceOverview from '../components/dashboard/FinanceOverview';
import OrderFlow from '../components/dashboard/OrderFlow';
import BestSelling from '../components/dashboard/BestSelling';
import StatusBreakdown from '../components/dashboard/StatusBreakdown';
import NewOrders from '../components/dashboard/NewOrders';
import ScrollTop from '../components/dashboard/ScrollTop';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../hooks/usePush';
import { get, put } from '../api';
import { zoneFor } from '../format';
import '../dashboard.css';

/** Quiet refresh cadence for the live counters. */
const POLL_MS = 20000;

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { business, setBusiness } = useBusiness();
  const { businessId } = useAuth();
  const toast = useToast();
  const push = usePush();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pushError, setPushError] = useState('');
  const [range, setRange] = useState('today');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const query =
    range === 'custom' && custom.from && custom.to
      ? `range=custom&from=${custom.from}&to=${custom.to}`
      : `range=${range}`;

  /*
   * The financial window is a real backend filter: the API recomputes every
   * figure for the requested range in the business timezone, so nothing here
   * is calculated on the client.
   */
  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const res = await get(`/dashboard?${query}`);
        setData(res);
        setFailed(false);
        return res;
      } catch {
        setFailed(true);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    load(false);
  }, [load, businessId]);

  // Live counters: the poll replaces the payload wholesale, so an order that
  // arrives in two refreshes can never be listed twice.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) load(true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  /** Persists one notification preference and reverts if the write fails. */
  const updateSettings = async (patch) => {
    const previous = data?.notification_settings || {};
    const next = { ...previous, ...patch };
    setData((d) => ({ ...d, notification_settings: next, business: { ...d.business, notification_settings: next } }));
    if (business) setBusiness({ ...business, notification_settings: next });
    try {
      const res = await put('/dashboard/notification-settings', patch);
      const merged = res.notification_settings;
      setData((d) => ({ ...d, notification_settings: merged, business: { ...d.business, notification_settings: merged } }));
      if (business) setBusiness({ ...business, notification_settings: merged });
      toast.success(t('action_saved'));
    } catch {
      setData((d) => ({ ...d, notification_settings: previous, business: { ...d.business, notification_settings: previous } }));
      if (business) setBusiness({ ...business, notification_settings: previous });
      toast.error(t('error_generic'));
    }
  };

  const onPushToggle = async () => {
    setPushError('');
    const res = push.subscribed ? await push.disable() : await push.enable();
    if (res.ok) {
      toast.success(push.subscribed ? t('action_saved') : t('dash_push_enabled'));
      return;
    }
    if (res.reason === 'unsupported') setPushError(t('dash_push_unsupported'));
    else if (res.reason === 'denied') setPushError(t('dash_push_denied'));
    else setPushError(`${t('dash_sw_failed')}${res.error ? ` — ${res.error}` : ''}`);
  };

  if (loading && !data) return <Loading />;
  if (!data) return <Alert kind="error">{t('error_generic')}</Alert>;

  const timeZone = zoneFor(locale, data.business?.timezone || business?.timezone);
  const currency = data.business?.currency || business?.currency;
  /*
   * Section visibility comes from the Business Settings › Dashboard tab. A
   * missing key means "shown", so a business that never opened that tab keeps
   * the dashboard it always had. This only controls display — order processing
   * and notifications keep running regardless.
   */
  const sections = business?.dashboard_settings || data.business?.dashboard_settings || {};
  const show = (key) => sections[key] !== false;

  return (
    <div className="dash">
      <WelcomeBanner business={business || data.business} />

      {failed ? <Alert kind="error">{t('error_generic')}</Alert> : null}

      {/* ---- Date and working hours, then notification settings ----
          Both cards are conditionally rendered, never hidden with opacity: the
          surviving card stretches to the full row through the grid's
          `:only-child` rule, and when both are off the row itself disappears. */}
      {show('show_date_hours') || show('show_notification_settings') ? (
        <div className="dash-row dash-row--info">
          {show('show_date_hours') ? <DateHours hours={data.hours} timeZone={timeZone} locale={locale} /> : null}
          {show('show_notification_settings') ? (
            <NotificationSettings
              /* The business record is the single source of truth for notification
                 settings, so a change made from the header shows up here at once. */
              settings={business?.notification_settings || data.notification_settings}
              onChange={updateSettings}
              push={push}
              onPushToggle={onPushToggle}
              pushError={pushError}
              locale={locale}
            />
          ) : null}
        </div>
      ) : null}

      {/* ---- Four pastel order metrics ---- */}
      {show('show_overview') ? <KpiCards kpi={data.kpi} locale={locale} /> : null}

      {/* ---- Financial overview ---- */}
      <FinanceOverview
        finance={data.finance}
        insights={data.insights}
        showInsights={show('show_insights')}
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

      {/* ---- Order flow and best-selling products ---- */}
      <div className="dash-row dash-row--analytics">
        <OrderFlow series={data.series} locale={locale} timeZone={timeZone} />
        <BestSelling rows={data.best_selling} currency={currency} locale={locale} />
      </div>

      {/* ---- Order status counters ---- */}
      {show('show_order_notifications') ? <StatusBreakdown flow={data.order_flow} /> : null}

      {/* ---- Newest orders ---- */}
      {show('show_recent_orders') ? (
        <NewOrders
          orders={data.new_orders}
          currency={currency}
          locale={locale}
          timeZone={timeZone}
          failed={failed}
          onRetry={() => load(false)}
        />
      ) : null}

      <ScrollTop />
    </div>
  );
}
