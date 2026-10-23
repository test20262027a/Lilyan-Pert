import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { tableLabel } from './TableField';
import './tableBadge.css';

/*
 * The guest's table, as one premium floating badge in the menu header.
 *
 * Three states, one shape so nothing about the layout moves between them:
 *   auto   — resolved from the scanned table QR code (read-only)
 *   manual — the table the guest picked in the ordering form
 *   empty  — no table yet: a calm placeholder asking for one
 *
 * The name is localized through the same helper the ordering form uses, so the
 * badge and the form can never disagree about which table is selected.
 */
export default function CustomerTableBadge({ table, mode = 'auto' }) {
  const { t, locale } = useI18n();

  if (!table) {
    return (
      <span className="cui-tbadge cui-tbadge--empty">
        <span className="cui-tbadge__icon" aria-hidden="true">
          <Icon name="table" size={16} />
        </span>
        <span className="cui-tbadge__text">
          <span className="cui-tbadge__label">{t('customer_table_select')}</span>
          <span className="cui-tbadge__hint">{t('customer_table_pick_hint')}</span>
        </span>
      </span>
    );
  }

  const name = tableLabel(table, locale);
  const auto = mode !== 'manual';

  return (
    <span className="cui-tbadge cui-tbadge--set">
      <span className="cui-tbadge__icon" aria-hidden="true">
        <Icon name="table" size={16} />
      </span>
      <span className="cui-tbadge__text">
        <span className="cui-tbadge__label">{t('customer_table_your')}</span>
        <strong className="cui-tbadge__name" title={name}>
          {name}
        </strong>
      </span>
      <span className="cui-tbadge__tag">
        <Icon name={auto ? 'checkCircle' : 'check'} size={13} />
        {auto ? t('order_table_qr') : t('order_table_manual')}
      </span>
    </span>
  );
}
