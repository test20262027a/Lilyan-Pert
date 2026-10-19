import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import {
  Alert,
  Badge,
  ConfirmDialog,
  EmptyState,
  Loading,
  Marker,
  Modal,
  SectionCard,
  useToast,
} from '../components/ui';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { del, get, post } from '../api';
import { fmtBytes, fmtDateTime, fmtNumber, zoneFor } from '../format';

const DANGER_GROUPS = ['orders', 'backups'];
const RESET_GROUPS = ['menu', 'orders', 'operations', 'marketing', 'analytics', 'backups'];

const RESET_META = {
  menu: { icon: 'book', danger: false },
  orders: { icon: 'receipt', danger: true },
  operations: { icon: 'table', danger: false },
  marketing: { icon: 'megaphone', danger: false },
  analytics: { icon: 'chart', danger: false },
  backups: { icon: 'database', danger: true },
};

export default function Backups() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { isOwner } = useAuth();
  const toast = useToast();
  const timeZone = zoneFor(locale, business?.timezone);

  const [registry, setRegistry] = useState(null);
  const [backups, setBackups] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const [resetGroups, setResetGroups] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reg, list] = await Promise.all([get('/backups/modules'), get('/backups')]);
      setRegistry(reg);
      setBackups(list.backups || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const modules = registry?.modules || [];
  const groups = registry?.groups || [];
  const created = backups.filter((b) => b.backup_type !== 'uploaded');
  const uploaded = backups.filter((b) => b.backup_type === 'uploaded');

  const byGroup = useMemo(() => {
    const map = {};
    for (const g of groups) map[g.key] = modules.filter((m) => m.group === g.key);
    return map;
  }, [groups, modules]);

  const createFull = async () => {
    setBusy(true);
    try {
      await post('/backups', { mode: 'full' });
      toast.success(t('backup_created'));
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const createCustom = async () => {
    setBusy(true);
    try {
      await post('/backups', { mode: 'custom', modules: selected });
      toast.success(t('backup_created'));
      setSelected([]);
      await load();
    } catch (err) {
      toast.error(err.code === 'NO_MODULES_SELECTED' ? t('backup_selected_count') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file) => {
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await post('/backups/upload', { file: parsed, name: file.name });
      toast.success(t('backup_created'));
      await load();
    } catch (err) {
      const map = {
        CROSS_BUSINESS_RESTORE: t('backup_cross_business'),
        INCOMPATIBLE_FORMAT: t('backup_incompatible'),
        INVALID_MANIFEST: t('error_generic'),
        INVALID_BACKUP_FILE: t('error_generic'),
      };
      toast.error(map[err.code] || t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async (id) => {
    setBusy(true);
    try {
      const res = await post(`/backups/${id}/restore`, {});
      setRestoreResult(res);
      toast.success(t('backup_restored'));
      setConfirm(null);
      await load();
    } catch (err) {
      const map = {
        CROSS_BUSINESS_RESTORE: t('backup_cross_business'),
        INCOMPATIBLE_FORMAT: t('backup_incompatible'),
      };
      toast.error(map[err.code] || t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await del(`/backups/${id}`);
      setConfirm(null);
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const resetSample = async () => {
    setBusy(true);
    try {
      const res = await post('/backups/reset-sample', { groups: resetGroups });
      const kept = res.still_present || {};
      toast.success(
        `${t('backup_reset_done')} · ${t('role_owner')}: ${kept.owners ?? '—'} · ${t('sec_general')}: ${kept.business ?? '—'}`,
      );
      setConfirm(null);
      setResetGroups([]);
      await load();
    } catch (err) {
      toast.error(err.code === 'NO_GROUPS_SELECTED' ? t('backup_selected_count') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !registry) return <Loading />;

  if (!isOwner) {
    return (
      <>
        <div className="page-head">
          <div className="page-head__text">
            <h1>{t('backup_title')}</h1>
            <p>{t('backup_subtitle')}</p>
          </div>
        </div>
        <Alert kind="warning">{t('user_view_only')}</Alert>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('backup_title')}</h1>
          <p>{t('backup_subtitle')}</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--primary" onClick={createFull} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="database" size={16} />}
            {t('backup_full')}
          </button>
        </div>
      </div>

      <Alert kind="info" icon="shield">
        {t('backup_excluded')} · {t('backup_format')} {registry?.format_version} · {registry?.schema_version}
      </Alert>

      <SectionCard
        icon="layers"
        iconClass="ic-indigo"
        title={t('backup_custom')}
        subtitle={t('backup_full_hint')}
        actions={
          <>
            <button className="btn btn--sm" onClick={() => setSelected(modules.map((m) => m.key))}>
              {t('action_select_all')}
            </button>
            <button className="btn btn--sm" onClick={() => setSelected([])}>
              {t('action_clear_all')}
            </button>
            <button className="btn btn--primary btn--sm" onClick={createCustom} disabled={busy || selected.length === 0}>
              <Icon name="check" size={15} />
              {t('backup_create_selected')} ({selected.length})
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map((g) => {
            const groupModules = byGroup[g.key] || [];
            if (!groupModules.length) return null;
            const allOn = groupModules.every((m) => selected.includes(m.key));
            const someOn = groupModules.some((m) => selected.includes(m.key));
            return (
              <div key={g.key}>
                {/* Group header marker selects/deselects every module in the group. */}
                <button
                  className={`select-card ${someOn ? 'is-selected' : ''} ${DANGER_GROUPS.includes(g.key) ? 'is-danger' : ''}`}
                  style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                  onClick={() =>
                    setSelected((prev) =>
                      allOn
                        ? prev.filter((k) => !groupModules.some((m) => m.key === k))
                        : [...new Set([...prev, ...groupModules.map((m) => m.key)])],
                    )
                  }
                  aria-pressed={allOn}
                >
                  <Marker on={allOn} danger={DANGER_GROUPS.includes(g.key)} />
                  <span className="select-card__name">{t(g.labelKey)}</span>
                  <span className="chip">{groupModules.length}</span>
                </button>

                <div className="md-grid">
                  {groupModules.map((m) => {
                    const on = selected.includes(m.key);
                    return (
                      /* Individual module cards toggle selection — no default checkboxes. */
                      <button
                        key={m.key}
                        className={`select-card ${on ? 'is-selected' : ''}`}
                        onClick={() =>
                          setSelected((prev) => (on ? prev.filter((k) => k !== m.key) : [...prev, m.key]))
                        }
                        aria-pressed={on}
                      >
                        <div className="select-card__row">
                          <Marker on={on} />
                          <span className="select-card__name">{t(`module_${m.key}`)}</span>
                        </div>
                        <div className="select-card__row">
                          <Badge kind={on ? 'active' : undefined}>
                            <Icon name="database" size={11} />
                            {fmtNumber(m.record_count, locale)} {t('label_records')}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        icon="database"
        iconClass="ic-teal"
        title={t('backup_created_list')}
        subtitle={`${created.length}`}
      >
        {created.length === 0 ? (
          <EmptyState icon="database" title={t('backup_no_backups')} />
        ) : (
          <div className="bk-grid">
            {created.map((b) => (
              <BackupCard
                key={b.id}
                backup={b}
                locale={locale}
                timeZone={timeZone}
                t={t}
                onDownload={() => window.open(`/api/backups/${b.id}/download`, '_blank')}
                onRestore={() => setConfirm({ kind: 'restore', backup: b })}
                onDelete={() => setConfirm({ kind: 'delete', backup: b })}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Upload action lives in the same section as the uploaded list. */}
      <SectionCard
        icon="upload"
        iconClass="ic-blue"
        title={t('backup_uploaded_list')}
        subtitle={`${uploaded.length}`}
        actions={
          <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
            {busy ? <span className="spinner" /> : <Icon name="upload" size={15} />}
            {t('backup_upload')}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) upload(file);
              }}
            />
          </label>
        }
      >
        {uploaded.length === 0 ? (
          <div className="empty" style={{ padding: '18px' }}>
            <span className="empty__title">{t('backup_no_uploaded')}</span>
          </div>
        ) : (
          <div className="bk-grid">
            {uploaded.map((b) => (
              <BackupCard
                key={b.id}
                backup={b}
                locale={locale}
                timeZone={timeZone}
                t={t}
                onDownload={() => window.open(`/api/backups/${b.id}/download`, '_blank')}
                onRestore={() => setConfirm({ kind: 'restore', backup: b })}
                onDelete={() => setConfirm({ kind: 'delete', backup: b })}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Reset sample data: clearly separated and never touches real access data. */}
      <SectionCard
        icon="alert"
        iconClass="ic-coral"
        title={t('backup_reset_sample')}
        subtitle={t('backup_protected_notice')}
        actions={
          <>
            <button className="btn btn--sm" onClick={() => setResetGroups(RESET_GROUPS)}>
              {t('action_select_all')}
            </button>
            <button className="btn btn--sm" onClick={() => setResetGroups([])}>
              {t('action_clear_all')}
            </button>
            <button
              className="btn btn--danger btn--sm"
              disabled={busy || resetGroups.length === 0}
              onClick={() => setConfirm({ kind: 'reset' })}
            >
              <Icon name="trash" size={15} />
              {t('backup_reset_sample')} ({resetGroups.length})
            </button>
          </>
        }
      >
        <div className="md-grid">
          {RESET_GROUPS.map((g) => {
            const on = resetGroups.includes(g);
            const danger = RESET_META[g].danger;
            return (
              <button
                key={g}
                className={`select-card ${on ? 'is-selected' : ''} ${danger ? 'is-danger' : ''}`}
                onClick={() => setResetGroups((prev) => (on ? prev.filter((x) => x !== g) : [...prev, g]))}
                aria-pressed={on}
              >
                <div className="select-card__row">
                  <Marker on={on} danger={danger} />
                  <Icon name={RESET_META[g].icon} size={16} />
                  <span className="select-card__name">{t(`group_${g}`)}</span>
                </div>
                {danger ? (
                  <span className="field__hint" style={{ color: 'var(--danger)' }}>
                    {t('backup_danger_group')}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {confirm?.kind === 'restore' ? (
        <RestoreConfirm
          backup={confirm.backup}
          t={t}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => restore(confirm.backup.id)}
        />
      ) : null}

      {confirm?.kind === 'delete' ? (
        <ConfirmDialog
          title={t('backup_delete_confirm')}
          message={confirm.backup.name}
          danger
          busy={busy}
          confirmLabel={t('action_delete')}
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm.backup.id)}
        />
      ) : null}

      {confirm?.kind === 'reset' ? (
        <ConfirmDialog
          title={t('backup_reset_sample')}
          message={t('backup_reset_confirm')}
          danger
          busy={busy}
          confirmLabel={t('action_delete')}
          onCancel={() => setConfirm(null)}
          onConfirm={resetSample}
        />
      ) : null}

      {restoreResult ? (
        <Modal
          title={t('backup_restore_summary')}
          onClose={() => setRestoreResult(null)}
          footer={
            <button className="btn btn--primary" onClick={() => setRestoreResult(null)}>
              {t('action_close')}
            </button>
          }
        >
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('backup_modules')}</th>
                  <th>{t('backup_records')}</th>
                  <th>{t('label_status')}</th>
                </tr>
              </thead>
              <tbody>
                {(restoreResult.summary || []).map((row) => (
                  <tr key={row.key}>
                    <td>{t(`module_${row.key}`)}</td>
                    <td>
                      {row.restored} / {row.restored + row.skipped}
                    </td>
                    <td>
                      <Badge kind={row.skipped === 0 ? 'active' : 'pending'}>
                        {row.skipped === 0 ? t('state_saved') : `${row.skipped} skipped`}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(restoreResult.warnings || []).length ? (
            <div style={{ marginTop: 12 }}>
              <Alert kind="warning">{restoreResult.warnings.join(', ')}</Alert>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}

function RestoreConfirm({ backup, t, busy, onCancel, onConfirm }) {
  const manifest = backup.manifest || {};
  return (
    <Modal
      title={t('backup_restore')}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="refresh" size={16} />}
            {t('backup_restore')}
          </button>
        </>
      }
    >
      <Alert kind="warning">{t('backup_restore_confirm')}</Alert>
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(manifest.modules || []).map((m) => (
          <span className="chip" key={m.key}>
            {t(`module_${m.key}`)} · {m.record_count}
          </span>
        ))}
      </div>
      <div className="totals" style={{ marginTop: 14 }}>
        <div className="totals__row">
          <span>{t('backup_format')}</span>
          <span>{manifest.format_version}</span>
        </div>
        <div className="totals__row">
          <span>{t('backup_created_on')}</span>
          <span>{manifest.created_at}</span>
        </div>
        <div className="totals__row">
          <span>{t('backup_creator')}</span>
          <span>{manifest.created_by_name}</span>
        </div>
      </div>
    </Modal>
  );
}

function BackupCard({ backup, locale, timeZone, t, onDownload, onRestore, onDelete }) {
  const manifest = backup.manifest || {};
  const modules = manifest.modules || [];
  return (
    <article className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <header className="card__head">
        <span className={`card__icon ${backup.backup_type === 'full' ? 'ic-indigo' : 'ic-teal'}`}>
          <Icon name={backup.backup_type === 'full' ? 'database' : 'layers'} size={17} />
        </span>
        <div className="card__titles">
          <div className="card__title" style={{ fontSize: 13.5 }}>{backup.name}</div>
          <div className="card__subtitle">{fmtDateTime(backup.created_at, locale, timeZone)}</div>
        </div>
      </header>
      <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 auto' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge kind={backup.backup_type === 'full' ? 'completed' : 'pending'}>
            {backup.backup_type === 'full' ? t('backup_full') : backup.backup_type === 'uploaded' ? t('backup_uploaded_list') : t('backup_custom')}
          </Badge>
          <Badge>{fmtBytes(backup.size_bytes, locale)}</Badge>
          <Badge kind={backup.status === 'restored' ? 'completed' : undefined}>
            {backup.status === 'restored' ? t('backup_restored') : t('state_saved')}
          </Badge>
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {modules.slice(0, 6).map((m) => (
            <span className="chip" key={m.key}>
              {t(`module_${m.key}`)} · {m.record_count}
            </span>
          ))}
          {modules.length > 6 ? <span className="chip">+{modules.length - 6}</span> : null}
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          <Icon name="users" size={12} /> {backup.created_by_name || '—'}
        </div>

        <div className="product-card__actions" style={{ marginTop: 'auto' }}>
          <button className="btn btn--sm" onClick={onDownload}>
            <Icon name="download" size={14} />
            {t('action_download')}
          </button>
          <button className="btn btn--sm" onClick={onRestore}>
            <Icon name="refresh" size={14} />
            {t('backup_restore')}
          </button>
          <button className="btn btn--sm btn--danger-soft" onClick={onDelete}>
            <Icon name="trash" size={14} />
            {t('action_delete')}
          </button>
        </div>
      </div>
    </article>
  );
}
