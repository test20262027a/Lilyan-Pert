import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, ConfirmDialog, Loading, Modal, useToast } from '../components/ui';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import BackupArtwork from '../components/backups/BackupArtwork';
import FullBackupPanel from '../components/backups/FullBackupPanel';
import SelectiveBackupPanel from '../components/backups/SelectiveBackupPanel';
import BackupCard from '../components/backups/BackupCard';
import RestoreDialog from '../components/backups/RestoreDialog';
import { sectionLabel } from '../components/backups/backupMeta';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { del, get, getBusinessId, post } from '../api';
import { fmtNumber, zoneFor } from '../format';
import '../backups.css';

/*
 * Backup & Restore.
 *
 * The page never invents a backup: the server builds the archive, stores it and
 * returns its manifest with real record counts and the saved file size. A
 * restore is previewed by the server before it may run, and a delete only ever
 * removes the selected archive — never business data.
 */

const ERROR_KEYS = {
  CROSS_BUSINESS_RESTORE: 'backup_cross_business',
  INCOMPATIBLE_FORMAT: 'backup_incompatible',
  INTEGRITY_FAILED: 'backup_integrity_failed',
  BACKUP_TOO_LARGE: 'backup_too_large',
  NO_MODULES_SELECTED: 'backup_nothing_selected',
  INVALID_MANIFEST: 'backup_upload_invalid',
  INVALID_BACKUP_FILE: 'backup_upload_invalid',
  NO_KNOWN_MODULES: 'backup_upload_invalid',
  BACKUP_NOT_FOUND: 'backup_not_found',
};

export default function Backups() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const toast = useToast();
  const timeZone = zoneFor(locale, business?.timezone);

  const [registry, setRegistry] = useState(null);
  const [backups, setBackups] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [reg, list] = await Promise.all([get('/backups/modules'), get('/backups')]);
      setRegistry(reg);
      setBackups(list.backups || []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = registry?.categories || [];
  const sections = registry?.sections || [];
  const modules = registry?.modules || [];

  const created = useMemo(() => backups.filter((b) => b.backup_type !== 'uploaded'), [backups]);
  const uploaded = useMemo(() => backups.filter((b) => b.backup_type === 'uploaded'), [backups]);

  const errorText = (err) => t(ERROR_KEYS[err?.code] || 'error_generic');

  const createBackup = async (body) => {
    setBusy(true);
    try {
      await post('/backups', body);
      toast.success(t('backup_created'));
      if (body.mode === 'custom') setSelected([]);
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const download = async (backup) => {
    try {
      const headers = getBusinessId() ? { 'X-Business-Id': getBusinessId() } : {};
      const response = await fetch(`/api/backups/${backup.id}/download`, {
        credentials: 'include',
        headers,
      });
      if (!response.ok) throw new Error('DOWNLOAD_FAILED');
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = match ? match[1] : 'lilyan-backup.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('backup_download_failed'));
    }
  };

  const upload = async (file) => {
    setBusy(true);
    setUploadError(null);
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw Object.assign(new Error('INVALID_BACKUP_FILE'), { code: 'INVALID_BACKUP_FILE' });
      }
      const data = await post('/backups/upload', { file: parsed, name: file.name });
      if (data?.checksum_verified === false) setUploadError(t('backup_integrity_unverified'));
      toast.success(t('backup_uploaded_ok'));
      await load();
    } catch (err) {
      setUploadError(errorText(err));
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const restore = async ({ pre_restore_backup }) => {
    if (!restoreTarget) return;
    setBusy(true);
    try {
      const data = await post(`/backups/${restoreTarget.id}/restore`, {
        confirm: true,
        pre_restore_backup,
      });
      setResult(data);
      setRestoreTarget(null);
      toast.success(t('backup_restored'));
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await del(`/backups/${removeTarget.id}`);
      setRemoveTarget(null);
      toast.success(t('backup_deleted'));
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="bk-page">
      <PageHeroBanner
        icon="database"
        title={t('backup_title')}
        subtitle={t('backup_subtitle')}
        art={<BackupArtwork />}
      />

      {failed ? (
        <Alert kind="error">
          {t('error_generic')}{' '}
          <button type="button" className="btn btn--sm" onClick={load}>
            {t('action_retry')}
          </button>
        </Alert>
      ) : null}

      {loading && !registry ? <Loading /> : null}

      {registry ? (
        <>
          <FullBackupPanel
            categories={categories}
            sections={sections}
            busy={busy}
            onCreate={() => createBackup({ mode: 'full' })}
          />

          <SelectiveBackupPanel
            categories={categories}
            sections={sections}
            selected={selected}
            busy={busy}
            onToggle={toggle}
            onSelectAll={() => setSelected(categories.map((c) => c.key))}
            onClear={() => setSelected([])}
            onCreate={() => createBackup({ mode: 'custom', categories: selected })}
          />

          <section className="bk-panel">
            <header className="bk-panel__head">
              <span className="bk-panel__ico">
                <Icon name="history" size={21} />
              </span>
              <div className="bk-panel__titles">
                <h2 className="bk-panel__title">
                  {t('backup_history_title')}
                  <span className="bk-badge">
                    {fmtNumber(created.length, locale)} {t('backup_count_unit')}
                  </span>
                </h2>
                <p className="bk-panel__sub">{t('backup_history_subtitle')}</p>
              </div>
            </header>

            <div className="bk-panel__body">
              <div className="bk-subhead">
                <Icon name="database" size={14} />
                <span>{t('backup_created_list')}</span>
              </div>

              {created.length ? (
                <div className="bk-hist-grid">
                  {created.map((backup) => (
                    <BackupCard
                      key={backup.id}
                      backup={backup}
                      registryModules={modules}
                      registrySections={sections}
                      locale={locale}
                      timeZone={timeZone}
                      t={t}
                      busy={busy}
                      onDownload={() => download(backup)}
                      onRestore={() => setRestoreTarget(backup)}
                      onDelete={() => setRemoveTarget(backup)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bk-empty">{t('backup_no_backups')}</div>
              )}
            </div>
          </section>

          <section className="bk-panel">
            <header className="bk-panel__head">
              <span className="bk-panel__ico">
                <Icon name="folder" size={21} />
              </span>
              <div className="bk-panel__titles">
                <h2 className="bk-panel__title">
                  {t('backup_uploaded_list')}
                  <span className="bk-badge">
                    {fmtNumber(uploaded.length, locale)} {t('backup_count_unit')}
                  </span>
                </h2>
                <p className="bk-panel__sub">{t('backup_uploaded_subtitle')}</p>
              </div>
              <label className={`bk-btn bk-btn--green ${busy ? 'is-busy' : ''}`}>
                {busy ? <span className="bk-spin" /> : <Icon name="upload" size={15} />}
                {t('backup_upload')}
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) upload(file);
                  }}
                />
              </label>
            </header>

            <div className="bk-panel__body">
              {uploadError ? (
                <div className="bk-inline-error" role="alert">
                  <Icon name="alert" size={14} />
                  <span>{uploadError}</span>
                  <button
                    type="button"
                    className="bk-inline-error__close"
                    onClick={() => setUploadError(null)}
                    aria-label={t('action_close')}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              ) : null}

              {uploaded.length ? (
                <div className="bk-hist-grid">
                  {uploaded.map((backup) => (
                    <BackupCard
                      key={backup.id}
                      backup={backup}
                      registryModules={modules}
                      registrySections={sections}
                      locale={locale}
                      timeZone={timeZone}
                      t={t}
                      busy={busy}
                      onDownload={() => download(backup)}
                      onRestore={() => setRestoreTarget(backup)}
                      onDelete={() => setRemoveTarget(backup)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bk-empty bk-empty--dashed">
                  <Icon name="folder" size={15} />
                  <span>{t('backup_no_uploaded')}</span>
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}

      {removeTarget ? (
        <ConfirmDialog
          title={t('backup_delete_title')}
          message={`${t('backup_delete_body')} ${removeTarget.name}`}
          danger
          busy={busy}
          confirmLabel={t('action_delete')}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={remove}
        />
      ) : null}

      {restoreTarget ? (
        <RestoreDialog
          backup={restoreTarget}
          business={business}
          busy={busy}
          onCancel={() => setRestoreTarget(null)}
          onConfirm={restore}
        />
      ) : null}

      {result ? (
        <Modal
          title={t('backup_restore_summary')}
          onClose={() => setResult(null)}
          footer={
            <button type="button" className="btn btn--primary" onClick={() => setResult(null)}>
              {t('action_close')}
            </button>
          }
        >
          <div className="bk-result">
            <ul className="bk-result__list">
              {(result.summary || []).map((row) => (
                <li key={row.key}>
                  <span>{sectionLabel(t, row.section || row.key)}</span>
                  <span className={row.skipped ? 'is-warn' : 'is-ok'}>
                    {fmtNumber(row.restored, locale)}
                    {row.skipped ? ` · ${fmtNumber(row.skipped, locale)} ${t('backup_rows_skipped')}` : ''}
                  </span>
                </li>
              ))}
            </ul>

            {(result.skipped_sections || []).length ? (
              <p className="bk-result__note">{t('backup_restore_skipped')}</p>
            ) : null}
            {(result.warnings || []).length ? (
              <p className="bk-result__note">{t('backup_restore_relations')}</p>
            ) : null}
            {result.pre_restore_backup_id ? (
              <p className="bk-result__note bk-result__note--ok">{t('backup_restore_safety_created')}</p>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
