import { useI18n } from '../../i18n';
import DeleteConfirmationDialog from '../confirm/DeleteConfirmationDialog';
import { tablesErrorText } from './errorText';

/*
 * Delete confirmation for one table.
 *
 * Deleting is never immediate and never silent: the shared dialog names the
 * table, states exactly what happens (the table leaves the list, its public QR
 * link stops resolving, saved orders stay) and adds how many orders this table
 * already carries. The API is the authority — if the table still has live
 * orders it refuses the delete, and that refusal is shown in the business's
 * language instead of a raw error code.
 */
export default function TableDeleteDialog({ table, busy, error, onCancel, onConfirm }) {
  const { t } = useI18n();
  const orders = Number(table.order_count) || 0;
  const seats = Number(table.seats) || 0;

  const subtitle = [table.zone, seats > 0 ? `${seats} ${t('table_seats')}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <DeleteConfirmationDialog
      entityType="table"
      entityName={table.name}
      entitySubtitle={subtitle || undefined}
      warning={
        orders > 0
          ? `${t('table_delete_warning')} ${t('table_orders_saved', { count: orders })}`
          : t('table_delete_warning')
      }
      busy={busy}
      error={error ? tablesErrorText(error, t) : undefined}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
