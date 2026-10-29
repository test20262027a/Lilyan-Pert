import { createPortal } from 'react-dom';
import { fmtDateTime, zoneFor } from '../format';
import { receiptMessageText } from '../receiptMessages';

/**
 * One receipt markup used by the on-screen receipt, the preview and the
 * printed output, so all three always show identical authoritative data.
 * It is a single continuous flow — no fixed heights, no page breaks.
 *
 * It is customer-facing only: the order's status history, edits, auditors and
 * timestamps are internal and live in the Order Details activity timeline,
 * never here — so printing and PDF export stay free of audit information.
 */
export function ReceiptPaper({ data, locale }) {
  if (!data) return null;
  const { order, items, table, business } = data;
  const settings = business?.receipt_settings || {};
  const timeZone = zoneFor(locale, business?.timezone);
  const businessName =
    business?.[`name_${locale}`] || business?.name_en || business?.name || '';
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
  /*
   * Every printed wording comes from the Text Editor (defaults included), so a
   * business edit appears on the next receipt without touching this layout.
   */
  const msg = (key) => receiptMessageText(business, key, locale);
  const footerText = receiptMessageText(business, 'footer', locale, {
    business_name: businessName,
    order_number: order?.order_number ?? '',
    table: table?.name || '',
    customer_name: order?.customer_name || '',
    date: order ? fmtDateTime(order.created_at, locale, timeZone) : '',
    total: `${Number(order?.total || 0).toFixed(0)}${business?.currency ? ` ${business.currency}` : ''}`,
    currency: business?.currency || '',
  });

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
              <span>{msg('order_no')}</span>
              <span>#{order?.order_number}</span>
            </div>
          ) : null}
          {table && settings.show_table_number !== false ? (
            <div className="receipt-row">
              <span>{msg('table')}</span>
              <span>{table.name}</span>
            </div>
          ) : null}
          {settings.show_datetime !== false ? (
            <div className="receipt-row">
              <span>{msg('datetime')}</span>
              <span>{fmtDateTime(order?.created_at, locale, timeZone)}</span>
            </div>
          ) : null}
          {settings.show_customer_name !== false && order?.customer_name ? (
            <div className="receipt-row">
              <span>{msg('customer')}</span>
              <span>{order.customer_name}</span>
            </div>
          ) : null}
          {moreInfo && settings.show_cashier ? (
            <div className="receipt-row">
              <span>{msg('cashier')}</span>
              <span>{order?.created_by_name || '—'}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <hr className="receipt-hr" />

      <div className="receipt-row receipt-meta" style={{ fontWeight: 700 }}>
        <span>{msg('items')}</span>
        <span>{msg('total_column')}</span>
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
          <div style={{ fontWeight: 700 }}>{msg('notes')}</div>
          <div>{order.notes}</div>
        </div>
      ) : null}

      <hr className="receipt-hr" />

      <div className="receipt-meta">
        <div className="receipt-row">
          <span>{msg('subtotal')}</span>
          <span>{Number(order?.subtotal || 0).toFixed(0)}</span>
        </div>
        {Number(order?.discount || 0) > 0 ? (
          <div className="receipt-row">
            <span>{msg('discount')}</span>
            <span>-{Number(order.discount).toFixed(0)}</span>
          </div>
        ) : null}
        {Number(order?.tax || 0) > 0 ? (
          <div className="receipt-row">
            <span>{msg('tax')}</span>
            <span>{Number(order.tax).toFixed(0)}</span>
          </div>
        ) : null}
        {Number(order?.service_charge || 0) > 0 ? (
          <div className="receipt-row">
            <span>{msg('service_charge')}</span>
            <span>{Number(order.service_charge).toFixed(0)}</span>
          </div>
        ) : null}
        <div className="receipt-row" style={{ fontWeight: 700, fontSize: 13.5, marginTop: 4 }}>
          <span>{msg('total')}</span>
          <span>
            {Number(order?.total || 0).toFixed(0)} {business?.currency || ''}
          </span>
        </div>
      </div>

      {/*
        Deliberately no order-change audit here: status transitions, edits and
        the users who made them belong to the Order Details activity timeline.
        A receipt carries the final order only, on screen, in print and in PDF.
      */}

      {footerText ? (
        <>
          <hr className="receipt-hr" />
          <div className="receipt-center receipt-meta">{footerText}</div>
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

/**
 * Page geometry for the printed receipt, taken from the saved print settings.
 * It is mounted inside the print portal, so it only exists while printing and
 * leaves the on-screen stylesheet untouched. Missing or invalid values fall
 * back to the historical 80 mm / 100% / 4 mm behaviour.
 */
export function ReceiptPrintStyle({ settings }) {
  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };
  const paper = String(settings?.paper_width || '80mm');
  const width =
    paper === '58mm' ? 58 : paper === 'custom' ? clamp(settings?.custom_width, 40, 120, 80) : 80;
  const scale = clamp(settings?.print_scale, 50, 150, 100) / 100;
  const left = clamp(settings?.margin_left, 0, 20, 4);
  const right = clamp(settings?.margin_right, 0, 20, 4);
  const bottom = clamp(settings?.margin_bottom, 0, 20, 4);

  return (
    <style>{`
      @page { size: ${width}mm auto; margin: ${bottom}mm ${right}mm ${bottom}mm ${left}mm; }
      #print-root .receipt-paper {
        width: ${(width / scale).toFixed(2)}mm;
        max-width: none;
        zoom: ${scale};
      }
    `}</style>
  );
}
