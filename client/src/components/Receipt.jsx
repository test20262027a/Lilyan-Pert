import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fmtDateTime, zoneFor } from '../format';
import { isRtl } from '../i18n';
import { pickReceiptFooter, receiptLabel, receiptMessageText } from '../receiptMessages';

/**
 * One receipt markup used by the on-screen receipt, the preview and the
 * printed output, so all three always show identical authoritative data.
 * It is a single continuous flow — no fixed heights, no page breaks.
 *
 * It is customer-facing only: the order's status history, edits, auditors and
 * timestamps are internal and live in the Order Details activity timeline,
 * never here — so printing and PDF export stay free of audit information.
 */
export function ReceiptPaper({ data, locale, footerPick: givenPick = null }) {
  /*
   * One closing message per receipt. The pick is identity-only (the text is
   * resolved on every render), and it is chosen once per receipt and language —
   * so it never changes while the receipt is being printed. A screen that shows
   * the receipt and then prints it (the settings preview) passes its own pick
   * down, so the printed paper carries the very message that was previewed.
   */
  const pick = useMemo(
    () => givenPick || pickReceiptFooter(data?.business, locale),
    // Keyed by the receipt's business and language, never by the payload object
    // the parent rebuilds on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [givenPick, locale, data?.business?.id],
  );

  if (!data) return null;
  const { order, items, table, business } = data;
  const settings = business?.receipt_settings || {};
  const timeZone = zoneFor(locale, business?.timezone);
  /* The business's own name in the receipt's language; a missing translation
     falls back to the configured default name, never to another language. */
  const businessName = business?.[`name_${locale}`] || business?.name || business?.name_en || '';
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
   * The receipt's structural labels are fixed localized text, printed in their
   * own place; only the closing message below is one of the fifteen editable
   * messages, and its {{businessName}} is resolved from the business profile at
   * print time, so a renamed business prints its new name.
   */
  const msg = (key) => receiptLabel(key, locale);
  const footer = pick
    ? {
        ...pick,
        text: receiptMessageText(business, pick.key, pick.language, {
          business_name: businessName,
          order_number: order?.order_number ?? '',
          table: table?.name || '',
          customer_name: order?.customer_name || '',
          date: order ? fmtDateTime(order.created_at, locale, timeZone) : '',
          total: `${Number(order?.total || 0).toFixed(0)}${business?.currency ? ` ${business.currency}` : ''}`,
          currency: business?.currency || '',
        }),
      }
    : null;

  /* The paper follows the receipt's own language, so Kurdish, Persian and
     Arabic print right-to-left even when the panel around them does not. */
  return (
    <div
      className="receipt-paper"
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
      style={contentAlign ? { textAlign: contentAlign } : undefined}
    >
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

      {/* Exactly one closing message, already resolved in this receipt's own
          language — never several messages, never several languages. */}
      {footer?.text ? (
        <>
          <hr className="receipt-hr" />
          <div className="receipt-center receipt-meta">{footer.text}</div>
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
