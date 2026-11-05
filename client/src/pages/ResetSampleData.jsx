import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, Loading, useToast } from '../components/ui';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import ResetArtwork from '../components/reset/ResetArtwork';
import ResetConfirmModal from '../components/reset/ResetConfirmModal';
import ResetModuleCard from '../components/reset/ResetModuleCard';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { get, post } from '../api';
import '../reset.css';

/*
 * Data Reset.
 *
 * Two operations that never mix, one card per real data module of
 * lib/reset-modules.js:
 *
 *   Sample data    removes only records the demo seed flagged `is_sample`.
 *   Business data  deletes this business's real records, after typing its name.
 *
 * Every number on this page comes from the server's authoritative count — the
 * same count query the backup manifest uses — and is refreshed in place after
 * any change, without reloading the application.
 */

/** Icon and tone per module. Each module owns a colour of its own. */
const MODULE_VISUALS = {
  orders: { icon: 'cart', tone: 'red' },
  visits: { icon: 'chartBars', tone: 'sky' },
  reviews: { icon: 'star', tone: 'gold' },
  advertisements: { icon: 'megaphone', tone: 'violet' },
  tables: { icon: 'qr', tone: 'mint' },
  promotions: { icon: 'percent', tone: 'amber' },
  products: { icon: 'package', tone: 'teal' },
  categories: { icon: 'layers', tone: 'cyan' },
  staff: { icon: 'users', tone: 'indigo' },
  suggestions: { icon: 'trendUp', tone: 'lime' },
  notifications: { icon: 'bell', tone: 'blue' },
  activity: { icon: 'history', tone: 'slate' },
  media: { icon: 'image', tone: 'grape' },
  settings: { icon: 'settings', tone: 'graphite' },
  branding: { icon: 'store', tone: 'sand' },
  texts: { icon: 'type', tone: 'plum' },
};

/**
 * Localized name for a module — and for every module a card can list as a
 * dependency. Both vocabularies resolve here, so the page can never print an
 * internal identifier such as `order_items` as if it were a label.
 */
const MODULE_LABELS = {
  /* reset modules */
  orders: 'reset_mod_orders',
  visits: 'reset_mod_visits',
  reviews: 'reset_mod_reviews',
  advertisements: 'reset_mod_advertisements',
  tables: 'reset_mod_tables',
  promotions: 'reset_mod_promotions',
  products: 'reset_mod_products',
  categories: 'reset_mod_categories',
  staff: 'reset_mod_staff',
  suggestions: 'reset_mod_suggestions',
  notifications: 'reset_mod_notifications',
  activity: 'reset_mod_activity',
  media: 'reset_mod_media',
  settings: 'reset_mod_settings',
  branding: 'reset_mod_branding',
  texts: 'reset_mod_texts',
  /* dependency module identifiers returned by the server */
  order_items: 'reset_mod_order_items',
  order_audit: 'reset_mod_order_audit',
  receipt_prints: 'reset_mod_receipt_prints',
  order_discounts: 'reset_mod_order_discounts',
  menu_products: 'reset_mod_menu_products',
  menu_categories: 'reset_mod_categories',
  team_members: 'reset_mod_staff',
  featured_products: 'reset_mod_suggestions',
  business_views: 'reset_mod_visits',
  activity_reports: 'reset_mod_activity',
  activity_hidden: 'reset_mod_activity_hidden',
  uploaded_files: 'reset_mod_uploaded_files',
  business_settings: 'reset_mod_settings',
  business_profile: 'reset_mod_branding',
  editable_text: 'reset_mod_texts',
};

/** The page's sections. A module not listed here falls into the last one. */
const GROUPS = [
  { key: 'operations', icon: 'receipt', modules: ['orders', 'visits', 'tables'] },
  { key: 'menu', icon: 'utensils', modules: ['products', 'categories', 'promotions', 'advertisements', 'suggestions'] },
  { key: 'customers', icon: 'message', modules: ['reviews', 'notifications'] },
  { key: 'system', icon: 'settings', modules: ['staff', 'activity', 'media', 'settings', 'branding', 'texts'] },
];

/** Modules whose deletion needs a dependency warning before it runs. */
const WARNINGS = {
  tables: 'reset_dep_tables',
  promotions: 'reset_dep_promotions',
  products: 'reset_dep_products',
  categories: 'reset_dep_categories',
  staff: 'reset_dep_staff',
  suggestions: 'reset_dep_suggestions',
  orders: 'reset_dep_orders_real',
  media: 'reset_dep_media',
  activity: 'reset_dep_activity',
  settings: 'reset_dep_settings',
};

const newRequestId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const STATUS_KEYS = {
  done: 'reset_status_done',
  blocked: 'reset_status_blocked',
  empty: 'reset_status_empty',
};

export default function ResetSampleData() {
  const { t } = useI18n();
  const { business } = useBusiness();
  const toast = useToast();

  const [modules, setModules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState('sample');
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  /*
   * `quiet` is the live refresh: counts are replaced in place, so the loader
   * never appears and a ticked module, an open dialog or the scroll position is
   * never thrown away.
   */
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const data = await get('/backups/reset-sample');
      setModules(data.modules || []);
      setFailed(false);
    } catch {
      if (!quiet) setFailed(true);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time counters: every successful write, other tabs, focus and a slow poll.
  useLiveRefresh(load);

  const cards = useMemo(
    () =>
      (modules || []).map((m) => {
        const sampleEligible = m.sample_counts?.eligible || 0;
        const sampleBlocked = m.sample_counts?.blocked || 0;
        const removable = m.removable || 0;
        const count = mode === 'sample' ? sampleEligible : removable;
        const total = m.total || 0;
        const blocked = mode === 'sample' ? sampleBlocked : 0;
        const labelKey = MODULE_LABELS[m.key] || null;
        return {
          key: m.key,
          risk: m.risk,
          total,
          count,
          blocked,
          kept: Math.max(0, total - count - blocked),
          dependents: (m.dependents || [])
            .filter((d) => MODULE_LABELS[d.key] && d.count > 0)
            .map((d) => ({ key: d.key, labelKey: MODULE_LABELS[d.key], count: d.count })),
          ...(MODULE_VISUALS[m.key] || { icon: 'database', tone: 'graphite' }),
          label: labelKey ? t(labelKey) : m.key,
          desc: t(`reset_mod_${m.key}_desc`),
          warning: WARNINGS[m.key] || null,
        };
      }),
    [modules, mode, t],
  );

  const selectable = cards.filter((c) => c.count > 0);

  const groups = useMemo(() => {
    const placed = new Set();
    const out = GROUPS.map((group) => {
      const items = group.modules
        .map((key) => cards.find((card) => card.key === key))
        .filter(Boolean);
      items.forEach((card) => placed.add(card.key));
      return { ...group, items };
    });
    // Anything the server knows but this page does not group still stays reachable.
    const rest = cards.filter((card) => !placed.has(card.key));
    if (rest.length) out[out.length - 1].items.push(...rest);
    return out.filter((group) => group.items.length);
  }, [cards]);

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setSelected([]);
    setResult(null);
  };

  const toggle = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const openBulk = () => setConfirm({ keys: selected, requestId: newRequestId() });
  const openSingle = (key) => setConfirm({ keys: [key], requestId: newRequestId() });

  const runReset = async ({ backup, typed }) => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (backup) {
        // A real full backup, created and confirmed by the server before any
        // record is removed. A failure here stops the reset.
        try {
          await post('/backups', { mode: 'full' });
        } catch {
          toast.error(t('reset_confirm_backup_failed'));
          return;
        }
      }
      const data = await post(mode === 'data' ? '/backups/reset-data' : '/backups/reset-sample', {
        modules: confirm.keys,
        request_id: confirm.requestId,
        ...(mode === 'data' ? { confirm: true, confirm_name: typed } : {}),
      });
      setResult(data);
      setModules(data.modules || []);
      setSelected((prev) => prev.filter((k) => !confirm.keys.includes(k)));
      setConfirm(null);
      if (data.removed > 0) {
        toast.success(
          t(mode === 'data' ? 'reset_data_done' : 'reset_done', { count: data.removed }),
        );
      } else {
        toast.error(t(mode === 'data' ? 'reset_data_nothing' : 'reset_nothing'));
      }
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const resultRows = (result?.results || []).filter((r) => r.status !== 'empty');
  const resultLabels = useMemo(() => Object.fromEntries(cards.map((c) => [c.key, c.label])), [cards]);

  return (
    <div className="rs-page">
      <PageHeroBanner
        icon="trash"
        title={t('reset_title')}
        subtitle={t('reset_subtitle')}
        art={<ResetArtwork />}
      />

      <div className="rs-modes" role="tablist" aria-label={t('reset_title')}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sample'}
          className={`rs-mode rs-mode--sample ${mode === 'sample' ? 'is-on' : ''}`}
          onClick={() => switchMode('sample')}
        >
          <span className="rs-mode__ico" aria-hidden="true">
            <Icon name="database" size={15} />
          </span>
          <span className="rs-mode__text">
            <strong>{t('reset_mode_sample')}</strong>
            <em>{t('reset_mode_sample_hint')}</em>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'data'}
          className={`rs-mode rs-mode--data ${mode === 'data' ? 'is-on' : ''}`}
          onClick={() => switchMode('data')}
        >
          <span className="rs-mode__ico" aria-hidden="true">
            <Icon name="alert" size={15} />
          </span>
          <span className="rs-mode__text">
            <strong>{t('reset_mode_data')}</strong>
            <em>{t('reset_mode_data_hint')}</em>
          </span>
        </button>
      </div>

      <div className="rs-notice" role="note">
        <Icon name={mode === 'data' ? 'alert' : 'shield'} size={16} />
        <span>{mode === 'data' ? t('reset_protected_notice_data') : t('reset_protected_notice')}</span>
      </div>

      <div className="rs-toolbar">
        <span className={`rs-toolbar__count ${selected.length ? 'is-on' : ''}`}>
          <Icon name={selected.length ? 'checkCircle' : 'layers'} size={14} />
          {t('reset_selected_count', { count: selected.length })}
        </span>
        <div className="rs-toolbar__actions">
          <button
            type="button"
            className="rs-btn rs-btn--green"
            onClick={() => setSelected(selectable.map((c) => c.key))}
            disabled={!selectable.length || busy}
          >
            <Icon name="check" size={14} />
            {t('action_select_all')}
          </button>
          <button
            type="button"
            className="rs-btn rs-btn--ghost"
            onClick={() => setSelected([])}
            disabled={!selected.length || busy}
          >
            <Icon name="close" size={14} />
            {t('action_clear_all')}
          </button>
          <button
            type="button"
            className="rs-btn rs-btn--danger"
            onClick={openBulk}
            disabled={!selected.length || busy}
          >
            <Icon name="trash" size={14} />
            {mode === 'data' ? t('reset_delete_selected') : t('reset_selected')}
          </button>
        </div>
      </div>

      {failed ? (
        <Alert kind="error">
          {t('error_generic')}{' '}
          <button type="button" className="btn btn--sm" onClick={load}>
            {t('action_retry')}
          </button>
        </Alert>
      ) : null}

      {result ? (
        <div className="rs-result" role="status">
          <div className="rs-result__head">
            <Icon name={result.removed > 0 ? 'checkCircle' : 'info'} size={17} />
            <strong>
              {result.removed > 0
                ? t(result.mode === 'data' ? 'reset_data_done' : 'reset_done', { count: result.removed })
                : t(result.mode === 'data' ? 'reset_data_nothing' : 'reset_nothing')}
            </strong>
            <button
              type="button"
              className="rs-result__close"
              onClick={() => setResult(null)}
              aria-label={t('action_close')}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
          {resultRows.length ? (
            <ul className="rs-result__list">
              {resultRows.map((r) => (
                <li key={r.key}>
                  <span>{resultLabels[r.key] || r.key}</span>
                  <span className={`rs-result__status is-${r.status}`}>
                    {r.status === 'done'
                      ? `${t(STATUS_KEYS.done)} · ${t('reset_count', { count: r.removed })}`
                      : t(STATUS_KEYS[r.status] || 'reset_status_blocked')}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {result.blocked?.length ? <p className="rs-result__note">{t('reset_blocked_result')}</p> : null}
        </div>
      ) : null}

      {loading ? <Loading /> : null}

      {!loading && cards.length ? (
        <div className="rs-sections">
          {groups.map((group) => (
            <section key={group.key} className="rs-group">
              <header className="rs-group__head">
                <span className="rs-group__icon" aria-hidden="true">
                  <Icon name={group.icon} size={15} />
                </span>
                <h2 className="rs-group__title">{t(`reset_group_${group.key}`)}</h2>
                <span className="rs-group__count">{group.items.length}</span>
              </header>
              <div className="rs-grid">
                {group.items.map((card) => (
                  <ResetModuleCard
                    key={card.key}
                    card={card}
                    mode={mode}
                    selected={selected.includes(card.key)}
                    busy={busy}
                    onToggle={() => toggle(card.key)}
                    onDelete={() => openSingle(card.key)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {confirm ? (
        <ResetConfirmModal
          mode={mode}
          modules={cards.filter((c) => confirm.keys.includes(c.key))}
          businessName={business?.name}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={runReset}
        />
      ) : null}
    </div>
  );
}
