import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import QrCode from '../components/QrCode';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Loading,
  Modal,
  SectionCard,
  Switch,
  useToast,
} from '../components/ui';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { del, get, post, put } from '../api';

export default function Tables() {
  const { t } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/manage/tables');
      setTables(res.tables || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  // Special address: the main ordering menu, not a table record.
  const mainMenuUrl = business ? `${origin}/m/${business.slug}` : '';

  const copyMain = async () => {
    try {
      await navigator.clipboard.writeText(mainMenuUrl);
      setCopied(true);
      toast.success(t('table_copied'));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t('error_generic'));
    }
  };

  const save = async (values, id) => {
    setBusy(true);
    try {
      if (id) await put(`/manage/tables/${id}`, values);
      else await post('/manage/tables', values);
      toast.success(t('state_saved'));
      setModal(null);
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await del(`/manage/tables/${id}`);
      setConfirm(null);
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('table_title')}</h1>
          <p>{t('table_subtitle')}</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--primary btn--sm" onClick={() => setModal({ values: { name: '', seats: 4, zone: '', active: true } })} disabled={!isManager}>
            <Icon name="plus" size={15} />
            {t('table_create')}
          </button>
        </div>
      </div>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      {/*
        Main Ordering Menu Address — the only place where the QR, download and
        share controls are intentionally absent. Ordinary tables are untouched.
      */}
      <SectionCard icon="globe" iconClass="ic-indigo" title={t('table_main_address')}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <code
            dir="ltr"
            style={{
              flex: '1 1 260px',
              minWidth: 0,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {mainMenuUrl}
          </code>
          <button className="btn btn--primary btn--sm" onClick={copyMain} disabled={!mainMenuUrl}>
            <Icon name={copied ? 'check' : 'copy'} size={15} />
            {copied ? t('state_copied') : t('table_copy')}
          </button>
          <a className="btn btn--sm" href={mainMenuUrl} target="_blank" rel="noreferrer">
            <Icon name="eye" size={15} />
            {t('action_view')}
          </a>
        </div>
      </SectionCard>

      <SectionCard icon="qr" iconClass="ic-purple" title={t('table_title')} subtitle={`${tables.length}`}>
        {loading ? (
          <Loading />
        ) : tables.length === 0 ? (
          <EmptyState icon="qr" title={t('table_no_tables')} />
        ) : (
          <div className="product-grid">
            {tables.map((tb) => (
              <TableCard
                key={tb.id}
                table={tb}
                menuUrl={`${origin}/m/${business?.slug}?table=${tb.qr_token}`}
                canManage={isManager}
                onEdit={() => setModal({ id: tb.id, values: { ...tb } })}
                onDelete={() => setConfirm(tb)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {modal ? (
        <TableForm modal={modal} busy={busy} onClose={() => setModal(null)} onSave={save} />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={t('table_delete_confirm')}
          message={confirm.name}
          danger
          busy={busy}
          confirmLabel={t('action_delete')}
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm.id)}
        />
      ) : null}
    </>
  );
}

function TableCard({ table, menuUrl, canManage, onEdit, onDelete }) {
  const { t } = useI18n();
  const toast = useToast();

  const download = async () => {
    try {
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(menuUrl, { margin: 1, width: 600 });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${table.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      a.click();
    } catch {
      toast.error(t('error_generic'));
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: table.name, url: menuUrl });
      } else {
        await navigator.clipboard.writeText(menuUrl);
        toast.success(t('table_copied'));
      }
    } catch {
      /* the user dismissed the share sheet */
    }
  };

  return (
    <div className="product-card" style={{ alignItems: 'center' }}>
      <div className="product-name" title={table.name}>{table.name}</div>
      <div className="product-card__meta" style={{ justifyContent: 'center' }}>
        <span className="chip">
          <Icon name="users" size={12} /> {table.seats} {t('table_seats')}
        </span>
        {table.zone ? <span className="chip">{table.zone}</span> : null}
      </div>
      <QrCode value={menuUrl} label={`${table.name} QR`} />
      <div className="product-card__meta" style={{ justifyContent: 'center' }}>
        <span className="chip">
          <Icon name="receipt" size={12} /> {table.order_count}
        </span>
      </div>
      <div className="product-card__actions" style={{ width: '100%' }}>
        <button className="btn btn--sm" onClick={download}>
          <Icon name="download" size={14} />
          {t('table_download_qr')}
        </button>
        <button className="btn btn--sm" onClick={share}>
          <Icon name="share" size={14} />
          {t('table_share')}
        </button>
        <a className="btn btn--sm" href={menuUrl} target="_blank" rel="noreferrer">
          <Icon name="eye" size={14} />
          {t('table_open_menu')}
        </a>
        {canManage ? (
          <>
            <button className="btn btn--sm" onClick={onEdit}>
              <Icon name="pencil" size={14} />
              {t('action_edit')}
            </button>
            <button className="btn btn--sm btn--danger-soft" onClick={onDelete}>
              <Icon name="trash" size={14} />
              {t('action_delete')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function TableForm({ modal, busy, onClose, onSave }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    name: modal.values.name || '',
    seats: modal.values.seats ?? 4,
    zone: modal.values.zone || '',
    active: modal.values.active !== false,
  });

  return (
    <Modal
      title={modal.id ? t('table_edit') : t('table_create')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={() => onSave(values, modal.id)} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label={t('label_name')}>
          <input className="input" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
        </Field>
        <Field label={t('table_seats')}>
          <input
            className="input"
            type="number"
            min="1"
            max="40"
            value={values.seats}
            onChange={(e) => setValues((v) => ({ ...v, seats: Number(e.target.value) }))}
          />
        </Field>
        <Field label={t('table_zone')}>
          <input className="input" value={values.zone} onChange={(e) => setValues((v) => ({ ...v, zone: e.target.value }))} />
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
          <Switch
            checked={values.active}
            onChange={(v) => setValues((s) => ({ ...s, active: v }))}
            label={t('label_active')}
            ariaLabel={t('label_active')}
          />
        </div>
      </div>
    </Modal>
  );
}
