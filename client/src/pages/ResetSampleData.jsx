import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, Loading, useToast } from '../components/ui';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import ResetArtwork from '../components/reset/ResetArtwork';
import ResetConfirmModal from '../components/reset/ResetConfirmModal';
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

/** Icon and pastel tone per module. The order below is the reference screen's. */
const MODULE_VISUALS = {
  orders: { icon: 'receipt', tone: 'orange' },
  visits: { icon: 'eye', tone: 'blue' },
  reviews: { icon: 'star', tone: 'purple' },
  advertisements: { icon: 'megaphone', tone: 'amber' },
  tables: { icon: 'qr', tone: 'teal' },
  promotions: { icon: 'percent', tone: 'pink' },
  products: { icon: 'package', tone: 'red' },
  categories: { icon: 'grid', tone: 'red' },
  staff: { icon: 'users', tone: 'red' },
  suggestions: { icon: 'trendUp', tone: 'red' },
  notifications: { icon: 'bell', tone: 'blue' },
  activity: { icon: 'history', tone: 'purple' },
  media: { icon: 'image', tone: 'teal' },
  settings: { icon: 'settings', tone: 'neutral' },
  branding: { icon: 'palette', tone: 'amber' },
  texts: { icon: 'type', tone: 'pink' },
};

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
        return {
          key: m.key,
          risk: m.risk,
          total: m.total || 0,
          count,
          blocked: mode === 'sample' ? sampleBlocked : 0,
          kept: Math.max(0, (m.total || 0) - count - (mode === 'sample' ? sampleBlocked : 0)),
          dependents: m.dependents || [],
          ...(MODULE_VISUALS[m.key] || { icon: 'database', tone: 'neutral' }),
          label: t(`reset_mod_${m.key}`),
          warning: WARNINGS[m.key] || null,
        };
      }),
    [modules, mode, t],
  );

  const selectable = cards.filter((c) => c.count > 0);

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
          className={`rs-mode ${mode === 'sample' ? 'is-on' : ''}`}
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
          className={`rs-mode rs-mode--danger ${mode === 'data' ? 'is-on' : ''}`}
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
            {selected.length ? ` (${selected.length})` : ''}
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
        <div className="rs-grid">
          {cards.map((card) => {
            const on = selected.includes(card.key);
            const disabled = card.count === 0;
            const depList = card.dependents
              .map((d) => `${t(`reset_mod_${d.key}`)} (${d.count})`)
              .join(' · ');
            return (
              <article
                key={card.key}
                className={`rs-card ${card.risk ? 'rs-card--risk' : ''} ${on ? 'is-on' : ''} ${disabled ? 'is-empty' : ''}`}
                onClick={() => !disabled && toggle(card.key)}
              >
                <div className="rs-card__top">
                  <span className={`rs-card__icon rs-tone--${card.tone}`} aria-hidden="true">
                    <Icon name={card.icon} size={18} />
                  </span>
                  <span className="rs-card__total" title={t('reset_total')}>
                    <Icon name="database" size={10} />
                    {card.total}
                  </span>
                  <button
                    type="button"
                    className="rs-tick"
                    aria-pressed={on}
                    aria-label={card.label}
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(card.key);
                    }}
                  >
                    {on ? <Icon name="check" size={13} /> : null}
                  </button>
                </div>

                <div className="rs-card__title">
                  <span className="rs-card__name">{card.label}</span>
                  {card.risk ? (
                    <span className="rs-card__badge">
                      <Icon name="alert" size={11} />
                      {t('reset_risk_badge')}
                    </span>
                  ) : null}
                </div>

                <p className="rs-card__desc">{t(`reset_mod_${card.key}_desc`)}</p>

                {card.risk && mode === 'data' ? <p className="rs-card__warn">{t('reset_risk_warning_data')}</p> : null}
                {card.warning && (card.count > 0 || card.blocked > 0) ? (
                  <p className="rs-card__warn">{t(card.warning)}</p>
                ) : null}
                {depList ? <p className="rs-card__dep">{t('reset_impact', { list: depList })}</p> : null}
                {card.blocked > 0 ? (
                  <p className="rs-card__warn">{t('reset_blocked_note', { count: card.blocked })}</p>
                ) : null}

                <div className="rs-card__foot">
                  <span className={`rs-count ${card.risk ? 'rs-count--risk' : ''}`}>
                    {mode === 'sample'
                      ? t('reset_sample_count', { count: card.count })
                      : t('reset_data_count', { count: card.count })}
                  </span>
                  {card.kept > 0 ? <span className="rs-kept">{t('reset_kept', { count: card.kept })}</span> : null}
                  <button
                    type="button"
                    className={`rs-reset ${card.risk || mode === 'data' ? 'rs-reset--risk' : ''}`}
                    disabled={disabled || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      openSingle(card.key);
                    }}
                  >
                    {mode === 'data' ? t('reset_action_delete') : t('reset_action')}
                  </button>
                </div>
              </article>
            );
          })}
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
