import { Alert } from '../ui';
import { useI18n } from '../../i18n';
import MenuModalFrame from '../menu/MenuModalFrame';
import { tablesErrorText } from './errorText';

/*
 * Delete confirmation for one table.
 *
 * Deleting is never immediate and never silent: the dialog states exactly what
 * happens (the table leaves the list, its public QR link stops resolving, saved
 * orders stay) and reports how many orders this table already carries. The API
 * is the authority — if the table still has live orders it refuses the delete,
 * and that refusal is shown here in the business's language instead of a raw
 * error code.
 */
export default function TableDeleteDialog({ table, busy, error, onCancel, onConfirm }) {
  const { t } = useI18n();
  const orders = Number(table.order_count) || 0;

  return (
    <MenuModalFrame
      title={t('table_delete_confirm')}
      icon="trash"
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            className="mcmodal__btn mcmodal__btn--save tdel__btn"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <span className="spinner" /> : null}
            {t('action_delete')}
          </button>
          <button type="button" className="mcmodal__btn mcmodal__btn--cancel" onClick={onCancel} disabled={busy}>
            {t('action_cancel')}
          </button>
        </>
      }
    >
      {error ? <Alert kind="error">{tablesErrorText(error, t)}</Alert> : null}

      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{table.name}</span>
        </div>
        <p className="tdel__note">{t('table_delete_warning')}</p>
        {orders > 0 ? (
          <p className="tdel__note">{t('table_orders_saved', { count: orders })}</p>
        ) : null}
      </section>
    </MenuModalFrame>
  );
}
