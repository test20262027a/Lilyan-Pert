import { useEffect, useMemo, useState } from 'react';
import Icon from '../Icon';
import { ConfirmDialog, useToast } from '../ui';
import { useI18n } from '../../i18n';
import { useBusiness } from '../../context/BusinessContext';
import { pickReceiptFooter } from '../../receiptMessages';
import { PrintPortal, ReceiptPaper, ReceiptPrintStyle } from '../Receipt';
import { ChoiceCard, SettingsCard, SettingsPanel, SettingsToggleRow } from './SettingsCard';
import { SetField } from './fields';
import ReceiptPreview from './ReceiptPreview';

/* Paper widths offered by the reference, plus a free width printers accept. */
const WIDTHS = [
  { value: '80mm', label: '80mm' },
  { value: '58mm', label: '58mm' },
  { value: 'custom', labelKey: 'settings_receipt_custom' },
];
const LOGO_SIZES = ['small', 'medium', 'large'];
const ALIGNMENTS = ['auto', 'center', 'start'];
const FONTS = ['naskh', 'kufi', 'system'];
const WEIGHTS = ['normal', 'medium', 'bold'];
const COLUMNS = ['auto', 'full', 'compact'];
const GRANDS = ['boxed', 'rule', 'plain'];
const FOOTER_ALIGNS = ['auto', 'center', 'start'];
const FOOTER_SIZES = ['small', 'normal', 'large'];
const LOGO_ALIGNS = ['center', 'start'];

/* The order details the paper may carry, in print order. */
const ORDER_TOGGLES = [
  ['show_order_number', 'settings_show_order_number'],
  ['show_datetime', 'settings_show_datetime'],
  ['show_customer_name', 'settings_show_customer_name'],
  ['show_table_number', 'settings_show_table_number'],
  ['show_notes', 'settings_show_notes'],
  ['show_more_info', 'settings_show_more_info'],
];
/* Header/footer content that already exists on this business record. */
const IDENTITY_TOGGLES = [
  ['show_address', 'settings_show_address'],
  ['show_phone', 'settings_show_phone'],
  ['show_cashier', 'settings_show_cashier'],
];

/* Restores receipt presentation only — business data and orders are untouched. */
const RECEIPT_DEFAULTS = {
  show_logo: true,
  show_address: true,
  show_phone: true,
  show_order_info: true,
  show_cashier: true,
  show_more_info: true,
  show_order_number: true,
  show_datetime: true,
  show_customer_name: true,
  show_table_number: true,
  show_notes: true,
  paper_width: '80mm',
  custom_width: 80,
  print_scale: 100,
  margin_top: 0,
  margin_left: 0,
  margin_right: 0,
  margin_bottom: 0,
  font_family: 'naskh',
  font_scale: 100,
  text_weight: 'normal',
  line_height: 1.4,
  section_spacing: 7,
  logo_size: 'medium',
  logo_align: 'center',
  alignment: 'auto',
  show_dividers: true,
  product_layout: 'auto',
  grand_style: 'boxed',
  footer_align: 'auto',
  footer_scale: 'normal',
};

/** Sample receipt for the preview and Test print — no order is ever created. */
function sampleReceipt(draft, t) {
  return {
    order: {
      order_number: 1024,
      created_at: new Date().toISOString(),
      customer_name: t('settings_receipt_sample_customer'),
      subtotal: 12000,
      discount: 0,
      tax: 0,
      service_charge: 0,
      total: 12000,
      notes: null,
    },
    items: [
      { name: t('settings_receipt_sample_item'), quantity: 1, unit_price: 12000, line_total: 12000, notes: null },
    ],
    table: { name: 'A1' },
    business: {
      name_en: draft.name_en,
      name_ku: draft.name_ku,
      name_fa: draft.name_fa,
      name_ar: draft.name_ar,
      name: draft.name,
      logo_url: draft.logo_url,
      phone: draft.phone,
      address: draft.address,
      addresses: draft.addresses,
      city: draft.city,
      currency: draft.currency,
      timezone: draft.timezone,
      receipt_settings: draft.receipt_settings,
      editable_text: draft.editable_text,
    },
  };
}

/**
 * Receipt printing settings.
 *
 * Everything here edits the unsaved draft, and the preview renders that draft
 * through the real receipt component — so any change, from the paper width to a
 * single margin, appears on the paper immediately. Nothing reaches the backend
 * until the workspace's own Save is pressed.
 *
 * The workspace is one two-column layout: related controls grouped into their
 * own panels on the reading side, the sticky live preview on the other, so the
 * controls fill the card from top to bottom instead of leaving a hollow column
 * beside the paper.
 */
export default function ReceiptTab({ draft, setJson, patch, setVal, canManage }) {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [printing, setPrinting] = useState(false);
  /*
   * The receipt's own language: it starts on the panel's language and can be
   * switched for a look at another one without changing the account at all.
   */
  const [previewLocale, setPreviewLocale] = useState(locale);
  const receipt = draft.receipt_settings || {};
  const width = receipt.paper_width || '80mm';
  const data = sampleReceipt(draft, t);

  useEffect(() => {
    setPreviewLocale(locale);
  }, [locale]);

  /*
   * One closing message for this preview and the print that follows it: the
   * pick is made here, once per language, and handed to both papers, so the
   * printed receipt never shows a different message from the preview.
   */
  const footerPick = useMemo(
    () => pickReceiptFooter(data.business, previewLocale),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewLocale, data.business?.id],
  );

  // Discarding only returns the receipt settings to what the server holds.
  const savedReceipt = useMemo(() => business?.receipt_settings || {}, [business]);
  const discardable = JSON.stringify(receipt) !== JSON.stringify(savedReceipt);
  const discardReceipt = () => setVal('receipt_settings', { ...savedReceipt });

  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const id = setTimeout(() => window.print(), 120);
    return () => {
      window.removeEventListener('afterprint', done);
      clearTimeout(id);
    };
  }, [printing]);

  const numeric = (key, fallback, min, max, step = '1') => ({
    className: 'input',
    type: 'number',
    dir: 'ltr',
    min,
    max,
    step,
    disabled: !canManage,
    value: receipt[key] ?? fallback,
    onChange: (event) =>
      setJson('receipt_settings', key, event.target.value === '' ? '' : Number(event.target.value)),
  });

  const setChoice = (key, value) => canManage && setJson('receipt_settings', key, value);
  const setToggle = (key, value) => setJson('receipt_settings', key, value);

  /** A row of choice cards bound to one setting. */
  const choices = (key, values, labelFor, fallback) => (
    <div className="set-choices">
      {values.map((value) => (
        <ChoiceCard
          key={value}
          active={(receipt[key] ?? fallback) === value}
          onClick={() => setChoice(key, value)}
        >
          {labelFor(value)}
        </ChoiceCard>
      ))}
    </div>
  );

  return (
    <>
      <SettingsCard
        icon="print"
        tone="teal"
        title={t('settings_receipt_title')}
        subtitle={t('settings_receipt_subtitle')}
        className="set-card--receipt"
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={discardReceipt}
              disabled={!canManage || !discardable}
            >
              <Icon name="refresh" size={15} />
              {t('settings_discard_changes')}
            </button>
            <button type="button" className="btn" onClick={() => setConfirmReset(true)} disabled={!canManage}>
              <Icon name="refresh" size={15} />
              {t('settings_restore_defaults')}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setPrinting(true)} disabled={!canManage}>
              <Icon name="print" size={15} />
              {t('settings_test_print')}
            </button>
          </>
        }
      >
        <div className="rcp">
          <div className="rcp__controls">
            <SettingsPanel icon="print" title={t('settings_receipt_group_paper')}>
              <SetField label={t('settings_receipt_width')}>
                {choices('paper_width', WIDTHS.map((option) => option.value), (value) => {
                  const option = WIDTHS.find((item) => item.value === value);
                  return option.labelKey ? t(option.labelKey) : option.label;
                }, '80mm')}
              </SetField>

              {width === 'custom' ? (
                <SetField label={t('settings_receipt_custom_width')} hint={t('settings_receipt_custom_hint')}>
                  <input {...numeric('custom_width', 80, 40, 120)} />
                </SetField>
              ) : null}

              <SetField label={t('settings_receipt_scale')} hint={t('settings_receipt_scale_hint')}>
                <input {...numeric('print_scale', 100, 50, 150)} />
              </SetField>

              <div className="rcp-margins">
                <SetField label={t('settings_receipt_margin_top')}>
                  <input {...numeric('margin_top', 0, 0, 20)} />
                </SetField>
                <SetField label={t('settings_receipt_margin_bottom')}>
                  <input {...numeric('margin_bottom', 0, 0, 20)} />
                </SetField>
                <SetField label={t('settings_receipt_margin_left')}>
                  <input {...numeric('margin_left', 0, 0, 20)} />
                </SetField>
                <SetField label={t('settings_receipt_margin_right')}>
                  <input {...numeric('margin_right', 0, 0, 20)} />
                </SetField>
              </div>
              <p className="rcp-note">{t('settings_receipt_margin_hint')}</p>
            </SettingsPanel>

            <SettingsPanel icon="type" title={t('settings_receipt_typography')}>
              <SetField label={t('settings_receipt_font_family')}>
                {choices('font_family', FONTS, (value) => t(`settings_receipt_font_${value}`), 'naskh')}
              </SetField>
              <div className="rcp-three">
                <SetField label={t('settings_receipt_font_size')} hint={t('settings_receipt_font_size_hint')}>
                  <input {...numeric('font_scale', 100, 80, 140)} />
                </SetField>
                <SetField label={t('settings_receipt_line_height')} hint={t('settings_receipt_line_height_hint')}>
                  <input {...numeric('line_height', 1.4, 1.1, 2, '0.05')} />
                </SetField>
                <SetField
                  label={t('settings_receipt_section_spacing')}
                  hint={t('settings_receipt_section_spacing_hint')}
                >
                  <input {...numeric('section_spacing', 7, 2, 16)} />
                </SetField>
              </div>
              <SetField label={t('settings_receipt_text_weight')}>
                {choices('text_weight', WEIGHTS, (value) => t(`settings_receipt_weight_${value}`), 'normal')}
              </SetField>
            </SettingsPanel>

            <SettingsPanel icon="layers" title={t('settings_receipt_layout')}>
              <SetField label={t('settings_receipt_product_columns')}>
                {choices('product_layout', COLUMNS, (value) => t(`settings_receipt_columns_${value}`), 'auto')}
              </SetField>
              <SetField label={t('settings_receipt_grand_style')}>
                {choices('grand_style', GRANDS, (value) => t(`settings_receipt_grand_${value}`), 'boxed')}
              </SetField>
              <SettingsToggleRow
                title={t('settings_receipt_dividers')}
                checked={receipt.show_dividers !== false}
                disabled={!canManage}
                onChange={(value) => setToggle('show_dividers', value)}
              />
              <div className="rcp-two">
                <SetField label={t('settings_receipt_footer_align')}>
                  {choices('footer_align', FOOTER_ALIGNS, (value) => t(`settings_receipt_align_${value}`), 'auto')}
                </SetField>
                <SetField label={t('settings_receipt_footer_size')}>
                  {choices('footer_scale', FOOTER_SIZES, (value) => t(`settings_receipt_size_${value}`), 'normal')}
                </SetField>
              </div>
            </SettingsPanel>

            <SettingsPanel icon="image" title={t('settings_receipt_group_branding')}>
              <SettingsToggleRow
                title={t('settings_show_logo')}
                checked={receipt.show_logo !== false}
                disabled={!canManage}
                onChange={(value) => setToggle('show_logo', value)}
              />
              <div className="rcp-two">
                <SetField label={t('settings_receipt_logo_size')}>
                  {choices('logo_size', LOGO_SIZES, (value) => t(`settings_receipt_size_${value}`), 'medium')}
                </SetField>
                <SetField label={t('settings_receipt_logo_position')}>
                  {choices('logo_align', LOGO_ALIGNS, (value) => t(`settings_receipt_position_${value}`), 'center')}
                </SetField>
              </div>
              <SetField label={t('settings_receipt_alignment')}>
                {choices('alignment', ALIGNMENTS, (value) => t(`settings_receipt_align_${value}`), 'auto')}
              </SetField>
            </SettingsPanel>

            <SettingsPanel icon="clipboard" title={t('settings_receipt_order_info')}>
              <SettingsToggleRow
                title={t('settings_show_order_info')}
                checked={receipt.show_order_info !== false}
                disabled={!canManage}
                onChange={(value) => setJson('receipt_settings', 'show_order_info', value)}
              />
              {ORDER_TOGGLES.map(([key, label]) => (
                <SettingsToggleRow
                  key={key}
                  title={t(label)}
                  checked={receipt[key] !== false}
                  disabled={!canManage || receipt.show_order_info === false}
                  onChange={(value) => setJson('receipt_settings', key, value)}
                />
              ))}
              <hr className="set-divider" />
              {IDENTITY_TOGGLES.map(([key, label]) => (
                <SettingsToggleRow
                  key={key}
                  title={t(label)}
                  checked={receipt[key] !== false}
                  disabled={!canManage}
                  onChange={(value) => setJson('receipt_settings', key, value)}
                />
              ))}
              {/* The receipt footer is written only in the Text Editor, where the
                  fifteen multilingual messages are the single source of truth. */}
            </SettingsPanel>
          </div>

          <aside className="rcp__aside">
            <ReceiptPreview
              data={data}
              settings={receipt}
              locale={previewLocale}
              onLocaleChange={setPreviewLocale}
              footerPick={footerPick}
              t={t}
            />
          </aside>
        </div>
      </SettingsCard>

      {confirmReset ? (
        <ConfirmDialog
          title={t('settings_restore_receipt_title')}
          message={t('settings_restore_receipt_message')}
          confirmLabel={t('settings_restore_defaults')}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            // Only receipt presentation is reset; the footer messages live in
            // the Text Editor and are never touched from here.
            patch('receipt_settings', { ...RECEIPT_DEFAULTS });
            setConfirmReset(false);
            toast.success(t('settings_receipt_restored'));
          }}
        />
      ) : null}

      {/* The same receipt component, the same draft values and the same footer
          message as the preview: the test print can never disagree with it. */}
      {printing ? (
        <PrintPortal>
          <ReceiptPrintStyle settings={receipt} />
          <ReceiptPaper data={data} locale={previewLocale} footerPick={footerPick} />
        </PrintPortal>
      ) : null}
    </>
  );
}
