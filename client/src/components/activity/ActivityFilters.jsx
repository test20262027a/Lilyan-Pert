import Icon from '../Icon';
import { Select } from '../ui';
import { useI18n } from '../../i18n';
import { ENTITY_KEYS } from './activityMeta';

const KINDS = ['activity', 'order_status', 'print'];
const RANGES = ['today', 'yesterday', 'week', 'month', 'custom', 'all'];

/*
 * The activity search and filter panel.
 *
 * Every control writes straight into the page state, which is sent to the API —
 * the search runs over the whole authorized dataset on the server, never over
 * the rows already painted on screen. Heights are aligned so the row reads as a
 * single toolbar, and the panel collapses into stacked fields on narrow screens
 * without hiding the search field.
 */
export default function ActivityFilters({
  term,
  onTerm,
  kind,
  onKind,
  entity,
  onEntity,
  actor,
  onActor,
  range,
  onRange,
  from,
  onFrom,
  to,
  onTo,
  actors,
  entities,
  dirty,
  onClear,
}) {
  const { t } = useI18n();

  const entityOptions = [
    { value: 'all', label: t('act_any_section') },
    ...entities.map((value) => ({
      value,
      label: ENTITY_KEYS[value] ? t(ENTITY_KEYS[value]) : value,
    })),
  ];

  return (
    <section className="av-panel">
      <div className="av-search">
        <Icon name="search" size={17} className="av-search__icon" />
        <input
          type="search"
          className="av-search__input"
          value={term}
          onChange={(e) => onTerm(e.target.value)}
          placeholder={t('act_search_placeholder')}
          aria-label={t('act_search_placeholder')}
        />
        {term ? (
          <button type="button" className="av-search__clear" onClick={() => onTerm('')} aria-label={t('action_clear_all')}>
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>

      <div className="av-filters">
        <label className="av-field">
          <span className="av-field__label">{t('act_filter_kind')}</span>
          <Select
            value={kind}
            onChange={onKind}
            aria-label={t('act_filter_kind')}
            options={[
              { value: 'all', label: t('act_kind_all') },
              ...KINDS.map((k) => ({ value: k, label: t(`act_kind_${k}`) })),
            ]}
          />
        </label>

        <label className="av-field">
          <span className="av-field__label">{t('act_filter_entity')}</span>
          <Select value={entity} onChange={onEntity} aria-label={t('act_filter_entity')} options={entityOptions} />
        </label>

        <label className="av-field">
          <span className="av-field__label">{t('act_filter_range')}</span>
          <Select
            value={range}
            onChange={onRange}
            aria-label={t('act_filter_range')}
            options={RANGES.map((r) => ({ value: r, label: t(`act_range_${r}`) }))}
          />
        </label>

        <label className="av-field">
          <span className="av-field__label">{t('act_filter_actor')}</span>
          <Select
            value={actor}
            onChange={onActor}
            aria-label={t('act_filter_actor')}
            options={[
              { value: 'all', label: t('act_any_actor') },
              ...actors.map((a) => ({ value: a.id, label: a.name || a.id })),
            ]}
          />
        </label>

        {range === 'custom' ? (
          <>
            <label className="av-field">
              <span className="av-field__label">{t('act_filter_from')}</span>
              <input className="input" type="date" value={from} onChange={(e) => onFrom(e.target.value)} />
            </label>
            <label className="av-field">
              <span className="av-field__label">{t('act_filter_to')}</span>
              <input className="input" type="date" value={to} onChange={(e) => onTo(e.target.value)} />
            </label>
          </>
        ) : null}

        <button type="button" className="av-clear" onClick={onClear} disabled={!dirty}>
          <Icon name="refresh" size={14} />
          {t('act_clear_filters')}
        </button>
      </div>
    </section>
  );
}
