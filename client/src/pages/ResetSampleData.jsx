import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, Loading, useToast } from '../components/ui';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import ResetArtwork from '../components/reset/ResetArtwork';
import ResetConfirmModal from '../components/reset/ResetConfirmModal';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { get, post } from '../api';
import '../reset.css';

/*
 * Reset Sample Data.
 *
 * The page shows exactly what the server counts as removable sample data — one
 * card per module of lib/reset-modules.js — and never decides on its own what
 * may be deleted. Selecting cards only builds a request; every removal happens
 * behind a confirmation, inside one server transaction, scoped to this business
 * and to `is_sample = true`.
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
};

/** Modules whose reset needs a dependency warning before it runs. */
const WARNINGS = {
  tables: 'reset_dep_tables',
  promotions: 'reset_dep_promotions',
  products: 'reset_dep_products',
  categories: 'reset_dep_categories',
  staff: 'reset_dep_staff',
  suggestions: 'reset_dep_suggestions',
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
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const data = await get('/backups/reset-sample');
      setModules(data.modules || []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = useMemo(
    () =>
      (modules || []).map((m) => ({
        ...m,
        ...(MODULE_VISUALS[m.key] || { icon: 'database', tone: 'neutral' }),
        label: t(`reset_mod_${m.key}`),
        warning: WARNINGS[m.key] ? WARNINGS[m.key] : null,
        kept: Math.max(0, (m.total || 0) - (m.eligible || 0) - (m.blocked || 0)),
      })),
    [modules, t],
  );

  const selectable = cards.filter((c) => c.eligible > 0);

  const toggle = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const openBulk = () => setConfirm({ keys: selected, requestId: newRequestId() });
  const openSingle = (key) => setConfirm({ keys: [key], requestId: newRequestId() });

  const runReset = async ({ backup }) => {
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
      const data = await post('/backups/reset-sample', {
        modules: confirm.keys,
        request_id: confirm.requestId,
      });
      setResult(data);
      setModules(data.modules || []);
      setSelected((prev) => prev.filter((k) => !confirm.keys.includes(k)));
      setConfirm(null);
      if (data.removed > 0) toast.success(t('reset_done', { count: data.removed }));
      else toast.error(t('reset_nothing'));
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const resultRows = (result?.results || []).filter((r) => r.status !== 'empty');
  const resultLabels = useMemo(
    () => Object.fromEntries(cards.map((c) => [c.key, c.label])),
    [cards],
  );

  return (
    <div className="rs-page">
      <PageHeroBanner icon="trash" title={t('reset_title')} subtitle={t('reset_subtitle')} art={<ResetArtwork />} />

      <div className="rs-notice" role="note">
        <Icon name="shield" size={16} />
        <span>{t('reset_protected_notice')}</span>
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
            {t('reset_selected')}
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
                ? t('reset_done', { count: result.removed })
                : t('reset_nothing')}
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
            const disabled = card.eligible === 0;
            return (
              <article
                key={card.key}
                className={`rs-card ${card.risk ? 'rs-card--risk' : ''} ${on ? 'is-on' : ''} ${disabled ? 'is-empty' : ''}`}
                onClick={() => !disabled && toggle(card.key)}
              >
                <div className="rs-card__head">
                  <span className={`rs-card__icon rs-tone--${card.tone}`} aria-hidden="true">
                    <Icon name={card.icon} size={17} />
                  </span>
                  <span className="rs-card__name">{card.label}</span>
                  {card.risk ? (
                    <span className="rs-card__badge">
                      <Icon name="alert" size={11} />
                      {t('reset_risk_badge')}
                    </span>
                  ) : null}
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
                    {on ? <Icon name="check" size={12} /> : null}
                  </button>
                </div>

                <p className="rs-card__desc">{t(`reset_mod_${card.key}_desc`)}</p>

                {card.risk ? <p className="rs-card__warn">{t('reset_risk_warning')}</p> : null}
                {card.blocked > 0 ? (
                  <p className="rs-card__warn">{t('reset_blocked_note', { count: card.blocked })}</p>
                ) : null}

                <div className="rs-card__rule" />

                <div className="rs-card__foot">
                  <span className={`rs-count ${card.risk ? 'rs-count--risk' : ''}`}>
                    {t('reset_count', { count: card.eligible })}
                  </span>
                  {card.kept > 0 ? <span className="rs-kept">{t('reset_kept', { count: card.kept })}</span> : null}
                  <button
                    type="button"
                    className={`rs-reset ${card.risk ? 'rs-reset--risk' : ''}`}
                    disabled={disabled || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      openSingle(card.key);
                    }}
                  >
                    {t('reset_action')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {confirm ? (
        <ResetConfirmModal
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
