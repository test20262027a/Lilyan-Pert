import { useMemo } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';
import { categoryLabel, categoryVisual, sectionLabel, sectionVisual } from './backupMeta';

/*
 * Section-by-section backup: twelve selectable cards, each listing the manifest
 * sections it covers. Selecting a card selects every section inside it — the
 * chips are labels, not controls, because the API takes whole cards.
 */
export default function SelectiveBackupPanel({
  categories = [],
  sections = [],
  selected = [],
  busy,
  onToggle,
  onSelectAll,
  onClear,
  onCreate,
}) {
  const { t, locale } = useI18n();

  const sectionsByCategory = useMemo(() => {
    const map = {};
    for (const section of sections) {
      (map[section.category] ||= []).push(section);
    }
    return map;
  }, [sections]);

  const count = selected.length;
  const selectable = categories.length;
  const allSelected = count > 0 && count === selectable;

  return (
    <section className="bk-panel">
      <header className="bk-panel__head bk-panel__head--split">
        <div className="bk-panel__lead">
          <span className="bk-panel__ico">
            <Icon name="layers" size={21} />
          </span>
          <div className="bk-panel__titles">
            <h2 className="bk-panel__title">
              {t('backup_custom')}
              <span className={`bk-badge ${count ? 'bk-badge--on' : ''}`}>
                {fmtNumber(count, locale)} {t('backup_section_unit')}
              </span>
            </h2>
            <p className="bk-panel__sub">{t('backup_selective_subtitle')}</p>
          </div>
        </div>

        <div className="bk-toolbar">
          <button
            type="button"
            className="bk-btn bk-btn--ghost"
            onClick={onClear}
            disabled={!count || busy}
          >
            <Icon name="close" size={13} />
            {t('action_clear_all')}
          </button>
          <button
            type="button"
            className="bk-btn bk-btn--ghost"
            onClick={onSelectAll}
            disabled={allSelected || busy}
          >
            <Icon name="check" size={13} />
            {t('action_select_all')}
          </button>
          <button
            type="button"
            className="bk-btn bk-btn--green"
            onClick={onCreate}
            disabled={!count || busy}
          >
            {busy ? <span className="bk-spin" /> : <Icon name="database" size={15} />}
            {t('backup_create_selected')}
          </button>
        </div>
      </header>

      <div className="bk-sel-grid">
        {categories.map((category) => {
          const on = selected.includes(category.key);
          const visual = categoryVisual(category.key);
          return (
            <article
              key={category.key}
              className={`bk-sel-card ${on ? 'is-on' : ''}`}
              onClick={() => onToggle(category.key)}
            >
              <div className="bk-sel-card__top">
                <span className={`bk-ico bk-tone--${visual.tone}`} aria-hidden="true">
                  <Icon name={visual.icon} size={17} />
                </span>
                <button
                  type="button"
                  className="bk-tick"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={categoryLabel(t, category.key)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(category.key);
                  }}
                >
                  {on ? <Icon name="check" size={13} /> : null}
                </button>
              </div>

              <span className="bk-sel-card__name">{categoryLabel(t, category.key)}</span>

              <div className="bk-sel-card__body">
                {(sectionsByCategory[category.key] || []).map((section) => {
                  const sectionStyle = sectionVisual(section.key);
                  return (
                    <span
                      className={`bk-chip ${section.restorable === false ? 'bk-chip--ref' : ''}`}
                      key={section.key}
                      title={section.restorable === false ? t('backup_ref_only') : undefined}
                    >
                      <Icon name={sectionStyle.icon} size={11} />
                      {sectionLabel(t, section.key)}
                      {on ? <Icon name="check" size={11} className="bk-chip__tick" /> : null}
                    </span>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
