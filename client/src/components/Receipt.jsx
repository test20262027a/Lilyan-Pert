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
  /*
   * The stored per-language address wins; the original single address stays
   * the fallback so a business that never filled the new fields prints exactly
   * what it printed before.
   */
  const addressText = business?.addresses?.[locale] || business?.addresses?.en || business?.address;
  const logoWidth = { small: 70, medium: 110, large: 150 }[settings.logo_size] || 110;
  const contentAlign =
    settings.alignment === 'center' ? 'center' : settings.alignment === 'start' ? 'start' : undefined;
  const moreInfo = settings.show_more_info !== false;

  return (
    <div className="receipt-paper" style={contentAlign ? { textAlign: contentAlign } : undefined}>
      {settings.show_logo && business?.logo_url ? (
        <img className="receipt-logo" src={business.logo_url} alt="" style={{ maxWidth: logoWidth }} />
      ) : null}
      <div className="receipt-center" style={{ fontWeight: 700, fontSize: 14 }}>{businessName}</div>
      {moreInfo && settings.show_address && (addressText || business?.city) ? (
        <div className="receipt-center receipt-meta">
          {[addressText, business?.city].filter(Boolean).join(', ')}
        </div>
      ) : null}
      {moreInfo && settings.show_phone && business?.phone ? (
        <div className="receipt-center receipt-meta">{business.phone}</div>
      ) : null}

      <hr className="receipt-hr" />

      {settings.show_order_info !== false ? (
        <div className="receipt-meta">
          {settings.show_order_number !== false ? (
            <div className="receipt-row">
              <span>{t('receipt_order_no')}</span>
              <span>#{order?.order_number}</span>
            </div>
          ) : null}
          {table && settings.show_table_number !== false ? (
            <div className="receipt-row">
              <span>{t('receipt_table')}</span>
              <span>{table.name}</span>
            </div>
          ) : null}
          {settings.show_datetime !== false ? (
            <div className="receipt-row">
              <span>{t('receipt_date')}</span>
              <span>{fmtDateTime(order?.created_at, locale, timeZone)}</span>
            </div>
          ) : null}
          {settings.show_customer_name !== false && order?.customer_name ? (
            <div className="receipt-row">
              <span>{t('receipt_customer')}</span>
              <span>{order.customer_name}</span>
            </div>
          ) : null}
          {moreInfo && settings.show_cashier ? (
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
        <div key={`${line.name}-${idx}`} style={{ marginTop: 4 }}>
          <div className="receipt-row receipt-item">
            <span className="receipt-item-name">
              {line.quantity} × {line.name}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>
              {Number(line.line_total).toFixed(0)}
            </span>
          </div>
          {settings.show_notes !== false && line.notes ? (
            <div className="receipt-meta receipt-item-name" style={{ paddingInlineStart: 12 }}>
              {line.notes}
            </div>
          ) : null}
        </div>
      ))}

      {settings.show_notes !== false && order?.notes ? (
        <div className="receipt-meta" style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 700 }}>{t('receipt_notes')}</div>
          <div>{order.notes}</div>
        </div>
      ) : null}

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
      {moreInfo && showChangeInfo && settings.show_change_info !== false && lastChange ? (
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
