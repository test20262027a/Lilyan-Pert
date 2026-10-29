import { useMemo } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';
import { categoryLabel, categoryVisual, sectionLabel, sectionVisual } from './backupMeta';

/*
 * Section-by-section backup.
 *
 * Twelve cards, and every section inside a card is its own control: picking
 * "Products" never drags "Categories" along. The card's own tick is a shortcut
 * that selects or clears every section it holds and reports its real
 * state — empty, mixed or full — so the card always tells the truth about what
 * the archive will contain.
 */
export default function SelectiveBackupPanel({
  categories = [],
  sections = [],
  modules = [],
  selected = [],
  busy,
  onToggleSection,
  onToggleCategory,
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

  const moduleByKey = useMemo(() => new Map(modules.map((mod) => [mod.key, mod])), [modules]);

  /* A section can require another one's data (order history needs its orders).
     The server includes only those modules, and the page says so up front. */
  const requiredSections = useMemo(() => {
    const picked = new Set(selected);
    const extra = new Set();
    for (const section of sections) {
      if (!picked.has(section.key)) continue;
      for (const moduleKey of section.modules || []) {
        for (const dep of moduleByKey.get(moduleKey)?.dependencies || []) {
          const depSection = moduleByKey.get(dep)?.section;
          if (depSection && !picked.has(depSection)) extra.add(depSection);
        }
      }
    }
    return [...extra];
  }, [selected, sections, moduleByKey]);

  const count = selected.length;
  const allSelected = count > 0 && count === sections.length;

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

      <div className={`bk-sel-grid ${count ? 'is-selecting' : ''}`}>
        {categories.map((category) => {
          const cardSections = sectionsByCategory[category.key] || [];
          const picked = cardSections.filter((section) => selected.includes(section.key));
          const all = cardSections.length > 0 && picked.length === cardSections.length;
          const part = picked.length > 0 && !all;
          const visual = categoryVisual(category.key);
          const name = categoryLabel(t, category.key);
          return (
            <article
              key={category.key}
              className={`bk-sel-card ${all ? 'is-on' : ''} ${part ? 'is-partial' : ''}`}
            >
              <div className="bk-sel-card__top">
                <span className={`bk-ico bk-tone--${visual.tone}`} aria-hidden="true">
                  <Icon name={visual.icon} size={17} />
                </span>
                <button
                  type="button"
                  className={`bk-tick ${part ? 'is-partial' : ''}`}
                  role="checkbox"
                  aria-checked={all ? 'true' : part ? 'mixed' : 'false'}
                  aria-label={name}
                  title={name}
                  onClick={() => onToggleCategory?.(category.key)}
                >
                  {all ? <Icon name="check" size={13} /> : null}
                  {part ? <span className="bk-tick__dash" aria-hidden="true" /> : null}
                </button>
              </div>

              <span className="bk-sel-card__name">{name}</span>

              <div className="bk-sel-card__body" role="group" aria-label={name}>
                {cardSections.map((section) => {
                  const sectionStyle = sectionVisual(section.key);
                  const on = selected.includes(section.key);
                  const reference = section.restorable === false;
                  return (
                    <button
                      type="button"
                      key={section.key}
                      role="checkbox"
                      aria-checked={on}
                      className={`bk-chip bk-chip--choice ${on ? 'is-on' : ''} ${
                        reference ? 'bk-chip--ref' : ''
                      }`}
                      title={reference ? t('backup_ref_only') : sectionLabel(t, section.key)}
                      onClick={() => onToggleSection?.(section.key)}
                      disabled={busy}
                    >
                      <span className="bk-chip__box" aria-hidden="true">
                        {on ? <Icon name="check" size={9} /> : <Icon name={sectionStyle.icon} size={10} />}
                      </span>
                      <span className="bk-chip__label">{sectionLabel(t, section.key)}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {requiredSections.length ? (
        <p className="bk-depnote" role="note">
          <Icon name="alert" size={13} />
          <span>
            {t('backup_deps_included', {
              sections: requiredSections.map((key) => sectionLabel(t, key)).join(' · '),
            })}
          </span>
        </p>
      ) : null}
    </section>
  );
}
