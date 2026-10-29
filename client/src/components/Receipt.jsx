import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fmtDateTime, fmtMoney, fmtNumber, zoneFor } from '../format';
import { isRtl } from '../i18n';
import { pickReceiptFooter, receiptLabel, receiptMessageText } from '../receiptMessages';
import '../receipt.css';

/**
 * One receipt markup used by the on-screen preview and the printed output, so
 * both always show identical authoritative data. It is a single continuous
 * flow — no fixed heights, no page breaks, nothing that can clip.
 *
 * The structure is fixed for both paper widths: logo, business identity,
 * rule, order number and details, rule, product list, rule, totals with a bold
 * grand total, rule, one closing message. Only the type scale and the logo cap
 * change between 58 mm and 80 mm (see receipt.css).
 *
 * It is customer-facing only: the order's status history, edits, auditors and
 * timestamps are internal and live in the Order Details activity timeline,
 * never here — so printing and PDF export stay free of audit information.
 */

/** The paper width in millimetres, from the saved print settings. */
export function paperWidth(settings) {
  const raw = String(settings?.paper_width || '80mm');
  if (raw === '58mm') return 58;
  if (raw === 'custom') {
    const n = Number(settings?.custom_width);
    return Number.isFinite(n) ? Math.min(120, Math.max(40, n)) : 80;
  }
  return 80;
}

const LOGO_PX = { small: 70, medium: 110, large: 150 };

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
  const tableName = table ? table[`name_${locale}`] || table.name : '';

  const mm = paperWidth(settings);
  const narrow = mm <= 60;
  const logoWidth = Math.min(LOGO_PX[settings.logo_size] || LOGO_PX.medium, narrow ? 84 : 150);
  const align = settings.alignment === 'center' || settings.alignment === 'start' ? settings.alignment : 'auto';
  const moreInfo = settings.show_more_info !== false;
  const currency = business?.currency || '';

  /*
   * Money keeps the app's own formatting rules (localized digits, the business
   * currency, whole numbers where the currency has no decimals). Nothing is
   * recalculated here — the stored order values print exactly as saved.
   */
  const amount = (value) => fmtNumber(Number(value) || 0, locale);

  /* The receipt's structural labels are fixed localized text, printed in their
     own place; only the closing message below is one of the fifteen editable
     messages, and its {{businessName}} is resolved from the business profile at
     print time, so a renamed business prints its new name. */
  const msg = (key) => receiptLabel(key, locale);
  const footer = pick
    ? {
        ...pick,
        text: receiptMessageText(business, pick.key, pick.language, {
          business_name: businessName,
          order_number: order?.order_number ?? '',
          table: tableName || '',
          customer_name: order?.customer_name || '',
          date: order ? fmtDateTime(order.created_at, locale, timeZone) : '',
          total: `${amount(order?.total)}${currency ? ` ${currency}` : ''}`,
          currency,
        }),
      }
    : null;

  const kvRow = (label, value, key) => (
    <div className="rc-kv__row" key={key}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );

  /* The paper follows the receipt's own language, so Kurdish, Persian and
     Arabic print right-to-left even when the panel around them does not. */
  return (
    <div
      className="receipt-paper"
      data-paper={narrow ? '58' : '80'}
      data-align={align}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
    >
      <header className="rc-head">
        {settings.show_logo && business?.logo_url ? (
          <img className="receipt-logo" src={business.logo_url} alt="" style={{ maxWidth: `${logoWidth}px` }} />
        ) : null}
        <div className="rc-name">{businessName}</div>
        {moreInfo && settings.show_address && (addressText || business?.city) ? (
          <div className="rc-contact">{[addressText, business?.city].filter(Boolean).join(', ')}</div>
        ) : null}
        {moreInfo && settings.show_phone && business?.phone ? (
          <div className="rc-contact rc-num">{business.phone}</div>
        ) : null}
        {moreInfo && (business?.email || business?.website) ? (
          <div className="rc-contact rc-num">
            {[business?.email, business?.website].filter(Boolean).join(' · ')}
          </div>
        ) : null}
      </header>

      {settings.show_order_info !== false ? (
        <section className="rc-order rc-block">
          {settings.show_order_number !== false ? (
            <div className="rc-orderno">
              <span className="rc-orderno__label">{msg('order_no')}</span>
              <span className="rc-orderno__value rc-num">#{order?.order_number}</span>
            </div>
          ) : null}
          <dl className="rc-kv">
            {tableName && settings.show_table_number !== false
              ? kvRow(msg('table'), tableName, 'table')
              : null}
            {settings.show_datetime !== false
              ? kvRow(msg('datetime'), <span className="rc-num">{fmtDateTime(order?.created_at, locale, timeZone)}</span>, 'date')
              : null}
            {settings.show_customer_name !== false && order?.customer_name
              ? kvRow(msg('customer'), order.customer_name, 'customer')
              : null}
            {moreInfo && settings.show_cashier
              ? kvRow(msg('cashier'), order?.created_by_name || '—', 'cashier')
              : null}
          </dl>
        </section>
      ) : null}

      {(items || []).length ? (
        /*
         * A real table, so the header and every product row share one set of
         * column tracks: quantity, unit price and line total line up down the
         * paper whatever the names are. Column widths are content-driven, so
         * the same markup adapts to 58 mm and 80 mm.
         */
        <table className="rc-items rc-block">
          <thead>
            <tr>
              <th scope="col">{msg('items')}</th>
              <th scope="col" className="rc-col rc-col--qty">{msg('qty')}</th>
              <th scope="col" className="rc-col rc-col--unit">{msg('unit_price')}</th>
              <th scope="col" className="rc-col">{msg('total_column')}</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((line, idx) => (
              <tr className="rc-item" key={`${line.name}-${idx}`}>
                <td className="rc-item__name">
                  <span className="rc-item__label">{line.name}</span>
                  {/* 80 mm prints quantity and unit price in their own columns;
                      58 mm has no room for four, so the same two values print
                      on this meta line under the name instead. */}
                  <span className="rc-item__meta rc-num">
                    {line.unit_price == null
                      ? amount(line.quantity)
                      : `${amount(line.quantity)} × ${amount(line.unit_price)}`}
                  </span>
                  {settings.show_notes !== false && line.notes ? (
                    <span className="rc-item__note">{line.notes}</span>
                  ) : null}
                </td>
                <td className="rc-item__qty rc-num">{amount(line.quantity)}</td>
                <td className="rc-item__unit rc-num">
                  {line.unit_price == null ? '—' : amount(line.unit_price)}
                </td>
                <td className="rc-item__amount rc-num">{amount(line.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {settings.show_notes !== false && order?.notes ? (
        <div className="rc-notes rc-block">
          <div className="rc-notes__label">{msg('notes')}</div>
          <div className="rc-notes__text">{order.notes}</div>
        </div>
      ) : null}

      <dl className="rc-totals rc-block">
        <div className="rc-totals__row">
          <dt>{msg('subtotal')}</dt>
          <dd className="rc-num">{amount(order?.subtotal)}</dd>
        </div>
        {Number(order?.discount || 0) > 0 ? (
          <div className="rc-totals__row">
            <dt>{msg('discount')}</dt>
            <dd className="rc-num">-{amount(order.discount)}</dd>
          </div>
        ) : null}
        {Number(order?.tax || 0) > 0 ? (
          <div className="rc-totals__row">
            <dt>{msg('tax')}</dt>
            <dd className="rc-num">{amount(order.tax)}</dd>
          </div>
        ) : null}
        {Number(order?.service_charge || 0) > 0 ? (
          <div className="rc-totals__row">
            <dt>{msg('service_charge')}</dt>
            <dd className="rc-num">{amount(order.service_charge)}</dd>
          </div>
        ) : null}
        <div className="rc-grand">
          <span>{msg('total')}</span>
          <span className="rc-num">{fmtMoney(order?.total || 0, currency, locale)}</span>
        </div>
      </dl>

      {/*
        Deliberately no order-change audit here: status transitions, edits and
        the users who made them belong to the Order Details activity timeline.
        A receipt carries the final order only, on screen, in print and in PDF.
      */}

      {/*
        Exactly one closing message, already resolved in this receipt's own
        language — never several messages, never several languages. The grand
        total closes with its own strong rule, so the message reads as a final
        section of its own without a second divider.
      */}
      {footer?.text ? <p className="rc-foot">{footer.text}</p> : null}
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
 * leaves the on-screen stylesheet untouched.
 *
 * The sheet is exactly as wide as the paper minus the two side margins: a
 * sheet as wide as the paper would print outside the printable area and the
 * printer would clip the price column. The calibration scale is applied with
 * `zoom`, so the sheet is widened by the same factor to still fill the paper.
 */
export function ReceiptPrintStyle({ settings }) {
  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };
  const paper = paperWidth(settings);
  const scale = clamp(settings?.print_scale, 50, 150, 100) / 100;
  const left = clamp(settings?.margin_left, 0, 20, 0);
  const right = clamp(settings?.margin_right, 0, 20, 0);
  const bottom = clamp(settings?.margin_bottom, 0, 20, 0);
  const printable = Math.max(paper - left - right, paper * 0.5);

  return (
    <style>{`
      @page { size: ${paper}mm auto; margin: ${bottom}mm ${right}mm ${bottom}mm ${left}mm; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      #print-root .receipt-paper {
        width: ${(printable / scale).toFixed(2)}mm;
        max-width: none;
        zoom: ${scale};
      }
    `}</style>
  );
}
