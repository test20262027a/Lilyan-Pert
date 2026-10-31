import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, EmptyState, Loading, useToast } from '../components/ui';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import TablesArtwork from '../components/tables/TablesArtwork';
import TablesAddressCard from '../components/tables/TablesAddressCard';
import TableQrCard from '../components/tables/TableQrCard';
import TableFormModal from '../components/tables/TableFormModal';
import TableDeleteDialog from '../components/tables/TableDeleteDialog';
import { copyText, publicMenuUrl, tableMenuUrl } from '../components/tables/menuUrl';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { del, get, post, put } from '../api';
import '../menu.css';
import '../tables.css';

/*
 * Tables & QR Codes.
 *
 * Four things, in the reference's order and nothing between them: the illustrated
 * banner (with Add Table inside it), the Main Ordering Menu Address, and the grid
 * of one QR card per real table of the signed-in business.
 *
 * Every card's code encodes that table's own public ordering address
 * (`/m/<business slug>?table=<qr_token>`), so scanning it opens the real customer
 * menu with the table already identified — the same route the customer menu and
 * the order API already use. The main menu address above is deliberately not a
 * table and never gets a QR of its own.
 *
 * Tables are read from `/manage/tables`, which is scoped to the authenticated
 * user's business server-side; creates, edits and deletes go through the same
 * business-scoped routes, so no client value can point them at another business.
 */
export default function Tables() {
  const { t } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/manage/tables');
      setTables(res.tables || []);
      setError(null);
    } catch (err) {
      setError(err?.code || 'ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const slug = business?.slug;
  // The special main ordering address: the menu itself, not a table record.
  const mainMenuUrl = publicMenuUrl(origin, slug);

  const copyMain = async () => {
    try {
      await copyText(mainMenuUrl);
      setCopied(true);
      toast.success(t('table_copied'));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t('table_copy_failed'));
    }
  };

  const openCreate = () => {
    setFormError(null);
    // The dialog fills the number, the display order and the seat count in from
    // this business's own tables; nothing is pre-filled from a hardcoded default.
    setModal({ values: {} });
  };

  const openEdit = (table) => {
    setFormError(null);
    setModal({ id: table.id, values: { ...table } });
  };

  const save = async (values, id) => {
    setBusy(true);
    setFormError(null);
    try {
      if (id) await put(`/manage/tables/${id}`, values);
      else await post('/manage/tables', values);
      setModal(null);
      await load();
      toast.success(t('state_saved'));
    } catch (err) {
      setFormError(err?.code || 'ERROR');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (table) => {
    setBusy(true);
    setDeleteError(null);
    try {
      await del(`/manage/tables/${table.id}`);
      setConfirm(null);
      await load();
      toast.success(t('state_saved'));
    } catch (err) {
      setDeleteError(err?.code || 'ERROR');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tables-page">
      <PageHeroBanner
        icon="table"
        title={t('table_title')}
        subtitle={t('table_subtitle')}
        art={<TablesArtwork />}
      >
        <button type="button" className="tadd" onClick={openCreate} disabled={!isManager}>
          <span className="tadd__dot" aria-hidden="true">
            <Icon name="plus" size={15} />
          </span>
          <span className="tadd__label">{t('table_create')}</span>
        </button>
      </PageHeroBanner>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      <TablesAddressCard url={mainMenuUrl} copied={copied} onCopy={copyMain} />

      {loading ? (
        <div className="tloading">
          <Loading />
        </div>
      ) : error ? (
        <Alert kind="error">
          {t('state_error')}{' '}
          <button type="button" className="btn btn--sm" onClick={load}>
            {t('action_retry')}
          </button>
        </Alert>
      ) : tables.length === 0 ? (
        <EmptyState
          icon="qr"
          title={t('table_no_tables')}
          hint={t('table_empty_hint')}
          action={
            isManager ? (
              <button type="button" className="tadd" onClick={openCreate}>
                <span className="tadd__dot" aria-hidden="true">
                  <Icon name="plus" size={15} />
                </span>
                <span className="tadd__label">{t('table_create')}</span>
              </button>
            ) : null
          }
        />
      ) : (
        <div className="tgrid">
          {tables.map((tb) => (
            <TableQrCard
              key={tb.id}
              table={tb}
              businessSlug={slug}
              menuUrl={tableMenuUrl(origin, slug, tb.qr_token)}
              canManage={isManager}
              onEdit={() => openEdit(tb)}
              onDelete={() => {
                setDeleteError(null);
                setConfirm(tb);
              }}
            />
          ))}
        </div>
      )}

      {modal ? (
        <TableFormModal
          modal={modal}
          tables={tables}
          busy={busy}
          error={formError}
          onClose={() => setModal(null)}
          onSave={save}
        />
      ) : null}

      {confirm ? (
        <TableDeleteDialog
          table={confirm}
          busy={busy}
          error={deleteError}
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm)}
        />
      ) : null}
    </div>
  );
}
