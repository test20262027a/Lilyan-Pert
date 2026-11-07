import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * The table an order belongs to, as staff read it: the table name first, then a
 * small pill saying how that table got onto the order.
 *
 * The distinction matters in the admin — a table identified by the scanned QR
 * code is a fact from the guest's physical position, while one picked by hand
 * may be a mistake — so it is shown, and stays readable in every language.
 */
export default function OrderTableLabel({ name, source }) {
  const { t } = useI18n();
  const qr = source === 'qr';
  const label = qr ? t('order_table_qr') : t('order_table_manual');

  return (
    <span className="otable-label">
      <span className="otable-label__name">{name || '—'}</span>
      {source ? (
        <span
          className={`otable-label__src${qr ? ' otable-label__src--qr' : ''}`}
          title={label}
        >
          <Icon name={qr ? 'qr' : 'table'} size={11} />
          {label}
        </span>
      ) : null}
    </span>
  );
}
