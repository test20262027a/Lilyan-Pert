import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, EmptyState, Loading, SectionCard, Select, StatusBadge, useToast } from '../components/ui';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { get } from '../api';
import { fmtDateTime, fmtNumber, zoneFor } from '../format';

/*
 * Activity Reports.
 *
 * One feed of three real audit streams the API merges for this business:
 * authorized admin changes (`activity_log`), every order status change
 * (`order_status_history`) and every receipt print (`receipt_prints`). Nothing
 * is back-filled or invented — the rows are the records the business itself
 * produced, and every filter below is applied server-side.
 */

const KINDS = ['activity', 'order_status', 'print'];

/* Entity labels reuse the module names the backup picker already translates. */
const ENTITY_KEYS = {
  category: 'module_menu_categories',
  product: 'module_menu_products',
  table: 'module_tables',
  promotion: 'module_promotions',
  ad: 'module_advertisements',
  review: 'module_reviews',
  user: 'nav_users',
  settings: 'module_business_settings',
  backup: 'backup_title',
  reset: 'backup_reset_sample',
  order: 'module_orders',
  print: 'module_receipt_prints',
};

const PAGE = 25;

export default function ActivityReports() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const toast = useToast();
  const timeZone = zoneFor(locale, business?.timezone);

  const [kind, setKind] = useState('all');
  const [entity, setEntity] = useState('all');
  const [actor, setActor] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (offset) => {
      if (offset === 0) setLoading(true);
      else setMore(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
        if (kind !== 'all') params.set('kind', kind);
        if (entity !== 'all') params.set('entity', entity);
        if (actor !== 'all') params.set('actor', actor);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const res = await get(`/activity?${params.toString()}`);
        setEntries((previous) => (offset === 0 ? res.entries || [] : [...previous, ...(res.entries || [])]));
        setTotal(res.total || 0);
        setActors(res.actors || []);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
        setMore(false);
      }
    },
    [kind, entity, actor, from, to],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const clearFilters = () => {
    setKind('all');
    setEntity('all');
    setActor('all');
    setFrom('');
    setTo('');
  };

  const entityLabel = (value) => t(ENTITY_KEYS[value] || value);

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('act_title')}</h1>
          <p>{t('act_subtitle')}</p>
        </div>
      </div>

      {failed ? (
        <Alert kind="error">
          {t('state_error')}{' '}
          <button type="button" className="btn btn--sm" onClick={() => load(0)}>
            {t('action_retry')}
          </button>
        </Alert>
      ) : null}

      <SectionCard
        icon="history"
        iconClass="ic-indigo"
        title={t('act_title')}
        subtitle={`${fmtNumber(total, locale)} ${t('label_records')}`}
        actions={
          <button className="btn btn--sm" onClick={clearFilters}>
            <Icon name="refresh" size={14} />
            {t('action_clear_all')}
          </button>
        }
      >
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <Select
            value={kind}
            onChange={setKind}
            aria-label={t('act_filter_kind')}
            options={[
              { value: 'all', label: `${t('act_filter_kind')}: ${t('label_all')}` },
              ...KINDS.map((k) => ({ value: k, label: t(`act_kind_${k}`) })),
            ]}
          />
          <Select
            value={entity}
            onChange={setEntity}
            aria-label={t('act_filter_entity')}
            options={[
              { value: 'all', label: `${t('act_filter_entity')}: ${t('label_all')}` },
              ...Object.keys(ENTITY_KEYS).map((e) => ({ value: e, label: entityLabel(e) })),
            ]}
          />
          <Select
            value={actor}
            onChange={setActor}
            aria-label={t('act_filter_actor')}
            options={[
              { value: 'all', label: `${t('act_filter_actor')}: ${t('label_all')}` },
              ...actors.map((a) => ({ value: a.id, label: a.name || a.id })),
            ]}
          />
          <label className="field">
            <span className="field__label">{t('act_filter_from')}</span>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">{t('act_filter_to')}</span>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <Loading />
        ) : entries.length === 0 ? (
          <EmptyState icon="history" title={t('act_empty')} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t('label_date')}</th>
                    <th>{t('order_changed_by')}</th>
                    <th>{t('act_filter_kind')}</th>
                    <th>{t('act_detail')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr key={`${row.kind}-${row.id}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(row.at, locale, timeZone)}</td>
                      <td>{row.actor_name || '—'}</td>
                      <td>
                        <span className="chip">
                          <Icon
                            name={row.kind === 'print' ? 'print' : row.kind === 'order_status' ? 'cart' : 'pencil'}
                            size={12}
                          />
                          {t(`act_kind_${row.kind}`)}
                        </span>
                      </td>
                      <td>
                        {row.kind === 'order_status' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {row.from_status ? <StatusBadge status={row.from_status} /> : null}
                            <Icon name="arrowRight" size={13} className="icon--dir" />
                            <StatusBadge status={row.to_status} />
                            {row.order_number ? <span className="chip">#{row.order_number}</span> : null}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <strong>{entityLabel(row.entity)}</strong>
                            <span>{t(`act_action_${row.action}`)}</span>
                            {row.entity_label ? <span className="chip">{row.entity_label}</span> : null}
                            {row.order_number ? <span className="chip">#{row.order_number}</span> : null}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="btn-row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {t('act_showing', { shown: fmtNumber(entries.length, locale), total: fmtNumber(total, locale) })}
              </span>
              {entries.length < total ? (
                <button className="btn btn--sm" disabled={more} onClick={() => load(entries.length)}>
                  {more ? <span className="spinner" /> : <Icon name="chevronDown" size={14} />}
                  {t('order_load_more')}
                </button>
              ) : null}
            </div>
          </>
        )}
      </SectionCard>
    </>
  );
}
