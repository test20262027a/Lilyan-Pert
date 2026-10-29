import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { fmtDate, fmtDateNumeric, fmtMoney, fmtNumber, fmtTime, zoneFor } from '../format';
import { isRtl } from '../i18n';
import { pickReceiptFooter, receiptLabel, receiptMessageText } from '../receiptMessages';
import '../receipt.css';

/**
 * One receipt markup used by the on-screen preview and the printed output, so
 * both always show identical authoritative data. It is a single continuous
 * flow — no fixed heights, no page breaks, nothing that can clip.
 *
 * Seven independent sections, each with its own boundary and the same inner
 * padding: identity (logo, name, contact) · order details (number, type, date,
 * time, table, guest, staff) · products (one real table of five columns) ·
 * notes · financial summary, closed by the highlighted grand total · one
 * closing message. Only the type scale, the logo cap and the product table's
 * shape change between 58 mm and 80 mm (see receipt.css).
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

/**
 * One labelled fact of the order card: an icon-led caption and its value on the
 * SAME row, in a stable two-column grid — caption in the first column (the
 * right-hand one on an RTL receipt), value in the second, so a name always
 * prints opposite its own label and wraps inside its own column.
 */
function ReceiptField({ icon, label, children }) {
  return (
    <div className="rc-field">
      <span className="rc-field__label">
        <Icon name={icon} size={11} />
        {label}
      </span>
      <span className="rc-field__value">{children}</span>
    </div>
  );
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
  /* Summary figures print with the receipt's own currency, exactly the way the
     grand total does, so no amount on the paper is ambiguous about its unit. */
  const money = (value) => fmtMoney(Number(value) || 0, currency, locale);

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
          date: order ? fmtDate(order.created_at, locale, timeZone, { short: true }) : '',
          total: `${amount(order?.total)}${currency ? ` ${currency}` : ''}`,
          currency,
        }),
      }
    : null;

  /*
   * The paper is a stack of independent sections — identity, order, products,
   * notes, summary, grand total, closing message. Each one is computed here so
   * a section whose settings are all off is not rendered at all: the paper
   * never carries an empty block or a divider with nothing under it.
   */
  const contactRows = [];
  if (moreInfo && settings.show_address && (addressText || business?.city)) {
    contactRows.push({
      key: 'address',
      icon: 'pin',
      text: [addressText, business?.city].filter(Boolean).join(', '),
    });
  }
  if (moreInfo && settings.show_phone && business?.phone) {
    contactRows.push({ key: 'phone', icon: 'phone', text: business.phone, bidi: true });
  }
  if (moreInfo && business?.email) {
    contactRows.push({ key: 'email', icon: 'mail', text: business.email, bidi: true });
  }

  const showOrderInfo = settings.show_order_info !== false;
  const hasOrderNumber = showOrderInfo && settings.show_order_number !== false;
  const hasDateTime = showOrderInfo && settings.show_datetime !== false;
  const hasCashier = showOrderInfo && moreInfo && settings.show_cashier !== false && !!order?.created_by_name;
  const hasTable = showOrderInfo && settings.show_table_number !== false && !!tableName;
  const hasCustomer = showOrderInfo && settings.show_customer_name !== false && !!order?.customer_name;
  /* The order's kind comes from the order itself: an order taken at a table is
     a dine-in order, one without a table is taken away. */
  const orderType = table ? 'dine_in' : 'takeaway';
  /* A seated order needs no badge: the table is already printed beside it. Only
     the takeaway order states its kind on the paper. */
  const hasOrderType = showOrderInfo && orderType !== 'dine_in';
  const hasLineNotes = settings.show_notes !== false && (items || []).some((line) => line.notes);

  /*
   * The order card's facts, one row each. Every row is the same two-column
   * grid — caption, then value — so the date, the table, the guest and the
   * cashier all line up, and a long value wraps inside its own column instead
   * of pushing the next row around. A fact with nothing saved is not added at
   * all, so the card never carries a reserved empty row.
   */
  const dateFmt = order ? fmtDateNumeric(order.created_at, locale, timeZone) : '';
  const timeFmt = order ? fmtTime(order.created_at, locale, timeZone) : '';

  const facts = [];
  if (hasDateTime) {
    /* One line: the numeric date, then its time beside it. */
    facts.push(
      <ReceiptField key="datetime" icon="calendar" label={msg('datetime')}>
        <span className="rc-field__dates">
          <span className="rc-num">{dateFmt}</span>
          <span className="rc-num">{timeFmt}</span>
        </span>
      </ReceiptField>,
    );
  }
  if (hasTable) {
    facts.push(
      <ReceiptField key="table" icon="table" label={msg('table')}>
        <span className="rc-field__value--strong" dir="auto">{tableName}</span>
      </ReceiptField>,
    );
  }
  if (hasCustomer) {
    facts.push(
      <ReceiptField key="customer" icon="person" label={msg('customer')}>
        <span dir="auto">{order.customer_name}</span>
      </ReceiptField>,
    );
  }
  if (hasCashier) {
    facts.push(
      <ReceiptField key="cashier" icon="person" label={msg('cashier')}>
        <span dir="auto">{order.created_by_name}</span>
      </ReceiptField>,
    );
  }

  const hasOrderDetails = facts.length > 0;

  /* The paper follows the receipt's own language, so Kurdish, Persian and
     Arabic print right-to-left even when the panel around them does not. */
  return (
    <div
      className="receipt-paper"
      data-paper={narrow ? '58' : '80'}
      data-align={align}
      data-logo={settings.logo_align === 'start' ? 'start' : 'center'}
      data-dividers={settings.show_dividers === false ? 'off' : 'on'}
      data-grand={GRAND_STYLES.includes(settings.grand_style) ? settings.grand_style : 'boxed'}
      data-foot-align={footAlign}
      style={paperVars}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
    >
      {/* 1 · identity: the logo, the business name, then one icon-led row per
          contact detail — each row its own icon area and its own text area. */}
      <header className="rc-head">
        {settings.show_logo && business?.logo_url ? (
          <img className="receipt-logo" src={business.logo_url} alt="" style={{ maxWidth: `${logoWidth}px` }} />
        ) : null}
        <div className="rc-name">{businessName}</div>
        {contactRows.length ? (
          <div className="rc-contacts">
            {contactRows.map((row) => (
              <div className="rc-contact" key={row.key}>
                <span className="rc-contact__icon" aria-hidden="true">
                  <Icon name={row.icon} size={11} />
                </span>
                <span className={`rc-contact__text${row.bidi ? ' rc-num' : ''}`}>{row.text}</span>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      {/* 2 · order card: the number leads with a receipt mark and a localised
          badge, then one aligned caption/value row per order fact. */}
      {hasOrderNumber || hasOrderDetails ? (
        <section className="rc-block">
          <div className="rc-card">
            {hasOrderNumber ? (
              <div className="rc-ordertop">
                <span className="rc-ordertop__icon" aria-hidden="true">
                  <Icon name="receipt" size={14} />
                </span>
                <span className="rc-ordertop__number rc-num">#{order?.order_number}</span>
                {hasOrderType ? (
                  <span className="rc-ordertop__badge">{msg(orderType)}</span>
                ) : null}
              </div>
            ) : null}
            {hasOrderDetails ? <div className="rc-ordergrid">{facts}</div> : null}
          </div>
        </section>
      ) : null}

      {/* 3 · products: one real table — row number, product, quantity, unit
          price and line total, each of the five in its own column, so the three
          money values can never read as one figure. */}
      {(items || []).length ? (
        <section className="rc-block">
          <div className="rc-card">
            <div className="rc-secthead">
              <span className="rc-secthead__icon" aria-hidden="true">
                <Icon name="cart" size={12} />
              </span>
              <span className="rc-secthead__title">{msg('products')}</span>
            </div>
            {/*
              * One real <table> with a <colgroup> and `table-layout: fixed`:
              * the five columns of the reference (# · product · quantity ·
              * unit price · line total) are fixed proportions of the paper, so
              * a value keeps its column down the whole receipt whatever the
              * names are, and a long name wraps inside the name column only.
              * The columns run right-to-left on an RTL receipt on their own.
              */}
            {columns === 'compact' ? (
              /*
               * 58 mm: the product name takes its own line with the row number,
               * then the quantity, the unit price and the line total sit under
               * one another in three aligned fields — never one merged string.
               */
              <table className="rc-table rc-table--compact">
                <colgroup>
                  <col className="rc-w rc-w--qty" />
                  <col className="rc-w rc-w--unit" />
                  <col className="rc-w rc-w--total" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className="rc-th rc-th--qty">{msg('qty')}</th>
                    <th scope="col" className="rc-th rc-th--unit">{msg('unit_price')}</th>
                    <th scope="col" className="rc-th rc-th--total">{msg('total_column')}</th>
                  </tr>
                </thead>
                {(items || []).map((line, idx) => (
                  <tbody className="rc-item" key={`${line.name}-${idx}`}>
                    <tr>
                      <td className="rc-td rc-td--name" colSpan={3}>
                        <span className="rc-td__index rc-num">{amount(idx + 1)}</span>
                        <span className="rc-td__name" dir="auto">{line.name}</span>
                        {hasLineNotes && line.notes ? (
                          <span className="rc-td__note" dir="auto">{line.notes}</span>
                        ) : null}
                      </td>
                    </tr>
                    <tr>
                      <td className="rc-td rc-td--qty rc-num">{amount(line.quantity)}</td>
                      <td className="rc-td rc-td--unit rc-num">
                        {line.unit_price == null ? '—' : amount(line.unit_price)}
                      </td>
                      <td className="rc-td rc-td--total rc-num">{amount(line.line_total)}</td>
                    </tr>
                  </tbody>
                ))}
              </table>
            ) : (
              <table className="rc-table">
                <colgroup>
                  <col className="rc-w rc-w--no" />
                  <col className="rc-w rc-w--name" />
                  <col className="rc-w rc-w--qty" />
                  <col className="rc-w rc-w--unit" />
                  <col className="rc-w rc-w--total" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className="rc-th rc-th--no">#</th>
                    <th scope="col" className="rc-th rc-th--name">{msg('product')}</th>
                    <th scope="col" className="rc-th rc-th--qty">{msg('qty')}</th>
                    <th scope="col" className="rc-th rc-th--unit">{msg('unit_price')}</th>
                    <th scope="col" className="rc-th rc-th--total">{msg('total_column')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(items || []).map((line, idx) => (
                    <tr className="rc-item" key={`${line.name}-${idx}`}>
                      <td className="rc-td rc-td--no rc-num">{amount(idx + 1)}</td>
                      <td className="rc-td rc-td--name">
                        <span className="rc-td__name" dir="auto">{line.name}</span>
                        {hasLineNotes && line.notes ? (
                          <span className="rc-td__note" dir="auto">{line.notes}</span>
                        ) : null}
                      </td>
                      <td className="rc-td rc-td--qty rc-num">{amount(line.quantity)}</td>
                      <td className="rc-td rc-td--unit rc-num">
                        {line.unit_price == null ? '—' : amount(line.unit_price)}
                      </td>
                      <td className="rc-td rc-td--total rc-num">{amount(line.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : null}

      {/* 4 · notes: their own headed card, the note itself in its own field
          beside a speech mark — start-aligned, never centred, wrapping inside. */}
      {settings.show_notes !== false && order?.notes ? (
        <section className="rc-block">
          <div className="rc-card">
            <div className="rc-secthead">
              <span className="rc-secthead__icon" aria-hidden="true">
                <Icon name="clipboard" size={12} />
              </span>
              <span className="rc-secthead__title">{msg('notes')}</span>
            </div>
            <div className="rc-note">
              <span className="rc-note__icon" aria-hidden="true">
                <Icon name="message" size={11} />
              </span>
              {/* The note keeps the paper's own direction, so its first word
                  always starts on the same side as the heading above it. */}
              <span className="rc-note__text">{order.notes}</span>
            </div>
          </div>
        </section>
      ) : null}

      {/* 5 · financial summary: one row per stored amount — label on one
          alignment, amount with its currency on the other — and the grand total
          closing the same card, above a strong divider. */}
      <section className="rc-block">
        <div className="rc-card">
          <div className="rc-secthead">
            <span className="rc-secthead__icon" aria-hidden="true">
              <Icon name="calculator" size={12} />
            </span>
            <span className="rc-secthead__title">{msg('summary')}</span>
          </div>
          <dl className="rc-sum">
            <div className="rc-sum__row">
              <dt>{msg('subtotal')}</dt>
              <dd className="rc-num">{money(order?.subtotal)}</dd>
            </div>
            {Number(order?.discount || 0) > 0 ? (
              <div className="rc-sum__row">
                <dt>{msg('discount')}</dt>
                <dd className="rc-num">-{money(order.discount)}</dd>
              </div>
            ) : null}
            {Number(order?.tax || 0) > 0 ? (
              <div className="rc-sum__row">
                <dt>{msg('tax')}</dt>
                <dd className="rc-num">{money(order.tax)}</dd>
              </div>
            ) : null}
            {Number(order?.service_charge || 0) > 0 ? (
              <div className="rc-sum__row">
                <dt>{msg('service_charge')}</dt>
                <dd className="rc-num">{money(order.service_charge)}</dd>
              </div>
            ) : null}
          </dl>

          {/* 6 · grand total: the bottom of the same card — the strongest figure
              on the paper, never one more line of the rows above it. */}
          <div className="rc-grand">
            <span className="rc-grand__label">{msg('total')}</span>
            <span className="rc-grand__amount">
              <Icon name="coins" size={13} className="rc-grand__icon" />
              <b className="rc-num">{fmtMoney(order?.total || 0, currency, locale)}</b>
            </span>
          </div>
        </div>
      </section>

      {/*
        Deliberately no order-change audit here: status transitions, edits and
        the users who made them belong to the Order Details activity timeline.
        A receipt carries the final order only, on screen, in print and in PDF.
      */}
      {/* 7 · exactly one closing message, already resolved in this receipt's
          own language — never several messages, never several languages. */}
      {footer?.text ? (
        <footer className="rc-foot rc-block">
          <Icon name="heart" size={12} className="rc-foot__icon" />
          <p className="rc-foot__text">{footer.text}</p>
        </footer>
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
