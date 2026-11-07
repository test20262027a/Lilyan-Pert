import Icon from '../../Icon';
import { Select } from '../../ui';
import { useI18n } from '../../../i18n';

/*
 * The order's status control, restyled only.
 *
 * The options are exactly the transitions the server said this order may take
 * (`allowed_transitions`), and the change goes through the same status endpoint
 * the list uses — so permissions, transition validation, notifications and the
 * status history stay untouched. Completed and cancelled orders offer nothing
 * and the control locks itself.
 */
export default function OrderStatusControl({ order, transitions = [], busy, onChange }) {
  const { t } = useI18n();
  const locked = transitions.length === 0;

  const options = [
    {
      value: order.status,
      label: t(`status_${order.status}`),
      leading: <span className={`odm-dot odm-dot--${order.status}`} aria-hidden="true" />,
      disabled: true,
    },
    ...transitions.map((status) => ({
      value: status,
      label: t(`status_${status}`),
      leading: <span className={`odm-dot odm-dot--${status}`} aria-hidden="true" />,
    })),
  ];

  return (
    <div className={`odm-status ${locked ? 'is-locked' : ''}`}>
      <Select
        value={order.status}
        onChange={(next) => {
          if (next && next !== order.status) onChange(next);
        }}
        options={options}
        disabled={locked || busy}
        ariaLabel={t('od_status')}
      />
      <p className="odm-status__hint">
        {busy ? <span className="spinner odm-status__spinner" /> : <Icon name="refresh" size={13} />}
        {locked ? t('od_status_locked') : t('order_change_status')}
      </p>
    </div>
  );
}
