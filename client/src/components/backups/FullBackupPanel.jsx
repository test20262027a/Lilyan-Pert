import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';
import { categoryDesc, categoryLabel, categoryVisual } from './backupMeta';

/*
 * Full Backup panel: the mint header with the real create action, the coverage
 * notice, the thirteen descriptive category cards and the live record total.
 * The cards describe what a full archive contains — they are not selectable,
 * because a full backup always covers every section.
 */
export default function FullBackupPanel({ categories = [], sections = [], busy, onCreate }) {
  const { t, locale } = useI18n();

  // The live total of the modules a full archive would carry, from the server.
  const records = sections.reduce((sum, section) => sum + (section.record_count || 0), 0);

  return (
    <section className="bk-panel">
      <header className="bk-panel__head">
        <span className="bk-panel__ico">
          <Icon name="database" size={21} />
        </span>
        <div className="bk-panel__titles">
          <h2 className="bk-panel__title">
            {t('backup_full')}
            <span className="bk-badge">{fmtNumber(records, locale)}</span>
          </h2>
          <p className="bk-panel__sub">{t('backup_full_subtitle')}</p>
        </div>
        <button type="button" className="bk-btn bk-btn--green" onClick={onCreate} disabled={busy}>
          {busy ? <span className="bk-spin" /> : <Icon name="database" size={15} />}
          {t('backup_create_full')}
        </button>
      </header>

      <div className="bk-panel__body">
        <div className="bk-notice">
          <Icon name="layers" size={16} />
          <span>{t('backup_full_includes')}</span>
        </div>

        <div className="bk-cat-grid">
          {categories.map((category) => {
            const visual = categoryVisual(category.key);
            return (
              <article className="bk-cat" key={category.key}>
                <span className={`bk-ico bk-tone--${visual.tone}`} aria-hidden="true">
                  <Icon name={visual.icon} size={16} />
                </span>
                <div className="bk-cat__text">
                  <span className="bk-cat__name">{categoryLabel(t, category.key)}</span>
                  <span className="bk-cat__desc">{categoryDesc(t, category.key)}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="bk-warn" role="note">
          <Icon name="image" size={15} />
          <span>{t('backup_files_note')}</span>
        </div>
      </div>
    </section>
  );
}
