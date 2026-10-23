import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { Modal, Switch } from '../ui';
import ModalActions from '../ModalActions';
import { useI18n } from '../../i18n';
import { get } from '../../api';
import { fmtDateTime, fmtNumber, zoneFor } from '../../format';
import { archiveSize, categoryLabel, sectionLabel, sectionVisual } from './backupMeta';

/*
 * Restore confirmation. Nothing here decides whether a restore may run: the
 * server's read-only `/verify` answers first and this dialog only presents it.
 * The restore stays disabled until the archive validates and the overwrite is
 * explicitly acknowledged.
 */

const CHECKS = [
  { key: 'readable', label: 'backup_check_readable' },
  { key: 'has_manifest', label: 'backup_check_manifest' },
  { key: 'format_ok', label: 'backup_check_format' },
  { key: 'business_match', label: 'backup_check_business' },
  { key: 'integrity', label: 'backup_check_integrity' },
];

const WARNINGS = {
  format: 'backup_warn_format',
  business: 'backup_warn_business',
  integrity: 'backup_warn_integrity',
  reference_only: 'backup_warn_reference_only',
};

export default function RestoreDialog({ backup, business, busy, onCancel, onConfirm }) {
  const { t, locale } = useI18n();
  const timeZone = zoneFor(locale, business?.timezone);

  const [preview, setPreview] = useState(null);
  const [failed, setFailed] = useState(false);
  const [ack, setAck] = useState(false);
  const [safety, setSafety] = useState(true);

  useEffect(() => {
    let live = true;
    setPreview(null);
    setFailed(false);
    get(`/backups/${backup.id}/verify`)
      .then((data) => live && setPreview(data))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [backup.id]);

  const sections = preview?.sections || [];
  const replaceTotal = (preview?.replaces || []).reduce((sum, row) => sum + (row.existing || 0), 0);
  const valid = Boolean(preview?.valid) && !failed;
  const media = preview?.media;

  return (
    <Modal
      title={t('backup_restore_preview')}
      subtitle={preview?.name || backup.name}
      onClose={onCancel}
      wide
      footer={
        <ModalActions
          primaryLabel={t('backup_restore_start')}
          primaryVariant="danger"
          primaryIcon="refresh"
          onPrimary={() => onConfirm({ pre_restore_backup: safety })}
          loading={busy}
          primaryDisabled={!valid || !ack}
          secondaryLabel={t('action_cancel')}
          onSecondary={onCancel}
          secondaryDisabled={busy}
        />
      }
    >
      {failed ? (
        <p className="bk-dialog__error">{t('error_generic')}</p>
      ) : !preview ? (
        <p className="bk-dialog__loading">
          <span className="spinner" /> {t('backup_verify_loading')}
        </p>
      ) : (
        <div className="bk-dialog">
          <div className="bk-verify">
            {CHECKS.map((check) => {
              const value = preview.checks?.[check.key];
              const state = value === true ? 'ok' : value === false ? 'bad' : 'skip';
              return (
                <span className={`bk-verify__item bk-verify__item--${state}`} key={check.key}>
                  <Icon name={state === 'bad' ? 'alert' : state === 'ok' ? 'check' : 'info'} size={12} />
                  {t(check.label)}
                </span>
              );
            })}
          </div>

          {!valid ? <p className="bk-dialog__error">{t('backup_restore_invalid')}</p> : null}

          <div className="bk-summary">
            <div className="bk-summary__row">
              <span>{t('backup_type_label')}</span>
              <strong>
                {backup.backup_type === 'full'
                  ? t('backup_type_full')
                  : backup.backup_type === 'custom'
                    ? t('backup_type_selective')
                    : t('backup_type_uploaded')}
              </strong>
            </div>
            <div className="bk-summary__row">
              <span>{t('backup_created_on')}</span>
              <strong>{fmtDateTime(preview.created_at, locale, timeZone)}</strong>
            </div>
            <div className="bk-summary__row">
              <span>{t('backup_size')}</span>
              <strong>{archiveSize(preview.size_bytes, locale)}</strong>
            </div>
            <div className="bk-summary__row">
              <span>{t('backup_restore_target')}</span>
              <strong>{business?.name || '—'}</strong>
            </div>
            <div className="bk-summary__row">
              <span>{t('backup_format')}</span>
              <strong>
                {preview.format_version || '—'}
                {preview.schema_version ? ` · ${preview.schema_version}` : ''}
              </strong>
            </div>
            <div className="bk-summary__row">
              <span>{t('backup_restore_replaces')}</span>
              <strong>
                {fmtNumber(replaceTotal, locale)} {t('backup_records')}
              </strong>
            </div>
          </div>

          <div className="bk-dialog__block">
            <div className="bk-dialog__blockhead">
              <Icon name="database" size={14} />
              {t('backup_sections')}
              <span className="bk-badge">
                {fmtNumber(sections.length, locale)} {t('backup_section_unit')}
              </span>
            </div>
            <div className="bk-dialog__chips">
              {sections.map((section) => {
                const visual = sectionVisual(section.key);
                return (
                  <span
                    className={`bk-sec-chip ${section.restorable === false ? 'bk-sec-chip--ref' : ''}`}
                    key={section.key}
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
            <div className="bk-dialog__hint">{t('backup_restore_protected_note')}</div>
          </div>

          {(preview.warnings || []).length ? (
            <div className="bk-dialog__warnings">
              {preview.warnings.map((warning) => (
                <p key={warning}>
                  <Icon name="alert" size={13} />
                  {t(WARNINGS[warning] || 'backup_warn_reference_only')}
                </p>
              ))}
            </div>
          ) : null}

          {media && media.references > 0 ? (
            <div className="bk-dialog__warnings bk-dialog__warnings--soft">
              <p>
                <Icon name="image" size={13} />
                {media.missing_local > 0
                  ? t('backup_warn_media', { count: fmtNumber(media.missing_local, locale) })
                  : t('backup_media_note', { count: fmtNumber(media.references, locale) })}
              </p>
              {media.external_unverified > 0 ? (
                <p>
                  <Icon name="link" size={13} />
                  {t('backup_warn_external_media', {
                    count: fmtNumber(media.external_unverified, locale),
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="bk-dialog__options">
            <Switch
              checked={safety}
              onChange={setSafety}
              label={t('backup_restore_safety')}
              ariaLabel={t('backup_restore_safety')}
            />
            <label className={`bk-ack ${ack ? 'is-on' : ''}`}>
              <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} />
              <span>{t('backup_restore_ack')}</span>
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
