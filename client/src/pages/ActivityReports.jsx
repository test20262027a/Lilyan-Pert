import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, EmptyState, useToast } from '../components/ui';
import DeleteConfirmationDialog from '../components/confirm/DeleteConfirmationDialog';
import { ENTITY_KEYS } from '../components/activity/activityMeta';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import ActivityArtwork from '../components/activity/ActivityArtwork';
import ActivityFilters from '../components/activity/ActivityFilters';
import ActivityCard from '../components/activity/ActivityCard';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { del, get } from '../api';
import { fmtNumber, zoneFor } from '../format';
import '../menu.css';
import '../activity.css';

/*
 * Activity Reports.
 *
 * One feed of three real audit streams the API merges for this business:
 * authorized admin changes (`activity_log`), every order status change
 * (`order_status_history`) and every receipt print (`receipt_prints`). Nothing
 * is back-filled or invented — the rows are the records the business itself
 * produced, and the search, module, type, member and date filters are all
 * resolved by the API over the whole dataset, not over the rendered page.
 *
 * Removing a row archives it from this report only (`activity_hidden`); the
 * authoritative audit record stays in place, and protected streams are never
 * offered for removal.
 */

const PAGE = 20;
const DEBOUNCE = 320;

export default function ActivityReports() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const timeZone = zoneFor(locale, business?.timezone);

  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [entity, setEntity] = useState('all');
  const [actor, setActor] = useState('all');
  const [range, setRange] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [actors, setActors] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);

  /* Typing stays instant; the request only follows once the term settles. */
  useEffect(() => {
    const id = setTimeout(() => setQuery(term.trim()), DEBOUNCE);
    return () => clearTimeout(id);
  }, [term]);

  const load = useCallback(
    async (offset, { silent = false } = {}) => {
      if (offset === 0 && !silent) setLoading(true);
      if (offset > 0) setMore(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset), range });
        if (query) params.set('q', query);
        if (kind !== 'all') params.set('kind', kind);
        if (entity !== 'all') params.set('entity', entity);
        if (actor !== 'all') params.set('actor', actor);
        if (range === 'custom') {
          if (from) params.set('from', from);
          if (to) params.set('to', to);
        }

        const res = await get(`/activity?${params.toString()}`);
        setEntries((previous) => (offset === 0 ? res.entries || [] : [...previous, ...(res.entries || [])]));
        setTotal(Number(res.total) || 0);
        setActors(res.actors || []);
        setEntities(res.entities || []);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
        setMore(false);
      }
    },
    [query, kind, entity, actor, range, from, to],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const dirty =
    term.trim() !== '' || kind !== 'all' || entity !== 'all' || actor !== 'all' || range !== 'all';

  const clearFilters = () => {
    setTerm('');
    setQuery('');
    setKind('all');
    setEntity('all');
    setActor('all');
    setRange('all');
    setFrom('');
    setTo('');
  };

  const remove = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await del(`/activity/${pending.kind}/${pending.id}`);
      setPending(null);
      await load(0, { silent: true });
      toast.success(t('act_deleted'));
    } catch (err) {
      toast.error(err?.code === 'ACTIVITY_PROTECTED' ? t('act_protected_hint') : t('act_delete_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="activity-page">
      <PageHeroBanner
        icon="history"
        title={t('act_title')}
        subtitle={t('act_subtitle')}
        art={<ActivityArtwork />}
      />

      {!isManager ? <Alert kind="warning">{t('act_no_permission')}</Alert> : null}

      <ActivityFilters
        term={term}
        onTerm={setTerm}
        kind={kind}
        onKind={setKind}
        entity={entity}
        onEntity={setEntity}
        actor={actor}
        onActor={setActor}
        range={range}
        onRange={setRange}
        from={from}
        onFrom={setFrom}
        to={to}
        onTo={setTo}
        actors={actors}
        entities={entities}
        dirty={dirty}
        onClear={clearFilters}
      />

      <div className="av-head">
        <span className="av-head__icon">
          <Icon name="history" size={16} />
        </span>
        <h2 className="av-head__title">{t('act_list_title')}</h2>
        {!loading && !failed ? (
          <span className="av-count">{t('act_count', { count: fmtNumber(total, locale) })}</span>
        ) : null}
      </div>

      {failed ? (
        <Alert kind="error">
          {t('act_load_error')}{' '}
          <button type="button" className="btn btn--sm" onClick={() => load(0)}>
            {t('action_retry')}
          </button>
        </Alert>
      ) : loading ? (
        <div className="av-list" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((row) => (
            <div className="av-card av-card--skeleton" key={row}>
              <span className="av-skel av-skel--icon" />
              <div className="av-card__body">
                <span className="av-skel" style={{ width: '38%', height: 13 }} />
                <span className="av-skel" style={{ width: '64%', height: 11, marginTop: 9 }} />
                <span className="av-skel" style={{ width: '46%', height: 10, marginTop: 10 }} />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="av-empty">
          <EmptyState
            icon="history"
            title={dirty ? t('act_empty_filtered') : t('act_empty')}
            hint={dirty ? t('act_empty_hint') : undefined}
            action={
              dirty ? (
                <button type="button" className="btn btn--sm" onClick={clearFilters}>
                  <Icon name="refresh" size={14} />
                  {t('act_clear_filters')}
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <>
          <div className="av-list">
            {entries.map((row) => (
              <ActivityCard
                key={`${row.kind}-${row.id}`}
                row={row}
                locale={locale}
                timeZone={timeZone}
                canManage={isManager}
                busy={busy}
                onDelete={setPending}
              />
            ))}
          </div>

          {entries.length < total ? (
            <button type="button" className="av-more" disabled={more} onClick={() => load(entries.length)}>
              {more ? <span className="spinner" /> : <Icon name="chevronDown" size={14} />}
              {t('act_load_more')}
            </button>
          ) : null}
        </>
      )}

      {pending ? (
        <DeleteConfirmationDialog
          entityType="activity"
          entityName={
            pending.entity_label ||
            (pending.order_number
              ? t('act_order_ref', { number: pending.order_number })
              : `#${String(pending.id).slice(0, 8)}`)
          }
          entitySubtitle={`${ENTITY_KEYS[pending.entity] ? t(ENTITY_KEYS[pending.entity]) : pending.entity} · ${
            pending.actor_name || t('act_actor_system')
          }`}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
