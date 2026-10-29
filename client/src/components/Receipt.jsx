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

/* The type stacks a receipt can actually print: every one of them carries
   Kurdish, Persian and Arabic as well as Latin, so no line falls back per glyph. */
const FONT_STACKS = {
  naskh: "'Noto Naskh Arabic', 'Segoe UI', Tahoma, 'DejaVu Sans', Arial, sans-serif",
  kufi: "'Noto Kufi Arabic', 'Segoe UI', Tahoma, 'DejaVu Sans', Arial, sans-serif",
  system: "'Segoe UI', Tahoma, 'DejaVu Sans', Arial, sans-serif",
};
const WEIGHTS = { normal: 400, medium: 600, bold: 700 };
const FOOTER_SCALES = { small: 0.86, normal: 1, large: 1.14 };
const GRAND_STYLES = ['boxed', 'rule', 'plain'];

/** One numeric setting, kept inside the range its control offers. */
function settingNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * The paper geometry every receipt shares — the printed sheet and the on-screen
 * preview read it from this one function, so the two can never disagree: the
 * real paper width, the calibration margins, the print scale, and the printable
 * width left between the two side margins.
 */
export function printGeometry(settings) {
  const paper = paperWidth(settings);
  const margins = {
    top: settingNumber(settings?.margin_top, 0, 20, 0),
    right: settingNumber(settings?.margin_right, 0, 20, 0),
    bottom: settingNumber(settings?.margin_bottom, 0, 20, 0),
    left: settingNumber(settings?.margin_left, 0, 20, 0),
  };
  return {
    paper,
    margins,
    scale: settingNumber(settings?.print_scale, 50, 150, 100) / 100,
    printable: Math.max(paper - margins.left - margins.right, paper * 0.5),
  };
}

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
   * Every printing preference is expressed as a custom property on the paper
   * element itself — the very element the printer renders. A change therefore
   * repaints the preview on the next render and prints identically: there is no
   * second, static template that could drift away from the real receipt.
   */
  const fontScale = settingNumber(settings.font_scale, 80, 140, 100) / 100;
  const paperVars = {
    '--rc-font': FONT_STACKS[settings.font_family] || FONT_STACKS.naskh,
    '--rc-font-size': `${(12 * fontScale).toFixed(2)}px`,
    '--rc-print-font-size': `${((narrow ? 8.4 : 9.5) * fontScale).toFixed(2)}pt`,
    '--rc-line-height': String(settingNumber(settings.line_height, 1.1, 2, 1.4)),
    '--rc-weight': String(WEIGHTS[settings.text_weight] || 400),
    '--rc-space': `${settingNumber(settings.section_spacing, 2, 16, 7)}px`,
    '--rc-foot-scale': String(FOOTER_SCALES[settings.footer_scale] || 1),
  };
  /* The product columns follow the paper width unless the owner pinned them. */
  const columns =
    settings.product_layout === 'full' || settings.product_layout === 'compact'
      ? settings.product_layout
      : narrow
        ? 'compact'
        : 'full';
  const footAlign =
    settings.footer_align === 'center' || settings.footer_align === 'start' ? settings.footer_align : 'auto';

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

  /*
   * The paper is a stack of independent sections — identity, contact, order,
   * guest, products, notes, totals, closing message. Each one is computed here
   * so a section whose settings are all off is not rendered at all: the paper
   * never carries an empty block or a divider with nothing under it.
   */
  const contactLines = [];
  if (moreInfo && settings.show_address && (addressText || business?.city)) {
    contactLines.push({ key: 'address', text: [addressText, business?.city].filter(Boolean).join(', ') });
  }
  if (moreInfo && settings.show_phone && business?.phone) {
    contactLines.push({ key: 'phone', text: business.phone, numeric: true });
  }
  const webLine = [business?.email, business?.website].filter(Boolean).join(' · ');
  if (moreInfo && webLine) contactLines.push({ key: 'web', text: webLine, numeric: true });

  const showOrderInfo = settings.show_order_info !== false;
  const hasOrderNumber = showOrderInfo && settings.show_order_number !== false;
  const hasDateTime = showOrderInfo && settings.show_datetime !== false;
  const hasCashier = showOrderInfo && moreInfo && settings.show_cashier;
  const hasTable = showOrderInfo && settings.show_table_number !== false && !!tableName;
  const hasCustomer = showOrderInfo && settings.show_customer_name !== false && !!order?.customer_name;
  const hasOrderSection = hasOrderNumber || hasDateTime || hasCashier;
  const hasGuestSection = hasTable || hasCustomer;

  /* The paper follows the receipt's own language, so Kurdish, Persian and
     Arabic print right-to-left even when the panel around them does not. */
  return (
    <div
      className="receipt-paper"
      data-paper={narrow ? '58' : '80'}
      data-align={align}
      data-columns={columns}
      data-logo={settings.logo_align === 'start' ? 'start' : 'center'}
      data-dividers={settings.show_dividers === false ? 'off' : 'on'}
      data-grand={GRAND_STYLES.includes(settings.grand_style) ? settings.grand_style : 'boxed'}
      data-foot-align={footAlign}
      style={paperVars}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
    >
      {/* 1 · identity: the logo and the business name on their own. */}
      <header className="rc-head">
        {settings.show_logo && business?.logo_url ? (
          <img className="receipt-logo" src={business.logo_url} alt="" style={{ maxWidth: `${logoWidth}px` }} />
        ) : null}
        <div className="rc-name">{businessName}</div>
      </header>

      {/* 2 · contact: address, phone, email and site, a section of their own. */}
      {contactLines.length ? (
        <section className="rc-contact-block rc-block">
          {contactLines.map((line) => (
            <div className={`rc-contact${line.numeric ? ' rc-num' : ''}`} key={line.key}>
              {line.text}
            </div>
          ))}
        </section>
      ) : null}

      {/* 3 · order: the number first, then when and by whom it was taken. */}
      {hasOrderSection ? (
        <section className="rc-order rc-block">
          {hasOrderNumber ? (
            <div className="rc-orderno">
              <span className="rc-orderno__label">{msg('order_no')}</span>
              <span className="rc-orderno__value rc-num">#{order?.order_number}</span>
            </div>
          ) : null}
          {hasDateTime || hasCashier ? (
            <dl className="rc-kv">
              {hasDateTime
                ? kvRow(
                    msg('datetime'),
                    <span className="rc-num">{fmtDateTime(order?.created_at, locale, timeZone)}</span>,
                    'date',
                  )
                : null}
              {hasCashier ? kvRow(msg('cashier'), order?.created_by_name || '—', 'cashier') : null}
            </dl>
          ) : null}
        </section>
      ) : null}

      {/* 4 · guest: which table the order belongs to and who it is for. */}
      {hasGuestSection ? (
        <section className="rc-guest rc-block">
          <dl className="rc-kv">
            {hasTable ? kvRow(msg('table'), tableName, 'table') : null}
            {hasCustomer ? kvRow(msg('customer'), order.customer_name, 'customer') : null}
          </dl>
        </section>
      ) : null}

      {/* 5 · products: name, quantity, unit price and line total, each in its
          own column so the three values can never read as one figure. */}
      {(items || []).length ? (
        <section className="rc-items rc-block">
          <div className="rc-items__head">
            <span>{msg('items')}</span>
            <span>{msg('qty')}</span>
            <span>{msg('unit_price')}</span>
            <span>{msg('total_column')}</span>
          </div>
          {(items || []).map((line, idx) => (
            /*
             * One grid, not one block per product: the header and every row are
             * laid out by the same column tracks (see receipt.css), so the
             * quantity, the unit price and the line total each keep the same
             * position down the whole paper whatever the product names are.
             */
            <div className="rc-item" key={`${line.name}-${idx}`}>
              <span className="rc-item__name">
                <span className="rc-item__label">{line.name}</span>
                {settings.show_notes !== false && line.notes ? (
                  <span className="rc-item__note">{line.notes}</span>
                ) : null}
              </span>
              <span className="rc-item__qty rc-num">{amount(line.quantity)}</span>
              <span className="rc-item__unit rc-num">
                {line.unit_price == null ? '—' : amount(line.unit_price)}
              </span>
              <span className="rc-item__amount rc-num">{amount(line.line_total)}</span>
            </div>
          ))}
        </section>
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
  // The same geometry the live preview draws, so the paper on screen and the
  // paper in the printer can never be laid out differently.
  const { paper, margins, scale, printable } = printGeometry(settings);

  return (
    <style>{`
      @page {
        size: ${paper}mm auto;
        margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
      }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      #print-root .receipt-paper {
        width: ${(printable / scale).toFixed(2)}mm;
        max-width: none;
        zoom: ${scale};
      }
    `}</style>
  );
}
