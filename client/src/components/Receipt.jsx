import { createPortal } from 'react-dom';
import { fmtDateTime, zoneFor } from '../format';

/**
 * One receipt markup used by the on-screen receipt, the preview and the
 * printed output, so all three always show identical authoritative data.
 * It is a single continuous flow — no fixed heights, no page breaks.
 */
export function ReceiptPaper({ data, locale, t, showChangeInfo }) {
  if (!data) return null;
  const { order, items, table, business } = data;
  const settings = business?.receipt_settings || {};
  const timeZone = zoneFor(locale, business?.timezone);
  const businessName =
    business?.[`name_${locale}`] || business?.name_en || business?.name || '';
  const lastChange = (data.history || []).filter((h) => h.from_status).slice(-1)[0];

  return (
    <div className="receipt-paper">
      {settings.show_logo && business?.logo_url ? (
        <img className="receipt-logo" src={business.logo_url} alt="" />
      ) : null}
      <div className="receipt-center" style={{ fontWeight: 700, fontSize: 14 }}>{businessName}</div>
      {settings.show_address && (business?.address || business?.city) ? (
        <div className="receipt-center receipt-meta">
          {[business?.address, business?.city].filter(Boolean).join(', ')}
        </div>
      ) : null}
      {settings.show_phone && business?.phone ? (
        <div className="receipt-center receipt-meta">{business.phone}</div>
      ) : null}

      <hr className="receipt-hr" />

      {settings.show_order_info !== false ? (
        <div className="receipt-meta">
          <div className="receipt-row">
            <span>{t('receipt_order_no')}</span>
            <span>#{order?.order_number}</span>
          </div>
          {table ? (
            <div className="receipt-row">
              <span>{t('receipt_table')}</span>
              <span>{table.name}</span>
            </div>
          ) : null}
          <div className="receipt-row">
            <span>{t('receipt_date')}</span>
            <span>{fmtDateTime(order?.created_at, locale, timeZone)}</span>
          </div>
          {settings.show_cashier ? (
            <div className="receipt-row">
              <span>{t('receipt_cashier')}</span>
              <span>{order?.created_by_name || '—'}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <hr className="receipt-hr" />

      <div className="receipt-row receipt-meta" style={{ fontWeight: 700 }}>
        <span>{t('receipt_items')}</span>
        <span>{t('label_total')}</span>
      </div>
      {(items || []).map((line, idx) => (
        <div className="receipt-row receipt-item" key={`${line.name}-${idx}`} style={{ marginTop: 4 }}>
          <span className="receipt-item-name">
            {line.quantity} × {line.name}
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>
            {Number(line.line_total).toFixed(0)}
          </span>
        </div>
      ))}

      <hr className="receipt-hr" />

      <div className="receipt-meta">
        <div className="receipt-row">
          <span>{t('order_subtotal')}</span>
          <span>{Number(order?.subtotal || 0).toFixed(0)}</span>
        </div>
        {Number(order?.discount || 0) > 0 ? (
          <div className="receipt-row">
            <span>{t('order_discount')}</span>
            <span>-{Number(order.discount).toFixed(0)}</span>
          </div>
        ) : null}
        {Number(order?.tax || 0) > 0 ? (
          <div className="receipt-row">
            <span>{t('order_tax')}</span>
            <span>{Number(order.tax).toFixed(0)}</span>
          </div>
        ) : null}
        {Number(order?.service_charge || 0) > 0 ? (
          <div className="receipt-row">
            <span>{t('order_service')}</span>
            <span>{Number(order.service_charge).toFixed(0)}</span>
          </div>
        ) : null}
        <div className="receipt-row" style={{ fontWeight: 700, fontSize: 13.5, marginTop: 4 }}>
          <span>{t('order_grand_total')}</span>
          <span>
            {Number(order?.total || 0).toFixed(0)} {business?.currency || ''}
          </span>
        </div>
      </div>

      {/*
        Order-change audit appears on the printed receipt only while
        receipt_settings.show_change_info is enabled; the order-details form
        always shows the same information regardless of this setting.
      */}
      {showChangeInfo && settings.show_change_info !== false && lastChange ? (
        <>
          <hr className="receipt-hr" />
          <div className="receipt-meta">
            <div style={{ fontWeight: 700 }}>{t('receipt_change_info')}</div>
            <div className="receipt-row">
              <span>
                {t(`status_${lastChange.from_status}`)} → {t(`status_${lastChange.to_status}`)}
              </span>
              <span>{lastChange.changed_by_name || '—'}</span>
            </div>
            <div className="receipt-center">{fmtDateTime(lastChange.changed_at, locale, timeZone)}</div>
          </div>
        </>
      ) : null}

      {settings.footer_text ? (
        <>
          <hr className="receipt-hr" />
          <div className="receipt-center receipt-meta">{settings.footer_text}</div>
        </>
      ) : null}
    </div>
  );
}

/** Renders the receipt outside the app tree so printing produces one clean flow. */
export function PrintPortal({ children }) {
  const node = typeof document !== 'undefined' ? document.getElementById('print-root') : null;
  if (!node) return null;
  return createPortal(children, node);
}
