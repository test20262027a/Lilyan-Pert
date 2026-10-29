import Icon from '../Icon';
import {
  archiveSize,
  backupName,
  initialsOf,
  isReferenceOnly,
  manifestSections,
  sectionLabel,
  sectionVisual,
} from './backupMeta';
import { fmtDateTime, fmtNumber } from '../../format';

/*
 * One saved archive. Every value is read from the stored row and its manifest:
 * the type, the status, the creator, the real file size and the record count of
 * every section that was actually exported.
 */

const TYPE_BADGE = {
  full: { key: 'backup_type_full', tone: 'green' },
  custom: { key: 'backup_type_selective', tone: 'violet' },
  uploaded: { key: 'backup_type_uploaded', tone: 'blue' },
};

const STATUS_BADGE = {
  ready: { key: 'backup_status_ready', tone: 'ok' },
  restored: { key: 'backup_status_restored', tone: 'neutral' },
  failed: { key: 'backup_status_failed', tone: 'bad' },
};

export default function BackupCard({
  backup,
  registryModules = [],
  registrySections = [],
  locale,
  timeZone,
  t,
  busy,
  onRestore,
  onDownload,
  onDelete,
}) {
  const manifest = backup.manifest || {};
  const type = TYPE_BADGE[backup.backup_type] || TYPE_BADGE.uploaded;
  const status = STATUS_BADGE[backup.status] || STATUS_BADGE.ready;
  const sections = manifestSections(manifest, registryModules);
  const displayName = backupName(backup, t);
  const creator = backup.created_by_name || manifest.uploaded_by_name || manifest.created_by_name;
  const creatorRole = backup.creator_role ? t(`role_${backup.creator_role}`) : t('role_owner');
  const checksumOk = manifest.checksum ? manifest.checksum_verified !== false : null;

  return (
    <article className="bk-card">
      <header className="bk-card__head">
        <div className="bk-card__heading">
          <div className="bk-card__badges">
            <span className={`bk-pill bk-pill--${type.tone}`}>{t(type.key)}</span>
            <span className={`bk-status bk-status--${status.tone}`}>
              <i aria-hidden="true" />
              {t(status.key)}
            </span>
            {backup.backup_type === 'uploaded' && checksumOk ? (
              <span className="bk-status bk-status--ok">
                <i aria-hidden="true" />
                {t('backup_checksum_ok')}
              </span>
            ) : null}
          </div>
          <h3 className="bk-card__name">{t('backup_card_title', { name: displayName })}</h3>
        </div>

        <button
          type="button"
          className="bk-trash"
          onClick={onDelete}
          disabled={busy}
          title={t('backup_delete_title')}
          aria-label={t('backup_delete_title')}
        >
          <Icon name="trash" size={15} />
        </button>
      </header>

      <div className="bk-card__meta">
        <span className="bk-avatar" aria-hidden="true">{initialsOf(creator)}</span>
        <span className="bk-card__creator">
          <strong>{creator || '—'}</strong>
          <span>{creatorRole}</span>
        </span>
        <span className="bk-card__date">
          <Icon name="clock" size={12} />
          {fmtDateTime(backup.created_at, locale, timeZone)}
        </span>
      </div>

      <div className="bk-sections">
        <div className="bk-sections__head">
          <Icon name="database" size={14} />
          <span className="bk-sections__title">{t('backup_sections')}</span>
          <span className="bk-sections__tag">
            {fmtNumber(sections.length, locale)} {t('backup_section_unit')}
          </span>
          <span className="bk-sections__tag bk-sections__tag--size">
            {archiveSize(backup.size_bytes, locale)}
          </span>
        </div>

        <div className="bk-sections__chips">
          {sections.map((section) => {
            const visual = sectionVisual(section.key);
            const referenceOnly = isReferenceOnly(section, registrySections);
            return (
              <span
                key={section.key}
                className={`bk-sec-chip ${referenceOnly ? 'bk-sec-chip--ref' : ''}`}
                title={referenceOnly ? t('backup_ref_only') : undefined}
              >
                <Icon name={visual.icon} size={11} />
                <span className="bk-sec-chip__label">{sectionLabel(t, section.key)}</span>
                <span className="bk-sec-chip__count">
                  {fmtNumber(section.record_count || 0, locale)}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <footer className="bk-card__foot">
        <button type="button" className="bk-btn bk-btn--green" onClick={onRestore} disabled={busy}>
          <Icon name="refresh" size={14} />
          {t('backup_restore')}
        </button>
        <button type="button" className="bk-btn bk-btn--ghost" onClick={onDownload} disabled={busy}>
          <Icon name="download" size={14} />
          {t('action_download')}
        </button>
      </footer>
    </article>
  );
}
